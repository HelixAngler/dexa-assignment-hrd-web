import { AlertIcon } from '../icons';
import { useI18n } from '../../i18n/provider';

/** Filled action styling, for a block that replaces the screen's content. */
const primaryActionClassName =
  'min-h-[44px] rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold leading-5 text-[var(--color-on-primary)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]';

/** Outlined action styling, for a screen that still shows its own primary. */
const secondaryActionClassName =
  'min-h-[44px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold leading-5 text-[var(--color-text)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] hover:bg-[var(--color-page)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]';

export interface ServerErrorStateProps {
  /** Called when the user asks to retry the failed load. */
  onRetry?: () => void;
  /** Overrides the headline; defaults to the active-language copy. */
  title?: string;
  /** Overrides the body copy; defaults to the active-language copy. */
  description?: string;
  /**
   * Weight of the retry action. A screen that still shows its own filled
   * primary action passes 'secondary', so the block never puts a second
   * filled button beside it; a block that replaces the screen's content
   * keeps the default and stays the only action on view.
   */
  actionVariant?: 'primary' | 'secondary';
}

/**
 * Shown when a request fails. The copy explicitly reassures the user that no
 * data changed, and a retry button offers the way forward. The tinted block
 * reserves a fixed minimum height, and the headline sits on the light tint so
 * it stays well above the contrast floor.
 */
export default function ServerErrorState({
  onRetry,
  title,
  description,
  actionVariant = 'primary',
}: ServerErrorStateProps) {
  const { t } = useI18n();

  const retryClassName =
    actionVariant === 'secondary'
      ? secondaryActionClassName
      : primaryActionClassName;

  return (
    <section
      data-testid="server-error-state"
      role="alert"
      className="mx-auto flex min-h-[240px] w-full max-w-[48ch] flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-danger-bg)] px-4 py-8 text-center shadow-[var(--shadow-card)]"
    >
      <AlertIcon size={32} className="text-[var(--color-danger)]" />
      <h2 className="text-lg font-semibold leading-7 text-[var(--color-text-strong)]">
        {title ?? t('state.serverError.title')}
      </h2>
      <p className="max-w-md text-sm leading-5 text-[var(--color-text)]">
        {description ?? t('state.serverError.description')}
      </p>
      <button
        type="button"
        data-testid="retry-button"
        onClick={() => onRetry?.()}
        className={retryClassName}
      >
        {t('state.serverError.retry')}
      </button>
    </section>
  );
}
