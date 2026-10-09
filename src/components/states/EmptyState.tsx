import type { ReactNode } from 'react';
import { useI18n } from '../../i18n/provider';

export interface EmptyStateProps {
  /** Icon or illustration shown above the copy. */
  icon?: ReactNode;
  /** Overrides the headline; defaults to the active-language empty copy. */
  title?: string;
  /** Overrides the body copy; defaults to the active-language empty copy. */
  description?: string;
  /** Optional call-to-action rendered below the copy. */
  action?: ReactNode;
}

/**
 * Explains why a list or table is blank instead of showing nothing. Callers
 * translate `title`/`description` via `t()` when they override the defaults.
 * The block reserves a fixed minimum height so swapping it in never shifts
 * the page around it.
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  const { t } = useI18n();

  return (
    <section
      data-testid="empty-state"
      className="mx-auto flex min-h-[240px] w-full max-w-[48ch] flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-8 text-center shadow-[var(--shadow-card)]"
    >
      <span aria-hidden="true" className="text-[var(--color-text-muted)]">
        {icon ?? (
          <svg
            viewBox="0 0 48 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="h-8 w-8"
            data-testid="empty-state-default-icon"
          >
            <rect x="8" y="12" width="32" height="26" rx="3" />
            <path d="M8 22h32" />
            <path d="M18 30h12" />
          </svg>
        )}
      </span>
      <h2 className="text-lg font-semibold leading-7 text-[var(--color-text-strong)]">
        {title ?? t('state.empty.title')}
      </h2>
      <p className="max-w-md text-sm leading-5 text-[var(--color-text)]">
        {description ?? t('state.empty.description')}
      </p>
      {action}
    </section>
  );
}
