import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api';
import { fetchSession, login, logout, setFirstPassword } from './auth';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('auth service', () => {
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

  describe('login', () => {
    it('posts the credentials to the identity login endpoint', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ role: 'hrd', mustChangePassword: false }),
      );

      const result = await login('admin@corp.test', 'secret-1');

      expect(result).toEqual({ role: 'hrd', mustChangePassword: false });
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/identity/auth/login');
      expect(init.method).toBe('POST');
      expect(init.body).toBe(
        JSON.stringify({ email: 'admin@corp.test', password: 'secret-1' }),
      );
    });

    it('keeps the generic failure code and the attempts left on a 401', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          {
            statusCode: 401,
            code: 'AUTH_INVALID',
            message: 'Email atau kata sandi salah.',
            attemptsRemaining: 3,
          },
          401,
        ),
      );

      await expect(login('admin@corp.test', 'wrong')).rejects.toMatchObject({
        status: 401,
        code: 'AUTH_INVALID',
        attemptsRemaining: 3,
      });
    });

    it('propagates a 423 lockout without any attempts counter', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(
          jsonResponse(
            {
              statusCode: 423,
              code: 'AUTH_LOCKED',
              message: 'Akun dikunci.',
            },
            423,
          ),
        ),
      );

      await expect(login('admin@corp.test', 'wrong')).rejects.toMatchObject({
        status: 423,
        code: 'AUTH_LOCKED',
        attemptsRemaining: undefined,
      });
      await expect(login('admin@corp.test', 'wrong')).rejects.toBeInstanceOf(
        ApiError,
      );
    });
  });

  describe('fetchSession', () => {
    it('resolves to null when the profile probe says the session is gone', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          { statusCode: 401, code: 'AUTH_REQUIRED', message: 'no' },
          401,
        ),
      );

      await expect(fetchSession()).resolves.toBeNull();
      expect(fetchMock.mock.calls[0][0]).toBe('/api/identity/profile');
    });

    it('builds the session from the profile payload when it carries the flags', async () => {
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

      await expect(fetchSession()).resolves.toEqual({
        name: 'Sari',
        email: 'admin@corp.test',
        position: 'HRD',
        phone: '0812000000',
        photoUrl: null,
        role: 'hrd',
        mustChangePassword: false,
      });
    });

    it('falls back to the flags remembered at sign-in when the profile omits them', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ role: 'hrd', mustChangePassword: true }),
      );
      await login('admin@corp.test', 'secret-1');

      fetchMock.mockResolvedValue(
        jsonResponse({
          name: 'Sari',
          email: 'admin@corp.test',
          position: 'HRD',
          phone: '0812000000',
          photoUrl: null,
        }),
      );

      await expect(fetchSession()).resolves.toMatchObject({
        role: 'hrd',
        mustChangePassword: true,
        name: 'Sari',
      });
    });

    it('bootstraps an unknown tab from the profile alone when nothing is remembered', async () => {
      // A fresh tab shares the session cookie but not the flags the sign-in
      // form wrote: the profile payload is the only thing it can ask.
      expect(window.sessionStorage.getItem('hrd-session-meta')).toBeNull();
      fetchMock.mockResolvedValue(
        jsonResponse({
          name: 'Sari',
          email: 'admin@corp.test',
          position: 'HRD',
          phone: '0812000000',
          photoUrl: null,
          role: 'hrd',
        }),
      );

      await expect(fetchSession()).resolves.toMatchObject({
        role: 'hrd',
        name: 'Sari',
      });
      expect(window.sessionStorage.getItem('hrd-session-meta')).toBeNull();
    });

    it('prefers the role the profile reports over flags this tab remembered', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ role: 'employee', mustChangePassword: false }),
      );
      await login('admin@corp.test', 'secret-1');

      fetchMock.mockResolvedValue(
        jsonResponse({
          name: 'Sari',
          email: 'admin@corp.test',
          position: 'HRD',
          phone: '0812000000',
          photoUrl: null,
          role: 'hrd',
        }),
      );

      await expect(fetchSession()).resolves.toMatchObject({ role: 'hrd' });
    });

    it('denies a session whose profile carries no role and nothing is remembered', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          name: 'Sari',
          email: 'admin@corp.test',
          position: 'HRD',
          phone: '0812000000',
          photoUrl: null,
        }),
      );

      await expect(fetchSession()).resolves.toMatchObject({ role: 'employee' });
    });

    it('rethrows a transport failure instead of pretending the user signed out', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(fetchSession()).rejects.toMatchObject({ status: 0 });
    });
  });

  describe('logout', () => {
    it('posts the logout request and forgets the remembered flags', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ role: 'hrd', mustChangePassword: false }),
      );
      await login('admin@corp.test', 'secret-1');

      fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
      await logout();

      const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
      expect(url).toBe('/api/identity/auth/logout');
      expect(init.method).toBe('POST');

      fetchMock.mockResolvedValue(
        jsonResponse(
          { statusCode: 401, code: 'AUTH_REQUIRED', message: 'no' },
          401,
        ),
      );
      await expect(fetchSession()).resolves.toBeNull();
    });

    it('still ends the local session when the request fails', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ role: 'hrd', mustChangePassword: false }),
      );
      await login('admin@corp.test', 'secret-1');

      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
      await expect(logout()).resolves.toBeUndefined();

      fetchMock.mockResolvedValue(
        jsonResponse(
          { statusCode: 401, code: 'AUTH_REQUIRED', message: 'no' },
          401,
        ),
      );
      await expect(fetchSession()).resolves.toBeNull();
    });
  });

  describe('setFirstPassword', () => {
    it('posts both password fields to the first-change endpoint', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}));
      await setFirstPassword('brand-new-pass', 'brand-new-pass');

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/identity/auth/password/set-first');
      expect(init.body).toBe(
        JSON.stringify({
          newPassword: 'brand-new-pass',
          confirmPassword: 'brand-new-pass',
        }),
      );
    });

    it('surfaces the server PASSWORD_WEAK message', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          {
            statusCode: 400,
            code: 'PASSWORD_WEAK',
            message: 'Kata sandi tidak memenuhi persyaratan keamanan.',
          },
          400,
        ),
      );

      await expect(setFirstPassword('short', 'short')).rejects.toMatchObject({
        status: 400,
        code: 'PASSWORD_WEAK',
      });
    });
  });
});
