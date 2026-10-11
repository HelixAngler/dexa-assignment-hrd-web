import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../i18n/id';
import { I18nProvider } from '../i18n/provider';
import ChangePasswordPage from './ChangePasswordPage';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function LocationProbe() {
  const location = useLocation();
  return (
    <div>
      <span data-testid="location-path">{location.pathname}</span>
    </div>
  );
}

function renderPassword() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/ganti-sandi']}>
        <LocationProbe />
        <ChangePasswordPage />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('ChangePasswordPage', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function expectPath(path: string) {
    expect(screen.getByTestId('location-path')).toHaveTextContent(
      new RegExp(`^${path}$`),
    );
  }

  async function fillAndSubmit(
    user: ReturnType<typeof userEvent.setup>,
    current: string,
    next: string,
    confirm: string,
  ) {
    const type = async (name: string, text: string) => {
      if (text !== '') {
        await user.type(screen.getByLabelText(name), text);
      }
    };
    await type(id['password.currentLabel'], current);
    await type(id['password.newLabel'], next);
    await type(id['password.confirmLabel'], confirm);
    await user.click(screen.getByTestId('password-save'));
  }

  it('states the password rules next to the new field and the session note', () => {
    renderPassword();

    expect(
      screen.getByRole('heading', { name: id['password.title'] }),
    ).toBeInTheDocument();
    const rules = screen.getByTestId('password-rules');
    expect(rules).toHaveTextContent(id['password.hint.min']);
    expect(rules).toHaveTextContent(id['password.hint.printable']);
    expect(rules).toHaveTextContent(id['password.hint.avoidCommon']);
    expect(screen.getByLabelText(id['password.newLabel'])).toHaveAttribute(
      'aria-describedby',
      'password-rules',
    );
    expect(screen.getByTestId('password-note')).toHaveTextContent(
      id['password.note'],
    );
  });

  it('blocks a mismatched confirmation before any request is made', async () => {
    const user = userEvent.setup();
    renderPassword();

    await fillAndSubmit(user, 'old-secret-1', 'brand-new-pass', 'different-pass');

    expect(await screen.findByTestId('password-error')).toHaveTextContent(
      id['password.mismatch'],
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expectPath('/ganti-sandi');
  });

  it('blocks a new password that is shorter than the minimum', async () => {
    const user = userEvent.setup();
    renderPassword();

    await fillAndSubmit(user, 'old-secret-1', 'short', 'short');

    expect(await screen.findByTestId('password-error')).toHaveTextContent(
      id['password.error.tooShort'],
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires the current password before anything else is checked', async () => {
    const user = userEvent.setup();
    renderPassword();

    await fillAndSubmit(user, '', 'brand-new-pass', 'brand-new-pass');

    expect(await screen.findByTestId('password-error')).toHaveTextContent(
      id['password.error.currentRequired'],
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts the change and swaps the form for the done panel', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({}));
    renderPassword();

    await fillAndSubmit(user, 'old-secret-1', 'brand-new-pass', 'brand-new-pass');

    const success = await screen.findByTestId('password-success');
    expect(success).toHaveTextContent(id['password.success']);
    expect(success).toHaveTextContent(id['password.successNote']);
    expect(screen.queryByTestId('password-save')).not.toBeInTheDocument();
    expectPath('/ganti-sandi');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/identity/auth/password/change');
    expect(JSON.parse(init.body as string)).toEqual({
      currentPassword: 'old-secret-1',
      newPassword: 'brand-new-pass',
    });

    await user.click(screen.getByTestId('password-done'));
    expectPath('/karyawan');
  });

  it('leaves the console for the Karyawan list when cancel is used', async () => {
    const user = userEvent.setup();
    renderPassword();

    await user.click(screen.getByTestId('password-cancel'));

    expectPath('/karyawan');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the server PASSWORD_WEAK message without leaving the page', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          statusCode: 400,
          code: 'PASSWORD_WEAK',
          message: 'Kata sandi ini tercantum dalam daftar kata sandi bocor.',
        },
        400,
      ),
    );
    renderPassword();

    await fillAndSubmit(user, 'old-secret-1', 'brand-new-pass', 'brand-new-pass');

    expect(await screen.findByTestId('password-error')).toHaveTextContent(
      'Kata sandi ini tercantum dalam daftar kata sandi bocor.',
    );
    expectPath('/ganti-sandi');
  });

  it('reports a wrong current password with the local copy when the server sends none', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse({ statusCode: 401, code: 'AUTH_INVALID', message: '' }, 401),
    );
    renderPassword();

    await fillAndSubmit(user, 'wrong-one', 'brand-new-pass', 'brand-new-pass');

    expect(await screen.findByTestId('password-error')).toHaveTextContent(
      id['password.error.currentWrong'],
    );
    expectPath('/ganti-sandi');
  });

  it('hands an unreachable server to the shared server-error state and retries the same change', async () => {
    const user = userEvent.setup();
    let post = 0;
    fetchMock.mockImplementation(() => {
      post += 1;
      if (post === 1) {
        return Promise.reject(new TypeError('Failed to fetch'));
      }
      return Promise.resolve(jsonResponse({}));
    });
    renderPassword();

    await fillAndSubmit(user, 'old-secret-1', 'brand-new-pass', 'brand-new-pass');

    const state = await screen.findByTestId('server-error-state');
    expect(state).toHaveTextContent(id['auth.error.network']);
    expect(state).toHaveTextContent(id['state.serverError.description']);
    expect(screen.queryByTestId('password-error')).not.toBeInTheDocument();
    expectPath('/ganti-sandi');

    await user.click(screen.getByTestId('retry-button'));

    await waitFor(() =>
      expect(screen.getByTestId('password-success')).toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('routes an unexpected server failure through the same shared state', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse({ statusCode: 500, code: 'INTERNAL', message: 'boom' }, 500),
    );
    renderPassword();

    await fillAndSubmit(user, 'old-secret-1', 'brand-new-pass', 'brand-new-pass');

    const state = await screen.findByTestId('server-error-state');
    expect(state).toHaveTextContent(id['auth.error.generic']);
    expect(screen.queryByTestId('password-error')).not.toBeInTheDocument();
    expectPath('/ganti-sandi');
  });
});
