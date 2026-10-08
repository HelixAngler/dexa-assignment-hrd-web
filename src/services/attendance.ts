import { apiFetch } from './api';

/** Base path of the attendance API on the same origin. */
export const ATTENDANCE_BASE = '/api/attendance';

/** How one employee's punches for the queried day turned out. */
export type AttendanceState = 'done' | 'open' | '-';

/** One employee's row for a date; both times are `null` without a punch. */
export interface AttendanceRowData {
  employeeId: string;
  name: string;
  masuk: string | null;
  pulang: string | null;
  state: AttendanceState;
}

/** Filters accepted by the view; an absent date means "today" server-side. */
export interface AttendanceQuery {
  /** Calendar day in `YYYY-MM-DD` form. */
  date?: string;
  /** Name substring the server filters on. */
  q?: string;
}

/** Keeps a time field `null` unless the server sent a usable string. */
function asInstantOrNull(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

/** Keeps the state literal safe when the server adds an unknown value. */
function asState(value: unknown): AttendanceState {
  return value === 'done' || value === 'open' ? value : '-';
}

function asRow(raw: unknown): AttendanceRowData {
  const record = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;
  const state = asState(record.state);
  return {
    employeeId: typeof record.employeeId === 'string' ? record.employeeId : '',
    name: typeof record.name === 'string' ? record.name : '',
    // A row nobody punched carries no times in either cell, whatever arrived.
    masuk: state === '-' ? null : asInstantOrNull(record.masuk),
    pulang: state === 'done' ? asInstantOrNull(record.pulang) : null,
    state,
  };
}

/**
 * Reads every employee's punches for one day. Read-only by design: the query
 * only ever names a date and a name substring, and the answer is normalised
 * so a no-punch row can never leak a stray time into the view.
 */
export async function fetchAttendance(
  query: AttendanceQuery = {},
): Promise<AttendanceRowData[]> {
  const params = new URLSearchParams();
  if (query.date !== undefined && query.date !== '') {
    params.set('date', query.date);
  }
  if (query.q !== undefined && query.q !== '') {
    params.set('q', query.q);
  }
  const search = params.toString();

  const body = await apiFetch<unknown>(
    `${ATTENDANCE_BASE}/attendance${search === '' ? '' : `?${search}`}`,
  );
  const rows = Array.isArray(body)
    ? body
    : Array.isArray((body as { rows?: unknown })?.rows)
      ? ((body as { rows: unknown[] }).rows)
      : null;
  if (rows === null) {
    return [];
  }
  return rows.map(asRow);
}
