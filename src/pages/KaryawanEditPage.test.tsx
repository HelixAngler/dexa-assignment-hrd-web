import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../i18n/id';
import { I18nProvider } from '../i18n/provider';
import { ApiError } from '../services/api';
import * as employeesService from '../services/employees';
import KaryawanEditPage from './KaryawanEditPage';

vi.mock('../services/employees', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/employees')>();
  return {
    ...actual,
    fetchEmployeeById: vi.fn(),
    updateEmployee: vi.fn(),
    setEmployeeStatus: vi.fn(),
    resetEmployeePassword: vi.fn(),
  };
});

const storedRow: employeesService.EmployeeSummary = {
  id: 'emp-1',
  name: 'Budi Santoso',
  email: 'budi@corp.test',
  position: 'Engineer',
  status: 'active',
};

function renderEdit() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/karyawan/emp-1/edit']}>
        <Routes>
          <Route path="/karyawan/:id/edit" element={<KaryawanEditPage />} />
          <Route
            path="/karyawan"
            element={<div data-testid="karyawan-list-stub">list</div>}
          />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );
}

async function fillName(user: ReturnType<typeof userEvent.setup>) {
  const name = screen.getByLabelText(id['form.name']);
  await user.clear(name);
  await user.type(name, 'Budi S.');
}

describe('KaryawanEditPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(employeesService.fetchEmployeeById).mockReset();
    vi.mocked(employeesService.fetchEmployeeById).mockResolvedValue(storedRow);
    vi.mocked(employeesService.updateEmployee).mockReset();
    vi.mocked(employeesService.updateEmployee).mockResolvedValue(undefined);
    vi.mocked(employeesService.setEmployeeStatus).mockReset();
    vi.mocked(employeesService.setEmployeeStatus).mockResolvedValue(undefined);
    vi.mocked(employeesService.resetEmployeePassword).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the employee and prefills the shared form', async () => {
    renderEdit();

    expect(await screen.findByTestId('karyawan-edit')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: id['karyawan.edit.title'] }),
    ).toBeInTheDocument();
    expect(
      await screen.findByDisplayValue('Budi Santoso'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(id['form.email'])).toHaveValue(
      'budi@corp.test',
    );
    expect(screen.getByLabelText(id['form.position'])).toHaveValue('Engineer');
    expect(employeesService.fetchEmployeeById).toHaveBeenCalledWith('emp-1');
  });

  it('shows the loading state while the row is fetched', () => {
    vi.mocked(employeesService.fetchEmployeeById).mockReturnValue(
      new Promise(() => {}),
    );
    renderEdit();

    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(screen.queryByTestId('employee-form')).not.toBeInTheDocument();
  });

  it('offers a retry when the load fails', async () => {
    const user = userEvent.setup();
    vi.mocked(employeesService.fetchEmployeeById).mockRejectedValueOnce(
      new ApiError(500, 'INTERNAL', 'boom'),
    );
    renderEdit();

    expect(await screen.findByTestId('server-error-state')).toBeInTheDocument();

    await user.click(screen.getByTestId('retry-button'));

    expect(await screen.findByTestId('employee-form')).toBeInTheDocument();
    expect(employeesService.fetchEmployeeById).toHaveBeenCalledTimes(2);
  });

  it('offers a way back when the row is gone', async () => {
    const user = userEvent.setup();
    vi.mocked(employeesService.fetchEmployeeById).mockResolvedValue(null);
    renderEdit();

    expect(await screen.findByTestId('empty-state')).toBeInTheDocument();
    expect(
      screen.getByText(id['karyawan.edit.notFoundTitle']),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: id['karyawan.edit.notFoundBack'] }),
    );

    expect(await screen.findByTestId('karyawan-list-stub')).toBeInTheDocument();
  });

  it('patches only the documented fields and shows a success toast', async () => {
    const user = userEvent.setup();
    renderEdit();

    await screen.findByDisplayValue('Budi Santoso');
    await fillName(user);
    await user.click(screen.getByTestId('employee-form-submit'));

    expect(employeesService.updateEmployee).toHaveBeenCalledTimes(1);
    expect(employeesService.updateEmployee).toHaveBeenCalledWith('emp-1', {
      name: 'Budi S.',
      email: 'budi@corp.test',
      position: 'Engineer',
    });
    expect(await screen.findByTestId('success-toast')).toHaveTextContent(
      id['toast.karyawan.updated'],
    );
  });

  it('includes the phone in the patch when one is typed', async () => {
    const user = userEvent.setup();
    renderEdit();

    await screen.findByDisplayValue('Budi Santoso');
    await user.type(screen.getByLabelText(id['form.phone']), '0812999999');
    await user.click(screen.getByTestId('employee-form-submit'));

    expect(vi.mocked(employeesService.updateEmployee).mock.calls[0][1]).toEqual({
      name: 'Budi Santoso',
      email: 'budi@corp.test',
      position: 'Engineer',
      phone: '0812999999',
    });
  });

  it('maps a duplicate email to the field error and keeps the values', async () => {
    const user = userEvent.setup();
    vi.mocked(employeesService.updateEmployee).mockRejectedValue(
      new ApiError(409, 'EMAIL_TAKEN', 'already used'),
    );
    renderEdit();

    await screen.findByDisplayValue('Budi Santoso');
    await fillName(user);
    await user.click(screen.getByTestId('employee-form-submit'));

    expect(await screen.findByTestId('error-email')).toHaveTextContent(
      id['form.error.emailTaken'],
    );
    expect(screen.getByLabelText(id['form.name'])).toHaveValue('Budi S.');
    expect(screen.queryByTestId('success-toast')).not.toBeInTheDocument();
  });

  it('asks for confirmation before deactivating and commits only on confirm', async () => {
    const user = userEvent.setup();
    renderEdit();

    await screen.findByDisplayValue('Budi Santoso');
    await user.click(
      screen.getByRole('radio', { name: id['karyawan.status.deactivated'] }),
    );
    await user.click(
      screen.getByRole('button', { name: id['karyawan.edit.statusApply'] }),
    );

    expect(
      screen.getByText(id['karyawan.edit.statusConfirmTitle']),
    ).toBeInTheDocument();
    expect(employeesService.setEmployeeStatus).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole('button', { name: id['karyawan.edit.statusConfirm'] }),
    );

    expect(employeesService.setEmployeeStatus).toHaveBeenCalledWith(
      'emp-1',
      'deactivated',
    );
    expect(await screen.findByTestId('success-toast')).toHaveTextContent(
      id['toast.karyawan.statusChanged'],
    );
    expect(
      screen.queryByText(id['karyawan.edit.statusConfirmTitle']),
    ).not.toBeInTheDocument();
  });

  it('cancels a pending deactivation without calling the endpoint', async () => {
    const user = userEvent.setup();
    renderEdit();

    await screen.findByDisplayValue('Budi Santoso');
    await user.click(
      screen.getByRole('radio', { name: id['karyawan.status.deactivated'] }),
    );
    await user.click(
      screen.getByRole('button', { name: id['karyawan.edit.statusApply'] }),
    );
    await user.click(
      screen.getByRole('button', { name: id['karyawan.edit.statusCancel'] }),
    );

    expect(employeesService.setEmployeeStatus).not.toHaveBeenCalled();
    expect(
      screen.queryByText(id['karyawan.edit.statusConfirmTitle']),
    ).not.toBeInTheDocument();
  });

  it('reactivates without a confirmation step', async () => {
    const user = userEvent.setup();
    vi.mocked(employeesService.fetchEmployeeById).mockResolvedValue({
      ...storedRow,
      status: 'deactivated',
    });
    renderEdit();

    await screen.findByDisplayValue('Budi Santoso');
    await user.click(
      screen.getByRole('radio', { name: id['karyawan.status.active'] }),
    );
    await user.click(
      screen.getByRole('button', { name: id['karyawan.edit.statusApply'] }),
    );

    expect(employeesService.setEmployeeStatus).toHaveBeenCalledWith(
      'emp-1',
      'active',
    );
    expect(
      screen.queryByText(id['karyawan.edit.statusConfirmTitle']),
    ).not.toBeInTheDocument();
  });

  it('resets the password and reveals the new one-time value once', async () => {
    const user = userEvent.setup();
    vi.mocked(employeesService.resetEmployeePassword).mockResolvedValue({
      temporaryPassword: 'Nw7-plq',
    });
    renderEdit();

    await screen.findByDisplayValue('Budi Santoso');
    expect(screen.queryByTestId('temporary-password')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: id['karyawan.edit.resetAction'] }),
    );

    expect(employeesService.resetEmployeePassword).toHaveBeenCalledWith('emp-1');
    expect(await screen.findByTestId('temporary-password')).toHaveTextContent(
      'Nw7-plq',
    );
    expect(screen.getByTestId('success-toast')).toHaveTextContent(
      id['toast.karyawan.passwordReset'],
    );
    expect(
      screen.getByText(id['karyawan.edit.resetGuidance']),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: id['karyawan.edit.resetClose'] }),
    );
    expect(screen.queryByTestId('temporary-password')).not.toBeInTheDocument();
  });

  it('hands a failed save to the shared state and re-patches on retry', async () => {
    const user = userEvent.setup();
    vi.mocked(employeesService.updateEmployee)
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL', 'stack trace here'))
      .mockResolvedValue(undefined);
    renderEdit();

    await screen.findByDisplayValue('Budi Santoso');
    await fillName(user);
    await user.click(screen.getByTestId('employee-form-submit'));

    const state = await screen.findByTestId('server-error-state');
    expect(state).toHaveTextContent(id['form.error.save']);
    expect(state).toHaveTextContent(id['state.serverError.description']);
    expect(state).not.toHaveTextContent('stack trace here');
    expect(screen.queryByTestId('employee-form-error')).not.toBeInTheDocument();
    expect(screen.getByLabelText(id['form.name'])).toHaveValue('Budi S.');

    await user.click(screen.getByTestId('retry-button'));

    expect(employeesService.updateEmployee).toHaveBeenCalledTimes(2);
    expect(employeesService.updateEmployee).toHaveBeenLastCalledWith('emp-1', {
      name: 'Budi S.',
      email: 'budi@corp.test',
      position: 'Engineer',
    });
    expect(await screen.findByTestId('success-toast')).toBeInTheDocument();
    expect(screen.queryByTestId('server-error-state')).not.toBeInTheDocument();
  });

  it('drops the failed-save offer as soon as the form is edited again', async () => {
    const user = userEvent.setup();
    vi.mocked(employeesService.updateEmployee).mockRejectedValueOnce(
      new ApiError(500, 'INTERNAL', 'boom'),
    );
    renderEdit();

    await screen.findByDisplayValue('Budi Santoso');
    await fillName(user);
    await user.click(screen.getByTestId('employee-form-submit'));

    expect(await screen.findByTestId('server-error-state')).toBeInTheDocument();

    await fillName(user);

    expect(screen.queryByTestId('server-error-state')).not.toBeInTheDocument();
    expect(employeesService.updateEmployee).toHaveBeenCalledTimes(1);
  });

  it('hands a failed status change to the shared state and retries that status', async () => {
    const user = userEvent.setup();
    vi.mocked(employeesService.setEmployeeStatus)
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL', 'boom'))
      .mockResolvedValue(undefined);
    renderEdit();

    await screen.findByDisplayValue('Budi Santoso');
    await user.click(
      screen.getByRole('radio', { name: id['karyawan.status.deactivated'] }),
    );
    await user.click(
      screen.getByRole('button', { name: id['karyawan.edit.statusApply'] }),
    );
    await user.click(
      screen.getByRole('button', { name: id['karyawan.edit.statusConfirm'] }),
    );

    const state = await screen.findByTestId('server-error-state');
    expect(state).toHaveTextContent(id['form.error.save']);
    expect(
      screen.queryByText(id['karyawan.edit.statusConfirmTitle']),
    ).not.toBeInTheDocument();

    await user.click(screen.getByTestId('retry-button'));

    expect(employeesService.setEmployeeStatus).toHaveBeenCalledTimes(2);
    expect(employeesService.setEmployeeStatus).toHaveBeenLastCalledWith(
      'emp-1',
      'deactivated',
    );
    expect(await screen.findByTestId('success-toast')).toHaveTextContent(
      id['toast.karyawan.statusChanged'],
    );
    expect(screen.queryByTestId('server-error-state')).not.toBeInTheDocument();
  });

  it('hands a failed reset to the shared state and retries without showing a password', async () => {
    const user = userEvent.setup();
    vi.mocked(employeesService.resetEmployeePassword)
      .mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND', 'gone'))
      .mockResolvedValue({ temporaryPassword: 'Nw7-plq' });
    renderEdit();

    await screen.findByDisplayValue('Budi Santoso');
    await user.click(
      screen.getByRole('button', { name: id['karyawan.edit.resetAction'] }),
    );

    const state = await screen.findByTestId('server-error-state');
    expect(state).toHaveTextContent(id['form.error.save']);
    expect(state).toHaveTextContent(id['state.serverError.description']);
    expect(screen.queryByTestId('karyawan-edit-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('temporary-password')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('retry-button'));

    expect(employeesService.resetEmployeePassword).toHaveBeenCalledTimes(2);
    expect(await screen.findByTestId('temporary-password')).toHaveTextContent(
      'Nw7-plq',
    );
    expect(screen.queryByTestId('server-error-state')).not.toBeInTheDocument();
  });

  it('keeps the password UX of the add screen off this screen', async () => {
    renderEdit();

    await screen.findByDisplayValue('Budi Santoso');

    expect(screen.queryByTestId('temp-password-preview')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: id['karyawan.add.passwordRegenerate'] }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(id['karyawan.add.forcedChangeNote'])).not.toBeInTheDocument();
  });

  it('carries no attendance field anywhere on the screen', async () => {
    renderEdit();

    await screen.findByDisplayValue('Budi Santoso');

    const controlNames = [
      ...screen.queryAllByRole('textbox'),
      ...screen.queryAllByRole('radio'),
    ].map((control) => control.getAttribute('name') ?? '');
    expect(controlNames.join(' ')).not.toMatch(/absen|punch|rekap|cuti/i);

    expect(screen.queryAllByLabelText(/absensi|absen|pulang|rekap/i)).toHaveLength(
      0,
    );
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getAllByRole('textbox')).toHaveLength(5);
  });

  it('groups the status controls under their own heading', async () => {
    renderEdit();

    const statusCard = await screen.findByTestId('status-card');
    expect(
      within(statusCard).getByText(id['karyawan.edit.statusTitle']),
    ).toBeInTheDocument();
    expect(
      within(statusCard).getByRole('radio', { name: id['karyawan.status.active'] }),
    ).toBeInTheDocument();
    expect(
      within(statusCard).getByRole('radio', {
        name: id['karyawan.status.deactivated'],
      }),
    ).toBeInTheDocument();
  });
});
