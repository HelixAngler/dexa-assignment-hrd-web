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
      className="flex min-h-[180px] flex-col items-center justify-center gap-2 px-4 py-8 text-center"
    >
      <span aria-hidden="true" className="text-gray-400">
        {icon ?? (
          <svg
            viewBox="0 0 48 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-12 w-12"
            data-testid="empty-state-default-icon"
          >
            <rect x="8" y="12" width="32" height="26" rx="3" />
            <path d="M8 22h32" />
            <path d="M18 30h12" />
          </svg>
        )}
      </span>
      <h2 className="text-base font-semibold text-gray-800">
        {title ?? t('state.empty.title')}
      </h2>
      <p className="max-w-md text-sm text-gray-500">
        {description ?? t('state.empty.description')}
      </p>
      {action}
    </section>
  );
}
