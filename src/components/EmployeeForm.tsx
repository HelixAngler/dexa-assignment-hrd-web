import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { z } from 'zod';
import type { DictKey } from '../i18n/id';
import { useI18n } from '../i18n/provider';
import { AlertIcon } from './icons';

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
      'min-h-[44px] w-full rounded-[var(--radius-sm)] bg-[var(--color-surface)] px-[var(--space-md)] text-[color:var(--color-text-strong)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)]',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]',
      hasError
        ? 'border border-[color:var(--color-danger)] focus:border-[color:var(--color-danger)]'
        : 'border border-[color:var(--color-border)] focus:border-[color:var(--color-primary)]',
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
        role="alert"
        className="flex items-start gap-[var(--space-sm)] rounded-[var(--radius-sm)] bg-[var(--color-danger-bg)] px-[var(--space-md)] py-[var(--space-sm)] font-medium text-[color:var(--color-danger)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]"
      >
        <AlertIcon size={20} className="mt-[var(--space-xs)] shrink-0" />
        <span>{text}</span>
      </p>
    );
  };

  return (
    <form
      data-testid="employee-form"
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-[var(--space-xl)]"
    >
      <div className="flex flex-col gap-[var(--space-xs)]">
        <label htmlFor="employee-name" className="font-medium text-[color:var(--color-text)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
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
          className={inputClass(fieldErrors.name !== undefined)}
        />
        {renderError('name')}
      </div>

      <div className="flex flex-col gap-[var(--space-xs)]">
        <label htmlFor="employee-email" className="font-medium text-[color:var(--color-text)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
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
          className={inputClass(
            fieldErrors.email !== undefined || showEmailTaken,
          )}
        />
        {renderError('email')}
      </div>

      <div className="flex flex-col gap-[var(--space-xs)]">
        <label htmlFor="employee-position" className="font-medium text-[color:var(--color-text)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
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
          className={inputClass(fieldErrors.position !== undefined)}
        />
        {renderError('position')}
      </div>

      <hr className="w-full border-0 border-t border-[color:var(--color-border)]" />

      <div className="flex flex-col gap-[var(--space-xs)]">
        <label htmlFor="employee-phone" className="font-medium text-[color:var(--color-text)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
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
          className={inputClass(fieldErrors.phone !== undefined)}
        />
        {renderError('phone')}
        {mode === 'edit' && values.phone === '' && (
          <p className="text-[color:var(--color-text-muted)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">{t('form.phoneKeepHint')}</p>
        )}
      </div>

      <div className="flex flex-col gap-[var(--space-xs)]">
        <label htmlFor="employee-photo" className="font-medium text-[color:var(--color-text)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
          {t('form.photo')}
        </label>
        <input
          id="employee-photo"
          name="photo"
          type="text"
          value={values.photo}
          onChange={(event) => setField('photo', event.target.value)}
          aria-describedby="employee-photo-hint"
          className={inputClass(false)}
        />
        <p id="employee-photo-hint" className="text-[color:var(--color-text-muted)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
          {t('form.photoHint')}
        </p>
      </div>

      {notice}

      <button
        type="submit"
        data-testid="employee-form-submit"
        disabled={pending}
        aria-busy={pending}
        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-[var(--space-lg)] font-semibold text-[color:var(--color-on-primary)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)] disabled:cursor-not-allowed disabled:bg-[var(--color-border)] disabled:text-[color:var(--color-text-muted)] sm:w-auto"
      >
        {mode === 'add' ? t('form.submit.add') : t('form.submit.save')}
      </button>
    </form>
  );
}
