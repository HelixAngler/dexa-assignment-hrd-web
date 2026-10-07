import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { id } from '../../i18n/id';
import { I18nProvider } from '../../i18n/provider';
import LoadingState from './LoadingState';

function renderLoading(ui: ReactElement = <LoadingState />) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('LoadingState', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders skeleton blocks with stable dimensions instead of a spinner', () => {
    renderLoading();

    const state = screen.getByTestId('loading-state');
    expect(state).toHaveAttribute('role', 'status');
    expect(state).toHaveAttribute('aria-busy', 'true');

    const title = screen.getByTestId('loading-skeleton-title');
    expect(title).toHaveClass('h-6', 'w-48');

    const rows = screen.getAllByTestId('loading-skeleton-row');
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row).toHaveClass('h-4', 'w-full');
    }

    expect(screen.getByTestId('loading-skeleton-caption')).toHaveClass(
      'h-4',
      'w-2/3',
    );
  });

  it('labels the region with the Indonesian loading copy by default', () => {
    renderLoading();

    expect(screen.getByTestId('loading-state')).toHaveAccessibleName(
      id['state.loading.title'],
    );
  });

  it('labels the region with the English copy when English is stored', () => {
    window.localStorage.setItem('lang', 'en');
    renderLoading();

    expect(screen.getByTestId('loading-state')).toHaveAccessibleName(
      'Loading data…',
    );
  });

  it('reserves fewer rows when a smaller rows count is requested', () => {
    renderLoading(<LoadingState rows={1} />);

    expect(screen.getAllByTestId('loading-skeleton-row')).toHaveLength(1);
  });

  it('accepts a custom accessible label', () => {
    renderLoading(<LoadingState label="Memuat absensi" />);

    expect(screen.getByTestId('loading-state')).toHaveAccessibleName(
      'Memuat absensi',
    );
  });
});
