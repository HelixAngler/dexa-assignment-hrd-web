import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { CheckIcon, CloseIcon } from '../icons';
import { useI18n } from '../../i18n/provider';

/** Auto-dismiss delay for success toasts. */
export const SUCCESS_TOAST_DURATION_MS = 4000;

export interface SuccessToastProps {
  /** Confirmation copy; pass a `t()` result so it follows the active language. */
  message: string;
  /** Notified when the toast dismisses (auto or manual). */
  onDismiss?: () => void;
  /** Override the auto-dismiss delay in milliseconds. */
  durationMs?: number;
}

/**
 * Success confirmation toast, fixed near the top of the viewport so callers
 * do not need a placement container. It auto-dismisses, is announced through
 * `role="status"`, and can be dismissed manually.
 */
export default function SuccessToast({
  message,
  onDismiss,
  durationMs = SUCCESS_TOAST_DURATION_MS,
}: SuccessToastProps) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
  }, [message]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [visible, message, durationMs, onDismiss]);

  if (!visible) {
    return null;
  }

  const dismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  return (
    <div
      data-testid="success-toast"
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-4 z-50 flex w-[min(92vw,420px)] -translate-x-1/2 items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-success)] bg-[var(--color-success-bg)] px-4 py-3 shadow-[var(--shadow-raised)]"
    >
      <span
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-success)] text-[var(--color-on-primary)]"
      >
        <CheckIcon size={14} />
      </span>
      <span className="min-w-0 flex-1 break-words text-sm font-medium text-[var(--color-text-strong)]">
        {message}
      </span>
      <button
        type="button"
        data-testid="success-toast-dismiss"
        aria-label={t('state.success.dismiss')}
        onClick={dismiss}
        className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-strong)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] hover:bg-[var(--color-border)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
      >
        <CloseIcon size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export interface UseSuccessToast {
  /** Current message, or `null` when nothing is shown. */
  message: string | null;
  /** Whether a toast is currently shown. */
  isOpen: boolean;
  /** Show (or replace) the success toast. */
  show: (message: string) => void;
  /** Dismiss the toast early. */
  dismiss: () => void;
  /** Ready-made toast element; place it anywhere inside the provider tree. */
  toast: ReactNode;
}

/**
 * Owns success-toast state so callers only pick where the toast appears:
 * render `toast` (e.g. at the end of a page) and call `show(t('...'))`
 * after a successful action.
 */
export function useSuccessToast(
  durationMs: number = SUCCESS_TOAST_DURATION_MS,
): UseSuccessToast {
  const [message, setMessage] = useState<string | null>(null);

  const show = useCallback((next: string) => setMessage(next), []);
  const dismiss = useCallback(() => setMessage(null), []);

  const toast =
    message === null ? null : (
      <SuccessToast
        message={message}
        onDismiss={dismiss}
        durationMs={durationMs}
      />
    );

  return {
    message,
    isOpen: message !== null,
    show,
    dismiss,
    toast,
  };
}
