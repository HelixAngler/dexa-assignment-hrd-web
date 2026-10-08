import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAttendance } from './attendance';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const doneRow = {
  employeeId: 'emp-1',
  name: 'Budi Santoso',
  masuk: '2026-10-08T01:00:00.000Z',
  pulang: '2026-10-08T10:00:00.000Z',
  state: 'done',
};

const openRow = {
  employeeId: 'emp-2',
  name: 'Citra Dewi',
  masuk: '2026-10-08T01:00:00.000Z',
  pulang: null,
  state: 'open',
};

const noPunchRow = {
  employeeId: 'emp-3',
  name: 'Rangga Wijaya',
  masuk: null,
  pulang: null,
  state: '-',
};

describe('attendance service', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the attendance view with the date and name query', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ rows: [doneRow] }));

    await expect(
      fetchAttendance({ date: '2026-10-08', q: 'budi' }),
    ).resolves.toEqual([doneRow]);

    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit | undefined,
    ];
    expect(url).toBe('/api/attendance/attendance?date=2026-10-08&q=budi');
    expect(init?.method ?? 'GET').toBe('GET');
  });

  it('leaves the date off when none is given so the server picks today', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ rows: [] }));

    await fetchAttendance();

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe('/api/attendance/attendance');
  });

  it('drops an empty name search instead of sending it', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ rows: [] }));

    await fetchAttendance({ date: '2026-10-08', q: '' });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe('/api/attendance/attendance?date=2026-10-08');
  });

  it('keeps every employee row, including the no-punch marker', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ rows: [doneRow, openRow, noPunchRow] }),
    );

    await expect(fetchAttendance({ date: '2026-10-08' })).resolves.toEqual([
      doneRow,
      openRow,
      noPunchRow,
    ]);
  });

  it('accepts a bare array answer so a missing wrapper never breaks the list', async () => {
    fetchMock.mockResolvedValue(jsonResponse([doneRow]));

    await expect(fetchAttendance({ date: '2026-10-08' })).resolves.toEqual([
      doneRow,
    ]);
  });

  it('strips every time from a row the server marks as no punch', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        rows: [
          {
            employeeId: 'emp-9',
            name: 'Sinta',
            masuk: '2026-10-08T01:00:00.000Z',
            pulang: '2026-10-08T09:00:00.000Z',
            state: '-',
          },
        ],
      }),
    );

    await expect(fetchAttendance({ date: '2026-10-08' })).resolves.toEqual([
      { employeeId: 'emp-9', name: 'Sinta', masuk: null, pulang: null, state: '-' },
    ]);
  });

  it('surfaces a rejected date as the typed DATE_INVALID error', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { statusCode: 400, code: 'DATE_INVALID', message: 'bad date' },
        400,
      ),
    );

    await expect(fetchAttendance({ date: '08-10-2026' })).rejects.toMatchObject({
      status: 400,
      code: 'DATE_INVALID',
    });
  });

  it('rejects a non-HRD caller with the typed 403 answer', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ statusCode: 403, code: 'FORBIDDEN', message: 'no' }, 403),
    );

    await expect(fetchAttendance()).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    });
  });

  it('never issues a mutating verb against the attendance resource', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ rows: [] })),
    );

    await fetchAttendance({ date: '2026-10-08', q: 'a' });
    await fetchAttendance({ date: '2026-10-09' });
    await fetchAttendance();

    const methods = fetchMock.mock.calls.map(
      ([, init]) => (init as RequestInit | undefined)?.method ?? 'GET',
    );
    expect(methods).toEqual(['GET', 'GET', 'GET']);
  });

  it('exports only the read operation for the attendance resource', async () => {
    const service = await import('./attendance');

    expect(Object.keys(service).sort()).toEqual([
      'ATTENDANCE_BASE',
      'fetchAttendance',
    ]);
  });
});
