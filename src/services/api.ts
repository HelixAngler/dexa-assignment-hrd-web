import { LANG_STORAGE_KEY } from '../i18n/provider';

/**
 * Typed transport error shared by every API call in this app: `status` is the
 * HTTP status (or `0` when the request never reached the server), `code` is
 * the machine code from the error body or a synthesised fallback, so callers
 * branch on stable identifiers instead of human text.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly attemptsRemaining?: number;

  constructor(
    status: number,
    code: string,
    message: string,
    attemptsRemaining?: number,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.attemptsRemaining = attemptsRemaining;
  }
}

/** Machine codes used when the server body carries no `code` field. */
const FALLBACK_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'AUTH_REQUIRED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE',
  423: 'ACCOUNT_LOCKED',
  500: 'INTERNAL',
};

/** The language the UI currently shows; the API answers in the same one. */
function activeLanguage(): string {
  try {
    return window.localStorage.getItem(LANG_STORAGE_KEY) === 'en' ? 'en' : 'id';
  } catch {
    return 'id';
  }
}

/**
 * The single door every API call goes through: always sends the session
 * cookie and the active language, parses JSON, and converts any non-2xx
 * answer (or a transport failure) into an {@link ApiError}. Successful
 * empty bodies resolve to `null`.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept-Language', activeLanguage());
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(path, { ...init, headers, credentials: 'include' });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'The request could not reach the server.');
  }

  const text = await response.text();
  let body: unknown = null;
  if (text !== '') {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (response.ok) {
    return body as T;
  }

  const details =
    typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const code =
    typeof details.code === 'string'
      ? details.code
      : (FALLBACK_CODES[response.status] ?? `HTTP_${response.status}`);
  const message =
    typeof details.message === 'string'
      ? details.message
      : `Request failed with status ${response.status}.`;
  const attemptsRemaining =
    typeof details.attemptsRemaining === 'number'
      ? details.attemptsRemaining
      : undefined;

  throw new ApiError(response.status, code, message, attemptsRemaining);
}
