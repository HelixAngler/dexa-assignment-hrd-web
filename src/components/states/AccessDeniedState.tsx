import { useI18n } from '../../i18n/provider';

export interface AccessDeniedStateProps {
  /**
   * Called by the Back button. Defaults to a browser history back, so the
   * component never strands the user on the denied screen.
   */
  onBack?: () => void;
  /** Overrides the headline; defaults to the active-language copy. */
  title?: string;
  /** Overrides the body copy; defaults to the active-language copy. */
  description?: string;
}

/**
 * Shown when the signed-in user lacks permission for the current view.
 * Explains the denial and always offers a way back.
 */
export default function AccessDeniedState({
  onBack,
  title,
  description,
}: AccessDeniedStateProps) {
  const { t } = useI18n();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    window.history.back();
  };

  return (
    <section
      data-testid="access-denied-state"
      className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-lg border border-yellow-100 bg-yellow-50 px-4 py-8 text-center"
    >
      <h2 className="text-base font-semibold text-yellow-900">
        {title ?? t('state.accessDenied.title')}
      </h2>
      <p className="max-w-md text-sm text-yellow-800">
        {description ?? t('state.accessDenied.description')}
      </p>
      <button
        type="button"
        data-testid="back-button"
        onClick={handleBack}
        className="min-h-[44px] rounded-md bg-gray-800 px-4 text-sm font-medium text-white hover:bg-gray-900"
      >
        {t('state.accessDenied.back')}
      </button>
    </section>
  );
}
