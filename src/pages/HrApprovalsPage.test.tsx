import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '../i18n/en';
import { id } from '../i18n/id';
import { I18nProvider, LanguageToggle } from '../i18n/provider';
import * as hrAccessService from '../services/hrAccess';
import HrApprovalsPage from './HrApprovalsPage';

vi.mock('../services/hrAccess', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/hrAccess')>();
  return { ...actual, listHrAccessRequests: vi.fn() };
});

function renderApprovals() {
  return render(
    <I18nProvider>
      <LanguageToggle />
      <MemoryRouter initialEntries={['/approvals']}>
        <HrApprovalsPage />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('HrApprovalsPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(hrAccessService.listHrAccessRequests).mockReset();
    vi.mocked(hrAccessService.listHrAccessRequests).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('owns the section heading above the approval section', async () => {
    renderApprovals();

    expect(screen.getByTestId('hr-approvals')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: id['karyawan.approval.title'] }),
    ).toBeInTheDocument();
    expect(screen.getByText(id['karyawan.approval.subtitle'])).toBeInTheDocument();
    expect(await screen.findByTestId('approval-section')).toBeInTheDocument();
  });

  it('switches the heading and the subtitle to English', async () => {
    const user = userEvent.setup();
    renderApprovals();
    await screen.findByTestId('approval-section');

    await user.click(screen.getByTestId('lang-toggle'));

    expect(
      screen.getByRole('heading', { name: en['karyawan.approval.title'] }),
    ).toBeInTheDocument();
    expect(screen.queryByText(id['karyawan.approval.title'])).toBeNull();
    expect(screen.getByText(en['karyawan.approval.subtitle'])).toBeInTheDocument();
    expect(screen.queryByText(id['karyawan.approval.subtitle'])).toBeNull();
    expect(window.localStorage.getItem('lang')).toBe('en');
  });
});
