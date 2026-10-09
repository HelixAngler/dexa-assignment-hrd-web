import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../i18n/id';
import { I18nProvider } from '../i18n/provider';
import { ApiError } from '../services/api';
import { SessionContext, type SessionValue } from '../services/session';
import * as authService from '../services/auth';
import FirstLoginPage from './FirstLoginPage';

vi.mock('../services/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/auth')>();
  return { ...actual, setFirstPassword: vi.fn() };
});

function makeSession(overrides: Partial<SessionValue> = {}): SessionValue {
  return {
    session: { role: 'hrd', mustChangePassword: true },
    status: 'authed',
    refresh: vi.fn().mockResolvedValue(undefined),
    login: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };
}

function renderFirstLogin(value: SessionValue) {
  return render(
    <SessionContext.Provider value={value}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/first-login']}>
          <Routes>
            <Route path="/first-login" element={<FirstLoginPage />} />
            <Route path="/karyawan" element={<div>karyawan-destination</div>} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </SessionContext.Provider>,
  );
}

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  next = 'brand-new-pass',
  confirm = 'brand-new-pass',
) {
  await user.type(
    screen.getByLabelText(id['firstLogin.newPasswordLabel']),
    next,
  );
  await user.type(
    screen.getByLabelText(id['firstLogin.confirmPasswordLabel']),
    confirm,
  );
  await user.click(screen.getByRole('button', { name: id['firstLogin.submit'] }));
}

describe('FirstLoginPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.mocked(authService.setFirstPassword).mockReset();
  });

  it('renders the forced-change copy that blocks the console', () => {
    renderFirstLogin(makeSession());

    expect(screen.getByTestId('first-login')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: id['firstLogin.title'] }),
    ).toBeInTheDocument();
    expect(screen.getByText(id['firstLogin.subtitle'])).toBeInTheDocument();
    expect(screen.getByText(id['firstLogin.hint'])).toBeInTheDocument();
  });

  it('posts the new password, re-probes the session and enters the console', async () => {
    const user = userEvent.setup();
    const refresh = vi.fn().mockResolvedValue(undefined);
    vi.mocked(authService.setFirstPassword).mockResolvedValue(undefined);
    renderFirstLogin(makeSession({ refresh }));

    await fillAndSubmit(user);

    expect(authService.setFirstPassword).toHaveBeenCalledWith(
      'brand-new-pass',
      'brand-new-pass',
    );
    expect(refresh).toHaveBeenCalled();
    expect(await screen.findByText('karyawan-destination')).toBeInTheDocument();
  });

  it('refuses to submit while the two fields differ and keeps the values', async () => {
    const user = userEvent.setup();
    renderFirstLogin(makeSession());

    await fillAndSubmit(user, 'brand-new-pass', 'different-pass');

    expect(screen.getByTestId('first-login-error')).toHaveTextContent(
      id['firstLogin.mismatch'],
    );
    expect(authService.setFirstPassword).not.toHaveBeenCalled();
    expect(
      screen.getByLabelText(id['firstLogin.newPasswordLabel']),
    ).toHaveValue('brand-new-pass');
    expect(
      screen.getByLabelText(id['firstLogin.confirmPasswordLabel']),
    ).toHaveValue('different-pass');
  });

  it('shows the server message for a weak password', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.setFirstPassword).mockRejectedValue(
      new ApiError(
        400,
        'PASSWORD_WEAK',
        'Kata sandi terlalu lemah.',
      ),
    );
    renderFirstLogin(makeSession());

    await fillAndSubmit(user);

    expect(await screen.findByTestId('first-login-error')).toHaveTextContent(
      'Kata sandi terlalu lemah.',
    );
  });

  it('hands a network failure to the shared server-error state with a working retry', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.setFirstPassword)
      .mockRejectedValueOnce(
        new ApiError(0, 'NETWORK_ERROR', 'The request could not reach the server.'),
      )
      .mockResolvedValue(undefined);
    const refresh = vi.fn().mockResolvedValue(undefined);
    renderFirstLogin(makeSession({ refresh }));

    await fillAndSubmit(user);

    const state = await screen.findByTestId('server-error-state');
    expect(state).toHaveTextContent(id['auth.error.network']);
    expect(state).toHaveTextContent(id['state.serverError.description']);
    expect(screen.queryByTestId('first-login-error')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('retry-button'));

    expect(await screen.findByText('karyawan-destination')).toBeInTheDocument();
    expect(authService.setFirstPassword).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('routes an unexpected server failure through the same shared state', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.setFirstPassword).mockRejectedValue(
      new ApiError(500, 'INTERNAL', 'boom'),
    );
    renderFirstLogin(makeSession());

    await fillAndSubmit(user);

    const state = await screen.findByTestId('server-error-state');
    expect(state).toHaveTextContent(id['auth.error.generic']);
    expect(screen.queryByTestId('first-login-error')).not.toBeInTheDocument();
    expect(
      screen.getByLabelText(id['firstLogin.newPasswordLabel']),
    ).toHaveValue('brand-new-pass');
  });
});
