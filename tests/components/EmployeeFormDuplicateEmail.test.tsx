import { useState } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import EmployeeForm from '../../src/components/EmployeeForm';
import { id } from '../../src/i18n/id';
import { I18nProvider } from '../../src/i18n/provider';

/**
 * The employee form when the server refuses a save because the address
 * already belongs to someone: the conflict is reported inline on the email
 * field itself, and nothing the admin typed is thrown away — the fix is one
 * edit away, not a refill.
 */

/**
 * Stands in for the screen that owns the form. A save the server rejects
 * with the duplicate-address conflict is modelled exactly the way the real
 * screen reacts: the request "succeeds" from the form's point of view and
 * the caller only flips the flag the form reads.
 */
function DuplicateEmailHarness() {
  const [emailTaken, setEmailTaken] = useState(false);
  return (
    <I18nProvider>
      <EmployeeForm
        mode="add"
        emailTaken={emailTaken}
        onSubmit={() => setEmailTaken(true)}
      />
    </I18nProvider>
  );
}

describe('EmployeeForm duplicate-email conflict', () => {
  it('shows the conflict inline under the email field and keeps every typed value', async () => {
    const user = userEvent.setup();
    render(<DuplicateEmailHarness />);

    await user.type(screen.getByLabelText(id['form.name']), 'Budi Santoso');
    await user.type(screen.getByLabelText(id['form.email']), 'budi@corp.test');
    await user.type(screen.getByLabelText(id['form.position']), 'Engineer');
    await user.type(screen.getByLabelText(id['form.phone']), '0812000000');
    await user.type(
      screen.getByLabelText(id['form.photo']),
      'https://cdn.test/budi.png',
    );

    await user.click(screen.getByTestId('employee-form-submit'));

    // The conflict is reported inside the form, as part of the email
    // field's own block, not as a page-level error that replaces the form.
    const error = await screen.findByTestId('error-email');
    expect(error).toHaveTextContent(id['form.error.emailTaken']);
    const form = screen.getByTestId('employee-form');
    expect(form).toContainElement(error);

    const emailInput = screen.getByLabelText(id['form.email']);
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput.parentElement).toContainElement(error);

    // Every other field still carries what was typed.
    expect(screen.getByLabelText(id['form.name'])).toHaveValue('Budi Santoso');
    expect(emailInput).toHaveValue('budi@corp.test');
    expect(screen.getByLabelText(id['form.position'])).toHaveValue('Engineer');
    expect(screen.getByLabelText(id['form.phone'])).toHaveValue('0812000000');
    expect(screen.getByLabelText(id['form.photo'])).toHaveValue(
      'https://cdn.test/budi.png',
    );
  });
});
