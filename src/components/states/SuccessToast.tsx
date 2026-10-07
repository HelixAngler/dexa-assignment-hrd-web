import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
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
      className="fixed left-1/2 top-4 z-50 flex w-[min(92vw,420px)] -translate-x-1/2 items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 shadow-lg"
    >
      <span
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white"
      >
        ✓
      </span>
      <span className="flex-1 text-sm font-medium text-green-900">
        {message}
      </span>
      <button
        type="button"
        data-testid="success-toast-dismiss"
        aria-label={t('state.success.dismiss')}
        onClick={dismiss}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-green-800 hover:bg-green-100"
      >
        <span aria-hidden="true">✕</span>
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
