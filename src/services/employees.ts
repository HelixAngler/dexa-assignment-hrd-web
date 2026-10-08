import { apiFetch } from './api';

/** Base path of the identity API on the same origin. */
export const IDENTITY_BASE = '/api/identity';

/** Lifecycle flag of an employee row. */
export type EmployeeStatus = 'active' | 'deactivated';

/** Row shape returned by the employee list. */
export interface EmployeeSummary {
  id: string;
  name: string;
  email: string;
  position: string;
  status: EmployeeStatus;
}

/** Fields a create request carries; nothing about passwords is sent. */
export interface EmployeeCreateInput {
  name: string;
  email: string;
  position: string;
  phone: string;
  photo?: string;
}

/** Fields a patch request may carry; every key is optional server-side. */
export interface EmployeeUpdateInput {
  name?: string;
  email?: string;
  position?: string;
  phone?: string;
  photo?: string;
}

/** Answer of a create: the password is shown once and never again. */
export interface EmployeeCreated {
  id: string;
  temporaryPassword: string;
}

/** Answer of a password reset: same one-time rule as the create. */
export interface EmployeeResetResult {
  temporaryPassword: string;
}

/** Keeps the status literal safe when the server adds an unknown value. */
function asStatus(value: unknown): EmployeeStatus {
  return value === 'deactivated' ? 'deactivated' : 'active';
}

function asSummary(row: unknown): EmployeeSummary {
  const record = (typeof row === 'object' && row !== null ? row : {}) as Record<
    string,
    unknown
  >;
  return {
    id: typeof record.id === 'string' ? record.id : '',
    name: typeof record.name === 'string' ? record.name : '',
    email: typeof record.email === 'string' ? record.email : '',
    position: typeof record.position === 'string' ? record.position : '',
    status: asStatus(record.status),
  };
}

/**
 * Reads every employee row. The API describes the row shape without a
 * wrapper, so a bare array is the primary answer; a keyed envelope is
 * accepted as well so a wrapper never renders the console empty.
 */
export async function listEmployees(): Promise<EmployeeSummary[]> {
  const body = await apiFetch<unknown>(`${IDENTITY_BASE}/employees`);
  const rows = Array.isArray(body)
    ? body
    : Array.isArray((body as { employees?: unknown })?.employees)
      ? ((body as { employees: unknown[] }).employees)
      : Array.isArray((body as { rows?: unknown })?.rows)
        ? ((body as { rows: unknown[] }).rows)
        : null;
  if (rows === null) {
    return [];
  }
  return rows.map(asSummary);
}

/**
 * Creates an employee and returns the server-issued temporary password.
 * Duplicate emails reject with the typed `EMAIL_TAKEN` conflict so the form
 * can attach the failure to the email field.
 */
export async function createEmployee(
  input: EmployeeCreateInput,
): Promise<EmployeeCreated> {
  return apiFetch<EmployeeCreated>(`${IDENTITY_BASE}/employees`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Applies the given field changes to one employee. */
export async function updateEmployee(
  id: string,
  input: EmployeeUpdateInput,
): Promise<void> {
  await apiFetch<unknown>(`${IDENTITY_BASE}/employees/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

/**
 * Activates or deactivates an employee on its own endpoint: a deactivation
 * revokes sessions server-side and closes any open attendance session.
 */
export async function setEmployeeStatus(
  id: string,
  status: EmployeeStatus,
): Promise<void> {
  await apiFetch<unknown>(
    `${IDENTITY_BASE}/employees/${encodeURIComponent(id)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
  );
}

/** Issues a fresh temporary password; the previous one stops working. */
export async function resetEmployeePassword(
  id: string,
): Promise<EmployeeResetResult> {
  return apiFetch<EmployeeResetResult>(
    `${IDENTITY_BASE}/employees/${encodeURIComponent(id)}/reset-password`,
    { method: 'POST' },
  );
}

/**
 * Loads one employee by id for the edit screen. The API exposes no
 * single-row route, so the row is looked up inside the list response and a
 * missing id resolves to `null` instead of an error.
 */
export async function fetchEmployeeById(
  id: string,
): Promise<EmployeeSummary | null> {
  const rows = await listEmployees();
  return rows.find((row) => row.id === id) ?? null;
}
