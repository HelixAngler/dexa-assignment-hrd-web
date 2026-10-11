import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertIcon, CheckIcon } from '../components/icons';
import { ServerErrorState } from '../components/states';
import type { DictKey } from '../i18n/id';
import { useI18n } from '../i18n/provider';
import { ApiError } from '../services/api';
import { changePassword } from '../services/auth';

/** Shortest replacement password the strength rule accepts. */
const MIN_PASSWORD_LENGTH = 8;

/** How a failed change is reported back to the form. */
interface ChangeError {
  /** Copy for the failure. */
  text: string;
  /** True when only the shared server-error state should show it. */
  fault: boolean;
}

/**
 * Classifies a failed change: a rejected replacement and a wrong current
 * password are shown next to the fields (the input has to change to pass),
 * while an unreachable server and anything else is a fault the shared
 * server-error state owns — nothing was written, so it can say so and offer
 * a retry of the same values.
 */
function describeError(error: unknown, t: (key: DictKey) => string): ChangeError {
  if (error instanceof ApiError) {
    if (error.code === 'PASSWORD_WEAK') {
      return {
        text: error.message !== '' ? error.message : t('password.error.weak'),
        fault: false,
      };
    }
    if (error.status === 401) {
      return {
        text:
          error.message !== ''
            ? error.message
            : t('password.error.currentWrong'),
        fault: false,
      };
    }
    if (error.status === 0) {
      return { text: t('auth.error.network'), fault: true };
    }
  }
  return { text: t('auth.error.generic'), fault: true };
}

/** Label above a field: medium weight, small size, muted-free colour. */
const labelClass =
  'font-medium text-[color:var(--color-text)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]';

/** Field box: 44 px floor, surface fill, primary focus ring. */
const fieldClass =
  'min-h-[44px] w-full rounded-[var(--radius-sm)] border border-[color:var(--color-border)] bg-[var(--color-surface)] px-[var(--space-md)] text-[color:var(--color-text-strong)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)] focus:border-[color:var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-page)] disabled:text-[color:var(--color-text-muted)]';

/** Primary save and ghost cancel of the action row. */
const saveClass =
  'inline-flex min-h-[44px] w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-[var(--space-lg)] font-semibold text-[color:var(--color-on-primary)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)] disabled:cursor-not-allowed disabled:bg-[var(--color-border)] disabled:text-[color:var(--color-text-muted)] sm:flex-1';
const cancelClass =
  'inline-flex min-h-[44px] w-full items-center justify-center rounded-[var(--radius-md)] px-[var(--space-lg)] font-semibold text-[color:var(--color-text)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)] hover:bg-[var(--color-page)] hover:text-[color:var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)] sm:flex-1';

/**
 * Self-service password change for the signed-in HRD account: the current
 * password proves ownership, the replacement is checked against the length
 * rule and matched against its confirmation before anything is sent, and the
 * server's strength verdict is shown inline while an unreachable server hands
 * off to the shared server-error state, which retries the same values. The
 * note states that the present session survives while other devices are
 * signed out; a successful change swaps the form for a done panel that leads
 * back to the Karyawan list.
 */
export default function ChangePasswordPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<ChangeError | null>(null);

  const inlineError = error !== null && !error.fault ? error.text : null;
  const faultTitle = error !== null && error.fault ? error.text : null;

  async function submit() {
    if (submitting) {
      return;
    }
    setError(null);
    if (currentPassword === '') {
      setError({ text: t('password.error.currentRequired'), fault: false });
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError({ text: t('password.error.tooShort'), fault: false });
      return;
    }
    if (newPassword !== confirmPassword) {
      setError({ text: t('password.mismatch'), fault: false });
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setDone(true);
    } catch (caught) {
      setError(describeError(caught, t));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  if (done) {
    return (
      <section data-testid="change-password" className="space-y-6">
        <h1 className="text-xl font-bold leading-8 text-[color:var(--color-text-strong)]">
          {t('password.title')}
        </h1>
        <div
          data-testid="password-success"
          role="status"
          className="rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[var(--color-surface)] p-[var(--space-lg)] shadow-[var(--shadow-card)]"
        >
          <div className="flex items-start gap-[var(--space-sm)] rounded-[var(--radius-sm)] bg-[var(--color-primary-subtle)] px-[var(--space-md)] py-[var(--space-sm)]">
            <CheckIcon
              size={20}
              className="mt-[var(--space-xs)] flex-none text-[color:var(--color-primary)]"
            />
            <div className="min-w-0 space-y-1">
              <p className="font-semibold text-[color:var(--color-text-strong)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
                {t('password.success')}
              </p>
              <p className="text-[color:var(--color-text)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
                {t('password.successNote')}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="password-done"
            onClick={() => navigate('/karyawan')}
            className={`${saveClass} mt-[var(--space-lg)]`}
          >
            {t('password.done')}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section data-testid="change-password" className="space-y-6">
      <h1 className="text-xl font-bold leading-8 text-[color:var(--color-text-strong)]">
        {t('password.title')}
      </h1>
      <div className="rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[var(--color-surface)] p-[var(--space-lg)] shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-[var(--space-sm)] rounded-[var(--radius-sm)] bg-[var(--color-primary-subtle)] px-[var(--space-md)] py-[var(--space-sm)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
          <AlertIcon
            size={20}
            className="mt-[var(--space-xs)] flex-none text-[color:var(--color-primary)]"
          />
          <p
            data-testid="password-note"
            className="min-w-0 text-[color:var(--color-text)]"
          >
            {t('password.note')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-[var(--space-lg)] flex flex-col gap-[var(--space-xl)]">
          <div className="flex flex-col gap-[var(--space-xs)]">
            <label htmlFor="change-password-current" className={labelClass}>
              {t('password.currentLabel')}
            </label>
            <input
              id="change-password-current"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              aria-required="true"
              value={currentPassword}
              onChange={(event) => {
                setCurrentPassword(event.target.value);
                setError(null);
              }}
              className={fieldClass}
            />
          </div>

          <div className="flex flex-col gap-[var(--space-xs)]">
            <label htmlFor="change-password-new" className={labelClass}>
              {t('password.newLabel')}
            </label>
            <input
              id="change-password-new"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              aria-required="true"
              aria-describedby="password-rules"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                setError(null);
              }}
              className={fieldClass}
            />
            <ul
              id="password-rules"
              data-testid="password-rules"
              className="list-disc space-y-1 pl-6 text-[color:var(--color-text-muted)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]"
            >
              <li>{t('password.hint.min')}</li>
              <li>{t('password.hint.printable')}</li>
              <li>{t('password.hint.avoidCommon')}</li>
            </ul>
          </div>

          <div className="flex flex-col gap-[var(--space-xs)]">
            <label htmlFor="change-password-confirm" className={labelClass}>
              {t('password.confirmLabel')}
            </label>
            <input
              id="change-password-confirm"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-required="true"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setError(null);
              }}
              className={fieldClass}
            />
            {inlineError !== null && (
              <div
                id="password-error"
                data-testid="password-error"
                role="alert"
                className="flex items-start gap-[var(--space-sm)] rounded-[var(--radius-sm)] bg-[var(--color-danger-bg)] px-[var(--space-md)] py-[var(--space-sm)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]"
              >
                <AlertIcon
                  size={20}
                  className="mt-[var(--space-xs)] flex-none text-[color:var(--color-danger)]"
                />
                <p className="min-w-0 font-medium text-[color:var(--color-text-strong)]">
                  {inlineError}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-[var(--space-sm)] sm:flex-row">
            <button
              type="submit"
              data-testid="password-save"
              disabled={submitting}
              aria-busy={submitting}
              className={saveClass}
            >
              {t('password.save')}
            </button>
            <button
              type="button"
              data-testid="password-cancel"
              onClick={() => navigate('/karyawan')}
              className={cancelClass}
            >
              {t('password.cancel')}
            </button>
          </div>
        </form>

        {faultTitle !== null && (
          <div className="mt-[var(--space-lg)]">
            <ServerErrorState
              title={faultTitle}
              onRetry={() => void submit()}
              actionVariant="secondary"
            />
          </div>
        )}
      </div>
    </section>
  );
}
