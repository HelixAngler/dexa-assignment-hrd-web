import { useCallback, useEffect, useState } from 'react';
import type { DictKey } from '../i18n/id';
import { useI18n, type Lang } from '../i18n/provider';
import { startAlertFeed, type AlertProjection } from '../services/alerts';
import type { CreateTransport } from '../services/realtime';
import { CloseIcon } from './icons';

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
 * How many banners the stack keeps on screen at once. Older banners past
 * this cap stay in the document behind the `hidden` attribute, so their ids
 * remain addressable while only the newest few are rendered visibly.
 */
const MAX_VISIBLE_BANNERS = 3;

/**
 * Stacked, dismissible alert banners for profile changes seen by the HRD
 * console. On mount it pulls the alerts missed since the last visit and
 * subscribes to the realtime channel; every event becomes its own banner in
 * normal document flow (never a modal), the queue lives only in memory and
 * an event id is shown at most once. The visible stack reads newest first
 * (flex `order` reverses the append order) and caps at three banners with a
 * "+N more" line naming the hidden remainder.
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

  const collapsedCount = queue.length - MAX_VISIBLE_BANNERS;
  const hasCollapsed = collapsedCount > 0;

  return (
    <div
      data-testid="alert-banner-list"
      role="region"
      aria-label={t('alert.regionLabel')}
      className="flex w-full flex-col gap-[var(--space-sm)] px-[var(--space-lg)] py-[var(--space-sm)] md:flex-row md:flex-wrap md:items-start"
    >
      {queue.map((alert, index) => {
        const collapsed = index < collapsedCount;
        return (
          <article
            key={alert.alertId}
            data-testid="alert-banner"
            data-alert-id={alert.alertId}
            role="alert"
            hidden={collapsed}
            style={{
              order: queue.length - index,
              ...(collapsed ? { display: 'none' } : null),
            }}
            className="flex min-w-0 flex-1 items-start gap-[var(--space-md)] rounded-[var(--radius-lg)] border border-[color:var(--color-border)] border-l-[length:var(--space-xs)] border-l-[color:var(--color-primary)] bg-[var(--color-surface)] px-[var(--space-lg)] py-[var(--space-md)] shadow-[var(--shadow-raised)] md:min-w-[280px]"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-xs)]">
              <p className="break-words font-semibold text-[color:var(--color-text-strong)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)]">
                {alert.employeeName}
              </p>
              <p className="break-words text-[color:var(--color-text)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)]">
                {describeChange(alert, t)}
              </p>
              <time
                dateTime={alert.occurredAt}
                className="tabular-nums text-[color:var(--color-text-muted)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]"
              >
                {formatOccurredAt(alert.occurredAt, lang)}
              </time>
            </div>
            <button
              type="button"
              data-testid="alert-banner-dismiss"
              aria-label={t('alert.dismiss')}
              onClick={() => dismiss(alert.alertId)}
              className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--color-text)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] hover:bg-[var(--color-page)] hover:text-[color:var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
            >
              <CloseIcon size={16} />
            </button>
          </article>
        );
      })}
      {hasCollapsed && (
        <p
          style={{ order: MAX_VISIBLE_BANNERS + 1 }}
          className="px-[var(--space-md)] py-[var(--space-xs)] text-[color:var(--color-text-muted)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]"
        >
          {t('alert.more').replace('{count}', String(collapsedCount))}
        </p>
      )}
    </div>
  );
}
