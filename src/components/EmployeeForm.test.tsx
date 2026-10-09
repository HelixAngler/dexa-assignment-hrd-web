import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../i18n/id';
import { I18nProvider } from '../i18n/provider';
import EmployeeForm, {
  employeeFormSchema,
  type EmployeeFormValues,
} from './EmployeeForm';

const validValues: EmployeeFormValues = {
  name: 'Budi Santoso',
  email: 'budi@corp.test',
  position: 'Engineer',
  phone: '0812000000',
  photo: '',
};

function renderForm(
  props: Partial<Parameters<typeof EmployeeForm>[0]> = {},
  language?: 'id' | 'en',
) {
  if (language === 'en') {
    window.localStorage.setItem('lang', 'en');
  }
  return render(
    <I18nProvider>
      <EmployeeForm mode="add" onSubmit={vi.fn()} {...props} />
    </I18nProvider>,
  );
}

async function fillAll(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(id['form.name']), validValues.name);
  await user.type(screen.getByLabelText(id['form.email']), validValues.email);
  await user.type(
    screen.getByLabelText(id['form.position']),
    validValues.position,
  );
  await user.type(screen.getByLabelText(id['form.phone']), validValues.phone);
}

describe('employeeFormSchema', () => {
  it('accepts a complete record and trims the text fields', () => {
    const result = employeeFormSchema.safeParse({
      name: '  Budi Santoso  ',
      email: ' budi@corp.test ',
      position: ' Engineer ',
      phone: '0812000000',
      photo: '',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: 'Budi Santoso',
      email: 'budi@corp.test',
      position: 'Engineer',
      phone: '0812000000',
      photo: '',
    });
  });

  it('accepts an omitted phone and photo', () => {
    const result = employeeFormSchema.safeParse({
      name: 'Budi',
      email: 'budi@corp.test',
      position: 'Engineer',
    });

    expect(result.success).toBe(true);
  });

  it('rejects blank required fields with the required marker', () => {
    const result = employeeFormSchema.safeParse({
      name: '   ',
      email: '',
      position: '',
      phone: '',
      photo: '',
    });

    expect(result.success).toBe(false);
    const messages = (result.error?.issues ?? []).map((issue) => ({
      field: String(issue.path[0]),
      message: issue.message,
    }));
    expect(messages).toContainEqual({ field: 'name', message: 'REQUIRED' });
    expect(messages).toContainEqual({ field: 'email', message: 'REQUIRED' });
    expect(messages).toContainEqual({ field: 'position', message: 'REQUIRED' });
  });

  it('rejects a malformed email', () => {
    const result = employeeFormSchema.safeParse({
      name: 'Budi',
      email: 'budi-at-corp',
      position: 'Engineer',
      phone: '',
      photo: '',
    });

    expect(result.success).toBe(false);
    expect(
      (result.error?.issues ?? []).some(
        (issue) =>
          String(issue.path[0]) === 'email' && issue.message === 'EMAIL_FORMAT',
      ),
    ).toBe(true);
  });

  it('rejects a phone number without enough digits', () => {
    const result = employeeFormSchema.safeParse({
      name: 'Budi',
      email: 'budi@corp.test',
      position: 'Engineer',
      phone: '12345',
      photo: '',
    });

    expect(result.success).toBe(false);
    expect(
      (result.error?.issues ?? []).some(
        (issue) =>
          String(issue.path[0]) === 'phone' && issue.message === 'PHONE_FORMAT',
      ),
    ).toBe(true);
  });
});

describe('EmployeeForm', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders every labelled field in Indonesian by default', () => {
    renderForm();

    expect(screen.getByLabelText(id['form.name'])).toBeInTheDocument();
    expect(screen.getByLabelText(id['form.email'])).toBeInTheDocument();
    expect(screen.getByLabelText(id['form.position'])).toBeInTheDocument();
    expect(screen.getByLabelText(id['form.phone'])).toBeInTheDocument();
    expect(screen.getByLabelText(id['form.photo'])).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: id['form.submit.add'] }),
    ).toBeInTheDocument();
  });

  it('keeps the edit submit label for the edit mode', () => {
    renderForm({ mode: 'edit' });

    expect(
      screen.getByRole('button', { name: id['form.submit.save'] }),
    ).toBeInTheDocument();
  });

  it('blocks the save with inline bilingual validation and never calls submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await user.click(screen.getByRole('button', { name: id['form.submit.add'] }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getAllByText(id['form.error.required']).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', { name: id['form.submit.add'] }),
    ).toBeEnabled();
  });

  it('requires the phone on create', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await user.type(screen.getByLabelText(id['form.name']), validValues.name);
    await user.type(screen.getByLabelText(id['form.email']), validValues.email);
    await user.type(
      screen.getByLabelText(id['form.position']),
      validValues.position,
    );
    await user.click(screen.getByRole('button', { name: id['form.submit.add'] }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('error-phone')).toHaveTextContent(
      id['form.error.required'],
    );
  });

  it('allows the phone to stay empty on edit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderForm({
      mode: 'edit',
      initialValues: { ...validValues, phone: '' },
      onSubmit,
    });

    await user.click(screen.getByRole('button', { name: id['form.submit.save'] }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '' }),
    );
  });

  it('explains on edit that a blank phone keeps the stored number', async () => {
    const user = userEvent.setup();
    renderForm({
      mode: 'edit',
      initialValues: { ...validValues, phone: '' },
    });

    expect(screen.getByText(id['form.phoneKeepHint'])).toBeInTheDocument();

    await user.type(screen.getByLabelText(id['form.phone']), '0812');

    expect(screen.queryByText(id['form.phoneKeepHint'])).not.toBeInTheDocument();
  });

  it('never shows the keep-the-number hint on create', () => {
    renderForm({ mode: 'add', initialValues: validValues });

    expect(screen.queryByText(id['form.phoneKeepHint'])).not.toBeInTheDocument();
  });

  it('submits the trimmed values when everything is valid', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await fillAll(user);
    await user.click(screen.getByRole('button', { name: id['form.submit.add'] }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Budi Santoso',
      email: 'budi@corp.test',
      position: 'Engineer',
      phone: '0812000000',
      photo: '',
    });
    expect(screen.queryByText(id['form.error.required'])).not.toBeInTheDocument();
  });

  it('shows a field-level duplicate-email error without clearing what was typed', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { rerender } = renderForm({ onSubmit });

    await fillAll(user);
    await user.click(screen.getByRole('button', { name: id['form.submit.add'] }));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    rerender(
      <I18nProvider>
        <EmployeeForm mode="add" onSubmit={onSubmit} emailTaken />
      </I18nProvider>,
    );

    expect(screen.getByText(id['form.error.emailTaken'])).toBeInTheDocument();
    expect(screen.getByLabelText(id['form.name'])).toHaveValue(validValues.name);
    expect(screen.getByLabelText(id['form.email'])).toHaveValue(
      validValues.email,
    );
    expect(screen.getByLabelText(id['form.position'])).toHaveValue(
      validValues.position,
    );
    expect(screen.getByLabelText(id['form.phone'])).toHaveValue(
      validValues.phone,
    );
  });

  it('clears the duplicate-email error as soon as the address changes', async () => {
    const user = userEvent.setup();
    renderForm({ emailTaken: true });

    expect(screen.getByText(id['form.error.emailTaken'])).toBeInTheDocument();

    await user.type(screen.getByLabelText(id['form.email']), 'x');

    expect(screen.queryByText(id['form.error.emailTaken'])).not.toBeInTheDocument();
  });

  it('disables the submit button while a save is pending', () => {
    renderForm({ pending: true });

    expect(
      screen.getByRole('button', { name: id['form.submit.add'] }),
    ).toBeDisabled();
  });

  it('reports field edits back to the caller', async () => {
    const user = userEvent.setup();
    const onValuesChange = vi.fn();
    renderForm({ onValuesChange });

    await user.type(screen.getByLabelText(id['form.name']), 'B');

    expect(onValuesChange).toHaveBeenCalled();
  });

  it('renders the notice slot before the submit button', () => {
    renderForm({ notice: <p>forced-change-note</p> });

    expect(screen.getByText('forced-change-note')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: id['form.submit.add'] }),
    ).toBeInTheDocument();
  });

  it('shows English validation messages when English is stored', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderForm({ onSubmit }, 'en');

    await user.click(screen.getByRole('button', { name: 'Add employee' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getAllByText('This field is required.').length,
    ).toBeGreaterThan(0);
  });
});
