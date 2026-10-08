import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionProvider, useSession } from './session';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function Probe() {
  const { session, status, refresh, login, logout } = useSession();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="session">
        {session
          ? `${session.role}:${String(session.mustChangePassword)}`
          : 'none'}
      </span>
      <button
        type="button"
        data-testid="do-login"
        onClick={() => void login('admin@corp.test', 'secret-1')}
      >
        login
      </button>
      <button type="button" data-testid="do-logout" onClick={() => void logout()}>
        logout
      </button>
      <button type="button" data-testid="do-refresh" onClick={() => void refresh()}>
        refresh
      </button>
    </div>
  );
}

function renderProvider() {
  return render(
    <SessionProvider>
      <Probe />
    </SessionProvider>,
  );
}

describe('SessionProvider', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts as loading and settles on anonymous when the probe is unauthenticated', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { statusCode: 401, code: 'AUTH_REQUIRED', message: 'no' },
        401,
      ),
    );
    renderProvider();

    expect(screen.getByTestId('status')).toHaveTextContent('loading');

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('anon'),
    );
    expect(screen.getByTestId('session')).toHaveTextContent('none');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/identity/profile');
  });

  it('settles on authed with the probed profile when a session cookie is valid', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        name: 'Sari',
        email: 'admin@corp.test',
        position: 'HRD',
        phone: '0812000000',
        photoUrl: null,
        role: 'hrd',
        mustChangePassword: false,
      }),
    );
    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authed'),
    );
    expect(screen.getByTestId('session')).toHaveTextContent('hrd:false');
  });

  it('treats a failed probe as anonymous instead of spinning forever', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('anon'),
    );
  });

  it('moves to authed after a successful login and back to anon after logout', async () => {
    const user = userEvent.setup();
    let signedIn = false;
    fetchMock.mockImplementation((url: string) => {
      if (String(url).endsWith('/auth/login')) {
        signedIn = true;
        return Promise.resolve(
          jsonResponse({ role: 'hrd', mustChangePassword: false }),
        );
      }
      if (!signedIn) {
        return Promise.resolve(
          jsonResponse(
            { statusCode: 401, code: 'AUTH_REQUIRED', message: 'no' },
            401,
          ),
        );
      }
      return Promise.resolve(
        jsonResponse({
          name: 'Sari',
          email: 'admin@corp.test',
          position: 'HRD',
          phone: '0812000000',
          photoUrl: null,
        }),
      );
    });
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('anon'),
    );

    await user.click(screen.getByTestId('do-login'));

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authed'),
    );
    expect(screen.getByTestId('session')).toHaveTextContent('hrd:false');

    await user.click(screen.getByTestId('do-logout'));

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('anon'),
    );
    expect(screen.getByTestId('session')).toHaveTextContent('none');
  });

  it('keeps the forced-change flag visible after login when the profile omits it', async () => {
    const user = userEvent.setup();
    let signedIn = false;
    fetchMock.mockImplementation((url: string) => {
      if (String(url).endsWith('/auth/login')) {
        signedIn = true;
        return Promise.resolve(
          jsonResponse({ role: 'hrd', mustChangePassword: true }),
        );
      }
      if (!signedIn) {
        return Promise.resolve(
          jsonResponse(
            { statusCode: 401, code: 'AUTH_REQUIRED', message: 'no' },
            401,
          ),
        );
      }
      return Promise.resolve(
        jsonResponse({
          name: 'Sari',
          email: 'admin@corp.test',
          position: 'HRD',
          phone: '0812000000',
          photoUrl: null,
        }),
      );
    });
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('anon'),
    );

    await user.click(screen.getByTestId('do-login'));

    await waitFor(() =>
      expect(screen.getByTestId('session')).toHaveTextContent('hrd:true'),
    );
  });

  it('throws when the hook is used without a provider', () => {
    expect(() => render(<Probe />)).toThrow(/useSession/);
  });
});
