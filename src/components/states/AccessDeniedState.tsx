import { AlertIcon } from '../icons';
import { useI18n } from '../../i18n/provider';

export interface AccessDeniedStateProps {
  /**
   * Called by the Back button. Defaults to a browser history back, so the
   * component never strands the user on the denied screen.
   */
  onBack?: () => void;
  /**
   * When given, a sign-out button is rendered next to the back button so a
   * session that may not be here can still leave the screen.
   */
  onSignOut?: () => void;
  /** Overrides the headline; defaults to the active-language copy. */
  title?: string;
  /** Overrides the body copy; defaults to the active-language copy. */
  description?: string;
}

/**
 * Shown when the signed-in user lacks permission for the current view.
 * Explains the denial and always offers a way back. Back is the screen's one
 * primary action; signing out sits beside it as the secondary choice.
 */
export default function AccessDeniedState({
  onBack,
  onSignOut,
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
      className="mx-auto flex min-h-[240px] w-full max-w-[48ch] flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-attention-bg)] px-4 py-8 text-center shadow-[var(--shadow-card)]"
    >
      <AlertIcon size={32} className="text-[var(--color-attention)]" />
      <h2 className="text-lg font-semibold leading-7 text-[var(--color-text-strong)]">
        {title ?? t('state.accessDenied.title')}
      </h2>
      <p className="max-w-md text-sm leading-5 text-[var(--color-text)]">
        {description ?? t('state.accessDenied.description')}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          data-testid="back-button"
          onClick={handleBack}
          className="min-h-[44px] rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold leading-5 text-[var(--color-on-primary)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          {t('state.accessDenied.back')}
        </button>
        {onSignOut !== undefined && (
          <button
            type="button"
            data-testid="sign-out-button"
            onClick={onSignOut}
            className="min-h-[44px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold leading-5 text-[var(--color-text)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] hover:bg-[var(--color-page)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            {t('state.accessDenied.signOut')}
          </button>
        )}
      </div>
    </section>
  );
}
