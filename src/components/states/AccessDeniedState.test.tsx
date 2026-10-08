import type { ReactElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../../i18n/id';
import { I18nProvider } from '../../i18n/provider';
import AccessDeniedState from './AccessDeniedState';

function renderDenied(ui: ReactElement = <AccessDeniedState />) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('AccessDeniedState', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('explains the denial in Indonesian and offers a back button', () => {
    renderDenied();

    expect(screen.getByTestId('access-denied-state')).toBeInTheDocument();
    expect(screen.getByText(id['state.accessDenied.title'])).toBeInTheDocument();
    expect(
      screen.getByText(id['state.accessDenied.description']),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: id['state.accessDenied.back'] }),
    ).toBeInTheDocument();
  });

  it('renders the English copy when English is the stored language', () => {
    window.localStorage.setItem('lang', 'en');
    renderDenied();

    expect(screen.getByText('Access denied')).toBeInTheDocument();
    expect(
      screen.getByText('You do not have permission to view this page.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('fires onBack when provided', () => {
    const onBack = vi.fn();
    renderDenied(<AccessDeniedState onBack={onBack} />);

    fireEvent.click(screen.getByTestId('back-button'));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('falls back to browser history when no onBack is given', () => {
    const back = vi
      .spyOn(window.history, 'back')
      .mockImplementation(() => undefined);
    renderDenied();

    fireEvent.click(screen.getByTestId('back-button'));

    expect(back).toHaveBeenCalledTimes(1);
  });

  it('allows overriding title and description', () => {
    renderDenied(
      <AccessDeniedState title="Judul khusus" description="Deskripsi khusus" />,
    );

    expect(screen.getByText('Judul khusus')).toBeInTheDocument();
    expect(screen.getByText('Deskripsi khusus')).toBeInTheDocument();
  });

  it('renders no sign-out button unless a handler is given', () => {
    renderDenied();

    expect(screen.queryByTestId('sign-out-button')).not.toBeInTheDocument();
  });

  it('offers sign out and fires the handler', () => {
    const onSignOut = vi.fn();
    renderDenied(<AccessDeniedState onSignOut={onSignOut} />);

    fireEvent.click(screen.getByTestId('sign-out-button'));

    expect(screen.getByTestId('sign-out-button')).toHaveTextContent(
      id['state.accessDenied.signOut'],
    );
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
