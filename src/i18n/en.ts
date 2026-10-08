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
  'state.empty.title': 'No data yet',
  'state.empty.description': 'There is nothing to show here yet.',
  'state.success.default': 'Changes saved successfully.',
  'state.success.dismiss': 'Dismiss notification',

  // Profile-change alert banners
  'alert.regionLabel': 'Profile change alerts',
  'alert.changedFields': 'changed {fields}',
  'alert.passwordLine': 'Password changed',
  'alert.dismiss': 'Dismiss alert',
  'alert.field.phone': 'phone',
  'alert.field.photo': 'photo',
  'alert.field.password': 'password',
};
