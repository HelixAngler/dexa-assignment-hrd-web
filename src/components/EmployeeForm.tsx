import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { z } from 'zod';
import type { DictKey } from '../i18n/id';
import { useI18n } from '../i18n/provider';

/** The five fields the create and update payloads carry. */
export interface EmployeeFormValues {
  name: string;
  email: string;
  position: string;
  phone: string;
  photo: string;
}

/** Marker messages the schema attaches; the form turns them into dictionary keys. */
const REQUIRED = 'REQUIRED';
const EMAIL_FORMAT = 'EMAIL_FORMAT';
const PHONE_FORMAT = 'PHONE_FORMAT';

/**
 * Phone rule: digits plus the separators people actually type, and at least
 * eight digits once everything else is stripped. An empty value is allowed
 * because the column may be left unfilled on create and kept untouched on edit.
 */
const PHONE_CHARACTERS = /^[0-9+\-(). ]*$/;

export function isUsablePhone(phone: string): boolean {
  if (!PHONE_CHARACTERS.test(phone)) {
    return false;
  }
  let digits = 0;
  for (const character of phone) {
    if (character >= '0' && character <= '9') {
      digits += 1;
    }
  }
  return digits >= 8;
}

/**
 * Fields shared by the create and edit schemas, so both screens reject the
 * same input with the same machine markers and neither ever builds its own
 * rules. Messages stay machine-readable on purpose: the screen maps them to
 * the active language, which keeps validation copy bilingual.
 */
const employeeFields = {
  name: z.string().trim().min(1, REQUIRED),
  email: z.string().trim().min(1, REQUIRED).email(EMAIL_FORMAT),
  position: z.string().trim().min(1, REQUIRED),
  photo: z.string().trim().optional().default(''),
};

/** Phone may stay empty on edit (the address is not part of a list row). */
const optionalPhone = z
  .string()
  .trim()
  .refine((value) => value === '' || isUsablePhone(value), PHONE_FORMAT)
  .optional()
  .default('');

/** Phone is part of the create payload, so it has to arrive filled in. */
const requiredPhone = z
  .string()
  .trim()
  .min(1, REQUIRED)
  .refine((value) => isUsablePhone(value), PHONE_FORMAT);

/** Shared schema: every field, phone optional — used when editing a row. */
export const employeeFormSchema = z.object({
  ...employeeFields,
  phone: optionalPhone,
});

/** Create schema: identical rules except that the phone must be filled in. */
export const employeeCreateFormSchema = z.object({
  ...employeeFields,
  phone: requiredPhone,
});

/** Translation key for each schema marker. */
const ISSUE_KEYS: Record<string, DictKey> = {
  [REQUIRED]: 'form.error.required',
  [EMAIL_FORMAT]: 'form.error.email',
  [PHONE_FORMAT]: 'form.error.phone',
};

type EmployeeField = keyof EmployeeFormValues;
type FieldErrors = Partial<Record<EmployeeField, DictKey>>;

/** Keeps only the first problem per field, so a blank email reports "required". */
function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0]) as EmployeeField;
    if (errors[field] === undefined && ISSUE_KEYS[issue.message] !== undefined) {
      errors[field] = ISSUE_KEYS[issue.message];
    }
  }
  return errors;
}

const EMPTY_VALUES: EmployeeFormValues = {
  name: '',
  email: '',
  position: '',
  phone: '',
  photo: '',
};

export interface EmployeeFormProps {
  /** Selects the submit label; the fields themselves are identical. */
  mode: 'add' | 'edit';
  /** Seed for the controlled inputs; every field defaults to an empty string. */
  initialValues?: Partial<EmployeeFormValues>;
  /** Disables the submit button while the caller's request is in flight. */
  pending?: boolean;
  /** Set by the caller on a 409 `EMAIL_TAKEN` answer for the typed address. */
  emailTaken?: boolean;
  /** Extra content rendered between the fields and the submit button. */
  notice?: ReactNode;
  /** Called whenever a field value changes, before validation runs. */
  onValuesChange?: () => void;
  /** Receives the parsed values; the caller performs the request. */
  onSubmit: (values: EmployeeFormValues) => void;
}

/**
 * The employee form shared by the create and edit screens. Validation runs
 * client-side before `onSubmit` fires, every message comes from the i18n
 * dictionary, and a rejected save never clears what was typed — the caller
 * only flips `emailTaken` and the same values stay on screen for a fix.
 */
export default function EmployeeForm({
  mode,
  initialValues,
  pending = false,
  emailTaken = false,
  notice,
  onValuesChange,
  onSubmit,
}: EmployeeFormProps) {
  const { t } = useI18n();
  const [values, setValues] = useState<EmployeeFormValues>({
    ...EMPTY_VALUES,
    ...initialValues,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [emailTakenDismissed, setEmailTakenDismissed] = useState(false);

  // A fresh 409 always deserves to be seen, even if an earlier one was
  // dismissed by editing the address.
  useEffect(() => {
    if (emailTaken) {
      setEmailTakenDismissed(false);
    }
  }, [emailTaken]);

  const setField = (field: EmployeeField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) =>
      current[field] === undefined ? current : { ...current, [field]: undefined },
    );
    if (field === 'email') {
      setEmailTakenDismissed(true);
    }
    onValuesChange?.();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const schema = mode === 'add' ? employeeCreateFormSchema : employeeFormSchema;
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    onSubmit(parsed.data);
  };

  const showEmailTaken = emailTaken && !emailTakenDismissed;

  const inputClass = (hasError: boolean) =>
    [
      'h-11 w-full rounded-md border px-3 text-sm text-gray-900',
      'focus:outline-none focus:ring-1',
      hasError
        ? 'border-red-400 focus:border-red-600 focus:ring-red-600'
        : 'border-gray-300 focus:border-blue-600 focus:ring-blue-600',
    ].join(' ');

  const errorText = (field: EmployeeField): string | null => {
    if (field === 'email' && showEmailTaken) {
      return t('form.error.emailTaken');
    }
    const key = fieldErrors[field];
    return key === undefined ? null : t(key);
  };

  const renderError = (field: EmployeeField) => {
    const text = errorText(field);
    if (text === null) {
      return null;
    }
    return (
      <p
        data-testid={`error-${field}`}
        className="mt-1 text-sm font-medium text-red-700"
      >
        {text}
      </p>
    );
  };

  return (
    <form
      data-testid="employee-form"
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4"
    >
      <div>
        <label htmlFor="employee-name" className="block text-sm font-medium text-gray-700">
          {t('form.name')}
        </label>
        <input
          id="employee-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          value={values.name}
          onChange={(event) => setField('name', event.target.value)}
          aria-invalid={fieldErrors.name !== undefined}
          className={`mt-1 ${inputClass(fieldErrors.name !== undefined)}`}
        />
        {renderError('name')}
      </div>

      <div>
        <label htmlFor="employee-email" className="block text-sm font-medium text-gray-700">
          {t('form.email')}
        </label>
        <input
          id="employee-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={values.email}
          onChange={(event) => setField('email', event.target.value)}
          aria-invalid={fieldErrors.email !== undefined || showEmailTaken}
          className={`mt-1 ${inputClass(
            fieldErrors.email !== undefined || showEmailTaken,
          )}`}
        />
        {renderError('email')}
      </div>

      <div>
        <label htmlFor="employee-position" className="block text-sm font-medium text-gray-700">
          {t('form.position')}
        </label>
        <input
          id="employee-position"
          name="position"
          type="text"
          required
          value={values.position}
          onChange={(event) => setField('position', event.target.value)}
          aria-invalid={fieldErrors.position !== undefined}
          className={`mt-1 ${inputClass(fieldErrors.position !== undefined)}`}
        />
        {renderError('position')}
      </div>

      <div>
        <label htmlFor="employee-phone" className="block text-sm font-medium text-gray-700">
          {t('form.phone')}
        </label>
        <input
          id="employee-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          value={values.phone}
          onChange={(event) => setField('phone', event.target.value)}
          aria-invalid={fieldErrors.phone !== undefined}
          className={`mt-1 ${inputClass(fieldErrors.phone !== undefined)}`}
        />
        {renderError('phone')}
        {mode === 'edit' && values.phone === '' && (
          <p className="mt-1 text-sm text-gray-500">{t('form.phoneKeepHint')}</p>
        )}
      </div>

      <div>
        <label htmlFor="employee-photo" className="block text-sm font-medium text-gray-700">
          {t('form.photo')}
        </label>
        <input
          id="employee-photo"
          name="photo"
          type="text"
          value={values.photo}
          onChange={(event) => setField('photo', event.target.value)}
          aria-describedby="employee-photo-hint"
          className={`mt-1 ${inputClass(false)}`}
        />
        <p id="employee-photo-hint" className="mt-1 text-sm text-gray-500">
          {t('form.photoHint')}
        </p>
      </div>

      {notice}

      <button
        type="submit"
        data-testid="employee-form-submit"
        disabled={pending}
        aria-busy={pending}
        className="min-h-[44px] w-full rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
      >
        {mode === 'add' ? t('form.submit.add') : t('form.submit.save')}
      </button>
    </form>
  );
}
