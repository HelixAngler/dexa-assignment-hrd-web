import type { ZodError } from 'zod';
import type { DictKey } from '../i18n/id';

/** The profile columns the HR screens collect outside the shared form. */
export type ProfileField = 'name' | 'email' | 'position' | 'phone';

/** At most one dictionary key per profile field. */
export type ProfileErrors = Partial<Record<ProfileField, DictKey>>;

/** Machine markers the shared employee schemas attach to bad fields. */
const REQUIRED = 'REQUIRED';
const EMAIL_FORMAT = 'EMAIL_FORMAT';
const PHONE_FORMAT = 'PHONE_FORMAT';

/** The shared schemas already speak these markers; screens map them to copy. */
const ISSUE_KEYS: Record<string, DictKey> = {
  [REQUIRED]: 'form.error.required',
  [EMAIL_FORMAT]: 'form.error.email',
  [PHONE_FORMAT]: 'form.error.phone',
};

/**
 * Turns a rejected employee schema into per-field dictionary keys, keeping
 * only the first problem per field so a blank email reports "required". The
 * screens that collect profile fields outside the shared `EmployeeForm`
 * (the HR proposal screens) reuse this instead of building their own rules.
 */
export function toProfileFieldErrors(error: ZodError): ProfileErrors {
  const errors: ProfileErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0]) as ProfileField;
    if (errors[field] === undefined && ISSUE_KEYS[issue.message] !== undefined) {
      errors[field] = ISSUE_KEYS[issue.message];
    }
  }
  return errors;
}
