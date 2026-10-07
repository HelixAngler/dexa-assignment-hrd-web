import type { ReactElement } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../../i18n/id';
import { I18nProvider } from '../../i18n/provider';
import SuccessToast, {
  SUCCESS_TOAST_DURATION_MS,
  useSuccessToast,
} from './SuccessToast';

function renderToast(ui: ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

function HookProbe() {
  const { isOpen, show, dismiss, toast } = useSuccessToast();
  return (
    <div>
      <span data-testid="is-open">{String(isOpen)}</span>
      <button type="button" data-testid="show" onClick={() => show('Tersimpan')}>
        show
      </button>
      <button type="button" data-testid="dismiss" onClick={dismiss}>
        dismiss
      </button>
      {toast}
    </div>
  );
}

describe('SuccessToast', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the message in a polite status region with a dismiss control', () => {
    renderToast(<SuccessToast message="Perubahan berhasil disimpan." />);

    const toast = screen.getByRole('status');
    expect(toast).toHaveTextContent('Perubahan berhasil disimpan.');
    expect(
      screen.getByRole('button', { name: id['state.success.dismiss'] }),
    ).toBeInTheDocument();
  });

  it('auto-dismisses after the default four seconds and notifies', () => {
    const onDismiss = vi.fn();
    renderToast(
      <SuccessToast message="Berhasil" onDismiss={onDismiss} />,
    );
    expect(screen.getByTestId('success-toast')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(SUCCESS_TOAST_DURATION_MS);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('success-toast')).not.toBeInTheDocument();
  });

  it('honours a custom auto-dismiss duration', () => {
    const onDismiss = vi.fn();
    renderToast(
      <SuccessToast message="Berhasil" onDismiss={onDismiss} durationMs={1000} />,
    );

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses when the dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    renderToast(<SuccessToast message="Berhasil" onDismiss={onDismiss} />);

    fireEvent.click(screen.getByTestId('success-toast-dismiss'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('success-toast')).not.toBeInTheDocument();
  });

  it('stays visible before the timer elapses', () => {
    renderToast(<SuccessToast message="Berhasil" />);

    act(() => {
      vi.advanceTimersByTime(SUCCESS_TOAST_DURATION_MS - 1);
    });

    expect(screen.getByTestId('success-toast')).toBeInTheDocument();
  });

  it('useSuccessToast shows, then auto-dismisses, the toast', () => {
    renderToast(<HookProbe />);

    expect(screen.getByTestId('is-open')).toHaveTextContent('false');
    expect(screen.queryByTestId('success-toast')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('show'));

    expect(screen.getByTestId('is-open')).toHaveTextContent('true');
    expect(screen.getByTestId('success-toast')).toHaveTextContent('Tersimpan');

    act(() => {
      vi.advanceTimersByTime(SUCCESS_TOAST_DURATION_MS);
    });

    expect(screen.getByTestId('is-open')).toHaveTextContent('false');
    expect(screen.queryByTestId('success-toast')).not.toBeInTheDocument();
  });

  it('useSuccessToast dismisses early on demand', () => {
    renderToast(<HookProbe />);

    fireEvent.click(screen.getByTestId('show'));
    expect(screen.getByTestId('success-toast')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('dismiss'));

    expect(screen.queryByTestId('success-toast')).not.toBeInTheDocument();
    expect(screen.getByTestId('is-open')).toHaveTextContent('false');
  });
});
