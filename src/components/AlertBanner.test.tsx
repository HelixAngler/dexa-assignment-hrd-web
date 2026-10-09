import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../i18n/id';
import { I18nProvider, LANG_STORAGE_KEY } from '../i18n/provider';
import {
  ALERTS_BASELINE_STORAGE_KEY,
  type AlertProjection,
} from '../services/alerts';
import type { CreateTransport, TransportHandlers } from '../services/realtime';
import AlertBanner from './AlertBanner';

/** One non-secret profile change: field diff is present, no password flag. */
const phoneAlert: AlertProjection = {
  alertId: 'evt-1',
  employeeId: 'emp-1',
  employeeName: 'Cleo R.',
  changedFields: ['phone'],
  before: { phone: '+62 811-000-0001' },
  after: { phone: '+62 812-000-0002' },
  passwordChanged: false,
  occurredAt: '2026-10-07T10:12:33Z',
};

/** A password change: flag set, values deliberately absent. */
const passwordAlert: AlertProjection = {
  alertId: 'evt-2',
  employeeId: 'emp-2',
  employeeName: 'Dana S.',
  changedFields: ['password'],
  passwordChanged: true,
  occurredAt: '2026-10-07T11:00:00Z',
};

interface FakeTransport {
  createTransport: CreateTransport;
  /** Delivers one publication payload as the realtime client would. */
  emit: (payload: unknown) => void;
  /** Token handed to the factory, or `null` before it was created. */
  token: () => string | null;
  /** Whether the feed closed the transport. */
  isClosed: () => boolean;
}

function createFakeTransport(): FakeTransport {
  let handlers: TransportHandlers | null = null;
  let token: string | null = null;
  let closed = false;
  return {
    createTransport: (receivedToken, receivedHandlers) => {
      token = receivedToken;
      handlers = receivedHandlers;
      return {
        close: () => {
          closed = true;
        },
      };
    },
    emit: (payload) => handlers?.onMessage(payload),
    token: () => token,
    isClosed: () => closed,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface FetchStubOptions {
  /** Alerts answered by the recent-alerts endpoint. */
  recent?: AlertProjection[];
  /** Status answered by the realtime token endpoint (default 200). */
  authStatus?: number;
}

/**
 * Replaces the global fetch with a router that only knows the two
 * notification endpoints the banner feed uses.
 */
function stubFetch(options: FetchStubOptions = {}) {
  const mock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith('/api/notification/alerts/recent')) {
      return jsonResponse({ alerts: options.recent ?? [] });
    }
    if (url === '/api/notification/realtime/auth') {
      const status = options.authStatus ?? 200;
      if (status >= 400) {
        return jsonResponse({ message: 'not allowed' }, status);
      }
      return jsonResponse({ token: 'test-token' });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

function renderBanner(createTransport: CreateTransport) {
  return render(
    <I18nProvider>
      <AlertBanner createTransport={createTransport} />
    </I18nProvider>,
  );
}

describe('AlertBanner', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pulls recent alerts on mount and renders one stacked banner each', async () => {
    const fetchMock = stubFetch({ recent: [phoneAlert, passwordAlert] });
    renderBanner(createFakeTransport().createTransport);

    const banners = await screen.findAllByTestId('alert-banner');
    expect(banners).toHaveLength(2);

    const recentCall = fetchMock.mock.calls.find(([input]) =>
      String(input).startsWith('/api/notification/alerts/recent'),
    );
    expect(recentCall).toBeDefined();

    const [first, second] = banners;
    expect(first).toHaveTextContent(phoneAlert.employeeName);
    expect(first).toHaveTextContent(
      id['alert.changedFields'].replace('{fields}', id['alert.field.phone']),
    );
    expect(first.querySelector('time')).toHaveAttribute(
      'datetime',
      phoneAlert.occurredAt,
    );
    expect(second).toHaveTextContent(passwordAlert.employeeName);
  });

  it('wraps long alert text instead of clipping it in the banner', async () => {
    const longName = 'Alexandria-Cassandra-Helena-Carter-Fitzgerald';
    stubFetch({ recent: [{ ...phoneAlert, employeeName: longName }] });
    renderBanner(createFakeTransport().createTransport);

    await screen.findAllByTestId('alert-banner');

    const name = screen.getByText(longName);
    expect(name.className).toContain('break-words');
    expect(name.className).not.toContain('truncate');

    const change = screen.getByText(
      id['alert.changedFields'].replace('{fields}', id['alert.field.phone']),
    );
    expect(change.className).toContain('break-words');
  });

  it('omits since on the very first visit and persists a new baseline', async () => {
    const fetchMock = stubFetch({ recent: [] });
    renderBanner(createFakeTransport().createTransport);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/notification/alerts/recent',
        expect.anything(),
      ),
    );
    await waitFor(() => {
      const stored = window.localStorage.getItem(ALERTS_BASELINE_STORAGE_KEY);
      expect(stored).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  it('asks for alerts since the stored last-visit baseline when one exists', async () => {
    const previousVisit = '2026-10-06T09:00:00.000Z';
    window.localStorage.setItem(ALERTS_BASELINE_STORAGE_KEY, previousVisit);
    const fetchMock = stubFetch({ recent: [] });

    renderBanner(createFakeTransport().createTransport);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/notification/alerts/recent?since=${encodeURIComponent(previousVisit)}`,
        expect.anything(),
      ),
    );
    await waitFor(() => {
      expect(
        window.localStorage.getItem(ALERTS_BASELINE_STORAGE_KEY),
      ).not.toBe(previousVisit);
    });
  });

  it('appends a banner when a realtime message arrives on the channel', async () => {
    stubFetch({ recent: [] });
    const fake = createFakeTransport();
    renderBanner(fake.createTransport);

    await waitFor(() => expect(fake.token()).toBe('test-token'));

    act(() => {
      fake.emit(phoneAlert);
    });

    const banner = screen.getByTestId('alert-banner');
    expect(banner).toHaveTextContent(phoneAlert.employeeName);
    expect(
      within(banner).getByRole('button', { name: id['alert.dismiss'] }),
    ).toBeInTheDocument();
  });

  it('removes only that banner on dismiss without calling the server', async () => {
    const fetchMock = stubFetch({ recent: [phoneAlert, passwordAlert] });
    const user = userEvent.setup();
    renderBanner(createFakeTransport().createTransport);

    const banners = await screen.findAllByTestId('alert-banner');
    expect(banners).toHaveLength(2);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const callsBeforeDismiss = fetchMock.mock.calls.length;

    await user.click(
      within(banners[0]).getByTestId('alert-banner-dismiss'),
    );

    expect(screen.queryByTestId('alert-banner')).toHaveTextContent(
      passwordAlert.employeeName,
    );
    expect(screen.getAllByTestId('alert-banner')).toHaveLength(1);
    expect(fetchMock.mock.calls.length).toBe(callsBeforeDismiss);
  });

  it('shows an event id only once even when pull and realtime both deliver it', async () => {
    stubFetch({ recent: [phoneAlert] });
    const fake = createFakeTransport();
    renderBanner(fake.createTransport);

    expect(await screen.findByTestId('alert-banner')).toBeTruthy();
    await waitFor(() => expect(fake.token()).toBe('test-token'));

    act(() => {
      fake.emit(phoneAlert);
      fake.emit(phoneAlert);
    });

    expect(screen.getAllByTestId('alert-banner')).toHaveLength(1);
  });

  it('renders the password-changed line for a password event', async () => {
    stubFetch({ recent: [passwordAlert] });
    renderBanner(createFakeTransport().createTransport);

    const banner = await screen.findByTestId('alert-banner');
    expect(banner).toHaveTextContent(passwordAlert.employeeName);
    expect(banner).toHaveTextContent(id['alert.passwordLine']);
    expect(banner).not.toHaveTextContent(id['alert.changedFields']);
  });

  it('switches banner copy to English when English is active', async () => {
    window.localStorage.setItem(LANG_STORAGE_KEY, 'en');
    stubFetch({ recent: [passwordAlert] });
    renderBanner(createFakeTransport().createTransport);

    const banner = await screen.findByTestId('alert-banner');
    expect(banner).toHaveTextContent('Password changed');
  });

  it('still shows pulled banners when realtime auth is unavailable', async () => {
    stubFetch({ recent: [phoneAlert], authStatus: 500 });
    renderBanner(createFakeTransport().createTransport);

    const banner = await screen.findByTestId('alert-banner');
    expect(banner).toHaveTextContent(phoneAlert.employeeName);
  });

  it('renders nothing at all when there are no alerts', async () => {
    const fetchMock = stubFetch({ recent: [] });
    const { container } = renderBanner(createFakeTransport().createTransport);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    expect(screen.queryByTestId('alert-banner-list')).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it('closes the realtime transport when the banner unmounts', async () => {
    stubFetch({ recent: [] });
    const fake = createFakeTransport();
    const { unmount } = renderBanner(fake.createTransport);

    await waitFor(() => expect(fake.token()).toBe('test-token'));
    unmount();

    expect(fake.isClosed()).toBe(true);
  });
});
