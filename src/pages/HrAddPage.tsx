import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { employeeCreateFormSchema } from '../components';
import {
  toProfileFieldErrors,
  type ProfileErrors,
  type ProfileField,
} from '../components/formIssues';
import { AlertIcon } from '../components/icons';
import { ServerErrorState } from '../components/states';
import { useI18n } from '../i18n/provider';
import { ApiError } from '../services/api';
import { createHrAccessRequest } from '../services/hrAccess';

/** The four profile fields a new-HR proposal carries; no photo, no password. */
type ProposeValues = {
  name: string;
  email: string;
  position: string;
  phone: string;
};

const EMPTY_PROPOSE: ProposeValues = {
  name: '',
  email: '',
  position: '',
  phone: '',
};

/** Surface every card on the screen rests on: border, radius, elevation. */
const cardClassName =
  'flex flex-col gap-[var(--space-lg)] rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[var(--color-surface)] p-[var(--space-lg)] shadow-[var(--shadow-card)]';

/** Outlined action: visible and tappable, but never the dominant one. */
const secondaryButtonClassName =
  'inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[var(--color-surface)] px-[var(--space-md)] font-semibold text-[color:var(--color-text)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)] hover:bg-[var(--color-page)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)] disabled:cursor-not-allowed disabled:bg-[var(--color-border)] disabled:text-[color:var(--color-text-muted)]';

/** The one filled action of its screen. */
const primaryButtonClassName =
  'inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-[var(--space-lg)] font-semibold text-[color:var(--color-on-primary)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)] disabled:cursor-not-allowed disabled:bg-[var(--color-border)] disabled:text-[color:var(--color-text-muted)] sm:w-auto';

const labelClassName =
  'font-medium text-[color:var(--color-text)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]';

const inputClassName = (hasError: boolean) =>
  [
    'min-h-[44px] w-full rounded-[var(--radius-sm)] bg-[var(--color-surface)] px-[var(--space-md)] text-[color:var(--color-text-strong)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]',
    hasError
      ? 'border border-[color:var(--color-danger)] focus:border-[color:var(--color-danger)]'
      : 'border border-[color:var(--color-border)] focus:border-[color:var(--color-primary)]',
  ].join(' ');

/**
 * Create screen for a new HR account, filing a proposal instead of an
 * account. The form collects exactly the four profile columns the `add_hr`
 * proposal carries — never any password material, because the temporary
 * password is issued by the server only once a checker approves. A
 * duplicate address is answered as a field error; once the proposal is
 * filed the screen switches to a pending notice that points at the
 * approvals inbox and states that the password reveal happens there.
 */
export default function HrAddPage() {
  const { t } = useI18n();
  const [values, setValues] = useState<ProposeValues>(EMPTY_PROPOSE);
  const [fieldErrors, setFieldErrors] = useState<ProfileErrors>({});
  const [emailTaken, setEmailTaken] = useState(false);
  const [pending, setPending] = useState(false);
  const [fault, setFault] = useState(false);
  const [lastValues, setLastValues] = useState<ProposeValues | null>(null);
  const [proposed, setProposed] = useState(false);

  async function handleSubmit(next: ProposeValues) {
    if (pending) {
      return;
    }
    setPending(true);
    setEmailTaken(false);
    setFault(false);
    setLastValues(next);
    try {
      await createHrAccessRequest({ type: 'add_hr', ...next });
      setProposed(true);
    } catch (caught) {
      if (
        caught instanceof ApiError &&
        caught.status === 409 &&
        caught.code === 'EMAIL_TAKEN'
      ) {
        setEmailTaken(true);
      } else {
        setFault(true);
      }
    } finally {
      setPending(false);
    }
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The employee create schema already carries the exact name/email/
    // position/phone rules the server enforces, so both screens refuse the
    // same input with the same wording.
    const parsed = employeeCreateFormSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(toProfileFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    void handleSubmit({
      name: parsed.data.name,
      email: parsed.data.email,
      position: parsed.data.position,
      phone: parsed.data.phone,
    });
  }

  const setField = (field: ProfileField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) =>
      current[field] === undefined ? current : { ...current, [field]: undefined },
    );
    if (field === 'email') {
      setEmailTaken(false);
    }
    setFault(false);
  };

  const errorText = (field: ProfileField): string | null => {
    if (field === 'email' && emailTaken) {
      return t('form.error.emailTaken');
    }
    const key = fieldErrors[field];
    return key === undefined ? null : t(key);
  };

  const renderFieldError = (field: ProfileField) => {
    const text = errorText(field);
    if (text === null) {
      return null;
    }
    return (
      <p
        data-testid={`hr-add-error-${field}`}
        role="alert"
        className="flex items-start gap-[var(--space-sm)] rounded-[var(--radius-sm)] bg-[var(--color-danger-bg)] px-[var(--space-md)] py-[var(--space-sm)] font-medium text-[color:var(--color-danger)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]"
      >
        <AlertIcon size={20} className="mt-[var(--space-xs)] shrink-0" />
        <span>{text}</span>
      </p>
    );
  };

  return (
    <section data-testid="hr-add" className="mx-auto max-w-2xl">
      <h1 className="font-bold text-[color:var(--color-text-strong)] [font-size:var(--text-xl)] [line-height:var(--text-xl-line-height)]">
        {t('hr.add.title')}
      </h1>

      {proposed ? (
        <div
          data-testid="hr-add-pending"
          className={`mt-[var(--space-xl)] ${cardClassName}`}
        >
          <h2 className="font-semibold text-[color:var(--color-text-strong)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)]">
            {t('hr.add.pendingTitle')}
          </h2>
          <p className="text-[color:var(--color-text-muted)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
            {t('hr.add.pendingDescription')}
          </p>
          <div className="flex flex-wrap gap-[var(--space-md)]">
            <Link
              to="/approvals"
              data-testid="hr-add-open-approvals"
              className={primaryButtonClassName}
            >
              {t('hr.add.pendingOpenApprovals')}
            </Link>
            <Link to="/hr" className={secondaryButtonClassName}>
              {t('hr.accounts.title')}
            </Link>
          </div>
        </div>
      ) : (
        <div className={`mt-[var(--space-xl)] ${cardClassName}`}>
          <form
            onSubmit={handleFormSubmit}
            noValidate
            className="flex flex-col gap-[var(--space-lg)]"
          >
            <div className="flex flex-col gap-[var(--space-xs)]">
              <label htmlFor="hr-add-name" className={labelClassName}>
                {t('form.name')}
              </label>
              <input
                id="hr-add-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={values.name}
                onChange={(event) => setField('name', event.target.value)}
                aria-invalid={fieldErrors.name !== undefined}
                className={inputClassName(fieldErrors.name !== undefined)}
              />
              {renderFieldError('name')}
            </div>

            <div className="flex flex-col gap-[var(--space-xs)]">
              <label htmlFor="hr-add-email" className={labelClassName}>
                {t('form.email')}
              </label>
              <input
                id="hr-add-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={values.email}
                onChange={(event) => setField('email', event.target.value)}
                aria-invalid={fieldErrors.email !== undefined || emailTaken}
                className={inputClassName(
                  fieldErrors.email !== undefined || emailTaken,
                )}
              />
              {renderFieldError('email')}
            </div>

            <div className="flex flex-col gap-[var(--space-xs)]">
              <label htmlFor="hr-add-position" className={labelClassName}>
                {t('form.position')}
              </label>
              <input
                id="hr-add-position"
                name="position"
                type="text"
                required
                value={values.position}
                onChange={(event) => setField('position', event.target.value)}
                aria-invalid={fieldErrors.position !== undefined}
                className={inputClassName(fieldErrors.position !== undefined)}
              />
              {renderFieldError('position')}
            </div>

            <div className="flex flex-col gap-[var(--space-xs)]">
              <label htmlFor="hr-add-phone" className={labelClassName}>
                {t('form.phone')}
              </label>
              <input
                id="hr-add-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                required
                value={values.phone}
                onChange={(event) => setField('phone', event.target.value)}
                aria-invalid={fieldErrors.phone !== undefined}
                className={inputClassName(fieldErrors.phone !== undefined)}
              />
              {renderFieldError('phone')}
            </div>

            <div>
              <button
                type="submit"
                data-testid="hr-add-submit"
                disabled={pending}
                aria-busy={pending}
                className={primaryButtonClassName}
              >
                {t('hr.add.submit')}
              </button>
            </div>
          </form>
        </div>
      )}

      {fault && (
        <div className="mt-[var(--space-xl)]">
          <ServerErrorState
            title={t('form.error.save')}
            onRetry={() => {
              if (lastValues !== null) {
                void handleSubmit(lastValues);
              }
            }}
            actionVariant="secondary"
          />
        </div>
      )}
    </section>
  );
}
