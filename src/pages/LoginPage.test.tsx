import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../i18n/id';
import { I18nProvider } from '../i18n/provider';
import { ApiError } from '../services/api';
import { SessionContext, type SessionValue } from '../services/session';
import LoginPage from './LoginPage';

function makeSession(overrides: Partial<SessionValue> = {}): SessionValue {
  return {
    session: null,
    status: 'anon',
    refresh: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };
}

function renderLogin(value: SessionValue) {
  return render(
    <SessionContext.Provider value={value}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/karyawan" element={<div>karyawan-destination</div>} />
            <Route
              path="/first-login"
              element={<div>first-login-destination</div>}
            />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </SessionContext.Provider>,
  );
}

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  email = 'admin@corp.test',
  password = 'secret-1',
) {
  await user.type(screen.getByLabelText(id['login.emailLabel']), email);
  await user.type(screen.getByLabelText(id['login.passwordLabel']), password);
  await user.click(screen.getByRole('button', { name: id['login.submit'] }));
}

describe('LoginPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('renders the Indonesian sign-in form copy', () => {
    renderLogin(makeSession());

    expect(screen.getByTestId('login')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: id['login.title'] }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(id['login.emailLabel'])).toBeInTheDocument();
    expect(screen.getByLabelText(id['login.passwordLabel'])).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: id['login.submit'] }),
    ).toBeInTheDocument();
  });

  it('submits the typed credentials and routes to the employee list', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue({
      role: 'hrd',
      mustChangePassword: false,
    });
    renderLogin(makeSession({ login }));

    await fillAndSubmit(user);

    expect(login).toHaveBeenCalledWith('admin@corp.test', 'secret-1');
    expect(await screen.findByText('karyawan-destination')).toBeInTheDocument();
  });

  it('routes to the forced first-password screen when the flag is set', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue({
      role: 'hrd',
      mustChangePassword: true,
    });
    renderLogin(makeSession({ login }));

    await fillAndSubmit(user);

    expect(await screen.findByText('first-login-destination')).toBeInTheDocument();
  });

  it('shows the generic failure plus the attempts left on a rejected sign-in', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockRejectedValue(
      new ApiError(401, 'AUTH_INVALID', 'Email atau kata sandi salah.', 3),
    );
    renderLogin(makeSession({ login }));

    await fillAndSubmit(user);

    const alert = await screen.findByTestId('login-error');
    expect(alert).toHaveTextContent(id['login.error.invalid']);
    expect(screen.getByTestId('login-attempts')).toHaveTextContent(
      id['login.error.attemptsRemaining'].replace('{count}', '3'),
    );
    expect(screen.queryByText('karyawan-destination')).not.toBeInTheDocument();
  });

  it('never leaks which field was wrong in the rejected-credential copy', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockRejectedValue(
      new ApiError(401, 'AUTH_INVALID', 'Pengguna tidak ditemukan.', 1),
    );
    renderLogin(makeSession({ login }));

    await fillAndSubmit(user, 'nobody@corp.test');

    const alert = await screen.findByTestId('login-error');
    expect(alert).not.toHaveTextContent('nobody@corp.test');
    expect(alert).not.toHaveTextContent('Pengguna tidak ditemukan');
    expect(alert).toHaveTextContent(id['login.error.invalid']);
  });

  it('omits the attempts line when the server stopped counting them', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockRejectedValue(
      new ApiError(401, 'AUTH_INVALID', 'Email atau kata sandi salah.'),
    );
    renderLogin(makeSession({ login }));

    await fillAndSubmit(user);

    expect(await screen.findByTestId('login-error')).toHaveTextContent(
      id['login.error.invalid'],
    );
    expect(screen.queryByTestId('login-attempts')).not.toBeInTheDocument();
  });

  it('shows the lockout message on a 423 answer', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockRejectedValue(
      new ApiError(
        423,
        'AUTH_LOCKED',
        'Akun dikunci setelah terlalu banyak percobaan gagal.',
      ),
    );
    renderLogin(makeSession({ login }));

    await fillAndSubmit(user);

    expect(await screen.findByTestId('login-error')).toHaveTextContent(
      id['login.error.locked'],
    );
  });

  it('shows the retry-able connection copy when the network fails', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockRejectedValue(
      new ApiError(0, 'NETWORK_ERROR', 'The request could not reach the server.'),
    );
    renderLogin(makeSession({ login }));

    await fillAndSubmit(user);

    expect(await screen.findByTestId('login-error')).toHaveTextContent(
      id['auth.error.network'],
    );
    expect(
      screen.getByRole('button', { name: id['login.submit'] }),
    ).toBeEnabled();
  });

  it('disables the submit button while the sign-in is in flight', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockReturnValue(new Promise(() => {}));
    renderLogin(makeSession({ login }));

    await user.type(
      screen.getByLabelText(id['login.emailLabel']),
      'admin@corp.test',
    );
    await user.type(
      screen.getByLabelText(id['login.passwordLabel']),
      'secret-1',
    );
    await user.click(screen.getByRole('button', { name: id['login.submit'] }));

    expect(
      screen.getByRole('button', { name: id['login.submit'] }),
    ).toBeDisabled();
  });

  it('renders the English copy when English is the stored language', async () => {
    window.localStorage.setItem('lang', 'en');
    const user = userEvent.setup();
    const login = vi.fn().mockRejectedValue(
      new ApiError(401, 'AUTH_INVALID', 'Email or password is incorrect.', 2),
    );
    renderLogin(makeSession({ login }));

    await user.type(screen.getByLabelText('Email'), 'admin@corp.test');
    await user.type(screen.getByLabelText('Password'), 'secret-1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const alert = await screen.findByTestId('login-error');
    expect(alert).toHaveTextContent('Email or password is incorrect.');
    expect(screen.getByTestId('login-attempts')).toHaveTextContent(
      'Attempts remaining: 2',
    );
  });
});
