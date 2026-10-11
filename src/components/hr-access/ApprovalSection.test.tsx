import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '../../i18n/en';
import { id } from '../../i18n/id';
import { I18nProvider, LanguageToggle } from '../../i18n/provider';
import type { HrAccessRequest } from '../../services/hrAccess';
import ApprovalSection from './ApprovalSection';

/** Base path of the proposal collection, mirrored from the service layer. */
const base = '/api/identity/hr-access-requests';

const fetchMock = vi.fn();

/** Requests that matched no handler; reported by the shared teardown. */
let unexpected: string[] = [];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(status: number, code: string, message = 'refused'): Response {
  return jsonResponse({ statusCode: status, code, message }, status);
}

function listResponse(items: HrAccessRequest[]): Response {
  return jsonResponse({ items, total: items.length });
}

type Handler = (
  url: string,
  init?: RequestInit,
) => Response | Promise<Response> | undefined;

/** Routes the stubbed network through the given handlers, in order. */
function respond(handlers: Handler[]) {
  fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    for (const handler of handlers) {
      const response = handler(url, init);
      if (response !== undefined) {
        return Promise.resolve(response);
      }
    }
    unexpected.push(`${init?.method ?? 'GET'} ${url}`);
    return Promise.resolve(
      errorResponse(500, 'INTERNAL', `unhandled request: ${url}`),
    );
  });
}

function isListGet(url: string, init?: RequestInit): boolean {
  return url.startsWith(base) && (init?.method ?? 'GET') === 'GET';
}

function postBody(init?: RequestInit): Record<string, unknown> {
  if (init?.body === undefined) {
    return {};
  }
  return JSON.parse(String(init.body)) as Record<string, unknown>;
}

function callsTo(suffix: string, method: 'POST' | 'GET' = 'POST') {
  return fetchMock.mock.calls.filter(
    ([input, init]) =>
      String(input).endsWith(suffix) &&
      ((init as RequestInit | undefined)?.method ?? 'GET') === method,
  );
}

function getCount(): number {
  return callsTo('', 'GET').length;
}

function makeRow(overrides: Partial<HrAccessRequest> = {}): HrAccessRequest {
  return {
    id: 'req-peer',
    type: 'add_hr',
    state: 'pending',
    proposedName: 'Dewi Lestari',
    proposedEmail: 'dewi@corp.test',
    proposedPosition: 'HR Officer',
    proposedPhone: '0812-0000-0009',
    targetEmployeeId: null,
    target: null,
    maker: { id: 'hr-sari', name: 'Sari Wati', email: 'sari@corp.test' },
    checker: null,
    decisionNote: null,
    decidedAt: null,
    createdAt: '2026-10-09T08:00:00.000Z',
    updatedAt: '2026-10-09T08:00:00.000Z',
    canDecide: true,
    ...overrides,
  };
}

/** Someone else's pending row: the viewer may decide it. */
const peerPending = makeRow();

/** The viewer's own pending row: `canDecide` stays false server-side. */
const ownPending = makeRow({
  id: 'req-own',
  proposedName: 'Rina Ramadhani',
  proposedEmail: 'rina@corp.test',
  maker: { id: 'hr-self', name: 'Ivan Pratama', email: 'ivan@corp.test' },
  canDecide: false,
});

const approvedRow = makeRow({
  id: 'req-approved',
  state: 'approved',
  proposedName: 'Tari Ulfa',
  proposedEmail: 'tari@corp.test',
  checker: { id: 'hr-rudi', name: 'Rudi Hartono', email: 'rudi@corp.test' },
  decidedAt: '2026-10-10T08:00:00.000Z',
  decisionNote: 'Sesuai aturan',
  canDecide: false,
});

const rejectedRow = makeRow({
  id: 'req-rejected',
  state: 'rejected',
  proposedName: 'Gappt Staff',
  proposedEmail: 'gappt@corp.test',
  checker: { id: 'hr-rudi', name: 'Rudi Hartono', email: 'rudi@corp.test' },
  decidedAt: '2026-10-10T09:00:00.000Z',
  decisionNote: 'Belum lengkap',
  canDecide: false,
});

const withdrawnRow = makeRow({
  id: 'req-withdrawn',
  state: 'withdrawn',
  proposedName: 'Batal Nih',
  proposedEmail: 'batal@corp.test',
  maker: { id: 'hr-self', name: 'Ivan Pratama', email: 'ivan@corp.test' },
  canDecide: false,
});

/**
 * A profile-change proposal: the name is the proposed one, the address is
 * the target's own, because that column is never part of this kind.
 */
const updatePending = makeRow({
  id: 'req-update',
  type: 'update_hr',
  proposedName: 'Citra Dewi',
  proposedEmail: null,
  proposedPosition: 'HR Generalist',
  proposedPhone: '0812-0000-0021',
  targetEmployeeId: 'emp-hrd-3',
  target: {
    id: 'emp-hrd-3',
    name: 'Citra Lama',
    email: 'citra@corp.test',
    status: 'active',
  },
});

/**
 * An already-decided deactivation. The server keeps `proposed*` null on this
 * kind; the decoy values below prove the target snapshot wins whenever both
 * happen to be present.
 */
const decidedDeactivate = makeRow({
  id: 'req-deact',
  type: 'deactivate_hr',
  state: 'approved',
  proposedName: 'Stale Proposed',
  proposedEmail: 'stale@corp.test',
  proposedPosition: 'Ghost Role',
  proposedPhone: '0812-0000-0000',
  targetEmployeeId: 'emp-hrd-9',
  target: {
    id: 'emp-hrd-9',
    name: 'Rina Terminus',
    email: 'rina@corp.test',
    status: 'deactivated',
  },
  checker: { id: 'hr-rudi', name: 'Rudi Hartono', email: 'rudi@corp.test' },
  decidedAt: '2026-10-10T10:00:00.000Z',
  canDecide: false,
});

/**
 * A pending deactivation that points at the signed-in viewer. The server
 * marks those rows so no decision button can ever reach them.
 */
const viewerTargetPending = makeRow({
  id: 'req-self-target',
  type: 'deactivate_hr',
  proposedName: null,
  proposedEmail: null,
  proposedPosition: null,
  proposedPhone: null,
  targetEmployeeId: 'emp-self',
  target: {
    id: 'emp-self',
    name: 'Ivan Pratama',
    email: 'ivan@corp.test',
    status: 'active',
  },
  canDecide: false,
  viewerIsTarget: true,
});

/** The same viewer-targeted row, but with a stale `canDecide` still true. */
const viewerTargetCanDecide = makeRow({
  id: 'req-self-target-decide',
  type: 'deactivate_hr',
  proposedName: null,
  proposedEmail: null,
  proposedPosition: null,
  proposedPhone: null,
  targetEmployeeId: 'emp-self',
  target: {
    id: 'emp-self',
    name: 'Ivan Pratama',
    email: 'ivan@corp.test',
    status: 'active',
  },
  canDecide: true,
  viewerIsTarget: true,
});

/** A pending password reset pointed at another HR account. */
const resetPending = makeRow({
  id: 'req-reset',
  type: 'reset_password',
  proposedName: null,
  proposedEmail: null,
  proposedPosition: null,
  proposedPhone: null,
  targetEmployeeId: 'emp-hrd-2',
  target: {
    id: 'emp-hrd-2',
    name: 'Citra Sehat',
    email: 'citra@corp.test',
    status: 'active',
  },
  canDecide: true,
});

function renderSection() {
  return render(
    <I18nProvider>
      <LanguageToggle />
      <ApprovalSection />
    </I18nProvider>,
  );
}

function rowFor(rows: HTMLElement[], marker: string): HTMLElement {
  const found = rows.find((row) => row.textContent?.includes(marker));
  if (found === undefined) {
    throw new Error(`no proposal row contains "${marker}"`);
  }
  return found;
}

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
    writable: true,
  });
  return writeText;
}

describe('ApprovalSection', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
    unexpected = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    expect(unexpected).toEqual([]);
  });

  it('renders the proposal list with maker, state chip and the decided fields', async () => {
    respond([(_url, init) => (isListGet(String(_url), init) ? listResponse([peerPending, ownPending, approvedRow]) : undefined)]);
    renderSection();

    const table = await screen.findByRole('table');
    const rows = within(table).getAllByTestId('approval-row');
    expect(rows).toHaveLength(3);

    const peer = rowFor(rows, 'Dewi Lestari');
    expect(peer).toHaveTextContent(id['karyawan.approval.type.add_hr']);
    expect(peer).toHaveTextContent('Dewi Lestari');
    expect(peer).toHaveTextContent('dewi@corp.test');
    expect(within(peer).getByText(id['karyawan.approval.state.pending'])).toBeInTheDocument();
    expect(within(peer).getByText('Sari Wati')).toBeInTheDocument();
    expect(within(peer).getByText('sari@corp.test')).toBeInTheDocument();

    const decided = rowFor(rows, 'Tari Ulfa');
    expect(within(decided).getByText(id['karyawan.approval.state.approved'])).toBeInTheDocument();
    expect(within(decided).getByText('Rudi Hartono')).toBeInTheDocument();
    expect(within(decided).getByText('2026-10-10 08:00')).toBeInTheDocument();
    expect(within(decided).getByText('Sesuai aturan')).toBeInTheDocument();

    for (const header of [
      id['karyawan.column.name'],
      id['karyawan.column.status'],
      id['karyawan.approval.maker'],
      id['karyawan.approval.checker'],
      id['karyawan.approval.decidedAt'],
      id['karyawan.approval.note'],
      id['karyawan.column.actions'],
    ]) {
      expect(within(table).getAllByRole('columnheader', { name: header })).toHaveLength(1);
    }
  });

  it('offers no way to file a proposal from the inbox itself', async () => {
    respond([
      (url, init) => (isListGet(url, init) ? listResponse([peerPending]) : undefined),
    ]);
    renderSection();
    await screen.findAllByTestId('approval-row');

    expect(screen.queryByTestId('approval-mode-add')).toBeNull();
    expect(screen.queryByTestId('approval-mode-deactivate')).toBeNull();
    expect(screen.queryByTestId('approval-mode-reset')).toBeNull();
    expect(screen.queryByTestId('approval-add-button')).toBeNull();
    expect(screen.queryByTestId('approval-target')).toBeNull();
    expect(screen.queryByRole('form')).toBeNull();
    expect(screen.queryByText(id['hr.add.title'])).toBeNull();
    expect(callsTo(base)).toHaveLength(0);
  });

  it('shows the profile-change kind with the proposed name and the target address', async () => {
    respond([
      (url, init) => (isListGet(url, init) ? listResponse([updatePending]) : undefined),
    ]);
    renderSection();

    const rows = await screen.findAllByTestId('approval-row');
    const row = rows[0];
    expect(within(row).getByText(id['karyawan.approval.type.update_hr'])).toBeInTheDocument();
    expect(within(row).getByText('Citra Dewi')).toBeInTheDocument();
    expect(within(row).getByText('citra@corp.test')).toBeInTheDocument();
  });

  it('withholds approve and reject on the maker own row and shows the self-hint', async () => {
    respond([
      (url, init) =>
        isListGet(url, init)
          ? listResponse([peerPending, ownPending, approvedRow])
          : undefined,
    ]);
    renderSection();

    const rows = await screen.findAllByTestId('approval-row');
    const own = rowFor(rows, 'Rina Ramadhani');
    expect(within(own).queryByTestId('approval-approve')).toBeNull();
    expect(within(own).queryByTestId('approval-reject')).toBeNull();
    expect(within(own).getByTestId('approval-withdraw')).toBeInTheDocument();
    expect(within(own).getByText(id['karyawan.approval.selfHint'])).toBeInTheDocument();

    const peer = rowFor(rows, 'Dewi Lestari');
    expect(within(peer).getByTestId('approval-approve')).toBeInTheDocument();
    expect(within(peer).getByTestId('approval-reject')).toBeInTheDocument();
    expect(within(peer).queryByTestId('approval-withdraw')).toBeNull();
    expect(within(peer).queryByText(id['karyawan.approval.selfHint'])).toBeNull();

    const decided = rowFor(rows, 'Tari Ulfa');
    expect(within(decided).queryByTestId('approval-approve')).toBeNull();
    expect(within(decided).queryByTestId('approval-reject')).toBeNull();
    expect(within(decided).queryByTestId('approval-withdraw')).toBeNull();
  });

  it('asks for confirmation before approving and cancels back without any request', async () => {
    const user = userEvent.setup();
    respond([
      (url, init) =>
        isListGet(url, init) ? listResponse([peerPending]) : undefined,
    ]);
    renderSection();

    const rows = await screen.findAllByTestId('approval-row');
    await user.click(within(rowFor(rows, 'Dewi Lestari')).getByTestId('approval-approve'));

    const confirm = screen.getByTestId('approval-confirm');
    expect(confirm).toHaveTextContent(id['karyawan.approval.confirmApproveTitle']);
    expect(screen.queryByTestId('approval-reason')).toBeNull();
    expect(callsTo('/approve')).toHaveLength(0);

    await user.click(screen.getByTestId('approval-confirm-cancel'));

    expect(screen.queryByTestId('approval-confirm')).toBeNull();
    expect(callsTo('/approve')).toHaveLength(0);
    const refreshed = await screen.findAllByTestId('approval-row');
    expect(within(rowFor(refreshed, 'Dewi Lestari')).getByTestId('approval-approve')).toBeInTheDocument();
  });

  it('scrolls the confirmation into view when it opens', async () => {
    // The panel sits below the whole table; without the scroll a long list
    // leaves it below the fold and the decision looks like a dead button.
    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;
    try {
      const user = userEvent.setup();
      respond([
        (url, init) =>
          isListGet(url, init) ? listResponse([peerPending]) : undefined,
      ]);
      renderSection();

      const rows = await screen.findAllByTestId('approval-row');
      await user.click(within(rowFor(rows, 'Dewi Lestari')).getByTestId('approval-approve'));

      expect(screen.getByTestId('approval-confirm')).toBeInTheDocument();
      expect(scrollSpy).toHaveBeenCalledWith({ block: 'nearest' });
    } finally {
      delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    }
  });

  it('reveals the one-time password once a confirmed approve lands, with copy guidance and a Done dismiss', async () => {
    const user = userEvent.setup();
    const writeText = stubClipboard();
    let items: HrAccessRequest[] = [peerPending];
    respond([
      (url, init) => {
        if (isListGet(url, init)) {
          return listResponse(items);
        }
        if (url.endsWith('/approve') && init?.method === 'POST') {
          items = [
            { ...items[0], state: 'approved', checker: approvedRow.checker, decidedAt: approvedRow.decidedAt, canDecide: false },
          ];
          return jsonResponse({
            ...items[0],
            temporaryPassword: 'TempFirst!2026',
          });
        }
        return undefined;
      },
    ]);
    renderSection();

    const rows = await screen.findAllByTestId('approval-row');
    await user.click(within(rowFor(rows, 'Dewi Lestari')).getByTestId('approval-approve'));
    await user.click(screen.getByTestId('approval-confirm-yes'));

    const panel = await screen.findByTestId('approval-temp-password');
    expect(screen.getAllByTestId('approval-temp-password')).toHaveLength(1);
    expect(panel).toHaveTextContent(id['karyawan.approval.tempPassword']);
    expect(panel).toHaveTextContent('TempFirst!2026');
    expect(panel).toHaveTextContent(id['karyawan.approval.tempPasswordNote']);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByTestId('approval-confirm')).toBeNull();

    await user.click(screen.getByRole('button', { name: id['karyawan.add.createdCopy'] }));
    expect(writeText).toHaveBeenCalledWith('TempFirst!2026');
    expect(
      screen.getByRole('button', { name: id['karyawan.add.createdCopied'] }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: id['password.done'] }));
    expect(screen.queryByTestId('approval-temp-password')).toBeNull();
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(callsTo('/approve')).toHaveLength(1);
  });

  it('refuses a second confirm press while the decision is in flight', async () => {
    const user = userEvent.setup();
    const inFlight: { resolve?: (value: Response) => void } = {};
    respond([
      (url, init) => {
        if (isListGet(url, init)) {
          return listResponse([peerPending]);
        }
        if (url.endsWith('/approve') && init?.method === 'POST') {
          return new Promise<Response>((resolve) => {
            inFlight.resolve = resolve;
          });
        }
        return undefined;
      },
    ]);
    renderSection();

    const rows = await screen.findAllByTestId('approval-row');
    await user.click(within(rowFor(rows, 'Dewi Lestari')).getByTestId('approval-approve'));
    const yes = screen.getByTestId('approval-confirm-yes');
    await user.click(yes);
    await user.click(yes);

    expect(callsTo('/approve')).toHaveLength(1);
    expect(yes).toBeDisabled();

    inFlight.resolve?.(
      jsonResponse({
        ...peerPending,
        state: 'approved',
        canDecide: false,
        temporaryPassword: 'TempFirst!2026',
      }),
    );
    await screen.findByTestId('approval-temp-password');
  });

  it('never fetches the password again after the panel is dismissed', async () => {
    const user = userEvent.setup();
    let items: HrAccessRequest[] = [peerPending, ownPending];
    respond([
      (url, init) => {
        if (isListGet(url, init)) {
          return listResponse(items);
        }
        if (url.endsWith('/approve') && init?.method === 'POST') {
          items = [
            { ...items[0], state: 'approved', checker: approvedRow.checker, decidedAt: approvedRow.decidedAt, canDecide: false },
            items[1],
          ];
          return jsonResponse({
            ...items[0],
            temporaryPassword: 'TempFirst!2026',
          });
        }
        if (url.endsWith('/withdraw') && init?.method === 'POST') {
          items = [
            items[0],
            { ...items[1], state: 'withdrawn', canDecide: false },
          ];
          return jsonResponse(items[1]);
        }
        return undefined;
      },
    ]);
    renderSection();

    let rows = await screen.findAllByTestId('approval-row');
    await user.click(within(rowFor(rows, 'Dewi Lestari')).getByTestId('approval-approve'));
    await user.click(screen.getByTestId('approval-confirm-yes'));
    await screen.findByTestId('approval-temp-password');
    await user.click(screen.getByRole('button', { name: id['password.done'] }));

    // A withdrawal reloads the list; the dismissed password must stay gone.
    rows = await screen.findAllByTestId('approval-row');
    await user.click(within(rowFor(rows, 'Rina Ramadhani')).getByTestId('approval-withdraw'));
    await waitFor(() => expect(getCount()).toBe(3));

    expect(screen.queryByTestId('approval-temp-password')).toBeNull();
    expect(callsTo('/approve')).toHaveLength(1);
    expect(callsTo('/withdraw')).toHaveLength(1);
    rows = await screen.findAllByTestId('approval-row');
    expect(within(rowFor(rows, 'Dewi Lestari')).getByText(id['karyawan.approval.state.approved'])).toBeInTheDocument();
  });

  it('requires a non-empty rejection reason inside the confirmation before any request', async () => {
    const user = userEvent.setup();
    let items: HrAccessRequest[] = [peerPending];
    respond([
      (url, init) => {
        if (isListGet(url, init)) {
          return listResponse(items);
        }
        if (url.endsWith('/reject') && init?.method === 'POST') {
          items = [
            {
              ...items[0],
              state: 'rejected',
              checker: approvedRow.checker,
              decidedAt: approvedRow.decidedAt,
              decisionNote: String(postBody(init).note),
              canDecide: false,
            },
          ];
          return jsonResponse(items[0]);
        }
        return undefined;
      },
    ]);
    renderSection();

    const rows = await screen.findAllByTestId('approval-row');
    await user.click(within(rowFor(rows, 'Dewi Lestari')).getByTestId('approval-reject'));

    const confirm = screen.getByTestId('approval-confirm');
    expect(confirm).toHaveTextContent(id['karyawan.approval.confirmRejectTitle']);
    const reason = within(confirm).getByTestId('approval-reason');
    expect(reason.tagName).toBe('TEXTAREA');
    expect(callsTo('/reject')).toHaveLength(0);

    await user.click(screen.getByTestId('approval-confirm-yes'));
    expect(within(confirm).getByRole('alert')).toHaveTextContent(id['form.error.required']);
    expect(callsTo('/reject')).toHaveLength(0);

    await user.type(reason, 'Bukan akun HR');
    await user.click(screen.getByTestId('approval-confirm-yes'));

    await waitFor(() => expect(callsTo('/reject')).toHaveLength(1));
    const [, init] = callsTo('/reject')[0] as [string, RequestInit];
    expect(postBody(init)).toEqual({ note: 'Bukan akun HR' });

    const refreshed = await screen.findAllByTestId('approval-row');
    const decided = rowFor(refreshed, 'Dewi Lestari');
    expect(within(decided).getByText(id['karyawan.approval.state.rejected'])).toBeInTheDocument();
    expect(within(decided).getByText('Bukan akun HR')).toBeInTheDocument();
    expect(within(decided).queryByTestId('approval-reject')).toBeNull();
    expect(screen.queryByTestId('approval-confirm')).toBeNull();
  });

  it('withdraws an own pending proposal', async () => {
    const user = userEvent.setup();
    let items: HrAccessRequest[] = [ownPending];
    respond([
      (url, init) => {
        if (isListGet(url, init)) {
          return listResponse(items);
        }
        if (url.endsWith('/withdraw') && init?.method === 'POST') {
          items = [{ ...items[0], state: 'withdrawn', canDecide: false }];
          return jsonResponse(items[0]);
        }
        return undefined;
      },
    ]);
    renderSection();

    const rows = await screen.findAllByTestId('approval-row');
    const own = rowFor(rows, 'Rina Ramadhani');
    await user.click(within(own).getByTestId('approval-withdraw'));

    await waitFor(() => expect(callsTo('/withdraw')).toHaveLength(1));
    const withdrawCall = callsTo('/withdraw')[0] as [string, RequestInit];
    expect(String(withdrawCall[0])).toContain('/req-own/withdraw');
    expect((withdrawCall[1] as RequestInit).body).toBeUndefined();

    const refreshed = await screen.findAllByTestId('approval-row');
    const decided = rowFor(refreshed, 'Rina Ramadhani');
    expect(within(decided).getByText(id['karyawan.approval.state.withdrawn'])).toBeInTheDocument();
    expect(within(decided).queryByTestId('approval-withdraw')).toBeNull();
    expect(within(decided).queryByText(id['karyawan.approval.selfHint'])).toBeNull();
  });

  it('renders an inline refusal for a 409 approve and keeps the row pending', async () => {
    const user = userEvent.setup();
    respond([
      (url, init) => {
        if (isListGet(url, init)) {
          return listResponse([peerPending]);
        }
        if (url.endsWith('/approve') && init?.method === 'POST') {
          return errorResponse(409, 'CONFLICT', 'last active HR');
        }
        return undefined;
      },
    ]);
    renderSection();

    const rows = await screen.findAllByTestId('approval-row');
    await user.click(
      within(rowFor(rows, 'Dewi Lestari')).getByTestId('approval-approve'),
    );
    await user.click(screen.getByTestId('approval-confirm-yes'));

    const alert = await screen.findByTestId('approval-action-error');
    expect(alert).toHaveTextContent(id['karyawan.approval.refused']);

    const refreshed = await screen.findAllByTestId('approval-row');
    const row = rowFor(refreshed, 'Dewi Lestari');
    expect(within(row).getByText(id['karyawan.approval.state.pending'])).toBeInTheDocument();
    expect(within(row).getByTestId('approval-approve')).toBeInTheDocument();
    expect(callsTo(base, 'GET')).toHaveLength(1);
  });

  it('shows the target snapshot instead of the proposed fields on a decided deactivate row', async () => {
    respond([
      (url, init) =>
        isListGet(url, init) ? listResponse([decidedDeactivate]) : undefined,
    ]);
    renderSection();

    const rows = await screen.findAllByTestId('approval-row');
    const row = rows[0];
    expect(
      within(row).getByText(id['karyawan.approval.type.deactivate_hr']),
    ).toBeInTheDocument();
    expect(within(row).getByText('Rina Terminus')).toBeInTheDocument();
    expect(within(row).getByText('rina@corp.test')).toBeInTheDocument();
    expect(
      within(row).getByText(id['karyawan.approval.state.approved']),
    ).toBeInTheDocument();
    expect(row).not.toHaveTextContent('Stale Proposed');
    expect(row).not.toHaveTextContent('stale@corp.test');
  });

  it('reveals the one-time password when a confirmed reset proposal is approved', async () => {
    const user = userEvent.setup();
    let items: HrAccessRequest[] = [resetPending];
    respond([
      (url, init) => {
        if (isListGet(url, init)) {
          return listResponse(items);
        }
        if (url.endsWith('/approve') && init?.method === 'POST') {
          items = [
            {
              ...items[0],
              state: 'approved',
              checker: approvedRow.checker,
              decidedAt: approvedRow.decidedAt,
              canDecide: false,
            },
          ];
          return jsonResponse({
            ...items[0],
            temporaryPassword: 'TempReset!2026',
          });
        }
        return undefined;
      },
    ]);
    renderSection();

    const rows = await screen.findAllByTestId('approval-row');
    await user.click(
      within(rowFor(rows, 'Citra Sehat')).getByTestId('approval-approve'),
    );
    await user.click(screen.getByTestId('approval-confirm-yes'));

    const panel = await screen.findByTestId('approval-temp-password');
    expect(panel).toHaveTextContent(id['karyawan.approval.tempPassword']);
    expect(panel).toHaveTextContent('TempReset!2026');
    expect(screen.queryByRole('table')).toBeNull();
    expect(callsTo('/approve')).toHaveLength(1);
  });

  it('replaces every decision button on a viewer-targeted row with the target hint', async () => {
    respond([
      (url, init) =>
        isListGet(url, init)
          ? listResponse([viewerTargetPending, viewerTargetCanDecide, peerPending])
          : undefined,
    ]);
    renderSection();

    const rows = await screen.findAllByTestId('approval-row');
    const blocked = rows.filter((row) =>
      within(row).queryByTestId('approval-target-hint'),
    );
    expect(blocked).toHaveLength(2);
    for (const row of blocked) {
      expect(within(row).getByTestId('approval-target-hint')).toHaveTextContent(
        id['karyawan.approval.targetHint'],
      );
      expect(within(row).queryByTestId('approval-approve')).toBeNull();
      expect(within(row).queryByTestId('approval-reject')).toBeNull();
      expect(within(row).queryByTestId('approval-withdraw')).toBeNull();
      expect(
        within(row).queryByText(id['karyawan.approval.selfHint']),
      ).toBeNull();
    }

    // Anyone else's row keeps its full decision controls.
    const peer = rowFor(rows, 'Dewi Lestari');
    expect(
      within(peer).queryByTestId('approval-target-hint'),
    ).toBeNull();
    expect(within(peer).getByTestId('approval-approve')).toBeInTheDocument();
    expect(within(peer).getByTestId('approval-reject')).toBeInTheDocument();
  });

  it('switches the proposal table and the decision copy to English', async () => {
    const user = userEvent.setup();
    respond([
      (url, init) =>
        isListGet(url, init)
          ? listResponse([
              peerPending,
              ownPending,
              approvedRow,
              rejectedRow,
              withdrawnRow,
            ])
          : undefined,
    ]);
    renderSection();

    const rows = await screen.findAllByTestId('approval-row');
    await user.click(within(rowFor(rows, 'Dewi Lestari')).getByTestId('approval-reject'));
    await user.click(screen.getByTestId('lang-toggle'));

    const table = screen.getByRole('table');
    for (const header of [
      en['karyawan.column.name'],
      en['karyawan.column.status'],
      en['karyawan.approval.maker'],
      en['karyawan.approval.checker'],
      en['karyawan.approval.decidedAt'],
      en['karyawan.approval.note'],
      en['karyawan.column.actions'],
    ]) {
      expect(within(table).getAllByRole('columnheader', { name: header })).toHaveLength(1);
    }

    for (const key of [
      'karyawan.approval.type.add_hr',
      'karyawan.approval.state.pending',
      'karyawan.approval.state.approved',
      'karyawan.approval.state.rejected',
      'karyawan.approval.state.withdrawn',
    ] as const) {
      expect(screen.getAllByText(en[key]).length).toBeGreaterThan(0);
      expect(screen.queryAllByText(id[key])).toHaveLength(0);
    }

    expect(screen.getAllByRole('button', { name: en['karyawan.approval.approve'] }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: en['karyawan.approval.reject'] }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: en['karyawan.approval.withdraw'] }).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole('button', { name: id['karyawan.approval.approve'] })).toHaveLength(0);

    expect(screen.getByText(en['karyawan.approval.selfHint'])).toBeInTheDocument();
    expect(screen.queryByText(id['karyawan.approval.selfHint'])).toBeNull();
    expect(screen.getByLabelText(en['karyawan.approval.rejectNote'])).toBeInTheDocument();
    expect(screen.queryByLabelText(id['karyawan.approval.rejectNote'])).toBeNull();
    expect(screen.getByText(en['karyawan.approval.confirmRejectTitle'])).toBeInTheDocument();
    expect(window.localStorage.getItem('lang')).toBe('en');
  });

  it('switches the one-time password panel to English', async () => {
    const user = userEvent.setup();
    let items: HrAccessRequest[] = [peerPending];
    respond([
      (url, init) => {
        if (isListGet(url, init)) {
          return listResponse(items);
        }
        if (url.endsWith('/approve') && init?.method === 'POST') {
          items = [
            { ...items[0], state: 'approved', checker: approvedRow.checker, decidedAt: approvedRow.decidedAt, canDecide: false },
          ];
          return jsonResponse({ ...items[0], temporaryPassword: 'TempFirst!2026' });
        }
        return undefined;
      },
    ]);
    renderSection();

    const rows = await screen.findAllByTestId('approval-row');
    await user.click(within(rowFor(rows, 'Dewi Lestari')).getByTestId('approval-approve'));
    await user.click(screen.getByTestId('approval-confirm-yes'));
    await screen.findByTestId('approval-temp-password');

    await user.click(screen.getByTestId('lang-toggle'));

    const panel = screen.getByTestId('approval-temp-password');
    expect(panel).toHaveTextContent(en['karyawan.approval.tempPassword']);
    expect(panel).toHaveTextContent(en['karyawan.approval.tempPasswordNote']);
    expect(screen.queryByText(id['karyawan.approval.tempPassword'])).toBeNull();
    expect(
      screen.getByRole('button', { name: en['karyawan.add.createdCopy'] }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: en['password.done'] })).toBeInTheDocument();
  });

  it('switches the empty-list copy to English', async () => {
    const user = userEvent.setup();
    respond([
      (url, init) => (isListGet(url, init) ? listResponse([]) : undefined),
    ]);
    renderSection();

    expect(await screen.findByText(id['karyawan.approval.empty'])).toBeInTheDocument();

    await user.click(screen.getByTestId('lang-toggle'));

    expect(screen.getByText(en['karyawan.approval.empty'])).toBeInTheDocument();
    expect(screen.queryByText(id['karyawan.approval.empty'])).toBeNull();
  });

  it('switches the load-error copy to English and retries the list', async () => {
    const user = userEvent.setup();
    let items: HrAccessRequest[] | 'fail' = 'fail';
    respond([
      (url, init) => {
        if (!isListGet(url, init)) {
          return undefined;
        }
        return items === 'fail'
          ? errorResponse(500, 'INTERNAL', 'boom')
          : listResponse(items);
      },
    ]);
    renderSection();

    expect(await screen.findByText(id['karyawan.approval.loadError'])).toBeInTheDocument();

    await user.click(screen.getByTestId('lang-toggle'));

    expect(screen.getByText(en['karyawan.approval.loadError'])).toBeInTheDocument();
    expect(screen.queryByText(id['karyawan.approval.loadError'])).toBeNull();

    items = [peerPending];
    await user.click(screen.getByRole('button', { name: en['state.serverError.retry'] }));

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(getCount()).toBe(2);
  });
});
