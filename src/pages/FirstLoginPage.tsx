import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertIcon } from '../components/icons';
import { ServerErrorState } from '../components/states';
import type { DictKey } from '../i18n/id';
import { LanguageToggle, useI18n } from '../i18n/provider';
import { ApiError } from '../services/api';
import { setFirstPassword } from '../services/auth';
import { useSession } from '../services/session';

/** How a failed password change is reported back to the form. */
interface FirstLoginError {
  /** Copy for the failure. */
  text: string;
  /** True when only the shared server-error state should show it. */
  fault: boolean;
}

/**
 * Classifies a failed password change: a weak password the server rejected is
 * reported inline (the rule text has to change to pass), while an unreachable
 * server and anything else is a fault the shared server-error state owns —
 * nothing was written, so it can say so and offer a retry.
 */
function describeError(error: unknown, t: (key: DictKey) => string): FirstLoginError {
  if (error instanceof ApiError) {
    if (error.code === 'PASSWORD_WEAK') {
      return {
        text: error.message !== '' ? error.message : t('auth.error.generic'),
        fault: false,
      };
    }
    if (error.status === 0) {
      return { text: t('auth.error.network'), fault: true };
    }
  }
  return { text: t('auth.error.generic'), fault: true };
}

/**
 * Forced password change shown before anything else in the console is
 * reachable while the account still uses its temporary password. The two
 * fields must match client-side before the request goes out; on success the
 * session is re-probed so the route guard releases the user to Karyawan.
 */
export default function FirstLoginPage() {
  const { t } = useI18n();
  const { refresh } = useSession();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<FirstLoginError | null>(null);

  async function submit() {
    if (submitting) {
      return;
    }
    if (newPassword !== confirmPassword) {
      setError({ text: t('firstLogin.mismatch'), fault: false });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await setFirstPassword(newPassword, confirmPassword);
      await refresh();
      navigate('/karyawan', { replace: true });
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

  /** Field box shared by both password inputs: 44 px floor, token colours. */
  const fieldClass =
    'mt-1 min-h-[44px] w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base leading-6 text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:bg-[var(--color-page)] disabled:text-[var(--color-text-muted)]';

  return (
    <section
      data-testid="first-login"
      className="flex min-h-[100dvh] flex-col bg-[var(--color-page)] text-base leading-6 text-[var(--color-text)]"
    >
      <div className="flex items-center justify-end px-4 py-3 md:px-6">
        <LanguageToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-6">
        <div className="w-full max-w-[40ch] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
          <p className="text-sm font-semibold leading-5 text-[var(--color-primary)]">
            {t('shell.appName')}
          </p>
          <h1 className="mt-1 text-xl font-bold leading-8 text-[var(--color-text-strong)]">
            {t('firstLogin.title')}
          </h1>
          <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">
            {t('firstLogin.subtitle')}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="first-login-new-password"
                className="text-sm font-medium leading-5 text-[var(--color-text)]"
              >
                {t('firstLogin.newPasswordLabel')}
              </label>
              <input
                id="first-login-new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                aria-describedby="first-login-hint"
                className={fieldClass}
              />
              <p
                id="first-login-hint"
                className="text-sm leading-5 text-[var(--color-text-muted)]"
              >
                {t('firstLogin.hint')}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="first-login-confirm-password"
                className="text-sm font-medium leading-5 text-[var(--color-text)]"
              >
                {t('firstLogin.confirmPasswordLabel')}
              </label>
              <input
                id="first-login-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={fieldClass}
              />
            </div>

            {error !== null &&
              (error.fault ? (
                <ServerErrorState
                  title={error.text}
                  onRetry={() => void submit()}
                  actionVariant="secondary"
                />
              ) : (
                <div
                  role="alert"
                  data-testid="first-login-error"
                  className="flex items-start gap-2 rounded-[var(--radius-sm)] bg-[var(--color-danger-bg)] px-3 py-2 text-sm leading-5"
                >
                  <AlertIcon
                    size={20}
                    className="mt-0.5 flex-none text-[var(--color-danger)]"
                  />
                  <p className="min-w-0 font-medium text-[var(--color-text-strong)]">
                    {error.text}
                  </p>
                </div>
              ))}

            <button
              type="submit"
              data-testid="first-login-submit"
              disabled={submitting}
              aria-busy={submitting}
              className="min-h-[44px] w-full rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold leading-5 text-[var(--color-on-primary)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t('firstLogin.submit')}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
