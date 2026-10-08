import { ApiError, apiFetch } from './api';
import {
  createCentrifugoTransport,
  fetchRealtimeToken,
  NOTIFICATION_BASE,
  type AlertTransport,
  type CreateTransport,
} from './realtime';

/** `localStorage` slot holding the ISO timestamp of the previous visit. */
export const ALERTS_BASELINE_STORAGE_KEY = 'alerts-last-visit';

/**
 * One profile change rendered as a banner: who changed what and when.
 * Password events carry the flag only — never any password material.
 */
export interface AlertProjection {
  alertId: string;
  employeeId: string;
  employeeName: string;
  changedFields: string[];
  before?: Record<string, string>;
  after?: Record<string, string>;
  passwordChanged: boolean;
  occurredAt: string;
}

export interface AlertFeedOptions {
  /** Receives every newly queued alert; the caller deduplicates by id. */
  onAlert: (alert: AlertProjection) => void;
  /** Overrides the realtime transport; tests inject a fake. */
  createTransport?: CreateTransport;
}

export interface AlertFeed {
  /** Stops the pull, the realtime client and any pending retry. */
  stop: () => void;
}

/** First retry delay after a realtime startup failure. */
const INITIAL_RETRY_DELAY_MS = 1000;

/** Upper bound for the doubling retry delay. */
const MAX_RETRY_DELAY_MS = 30000;

/**
 * Validates a payload before it reaches the queue so a malformed message
 * cannot break rendering. Returns `null` for anything that is not an alert.
 */
function asAlert(value: unknown): AlertProjection | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as Partial<AlertProjection>;
  if (typeof record.alertId !== 'string') {
    return null;
  }
  return {
    alertId: record.alertId,
    employeeId: typeof record.employeeId === 'string' ? record.employeeId : '',
    employeeName:
      typeof record.employeeName === 'string' ? record.employeeName : '',
    changedFields: Array.isArray(record.changedFields)
      ? record.changedFields.filter(
          (field): field is string => typeof field === 'string',
        )
      : [],
    passwordChanged: record.passwordChanged === true,
    occurredAt: typeof record.occurredAt === 'string' ? record.occurredAt : '',
    ...(record.before !== undefined ? { before: record.before } : {}),
    ...(record.after !== undefined ? { after: record.after } : {}),
  };
}

/** Reads the stored last-visit timestamp; unusable values read as absent. */
export function readBaseline(): string | null {
  try {
    const stored = window.localStorage.getItem(ALERTS_BASELINE_STORAGE_KEY);
    if (stored === null || stored === '' || Number.isNaN(Date.parse(stored))) {
      return null;
    }
    return stored;
  } catch {
    // Storage may be unavailable; the server falls back to its recent-N list.
    return null;
  }
}

/** Stores the current visit start so the next visit resumes from there. */
export function persistBaseline(timestamp: string): void {
  try {
    window.localStorage.setItem(ALERTS_BASELINE_STORAGE_KEY, timestamp);
  } catch {
    // Storage may be unavailable; the next visit simply pulls a wider window.
  }
}

/**
 * Pull fallback: alerts newer than `since` (or the server's recent-N list
 * when `since` is absent), newest first.
 */
export async function fetchRecentAlerts(
  since: string | null,
): Promise<AlertProjection[]> {
  const url =
    since === null
      ? `${NOTIFICATION_BASE}/alerts/recent`
      : `${NOTIFICATION_BASE}/alerts/recent?since=${encodeURIComponent(since)}`;
  const body = await apiFetch<{ alerts?: unknown }>(url);
  const alerts = Array.isArray(body?.alerts) ? body.alerts : [];
  return alerts
    .map(asAlert)
    .filter((alert): alert is AlertProjection => alert !== null);
}

/**
 * Starts both delivery paths for the banner queue and returns its handle:
 *
 * - pull: fetches alerts missed since the stored last visit, then advances
 *   the baseline only after a successful fetch, so a failed pull is retried
 *   by the next visit instead of being skipped;
 * - realtime: exchanges the session for a token and subscribes through the
 *   transport, rebuilding it with a doubling delay when startup fails.
 *
 * Either path works on its own, so banners still appear when the realtime
 * server is unreachable.
 */
export function startAlertFeed(options: AlertFeedOptions): AlertFeed {
  const createTransport = options.createTransport ?? createCentrifugoTransport;

  let stopped = false;
  let transport: AlertTransport | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryDelay = INITIAL_RETRY_DELAY_MS;

  const handlePayload = (payload: unknown): void => {
    if (stopped) {
      return;
    }
    const alert = asAlert(payload);
    if (alert !== null) {
      options.onAlert(alert);
    }
  };

  const closeTransport = (): void => {
    if (transport !== null) {
      transport.close();
      transport = null;
    }
  };

  const scheduleRetry = (): void => {
    if (stopped || retryTimer !== null) {
      return;
    }
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void startRealtime();
    }, retryDelay);
    retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
  };

  const startRealtime = async (): Promise<void> => {
    if (stopped) {
      return;
    }
    let token: string;
    try {
      token = await fetchRealtimeToken();
    } catch (error) {
      // Without permission there is nothing to retry; the pull already ran.
      if (error instanceof ApiError && error.status === 403) {
        return;
      }
      scheduleRetry();
      return;
    }
    if (stopped) {
      return;
    }
    closeTransport();
    transport = createTransport(token, {
      onMessage: handlePayload,
      onFailure: () => {
        closeTransport();
        scheduleRetry();
      },
    });
    retryDelay = INITIAL_RETRY_DELAY_MS;
  };

  void (async () => {
    const since = readBaseline();
    const visitStartedAt = new Date().toISOString();
    try {
      const alerts = await fetchRecentAlerts(since);
      if (stopped) {
        return;
      }
      alerts.forEach(options.onAlert);
      persistBaseline(visitStartedAt);
    } catch {
      // Keep the old baseline so the next visit retries this window.
    }
  })();

  void startRealtime();

  return {
    stop: () => {
      stopped = true;
      if (retryTimer !== null) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      closeTransport();
    },
  };
}
