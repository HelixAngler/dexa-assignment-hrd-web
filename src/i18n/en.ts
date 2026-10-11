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
  'shell.changePassword': 'Change password',
  'nav.karyawan': 'Employees',
  'nav.absensi': 'Attendance',
  'nav.hr': 'HR Accounts',
  'nav.hrApprovals': 'HR Approvals',

  // HR account directory (/hrd/hr)
  'hr.accounts.title': 'HR Accounts',
  'hr.accounts.subtitle': 'Every account with the HR role in this console.',
  'hr.accounts.openApprovals': 'HR Approvals',
  'hr.accounts.emptyTitle': 'No HR accounts yet',
  'hr.accounts.emptyDescription':
    'HR accounts created through the approval flow appear here.',

  // Add HR account (/hrd/hr/add)
  'hr.add.title': 'Add HR account',
  'hr.add.submit': 'Submit proposal',
  'hr.add.pendingTitle': 'Proposal sent',
  'hr.add.pendingDescription':
    'The HR account proposal is waiting for another HR to approve it. The temporary password is issued and shown to the checker only once the proposal is approved.',
  'hr.add.pendingOpenApprovals': 'Open HR approvals',

  // Edit HR account (/hrd/hr/:id/edit)
  'hr.edit.title': 'Edit HR account',
  'hr.edit.pendingTitle': 'Waiting for approval',
  'hr.edit.pendingDescription':
    'The proposals below are waiting for another HR to decide. Every action stays disabled until that decision is made.',
  'hr.edit.pendingListLabel': 'Pending proposals',
  'hr.edit.noChanges': 'There are no changes to send.',
  'hr.edit.statusConfirmTitle': 'Deactivate this HR account?',
  'hr.edit.statusConfirmBody':
    'The account is deactivated only after another HR approves the proposal; until then neither status nor access changes.',
  'hr.edit.reactivateAction': 'Propose reactivation',
  'hr.edit.reactivateConfirmTitle': 'Reactivate this HR account?',
  'hr.edit.reactivateConfirmBody':
    'The account is reactivated once another HR account approves the proposal; until then its status and access do not change.',
  'hr.edit.reactivateConfirm': 'Yes, propose',
  'hr.edit.resetHint':
    'A password reset is proposed through the approvals flow. The new password is issued and shown to the checker only once the proposal is approved.',
  'hr.edit.resetAction': 'Propose a password reset',
  'hr.edit.resetConfirmTitle': 'Propose a password reset?',
  'hr.edit.resetConfirmBody':
    'This proposal goes to HR Approvals and changes no password yet.',
  'hr.edit.resetConfirm': 'Yes, propose',
  'hr.edit.notFoundTitle': 'HR account not found',
  'hr.edit.notFoundDescription':
    'This account may have been removed. Go back to the list for the current data.',
  'hr.edit.notFoundBack': 'Back to the HR account list',
  'toast.hr.proposed': 'Proposal sent and waiting for approval.',

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
  'karyawan.edit.hrManagedTitle': 'HR accounts are managed through approvals',
  'karyawan.edit.hrManagedDescription':
    'HR accounts are edited on the HR Accounts page: every change becomes a proposal that waits for another HR to approve it.',
  'karyawan.edit.hrManagedAction': 'Open the HR Accounts page',
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

  // Maker-checker approvals for HR accounts
  'karyawan.approval.title': 'HR Approvals',
  'karyawan.approval.subtitle':
    'Decide HR account change proposals filed by other HR accounts.',
  'karyawan.approval.state.pending': 'Pending',
  'karyawan.approval.state.approved': 'Approved',
  'karyawan.approval.state.rejected': 'Rejected',
  'karyawan.approval.state.withdrawn': 'Withdrawn',
  'karyawan.approval.type.add_hr': 'Add HR',
  'karyawan.approval.type.deactivate_hr': 'Deactivate HR',
  'karyawan.approval.type.reactivate_hr': 'Reactivate HR',
  'karyawan.approval.type.reset_password': 'Reset password',
  'karyawan.approval.type.update_hr': 'Edit HR profile',
  'karyawan.approval.confirmApproveTitle': 'Approve this proposal?',
  'karyawan.approval.confirmRejectTitle': 'Reject this proposal?',
  'karyawan.approval.refused':
    'The server refused this request. Nothing changed — review it and try again.',
  'karyawan.approval.maker': 'Proposed by',
  'karyawan.approval.checker': 'Decided by',
  'karyawan.approval.decidedAt': 'Decided at',
  'karyawan.approval.note': 'Note',
  'karyawan.approval.rejectNote': 'Rejection reason',
  'karyawan.approval.approve': 'Approve',
  'karyawan.approval.reject': 'Reject',
  'karyawan.approval.withdraw': 'Withdraw proposal',
  'karyawan.approval.selfHint':
    'You proposed this; a different HR account must decide.',
  'karyawan.approval.targetHint':
    'This proposal removes your own access; another HR has to decide it.',
  'karyawan.approval.tempPassword': 'One-time temporary password',
  'karyawan.approval.tempPasswordNote':
    'Copy it now. The password is shown once and cannot be viewed again.',
  'karyawan.approval.empty': 'No proposals yet.',
  'karyawan.approval.loadError': 'The approval list could not be loaded.',

  // Attendance: HRD read-only attendance view
  'absensi.title': 'Attendance',
  'absensi.readOnlyNote':
    'Read-only view. The attendance data on this page cannot be changed.',
  'absensi.dateLabel': 'Date',
  'absensi.searchLabel': 'Search by name',
  'absensi.searchSubmit': 'Search',
  'absensi.emptyTitle': 'No attendance records yet',
  'absensi.emptyDescription':
    'No employees match this date or this name search.',
  'absensi.error.dateInvalid': 'That date is not valid. Please pick another one.',
  'absensi.column.name': 'Name',
  'absensi.column.masuk': 'Clock in',
  'absensi.column.pulang': 'Clock out',
  'absensi.column.status': 'Status',
  'absensi.row.stillWorking': '(still working)',
  'absensi.row.status.done': 'Done',
  'absensi.row.status.open': 'Working',
  'absensi.row.status.noPunch': 'No punch yet',

  // Profile-change alert banners
  'alert.regionLabel': 'Profile change alerts',
  'alert.changedFields': 'changed {fields}',
  'alert.passwordLine': 'Password changed',
  'alert.dismiss': 'Dismiss alert',
  'alert.more': '+{count} more',
  'alert.field.phone': 'phone',
  'alert.field.photo': 'photo',
  'alert.field.password': 'password',

  // Own-account password change
  'password.title': 'Change Password',
  'password.currentLabel': 'Current password',
  'password.newLabel': 'New password',
  'password.confirmLabel': 'Repeat new password',
  'password.hint.min': 'At least 8 characters.',
  'password.hint.printable': 'Any printable characters are allowed.',
  'password.hint.avoidCommon': 'Avoid commonly used passwords.',
  'password.note':
    'This session stays signed in on this device; other devices are signed out automatically.',
  'password.mismatch': 'The new passwords do not match.',
  'password.error.currentRequired': 'Enter your current password.',
  'password.error.tooShort': 'The new password needs at least 8 characters.',
  'password.error.weak': 'The password does not meet the security requirements.',
  'password.error.currentWrong': 'The current password is incorrect.',
  'password.save': 'Save',
  'password.cancel': 'Cancel',
  'password.success': 'Password changed successfully.',
  'password.successNote':
    'This session stays signed in; other devices must sign in again.',
  'password.done': 'Done',
};
