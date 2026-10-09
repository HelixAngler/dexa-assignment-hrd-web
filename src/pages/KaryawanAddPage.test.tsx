import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../i18n/id';
import { I18nProvider } from '../i18n/provider';
import { ApiError } from '../services/api';
import * as employeesService from '../services/employees';
import KaryawanAddPage from './KaryawanAddPage';

vi.mock('../services/employees', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/employees')>();
  return { ...actual, createEmployee: vi.fn() };
});

function renderAdd() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/karyawan/add']}>
        <Routes>
          <Route path="/karyawan/add" element={<KaryawanAddPage />} />
          <Route
            path="/karyawan"
            element={<div data-testid="karyawan-list-stub">list</div>}
          />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );
}

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(id['form.name']), 'Budi Santoso');
  await user.type(screen.getByLabelText(id['form.email']), 'budi@corp.test');
  await user.type(screen.getByLabelText(id['form.position']), 'Engineer');
  await user.type(screen.getByLabelText(id['form.phone']), '0812000000');
}

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
    writable: true,
  });
  return writeText;
}

describe('KaryawanAddPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(employeesService.createEmployee).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the add screen with the shared employee form', () => {
    renderAdd();

    expect(screen.getByTestId('karyawan-add')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: id['karyawan.add.title'] }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('employee-form')).toBeInTheDocument();
  });

  it('states the forced-change rule before the save button', () => {
    renderAdd();

    const note = screen.getByText(id['karyawan.add.forcedChangeNote']);
    const submit = screen.getByTestId('employee-form-submit');
    expect(
      note.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('shows a client-side password preview with a regenerate action before saving', async () => {
    const user = userEvent.setup();
    renderAdd();

    const before = (
      screen.getByLabelText(
        id['karyawan.add.passwordLabel'],
      ) as HTMLInputElement
    ).value;
    expect(before).toMatch(/.{8,}/);

    await user.click(
      screen.getByRole('button', { name: id['karyawan.add.passwordRegenerate'] }),
    );

    const after = (
      screen.getByLabelText(
        id['karyawan.add.passwordLabel'],
      ) as HTMLInputElement
    ).value;
    expect(after).toMatch(/.{8,}/);
    expect(after).not.toBe(before);
    expect(screen.getByText(id['karyawan.add.passwordPreviewNote'])).toBeInTheDocument();
  });

  it('posts exactly the documented payload and never a password', async () => {
    const user = userEvent.setup();
    vi.mocked(employeesService.createEmployee).mockResolvedValue({
      id: 'emp-9',
      temporaryPassword: 'K9x-ty2',
    });
    renderAdd();

    await fillForm(user);
    await user.click(screen.getByTestId('employee-form-submit'));

    expect(employeesService.createEmployee).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(employeesService.createEmployee).mock.calls[0][0];
    expect(payload).toEqual({
      name: 'Budi Santoso',
      email: 'budi@corp.test',
      position: 'Engineer',
      phone: '0812000000',
    });
    expect(payload).not.toHaveProperty('password');
    expect(payload).not.toHaveProperty('temporaryPassword');
  });

  it('includes the photo only when one was supplied', async () => {
    const user = userEvent.setup();
    vi.mocked(employeesService.createEmployee).mockResolvedValue({
      id: 'emp-9',
      temporaryPassword: 'K9x-ty2',
    });
    renderAdd();

    await fillForm(user);
    await user.type(
      screen.getByLabelText(id['form.photo']),
      'https://cdn.test/budi.png',
    );
    await user.click(screen.getByTestId('employee-form-submit'));

    expect(vi.mocked(employeesService.createEmployee).mock.calls[0][0]).toEqual({
      name: 'Budi Santoso',
      email: 'budi@corp.test',
      position: 'Engineer',
      phone: '0812000000',
      photo: 'https://cdn.test/budi.png',
    });
  });

  it('reveals the issued one-time password with copy guidance and a success toast', async () => {
    const user = userEvent.setup();
    stubClipboard();
    vi.mocked(employeesService.createEmployee).mockResolvedValue({
      id: 'emp-9',
      temporaryPassword: 'K9x-ty2',
    });
    renderAdd();

    await fillForm(user);
    await user.click(screen.getByTestId('employee-form-submit'));

    expect(await screen.findByTestId('temporary-password')).toHaveTextContent(
      'K9x-ty2',
    );
    expect(
      screen.getByText(id['karyawan.add.createdGuidance']),
    ).toBeInTheDocument();
    expect(screen.getByTestId('success-toast')).toHaveTextContent(
      id['toast.karyawan.created'],
    );
    expect(screen.queryByTestId('employee-form')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: id['karyawan.add.createdCopy'] }),
    );
    expect(
      screen.getByRole('button', { name: id['karyawan.add.createdCopied'] }),
    ).toBeInTheDocument();
  });

  it('returns to the list after the password is acknowledged', async () => {
    const user = userEvent.setup();
    vi.mocked(employeesService.createEmployee).mockResolvedValue({
      id: 'emp-9',
      temporaryPassword: 'K9x-ty2',
    });
    renderAdd();

    await fillForm(user);
    await user.click(screen.getByTestId('employee-form-submit'));
    await screen.findByTestId('temporary-password');

    await user.click(
      screen.getByRole('button', { name: id['karyawan.add.createdDone'] }),
    );

    expect(await screen.findByTestId('karyawan-list-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('karyawan-add')).not.toBeInTheDocument();
  });

  it('maps a duplicate email to a field error and keeps the typed values', async () => {
    const user = userEvent.setup();
    vi.mocked(employeesService.createEmployee).mockRejectedValue(
      new ApiError(409, 'EMAIL_TAKEN', 'already used'),
    );
    renderAdd();

    await fillForm(user);
    await user.click(screen.getByTestId('employee-form-submit'));

    expect(await screen.findByTestId('error-email')).toHaveTextContent(
      id['form.error.emailTaken'],
    );
    expect(screen.getByLabelText(id['form.name'])).toHaveValue('Budi Santoso');
    expect(screen.getByLabelText(id['form.email'])).toHaveValue(
      'budi@corp.test',
    );
    expect(screen.queryByTestId('temporary-password')).not.toBeInTheDocument();
  });

  it('hands a server fault to the shared state and re-creates on retry', async () => {
    const user = userEvent.setup();
    vi.mocked(employeesService.createEmployee)
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL', 'stack trace here'))
      .mockResolvedValue({ id: 'emp-9', temporaryPassword: 'K9x-ty2' });
    renderAdd();

    await fillForm(user);
    await user.click(screen.getByTestId('employee-form-submit'));

    const state = await screen.findByTestId('server-error-state');
    expect(state).toHaveTextContent(id['form.error.save']);
    expect(state).toHaveTextContent(id['state.serverError.description']);
    expect(state).not.toHaveTextContent('stack trace here');
    expect(screen.queryByTestId('employee-form-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('error-email')).not.toBeInTheDocument();
    expect(screen.getByLabelText(id['form.name'])).toHaveValue('Budi Santoso');

    await user.click(screen.getByTestId('retry-button'));

    expect(await screen.findByTestId('temporary-password')).toHaveTextContent(
      'K9x-ty2',
    );
    expect(employeesService.createEmployee).toHaveBeenCalledTimes(2);
    expect(employeesService.createEmployee).toHaveBeenLastCalledWith({
      name: 'Budi Santoso',
      email: 'budi@corp.test',
      position: 'Engineer',
      phone: '0812000000',
    });
  });

  it('keeps the save button disabled while the request is in flight', async () => {
    const user = userEvent.setup();
    vi.mocked(employeesService.createEmployee).mockReturnValue(
      new Promise(() => {}),
    );
    renderAdd();

    await fillForm(user);
    await user.click(screen.getByTestId('employee-form-submit'));

    expect(screen.getByTestId('employee-form-submit')).toBeDisabled();
    expect(
      within(screen.getByTestId('employee-form')).queryByTestId(
        'temporary-password',
      ),
    ).not.toBeInTheDocument();
  });
});
