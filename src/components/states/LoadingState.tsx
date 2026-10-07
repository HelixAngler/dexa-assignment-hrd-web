import { useI18n } from '../../i18n/provider';

export interface LoadingStateProps {
  /** Accessible label; defaults to the active-language loading copy. */
  label?: string;
  /** How many skeleton lines to reserve below the title block. */
  rows?: number;
}

/**
 * Loading placeholder that reserves the space the real content will occupy:
 * every skeleton block has a fixed height/width so nothing jumps when data
 * arrives. Announced politely via `role="status"` instead of a bare spinner.
 */
export default function LoadingState({
  label,
  rows = 3,
}: LoadingStateProps) {
  const { t } = useI18n();
  const text = label ?? t('state.loading.title');

  return (
    <div
      data-testid="loading-state"
      role="status"
      aria-busy="true"
      aria-label={text}
      className="min-h-[180px] space-y-3 py-4"
    >
      <div
        data-testid="loading-skeleton-title"
        className="h-6 w-48 rounded bg-gray-200"
      />
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          data-testid="loading-skeleton-row"
          className="h-4 w-full rounded bg-gray-200"
        />
      ))}
      <div
        data-testid="loading-skeleton-caption"
        className="h-4 w-2/3 rounded bg-gray-200"
      />
    </div>
  );
}
