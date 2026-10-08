import { Centrifuge, UnauthorizedError } from 'centrifuge';
import { ApiError, apiFetch } from './api';

/** Base path of the notification API on the same origin. */
export const NOTIFICATION_BASE = '/api/notification';

/** Realtime channel every HRD console instance listens on. */
export const ALERTS_CHANNEL = 'hrd:alerts';

/** What a realtime transport reports back to the alert feed. */
export interface TransportHandlers {
  /** Called for every payload published on the alert channel. */
  onMessage: (payload: unknown) => void;
  /** Called when the transport failed terminally and must be rebuilt. */
  onFailure: () => void;
}

/** A live realtime connection. Closing it must release every resource. */
export interface AlertTransport {
  close: () => void;
}

/**
 * Builds and immediately starts a realtime connection for an already issued
 * token. Tests inject their own factory instead of dialling a socket.
 */
export type CreateTransport = (
  token: string,
  handlers: TransportHandlers,
) => AlertTransport;

/**
 * Websocket endpoint of the realtime proxy served by this origin: the proxy
 * forwards the path to the Centrifugo server, whose socket lives under
 * `/connection/websocket`.
 */
export function realtimeEndpoint(): string {
  const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${window.location.host}/realtime/connection/websocket`;
}

/** Exchanges the current session for a channel-scoped realtime token. */
export async function fetchRealtimeToken(): Promise<string> {
  const body = await apiFetch<{ token?: unknown }>(
    `${NOTIFICATION_BASE}/realtime/auth`,
    { method: 'POST' },
  );
  if (typeof body?.token !== 'string' || body.token === '') {
    throw new ApiError(500, 'INTERNAL', 'The realtime token is missing.');
  }
  return body.token;
}

/**
 * Default transport built on the Centrifugo JavaScript client
 * (`centrifuge` npm package). The socket itself opens without credentials —
 * the gateway only admits an anonymous connection here — and the token is
 * presented with the subscription instead, because the gateway binds any
 * token sent at connect time to connection credentials the console does not
 * have. Reconnect behaviour:
 *
 * - socket drops: the client re-dials with its own jittered backoff between
 *   `minReconnectDelay` and `maxReconnectDelay`;
 * - expired subscription token: the client re-requests one through the
 *   subscription's `getToken`, retrying transient failures after a jittered
 *   delay;
 * - revoked permission (403): reported through `onFailure` once and the
 *   client stops itself, leaving retries to the alert feed.
 */
export const createCentrifugoTransport: CreateTransport = (
  token,
  handlers,
) => {
  const client = new Centrifuge(realtimeEndpoint(), {
    minReconnectDelay: 1000,
    maxReconnectDelay: 30000,
  });

  const subscription = client.newSubscription(ALERTS_CHANNEL, {
    token,
    getToken: async () => {
      try {
        return await fetchRealtimeToken();
      } catch (error) {
        if (error instanceof ApiError && error.status === 403) {
          handlers.onFailure();
          throw new UnauthorizedError('Realtime access is not permitted.');
        }
        throw error;
      }
    },
  });
  subscription.on('publication', (ctx) => handlers.onMessage(ctx.data));
  subscription.subscribe();
  client.connect();

  return {
    close: () => {
      client.disconnect();
    },
  };
};
