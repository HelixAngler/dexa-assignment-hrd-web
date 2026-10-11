import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '../i18n/en';
import { id } from '../i18n/id';
import { I18nProvider, LanguageToggle } from '../i18n/provider';
import { ApiError } from '../services/api';
import * as employeesService from '../services/employees';
import * as hrAccessService from '../services/hrAccess';
import type { HrAccessRequest } from '../services/hrAccess';
import HrEditPage from './HrEditPage';

vi.mock('../services/employees', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/employees')>();
  return { ...actual, fetchEmployeeRecord: vi.fn() };
});

vi.mock('../services/hrAccess', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/hrAccess')>();
  return {
    ...actual,
    listHrAccessRequests: vi.fn(),
    createHrAccessRequest: vi.fn(),
  };
});

const stored: employeesService.EmployeeRecord = {
  id: 'emp-hrd-1',
  name: 'Sari Wati',
  email: 'sari@corp.test',
  position: 'HR Officer',
  status: 'active',
  role: 'hrd',
  phone: '0812-0000-0001',
};

/** A pending proposal already pointing at the account under edit. */
const pendingUpdate: HrAccessRequest = {
  id: 'req-pending',
  type: 'update_hr',
  state: 'pending',
  proposedName: 'Sari W.',
  proposedEmail: null,
  proposedPosition: 'HR Officer',
  proposedPhone: '0812-0000-0001',
  targetEmployeeId: stored.id,
  target: {
    id: stored.id,
    name: stored.name,
    email: stored.email,
    status: 'active',
  },
  maker: { id: 'hr-self', name: 'Ivan Pratama', email: 'ivan@corp.test' },
  checker: null,
  decisionNote: null,
  decidedAt: null,
  createdAt: '2026-10-10T08:00:00.000Z',
  updatedAt: '2026-10-10T08:00:00.000Z',
  canDecide: false,
};

/** A pending reactivation proposal already pointing at the account. */
const pendingReactivate: HrAccessRequest = {
  id: 'req-reactivate',
  type: 'reactivate_hr',
  state: 'pending',
  proposedName: null,
  proposedEmail: null,
  proposedPosition: null,
  proposedPhone: null,
  targetEmployeeId: stored.id,
  target: {
    id: stored.id,
    name: stored.name,
    email: stored.email,
    status: 'deactivated',
  },
  maker: { id: 'hr-self', name: 'Ivan Pratama', email: 'ivan@corp.test' },
  checker: null,
  decisionNote: null,
  decidedAt: null,
  createdAt: '2026-10-10T09:00:00.000Z',
  updatedAt: '2026-10-10T09:00:00.000Z',
  canDecide: false,
};

function renderEdit() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/hr/emp-hrd-1/edit']}>
        <Routes>
          <Route path="/hr/:id/edit" element={<HrEditPage />} />
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

async function changeName(user: ReturnType<typeof userEvent.setup>) {
  const name = screen.getByLabelText(id['form.name']);
  await user.clear(name);
  await user.type(name, 'Sari Wati Utami');
}

describe('HrEditPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(employeesService.fetchEmployeeRecord).mockReset();
    vi.mocked(employeesService.fetchEmployeeRecord).mockResolvedValue(stored);
    vi.mocked(hrAccessService.listHrAccessRequests).mockReset();
    vi.mocked(hrAccessService.listHrAccessRequests).mockResolvedValue([]);
    vi.mocked(hrAccessService.createHrAccessRequest).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the account and prefills the form, with the address read-only', async () => {
    renderEdit();

    expect(await screen.findByLabelText(id['form.name'])).toHaveValue('Sari Wati');
    expect(screen.getByLabelText(id['form.position'])).toHaveValue('HR Officer');
    expect(screen.getByLabelText(id['form.phone'])).toHaveValue('0812-0000-0001');

    const email = screen.getByLabelText(id['form.email']);
    expect(email).toHaveValue('sari@corp.test');
    expect(email).toHaveAttribute('readonly');
    expect(employeesService.fetchEmployeeRecord).toHaveBeenCalledWith('emp-hrd-1');
  });

  it('offers no way to change the address on the screen', async () => {
    const user = userEvent.setup();
    renderEdit();
    await screen.findByLabelText(id['form.name']);

    await user.type(screen.getByLabelText(id['form.email']), 'x');

    expect(screen.getByLabelText(id['form.email'])).toHaveValue('sari@corp.test');
  });

  it('shows the not-found state and routes back to the directory', async () => {
    const user = userEvent.setup();
    vi.mocked(employeesService.fetchEmployeeRecord).mockResolvedValue(null);
    renderEdit();

    expect(await screen.findByText(id['hr.edit.notFoundTitle'])).toBeInTheDocument();

    await user.click(screen.getByTestId('not-found-back'));

    expect(await screen.findByTestId('hr-accounts-stub')).toBeInTheDocument();
  });

  it('hands a failed load to the shared server-error state and retries it', async () => {
    const user = userEvent.setup();
    vi.mocked(employeesService.fetchEmployeeRecord)
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL', 'boom'))
      .mockResolvedValueOnce(stored);
    renderEdit();

    expect(await screen.findByTestId('server-error-state')).toBeInTheDocument();

    await user.click(screen.getByTestId('retry-button'));

    expect(await screen.findByLabelText(id['form.name'])).toHaveValue('Sari Wati');
    expect(employeesService.fetchEmployeeRecord).toHaveBeenCalledTimes(2);
  });

  it('refuses an empty profile save before any request', async () => {
    const user = userEvent.setup();
    renderEdit();
    await screen.findByLabelText(id['form.name']);

    const name = screen.getByLabelText(id['form.name']);
    await user.clear(name);
    await user.click(screen.getByTestId('hr-edit-save'));

    expect(screen.getByTestId('hr-edit-error-name')).toHaveTextContent(
      id['form.error.required'],
    );
    expect(hrAccessService.createHrAccessRequest).not.toHaveBeenCalled();
  });

  it('files an update_hr proposal with only the changed columns and lists it as pending', async () => {
    const user = userEvent.setup();
    vi.mocked(hrAccessService.createHrAccessRequest).mockResolvedValue({
      ...pendingUpdate,
      proposedName: 'Sari Wati Utami',
    });
    vi.mocked(hrAccessService.listHrAccessRequests)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([pendingUpdate]);
    renderEdit();
    await screen.findByLabelText(id['form.name']);

    await changeName(user);
    await user.click(screen.getByTestId('hr-edit-save'));

    await waitFor(() =>
      expect(hrAccessService.createHrAccessRequest).toHaveBeenCalledWith({
        type: 'update_hr',
        targetEmployeeId: 'emp-hrd-1',
        name: 'Sari Wati Utami',
      }),
    );

    const pending = await screen.findByTestId('hr-edit-pending');
    expect(pending).toHaveTextContent(id['hr.edit.pendingTitle']);
    expect(within(pending).getByText(id['karyawan.approval.type.update_hr'])).toBeInTheDocument();
    expect(screen.getByTestId('hr-edit-save')).toBeDisabled();
    expect(screen.getByTestId('hr-edit-status-apply')).toBeDisabled();
    expect(screen.getByTestId('hr-edit-reset')).toBeDisabled();
  });

  it('sends every edited column when more than one changes', async () => {
    const user = userEvent.setup();
    vi.mocked(hrAccessService.createHrAccessRequest).mockResolvedValue(pendingUpdate);
    vi.mocked(hrAccessService.listHrAccessRequests)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([pendingUpdate]);
    renderEdit();
    await screen.findByLabelText(id['form.name']);

    await changeName(user);
    await user.clear(screen.getByLabelText(id['form.phone']));
    await user.type(screen.getByLabelText(id['form.phone']), '081200000002');
    await user.click(screen.getByTestId('hr-edit-save'));

    await waitFor(() =>
      expect(hrAccessService.createHrAccessRequest).toHaveBeenCalledWith({
        type: 'update_hr',
        targetEmployeeId: 'emp-hrd-1',
        name: 'Sari Wati Utami',
        phone: '081200000002',
      }),
    );
  });

  it('states that an untouched form has nothing to send', async () => {
    const user = userEvent.setup();
    renderEdit();
    await screen.findByLabelText(id['form.name']);

    await user.click(screen.getByTestId('hr-edit-save'));

    expect(await screen.findByTestId('hr-edit-no-changes')).toHaveTextContent(
      id['hr.edit.noChanges'],
    );
    expect(hrAccessService.createHrAccessRequest).not.toHaveBeenCalled();
  });

  it('confirms the deactivation proposal and files it once accepted', async () => {
    const user = userEvent.setup();
    vi.mocked(hrAccessService.createHrAccessRequest).mockResolvedValue({
      ...pendingUpdate,
      id: 'req-deact',
      type: 'deactivate_hr',
      proposedName: null,
      proposedPosition: null,
      proposedPhone: null,
    });
    vi.mocked(hrAccessService.listHrAccessRequests)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...pendingUpdate, type: 'deactivate_hr', proposedName: null }]);
    renderEdit();
    await screen.findByLabelText(id['form.name']);

    expect(screen.getByTestId('hr-edit-status-apply')).toBeDisabled();
    await user.click(
      screen.getByRole('radio', { name: id['karyawan.status.deactivated'] }),
    );
    expect(screen.getByTestId('hr-edit-status-apply')).toBeEnabled();

    await user.click(screen.getByTestId('hr-edit-status-apply'));

    const confirm = screen.getByTestId('hr-edit-confirm');
    expect(confirm).toHaveTextContent(id['hr.edit.statusConfirmTitle']);
    expect(confirm).toHaveTextContent(id['hr.edit.statusConfirmBody']);
    expect(hrAccessService.createHrAccessRequest).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('hr-edit-confirm-cancel'));
    expect(screen.queryByTestId('hr-edit-confirm')).toBeNull();
    expect(hrAccessService.createHrAccessRequest).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('hr-edit-status-apply'));
    await user.click(screen.getByTestId('hr-edit-confirm-yes'));

    await waitFor(() =>
      expect(hrAccessService.createHrAccessRequest).toHaveBeenCalledWith({
        type: 'deactivate_hr',
        targetEmployeeId: 'emp-hrd-1',
      }),
    );
    expect(await screen.findByTestId('hr-edit-pending')).toBeInTheDocument();
  });

  it('offers the reactivation action on a deactivated account instead of any status flow', async () => {
    vi.mocked(employeesService.fetchEmployeeRecord).mockResolvedValue({
      ...stored,
      status: 'deactivated',
    });
    renderEdit();

    expect(await screen.findByTestId('hr-edit-reactivate')).toHaveTextContent(
      id['hr.edit.reactivateAction'],
    );
    expect(screen.queryByTestId('hr-edit-status-idle')).toBeNull();
    expect(screen.queryByTestId('hr-edit-status-apply')).toBeNull();
    expect(
      screen.queryByRole('radio', { name: id['karyawan.status.active'] }),
    ).toBeNull();
    expect(
      screen.queryByRole('radio', { name: id['karyawan.status.deactivated'] }),
    ).toBeNull();
    expect(screen.getByTestId('hr-edit-reactivate')).toBeEnabled();
  });

  it('asks before filing a reactivation and a cancel sends nothing', async () => {
    const user = userEvent.setup();
    vi.mocked(employeesService.fetchEmployeeRecord).mockResolvedValue({
      ...stored,
      status: 'deactivated',
    });
    renderEdit();
    await screen.findByTestId('hr-edit-reactivate');

    await user.click(screen.getByTestId('hr-edit-reactivate'));

    const confirm = screen.getByTestId('hr-edit-confirm');
    expect(confirm).toHaveTextContent(id['hr.edit.reactivateConfirmTitle']);
    expect(confirm).toHaveTextContent(id['hr.edit.reactivateConfirmBody']);
    expect(
      within(confirm).getByTestId('hr-edit-confirm-yes'),
    ).toHaveTextContent(id['hr.edit.reactivateConfirm']);
    expect(hrAccessService.createHrAccessRequest).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('hr-edit-confirm-cancel'));
    expect(screen.queryByTestId('hr-edit-confirm')).toBeNull();
    expect(hrAccessService.createHrAccessRequest).not.toHaveBeenCalled();
  });

  it('files a reactivate_hr proposal once confirmed and then shows the pending notice', async () => {
    const user = userEvent.setup();
    vi.mocked(employeesService.fetchEmployeeRecord).mockResolvedValue({
      ...stored,
      status: 'deactivated',
    });
    vi.mocked(hrAccessService.createHrAccessRequest).mockResolvedValue(
      pendingReactivate,
    );
    vi.mocked(hrAccessService.listHrAccessRequests)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([pendingReactivate]);
    renderEdit();
    await screen.findByTestId('hr-edit-reactivate');

    await user.click(screen.getByTestId('hr-edit-reactivate'));
    await user.click(screen.getByTestId('hr-edit-confirm-yes'));

    await waitFor(() =>
      expect(hrAccessService.createHrAccessRequest).toHaveBeenCalledWith({
        type: 'reactivate_hr',
        targetEmployeeId: 'emp-hrd-1',
      }),
    );
    expect(hrAccessService.createHrAccessRequest).toHaveBeenCalledTimes(1);

    const pending = await screen.findByTestId('hr-edit-pending');
    expect(
      within(pending).getByText(id['karyawan.approval.type.reactivate_hr']),
    ).toBeInTheDocument();
    expect(screen.getByTestId('hr-edit-reactivate')).toBeDisabled();
    // The status flips only when a checker approves; the screen never guesses.
    expect(screen.queryByTestId('hr-edit-status-apply')).toBeNull();
    expect(employeesService.fetchEmployeeRecord).toHaveBeenCalledTimes(1);
  });

  it('locks the reactivation behind a proposal that is already pending', async () => {
    vi.mocked(employeesService.fetchEmployeeRecord).mockResolvedValue({
      ...stored,
      status: 'deactivated',
    });
    vi.mocked(hrAccessService.listHrAccessRequests).mockResolvedValue([
      pendingReactivate,
    ]);
    renderEdit();

    expect(await screen.findByTestId('hr-edit-pending')).toBeInTheDocument();
    expect(screen.getByTestId('hr-edit-reactivate')).toBeDisabled();
  });

  it('confirms the reset proposal and never reveals a password on this screen', async () => {
    const user = userEvent.setup();
    vi.mocked(hrAccessService.createHrAccessRequest).mockResolvedValue({
      ...pendingUpdate,
      id: 'req-reset',
      type: 'reset_password',
      proposedName: null,
      proposedPosition: null,
      proposedPhone: null,
    });
    vi.mocked(hrAccessService.listHrAccessRequests)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...pendingUpdate, type: 'reset_password', proposedName: null }]);
    renderEdit();
    await screen.findByLabelText(id['form.name']);

    await user.click(screen.getByTestId('hr-edit-reset'));

    const confirm = screen.getByTestId('hr-edit-confirm');
    expect(confirm).toHaveTextContent(id['hr.edit.resetConfirmTitle']);
    expect(
      within(confirm).getByTestId('hr-edit-confirm-yes'),
    ).toHaveTextContent(id['hr.edit.resetConfirm']);

    await user.click(screen.getByTestId('hr-edit-confirm-yes'));

    await waitFor(() =>
      expect(hrAccessService.createHrAccessRequest).toHaveBeenCalledWith({
        type: 'reset_password',
        targetEmployeeId: 'emp-hrd-1',
      }),
    );

    await screen.findByTestId('hr-edit-pending');
    expect(screen.queryByText(/Temp[A-Z]/)).toBeNull();
    expect(screen.queryByTestId('temporary-password')).toBeNull();
  });

  it('lists a proposal that is already pending and locks every action', async () => {
    vi.mocked(hrAccessService.listHrAccessRequests).mockResolvedValue([
      pendingUpdate,
    ]);
    renderEdit();

    expect(await screen.findByTestId('hr-edit-pending')).toBeInTheDocument();
    expect(screen.getByTestId('hr-edit-save')).toBeDisabled();
    expect(screen.getByTestId('hr-edit-status-apply')).toBeDisabled();
    expect(screen.getByTestId('hr-edit-reset')).toBeDisabled();
    expect(screen.getByLabelText(id['form.name'])).toBeDisabled();
    expect(
      within(screen.getByTestId('hr-edit-pending')).getByText(
        id['karyawan.approval.type.update_hr'],
      ),
    ).toBeInTheDocument();
  });

  it('switches the proposal screen to English', async () => {
    const user = userEvent.setup();
    renderEdit();
    await screen.findByLabelText(id['form.name']);

    expect(
      screen.getByRole('heading', { name: id['hr.edit.title'] }),
    ).toBeInTheDocument();

    await user.click(screen.getByTestId('lang-toggle'));

    expect(
      screen.getByRole('heading', { name: en['hr.edit.title'] }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('hr-edit-reset')).toHaveTextContent(
      en['hr.edit.resetAction'],
    );
    expect(window.localStorage.getItem('lang')).toBe('en');
  });
});
