import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api';
import {
  createEmployee,
  fetchEmployeeById,
  listEmployees,
  resetEmployeePassword,
  setEmployeeStatus,
  updateEmployee,
} from './employees';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const row = {
  id: 'emp-1',
  name: 'Budi',
  email: 'budi@corp.test',
  position: 'Engineer',
  status: 'active',
  role: 'employee',
};

describe('employees service', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('listEmployees', () => {
    it('GETs the employee collection', async () => {
      fetchMock.mockResolvedValue(jsonResponse([row]));

      await expect(listEmployees()).resolves.toEqual([row]);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit | undefined];
      expect(url).toBe('/api/identity/employees');
      expect(init?.method ?? 'GET').toBe('GET');
    });

    it('rejects a 403 answer with the typed error', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          { statusCode: 403, code: 'FORBIDDEN', message: 'no' },
          403,
        ),
      );

      await expect(listEmployees()).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN',
      });
    });
  });

  describe('createEmployee', () => {
    it('POSTs exactly the documented create payload and returns the one-time password', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ id: 'emp-9', temporaryPassword: 'K9x-ty2' }, 201),
      );

      await expect(
        createEmployee({
          name: 'Budi',
          email: 'budi@corp.test',
          position: 'Engineer',
          phone: '0812000000',
        }),
      ).resolves.toEqual({ id: 'emp-9', temporaryPassword: 'K9x-ty2' });

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/identity/employees');
      expect(init.method).toBe('POST');
      expect(init.body).toBe(
        JSON.stringify({
          name: 'Budi',
          email: 'budi@corp.test',
          position: 'Engineer',
          phone: '0812000000',
        }),
      );
      expect(JSON.parse(String(init.body))).not.toHaveProperty('password');
    });

    it('maps a duplicate email to the typed 409 EMAIL_TAKEN error', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(
          jsonResponse(
            { statusCode: 409, code: 'EMAIL_TAKEN', message: 'already used' },
            409,
          ),
        ),
      );

      await expect(
        createEmployee({
          name: 'Budi',
          email: 'budi@corp.test',
          position: 'Engineer',
          phone: '0812000000',
        }),
      ).rejects.toMatchObject({ status: 409, code: 'EMAIL_TAKEN' });
      await expect(
        createEmployee({
          name: 'Budi',
          email: 'budi@corp.test',
          position: 'Engineer',
          phone: '0812000000',
        }),
      ).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe('updateEmployee', () => {
    it('PATCHes the given fields to the employee route', async () => {
      fetchMock.mockResolvedValue(jsonResponse(row));

      await updateEmployee('emp-1', { name: 'Budi S.', position: 'Lead' });

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/identity/employees/emp-1');
      expect(init.method).toBe('PATCH');
      expect(init.body).toBe(
        JSON.stringify({ name: 'Budi S.', position: 'Lead' }),
      );
    });
  });

  describe('setEmployeeStatus', () => {
    it('PATCHes the status route with the new status', async () => {
      fetchMock.mockResolvedValue(jsonResponse(row));

      await setEmployeeStatus('emp-1', 'deactivated');

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/identity/employees/emp-1/status');
      expect(init.method).toBe('PATCH');
      expect(init.body).toBe(JSON.stringify({ status: 'deactivated' }));
    });
  });

  describe('resetEmployeePassword', () => {
    it('POSTs to the reset route and returns the new temporary password', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ temporaryPassword: 'Zz4-qq1' }),
      );

      await expect(resetEmployeePassword('emp-1')).resolves.toEqual({
        temporaryPassword: 'Zz4-qq1',
      });

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/identity/employees/emp-1/reset-password');
      expect(init.method).toBe('POST');
    });
  });

  describe('fetchEmployeeById', () => {
    it('finds the row inside the list response', async () => {
      fetchMock.mockResolvedValue(jsonResponse([row]));

      await expect(fetchEmployeeById('emp-1')).resolves.toEqual(row);
    });

    it('resolves to null when the id is not in the collection', async () => {
      fetchMock.mockResolvedValue(jsonResponse([row]));

      await expect(fetchEmployeeById('emp-404')).resolves.toBeNull();
    });
  });
});
