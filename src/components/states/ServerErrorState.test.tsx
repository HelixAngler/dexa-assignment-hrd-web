import type { ReactElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../../i18n/id';
import { I18nProvider } from '../../i18n/provider';
import ServerErrorState from './ServerErrorState';

function renderError(ui: ReactElement = <ServerErrorState />) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('ServerErrorState', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('announces the Indonesian error copy stating that no data changed', () => {
    renderError();

    const state = screen.getByTestId('server-error-state');
    expect(state).toHaveAttribute('role', 'alert');
    expect(screen.getByText(id['state.serverError.title'])).toBeInTheDocument();
    expect(
      screen.getByText(id['state.serverError.description']),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: id['state.serverError.retry'] }),
    ).toBeInTheDocument();
  });

  it('renders the English copy when English is the stored language', () => {
    window.localStorage.setItem('lang', 'en');
    renderError();

    expect(screen.getByText('Server error')).toBeInTheDocument();
    expect(screen.getByText('No data was changed. Please try again.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Retry' }),
    ).toBeInTheDocument();
  });

  it('fires onRetry when the retry button is clicked', () => {
    const onRetry = vi.fn();
    renderError(<ServerErrorState onRetry={onRetry} />);

    fireEvent.click(screen.getByTestId('retry-button'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not throw when retry is clicked without a handler', () => {
    renderError();

    expect(() => fireEvent.click(screen.getByTestId('retry-button'))).not.toThrow();
  });

  it('allows overriding title and description', () => {
    renderError(
      <ServerErrorState title="Judul khusus" description="Deskripsi khusus" />,
    );

    expect(screen.getByText('Judul khusus')).toBeInTheDocument();
    expect(screen.getByText('Deskripsi khusus')).toBeInTheDocument();
  });
});
