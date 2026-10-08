import type { DictKey } from './id';

/**
 * English dictionary for the HRD admin app.
 *
 * `Record<DictKey, string>` makes both parity failures compile errors:
 * a missing key fails assignment, an unknown key is an excess property.
 */
export const en: Record<DictKey, string> = {
  // App shell / navigation
  'shell.appName': 'HRD Attendance',
  'shell.navLabel': 'Main navigation',
  'shell.openMenu': 'Open navigation menu',
  'shell.closeMenu': 'Close navigation menu',
  'shell.toggleLanguage': 'Switch language',
  'nav.karyawan': 'Employees',
  'nav.absensi': 'Attendance',

  // Feedback states
  'state.loading.title': 'Loading data…',
  'state.serverError.title': 'Server error',
  'state.serverError.description': 'No data was changed. Please try again.',
  'state.serverError.retry': 'Retry',
  'state.accessDenied.title': 'Access denied',
  'state.accessDenied.description':
    'You do not have permission to view this page.',
  'state.accessDenied.back': 'Back',
  'state.accessDenied.signOut': 'Sign out',
  'state.empty.title': 'No data yet',
  'state.empty.description': 'There is nothing to show here yet.',
  'state.success.default': 'Changes saved successfully.',
  'state.success.dismiss': 'Dismiss notification',

  // Sign-in
  'login.title': 'Sign in',
  'login.subtitle': 'Sign in to the HRD console with your company email.',
  'login.emailLabel': 'Email',
  'login.passwordLabel': 'Password',
  'login.submit': 'Sign in',
  'login.error.invalid': 'Email or password is incorrect.',
  'login.error.attemptsRemaining': 'Attempts remaining: {count}',
  'login.error.locked':
    'Account locked after too many failed attempts. Try again later.',

  // Shared auth-flow errors (sign-in and forced first-password change)
  'auth.error.network': 'Connection failed. Please try again.',
  'auth.error.generic': 'Something went wrong. Please try again.',

  // Forced first-password change
  'firstLogin.title': 'First sign-in',
  'firstLogin.subtitle': 'You must replace the temporary password before continuing.',
  'firstLogin.newPasswordLabel': 'New password',
  'firstLogin.confirmPasswordLabel': 'Repeat password',
  'firstLogin.hint': 'At least 8 characters.',
  'firstLogin.submit': 'Save & continue',
  'firstLogin.mismatch': 'Passwords do not match.',

  // Routing: sessions that may not open this console
  'route.denied.employeeTitle': 'Access denied',
  'route.denied.employeeDescription':
    'This console is only for HRD accounts. Sign out and sign in with an HRD account.',

  // Shared employee form (add + edit)
  'form.name': 'Full name',
  'form.email': 'Company email',
  'form.position': 'Position',
  'form.phone': 'Phone number',
  'form.photo': 'Photo',
  'form.photoHint': 'Optional. Paste a photo URL or a storage object key.',
  'form.phoneKeepHint': 'Leave blank to keep the phone number already on file.',
  'form.error.required': 'This field is required.',
  'form.error.email': 'Enter a valid email address.',
  'form.error.phone': 'Invalid phone number. At least 8 digits.',
  'form.error.emailTaken': 'This email is already registered. Use another one.',
  'form.error.save': 'Changes could not be saved. Please try again.',
  'form.submit.add': 'Add employee',
  'form.submit.save': 'Save changes',

  // Add employee
  'karyawan.add.title': 'Add employee',
  'karyawan.add.passwordLabel': 'Temporary password (preview)',
  'karyawan.add.passwordPreviewNote':
    'Preview on this device. The server issues the real password when you save.',
  'karyawan.add.passwordRegenerate': 'Regenerate',
  'karyawan.add.forcedChangeNote':
    'The employee must change this password at first sign-in.',
  'karyawan.add.createdTitle': 'Employee created',
  'karyawan.add.createdPasswordLabel': 'Temporary password',
  'karyawan.add.createdGuidance':
    'Copy and share it now. The password is shown only once and cannot be viewed again.',
  'karyawan.add.createdCopy': 'Copy password',
  'karyawan.add.createdCopied': 'Copied',
  'karyawan.add.createdDone': 'Back to list',
  'toast.karyawan.created': 'Employee added successfully.',

  // Edit employee
  'karyawan.edit.title': 'Edit employee',
  'karyawan.edit.notFoundTitle': 'Employee not found',
  'karyawan.edit.notFoundDescription':
    'This record may have been removed. Go back to the list for the current data.',
  'karyawan.edit.notFoundBack': 'Back to list',
  'karyawan.edit.statusTitle': 'Employment status',
  'karyawan.edit.statusApply': 'Apply status',
  'karyawan.edit.statusConfirmTitle': 'Deactivate this employee?',
  'karyawan.edit.statusConfirmBody':
    'The employee will not be able to sign in and any open session is closed. Attendance history stays intact.',
  'karyawan.edit.statusConfirm': 'Yes, deactivate',
  'karyawan.edit.statusCancel': 'Cancel',
  'karyawan.edit.resetTitle': 'Password',
  'karyawan.edit.resetAction': 'Reset password',
  'karyawan.edit.resetHint':
    'The new password applies at the next sign-in and must be changed by the employee.',
  'karyawan.edit.resetRevealTitle': 'New temporary password',
  'karyawan.edit.resetGuidance':
    'Copy and share it now. The password is shown only once.',
  'karyawan.edit.resetClose': 'Close',
  'karyawan.status.active': 'Active',
  'karyawan.status.deactivated': 'Deactivated',

  // Employee list
  'karyawan.list.title': 'Employee list',
  'karyawan.list.add': '+ Add',
  'karyawan.list.edit': 'Edit',
  'karyawan.list.emptyTitle': 'No employees yet',
  'karyawan.list.emptyDescription': 'Add your first employee with the + Add button.',
  'karyawan.column.name': 'Name',
  'karyawan.column.email': 'Email',
  'karyawan.column.position': 'Position',
  'karyawan.column.status': 'Status',
  'karyawan.column.actions': 'Actions',
  'toast.karyawan.updated': 'Employee updated.',
  'toast.karyawan.statusChanged': 'Employee status updated.',
  'toast.karyawan.passwordReset': 'Password reset successfully.',

  // Profile-change alert banners
  'alert.regionLabel': 'Profile change alerts',
  'alert.changedFields': 'changed {fields}',
  'alert.passwordLine': 'Password changed',
  'alert.dismiss': 'Dismiss alert',
  'alert.field.phone': 'phone',
  'alert.field.photo': 'photo',
  'alert.field.password': 'password',
};
