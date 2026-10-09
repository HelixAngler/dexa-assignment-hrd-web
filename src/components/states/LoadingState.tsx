import { useI18n } from '../../i18n/provider';

export interface LoadingStateProps {
  /** Accessible label; defaults to the active-language loading copy. */
  label?: string;
  /** How many skeleton lines to reserve below the title block. */
  rows?: number;
}

/** Skeleton base: token hairline colour with a moving highlight. */
const skeletonClass =
  'rounded-[var(--radius-sm)] bg-[linear-gradient(90deg,var(--color-border),var(--color-surface),var(--color-border))] [background-size:200%_100%] motion-safe:[animation:skeleton-shimmer_1.5s_linear_infinite]';

/**
 * Loading placeholder that reserves the space the real content will occupy:
 * every skeleton block has a fixed height/width so nothing jumps when data
 * arrives. The highlight sweep only runs under `prefers-reduced-motion:
 * no-preference`, and the region is announced politely via `role="status"`.
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
      className="min-h-[240px] space-y-3 py-4"
    >
      <style>{'@keyframes skeleton-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}'}</style>
      <div
        data-testid="loading-skeleton-title"
        className={`h-6 w-48 ${skeletonClass}`}
      />
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          data-testid="loading-skeleton-row"
          className={`h-4 w-full ${skeletonClass}`}
        />
      ))}
      <div
        data-testid="loading-skeleton-caption"
        className={`h-4 w-2/3 ${skeletonClass}`}
      />
    </div>
  );
}
