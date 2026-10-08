import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DictKey } from '../i18n/id';
import { useI18n } from '../i18n/provider';
import { ApiError } from '../services/api';
import { setFirstPassword } from '../services/auth';
import { useSession } from '../services/session';

/**
 * Turns a failed password change into display copy: a weak password shows
 * the server's own message, an unreachable server and anything else get
 * their generic retry copy.
 */
function describeError(error: unknown, t: (key: DictKey) => string): string {
  if (error instanceof ApiError) {
    if (error.status === 400 && error.code === 'PASSWORD_WEAK' && error.message !== '') {
      return error.message;
    }
    if (error.status === 0) {
      return t('auth.error.network');
    }
  }
  return t('auth.error.generic');
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
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('firstLogin.mismatch'));
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

  const fieldClass =
    'mt-1 h-11 w-full rounded-md border border-gray-300 px-3 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600';

  return (
    <section
      data-testid="first-login"
      className="flex min-h-screen items-center justify-center bg-gray-50 px-4"
    >
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">
          {t('firstLogin.title')}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{t('firstLogin.subtitle')}</p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="first-login-new-password"
              className="block text-sm font-medium text-gray-700"
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
            <p id="first-login-hint" className="mt-1 text-sm text-gray-500">
              {t('firstLogin.hint')}
            </p>
          </div>
          <div>
            <label
              htmlFor="first-login-confirm-password"
              className="block text-sm font-medium text-gray-700"
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

          {error !== null && (
            <div
              role="alert"
              data-testid="first-login-error"
              className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            data-testid="first-login-submit"
            disabled={submitting}
            aria-busy={submitting}
            className="min-h-[44px] w-full rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {t('firstLogin.submit')}
          </button>
        </form>
      </div>
    </section>
  );
}
