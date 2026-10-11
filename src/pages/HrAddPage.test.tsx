import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '../i18n/en';
import { id } from '../i18n/id';
import { I18nProvider, LanguageToggle } from '../i18n/provider';
import { ApiError } from '../services/api';
import * as hrAccessService from '../services/hrAccess';
import HrAddPage from './HrAddPage';

vi.mock('../services/hrAccess', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/hrAccess')>();
  return { ...actual, createHrAccessRequest: vi.fn() };
});

function renderAdd() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/hr/add']}>
        <Routes>
          <Route path="/hr/add" element={<HrAddPage />} />
          <Route
            path="/approvals"
            element={<div data-testid="approvals-destination">approvals</div>}
          />
          <Route
            path="/hr"
            element={<div data-testid="hr-accounts-stub">accounts</div>}
          />
        </Routes>
      </MemoryRouter>
      <LanguageToggle />
    </I18nProvider>,
  );
}

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(id['form.name']), 'Dewi Lestari');
  await user.type(screen.getByLabelText(id['form.email']), 'dewi@corp.test');
  await user.type(screen.getByLabelText(id['form.position']), 'HR Officer');
  await user.type(screen.getByLabelText(id['form.phone']), '081200000009');
}

describe('HrAddPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(hrAccessService.createHrAccessRequest).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the proposal screen with the four profile fields and no password input', () => {
    renderAdd();

    expect(screen.getByTestId('hr-add')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: id['hr.add.title'] }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(id['form.name'])).toHaveAttribute('id', 'hr-add-name');
    expect(screen.getByLabelText(id['form.email'])).toHaveAttribute('id', 'hr-add-email');
    expect(screen.getByLabelText(id['form.position'])).toHaveAttribute(
      'id',
      'hr-add-position',
    );
    expect(screen.getByLabelText(id['form.phone'])).toHaveAttribute(
      'id',
      'hr-add-phone',
    );
  });

  it('never offers password material of any kind before the proposal is approved', () => {
    renderAdd();

    expect(screen.queryByRole('textbox', { name: /kata sandi|password/i })).toBeNull();
    expect(screen.queryByText(id['karyawan.add.passwordLabel'])).toBeNull();
    expect(screen.queryByTestId('temporary-password')).toBeNull();
    expect(
      screen.getByRole('button', { name: id['hr.add.submit'] }),
    ).toBeInTheDocument();
  });

  it('blocks an empty submit with per-field errors before any request', async () => {
    const user = userEvent.setup();
    renderAdd();

    await user.click(screen.getByTestId('hr-add-submit'));

    expect(screen.getByTestId('hr-add-error-name')).toHaveTextContent(
      id['form.error.required'],
    );
    expect(screen.getByTestId('hr-add-error-email')).toHaveTextContent(
      id['form.error.required'],
    );
    expect(screen.getByTestId('hr-add-error-position')).toHaveTextContent(
      id['form.error.required'],
    );
    expect(screen.getByTestId('hr-add-error-phone')).toHaveTextContent(
      id['form.error.required'],
    );
    expect(hrAccessService.createHrAccessRequest).not.toHaveBeenCalled();
  });

  it('posts the add_hr proposal with the four fields and switches to the pending card', async () => {
    const user = userEvent.setup();
    vi.mocked(hrAccessService.createHrAccessRequest).mockResolvedValue({
      id: 'req-1',
      type: 'add_hr',
      state: 'pending',
      proposedName: 'Dewi Lestari',
      proposedEmail: 'dewi@corp.test',
      proposedPosition: 'HR Officer',
      proposedPhone: '081200000009',
      targetEmployeeId: null,
      target: null,
      maker: { id: 'hr-self', name: 'Ivan Pratama', email: 'ivan@corp.test' },
      checker: null,
      decisionNote: null,
      decidedAt: null,
      createdAt: '2026-10-10T08:00:00.000Z',
      updatedAt: '2026-10-10T08:00:00.000Z',
      canDecide: false,
    });
    renderAdd();

    await fillForm(user);
    await user.click(screen.getByTestId('hr-add-submit'));

    expect(hrAccessService.createHrAccessRequest).toHaveBeenCalledWith({
      type: 'add_hr',
      name: 'Dewi Lestari',
      email: 'dewi@corp.test',
      position: 'HR Officer',
      phone: '081200000009',
    });

    const pending = await screen.findByTestId('hr-add-pending');
    expect(pending).toHaveTextContent(id['hr.add.pendingTitle']);
    expect(pending).toHaveTextContent(id['hr.add.pendingDescription']);
    expect(screen.queryByRole('form')).toBeNull();
    expect(screen.queryByTestId('temporary-password')).toBeNull();

    const link = screen.getByTestId('hr-add-open-approvals');
    expect(link).toHaveAttribute('href', '/approvals');
    expect(link).toHaveTextContent(id['hr.add.pendingOpenApprovals']);
  });

  it('keeps the typed values and flags the address on a 409 EMAIL_TAKEN answer', async () => {
    const user = userEvent.setup();
    vi.mocked(hrAccessService.createHrAccessRequest).mockRejectedValue(
      new ApiError(409, 'EMAIL_TAKEN', 'already used'),
    );
    renderAdd();

    await fillForm(user);
    await user.click(screen.getByTestId('hr-add-submit'));

    expect(await screen.findByTestId('hr-add-error-email')).toHaveTextContent(
      id['form.error.emailTaken'],
    );
    expect(screen.getByLabelText(id['form.name'])).toHaveValue('Dewi Lestari');
    expect(screen.queryByTestId('hr-add-pending')).not.toBeInTheDocument();
  });

  it('hands a failed proposal to the shared server-error state and retries it', async () => {
    const user = userEvent.setup();
    vi.mocked(hrAccessService.createHrAccessRequest)
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL', 'boom'))
      .mockResolvedValueOnce({
        id: 'req-2',
        type: 'add_hr',
        state: 'pending',
        proposedName: 'Dewi Lestari',
        proposedEmail: 'dewi@corp.test',
        proposedPosition: 'HR Officer',
        proposedPhone: '081200000009',
        targetEmployeeId: null,
        target: null,
        maker: { id: 'hr-self', name: 'Ivan Pratama', email: 'ivan@corp.test' },
        checker: null,
        decisionNote: null,
        decidedAt: null,
        createdAt: '2026-10-10T08:00:00.000Z',
        updatedAt: '2026-10-10T08:00:00.000Z',
        canDecide: false,
      });
    renderAdd();

    await fillForm(user);
    await user.click(screen.getByTestId('hr-add-submit'));

    expect(await screen.findByTestId('server-error-state')).toBeInTheDocument();

    await user.click(screen.getByTestId('retry-button'));

    expect(await screen.findByTestId('hr-add-pending')).toBeInTheDocument();
    expect(hrAccessService.createHrAccessRequest).toHaveBeenCalledTimes(2);
  });

  it('switches the proposal screen to English', async () => {
    const user = userEvent.setup();
    renderAdd();

    expect(
      screen.getByRole('heading', { name: id['hr.add.title'] }),
    ).toBeInTheDocument();

    await user.click(screen.getByTestId('lang-toggle'));

    expect(
      screen.getByRole('heading', { name: en['hr.add.title'] }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: en['hr.add.submit'] }),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem('lang')).toBe('en');
  });
});
