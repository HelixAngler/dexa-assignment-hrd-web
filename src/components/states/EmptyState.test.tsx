import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { id } from '../../i18n/id';
import { I18nProvider } from '../../i18n/provider';
import EmptyState from './EmptyState';

function renderEmpty(ui: ReactElement = <EmptyState />) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('EmptyState', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('explains the empty result in Indonesian by default', () => {
    renderEmpty();

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText(id['state.empty.title'])).toBeInTheDocument();
    expect(
      screen.getByText(id['state.empty.description']),
    ).toBeInTheDocument();
    expect(screen.getByTestId('empty-state-default-icon')).toBeInTheDocument();
  });

  it('renders the English copy when English is the stored language', () => {
    window.localStorage.setItem('lang', 'en');
    renderEmpty();

    expect(screen.getByText('No data yet')).toBeInTheDocument();
    expect(
      screen.getByText('There is nothing to show here yet.'),
    ).toBeInTheDocument();
  });

  it('renders a caller-provided icon slot', () => {
    renderEmpty(
      <EmptyState icon={<span data-testid="custom-icon">★</span>} />,
    );

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state-default-icon')).not.toBeInTheDocument();
  });

  it('uses caller-provided title and description when given', () => {
    renderEmpty(<EmptyState title="Tidak ada karyawan" description="Ubah filter." />);

    expect(screen.getByText('Tidak ada karyawan')).toBeInTheDocument();
    expect(screen.getByText('Ubah filter.')).toBeInTheDocument();
  });

  it('renders an optional action slot', () => {
    renderEmpty(<EmptyState action={<button type="button">Tambah</button>} />);

    expect(screen.getByRole('button', { name: 'Tambah' })).toBeInTheDocument();
  });
});
