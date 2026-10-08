import { useCallback, useEffect, useState } from 'react';
import type { DictKey } from '../i18n/id';
import { useI18n, type Lang } from '../i18n/provider';
import { startAlertFeed, type AlertProjection } from '../services/alerts';
import type { CreateTransport } from '../services/realtime';

/** Dictionary keys for the field names a change summary can mention. */
const FIELD_KEYS: Record<string, DictKey> = {
  phone: 'alert.field.phone',
  photo: 'alert.field.photo',
  password: 'alert.field.password',
};

/** Localised one-line description of what changed in an alert. */
function describeChange(
  alert: AlertProjection,
  t: (key: DictKey) => string,
): string {
  if (alert.passwordChanged) {
    return t('alert.passwordLine');
  }
  const labels = alert.changedFields.map((field) =>
    FIELD_KEYS[field] !== undefined ? t(FIELD_KEYS[field]) : field,
  );
  if (labels.length === 0) {
    return '';
  }
  return t('alert.changedFields').replace('{fields}', labels.join(', '));
}

/** Localised occurrence timestamp; unparseable input is shown verbatim. */
function formatOccurredAt(occurredAt: string, lang: Lang): string {
  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) {
    return occurredAt;
  }
  return new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export interface AlertBannerProps {
  /**
   * Builds the realtime transport for a freshly issued token. Pass a stable
   * reference: changing it restarts the feed.
   */
  createTransport?: CreateTransport;
}

/**
 * Stacked, dismissible alert banners for profile changes seen by the HRD
 * console. On mount it pulls the alerts missed since the last visit and
 * subscribes to the realtime channel; every event becomes its own banner in
 * normal document flow (never a modal), the queue lives only in memory and
 * an event id is shown at most once.
 */
export default function AlertBanner({ createTransport }: AlertBannerProps) {
  const { t, lang } = useI18n();
  const [queue, setQueue] = useState<AlertProjection[]>([]);
  const [seenIds] = useState(() => new Set<string>());

  const enqueue = useCallback(
    (alert: AlertProjection) => {
      if (seenIds.has(alert.alertId)) {
        return;
      }
      seenIds.add(alert.alertId);
      setQueue((current) => [...current, alert]);
    },
    [seenIds],
  );

  const dismiss = useCallback((alertId: string) => {
    setQueue((current) => current.filter((alert) => alert.alertId !== alertId));
  }, []);

  useEffect(() => {
    const feed = startAlertFeed({ onAlert: enqueue, createTransport });
    return () => feed.stop();
  }, [enqueue, createTransport]);

  if (queue.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="alert-banner-list"
      role="region"
      aria-label={t('alert.regionLabel')}
      className="flex w-full flex-col gap-2 p-2 md:flex-row md:flex-wrap md:items-start"
    >
      {queue.map((alert) => (
        <article
          key={alert.alertId}
          data-testid="alert-banner"
          data-alert-id={alert.alertId}
          role="alert"
          className="flex min-w-0 flex-1 items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 shadow-sm md:min-w-[280px]"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-amber-900">
              {alert.employeeName}
            </p>
            <p className="text-sm text-amber-800">
              {describeChange(alert, t)}
            </p>
            <time
              dateTime={alert.occurredAt}
              className="text-xs text-amber-700"
            >
              {formatOccurredAt(alert.occurredAt, lang)}
            </time>
          </div>
          <button
            type="button"
            data-testid="alert-banner-dismiss"
            aria-label={t('alert.dismiss')}
            onClick={() => dismiss(alert.alertId)}
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded text-amber-800 hover:bg-amber-100"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </article>
      ))}
    </div>
  );
}
