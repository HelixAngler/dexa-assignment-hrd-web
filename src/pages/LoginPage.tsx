import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ServerErrorState } from '../components/states';
import { LanguageToggle, useI18n } from '../i18n/provider';
import { ApiError } from '../services/api';
import { useSession } from '../services/session';

/** Which user-facing message a failed sign-in attempt maps to. */
type LoginErrorKind = 'invalid' | 'locked' | 'network' | 'generic';

interface LoginErrorView {
  kind: LoginErrorKind;
  attemptsRemaining?: number;
}

/** True when only the shared server-error state should carry the message. */
function isServerFault(error: LoginErrorView | null): boolean {
  return error !== null && (error.kind === 'network' || error.kind === 'generic');
}

/**
 * Classifies a thrown sign-in failure: unreachable server, lockout, rejected
 * credentials (with the attempts the server still allows) and everything
 * else, which falls back to a generic retry message. The server text is
 * never shown, so the answer cannot tell an attacker whether the email exists.
 */
function toLoginErrorView(error: unknown): LoginErrorView {
  if (!(error instanceof ApiError)) {
    return { kind: 'generic' };
  }
  if (error.status === 0) {
    return { kind: 'network' };
  }
  if (error.code === 'AUTH_LOCKED' || error.status === 423) {
    return { kind: 'locked' };
  }
  if (error.code === 'AUTH_INVALID' || error.status === 401) {
    return { kind: 'invalid', attemptsRemaining: error.attemptsRemaining };
  }
  return { kind: 'generic' };
}

/**
 * Sign-in screen for the HRD console. One generic failure message covers
 * every rejected credential, optionally extended with how many attempts the
 * server still allows; lockout is answered inline next to the form while an
 * unreachable server hands off to the shared server-error state, which
 * re-sends the same typed credentials. A successful submit is re-interpreted
 * by the route guard: HRD sessions enter the console, temporary passwords
 * land on the forced change screen and any other role lands on the
 * access-denied view.
 */
export default function LoginPage() {
  const { t } = useI18n();
  const { login } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<LoginErrorView | null>(null);

  const errorText =
    error === null
      ? null
      : error.kind === 'invalid'
        ? t('login.error.invalid')
        : error.kind === 'locked'
          ? t('login.error.locked')
          : error.kind === 'network'
            ? t('auth.error.network')
            : t('auth.error.generic');

  async function attempt() {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const session = await login(email, password);
      navigate(session.mustChangePassword ? '/first-login' : '/karyawan', {
        replace: true,
      });
    } catch (caught) {
      setError(toLoginErrorView(caught));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void attempt();
  }

  const fieldClass =
    'mt-1 h-11 w-full rounded-md border border-gray-300 px-3 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600';

  return (
    <section
      data-testid="login"
      className="relative flex min-h-screen items-center justify-center bg-gray-50 px-4"
    >
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">
          {t('login.title')}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{t('login.subtitle')}</p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-sm font-medium text-gray-700"
            >
              {t('login.emailLabel')}
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-gray-700"
            >
              {t('login.passwordLabel')}
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={fieldClass}
            />
          </div>

          {error !== null && errorText !== null && (
            isServerFault(error) ? (
              <ServerErrorState title={errorText} onRetry={() => void attempt()} />
            ) : (
              <div
                role="alert"
                data-testid="login-error"
                className="space-y-1 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                <p>{errorText}</p>
                {error.kind === 'invalid' &&
                  typeof error.attemptsRemaining === 'number' && (
                    <p
                      data-testid="login-attempts"
                      className="font-medium text-red-800"
                    >
                      {t('login.error.attemptsRemaining').replace(
                        '{count}',
                        String(error.attemptsRemaining),
                      )}
                    </p>
                  )}
              </div>
            )
          )}

          <button
            type="submit"
            data-testid="login-submit"
            disabled={submitting}
            aria-busy={submitting}
            className="min-h-[44px] w-full rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {t('login.submit')}
          </button>
        </form>
      </div>
    </section>
  );
}
