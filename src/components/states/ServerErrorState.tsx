import { useI18n } from '../../i18n/provider';

export interface ServerErrorStateProps {
  /** Called when the user asks to retry the failed load. */
  onRetry?: () => void;
  /** Overrides the headline; defaults to the active-language copy. */
  title?: string;
  /** Overrides the body copy; defaults to the active-language copy. */
  description?: string;
}

/**
 * Shown when a request fails. The copy explicitly reassures the user that no
 * data changed, and a retry button offers the way forward.
 */
export default function ServerErrorState({
  onRetry,
  title,
  description,
}: ServerErrorStateProps) {
  const { t } = useI18n();

  return (
    <section
      data-testid="server-error-state"
      role="alert"
      className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-8 text-center"
    >
      <h2 className="text-base font-semibold text-red-800">
        {title ?? t('state.serverError.title')}
      </h2>
      <p className="max-w-md text-sm text-red-700">
        {description ?? t('state.serverError.description')}
      </p>
      <button
        type="button"
        data-testid="retry-button"
        onClick={() => onRetry?.()}
        className="min-h-[44px] rounded-md bg-red-700 px-4 text-sm font-medium text-white hover:bg-red-800"
      >
        {t('state.serverError.retry')}
      </button>
    </section>
  );
}
