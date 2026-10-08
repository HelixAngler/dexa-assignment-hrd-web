import { beforeEach, describe, expect, it, vi } from 'vitest';

const centrifugeMock = vi.hoisted(() => {
  const state = {
    constructorArgs: [] as unknown[],
    channels: [] as string[],
    subscriptionOptions: [] as unknown[],
    connectCalled: false,
    disconnectCalled: false,
    subscribeCalled: false,
    publicationHandler: null as ((ctx: { data: unknown }) => void) | null,
  };

  class FakeCentrifuge {
    constructor(...args: unknown[]) {
      state.constructorArgs = args;
    }

    newSubscription(channel: string, options?: unknown) {
      state.channels.push(channel);
      state.subscriptionOptions.push(options);
      return {
        on: (event: string, handler: (ctx: { data: unknown }) => void) => {
          if (event === 'publication') {
            state.publicationHandler = handler;
          }
        },
        subscribe: () => {
          state.subscribeCalled = true;
        },
      };
    }

    connect() {
      state.connectCalled = true;
    }

    disconnect() {
      state.disconnectCalled = true;
    }
  }

  return { state, FakeCentrifuge };
});

vi.mock('centrifuge', () => ({
  Centrifuge: centrifugeMock.FakeCentrifuge,
  UnauthorizedError: class UnauthorizedError extends Error {},
}));

import {
  ALERTS_CHANNEL,
  createCentrifugoTransport,
  realtimeEndpoint,
} from './realtime';

describe('createCentrifugoTransport', () => {
  beforeEach(() => {
    centrifugeMock.state.constructorArgs = [];
    centrifugeMock.state.channels = [];
    centrifugeMock.state.subscriptionOptions = [];
    centrifugeMock.state.connectCalled = false;
    centrifugeMock.state.disconnectCalled = false;
    centrifugeMock.state.subscribeCalled = false;
    centrifugeMock.state.publicationHandler = null;
  });

  it('connects an anonymous socket through the realtime proxy', () => {
    createCentrifugoTransport('token-1', {
      onMessage: vi.fn(),
      onFailure: vi.fn(),
    });

    expect(centrifugeMock.state.constructorArgs[0]).toBe(realtimeEndpoint());
    // The gateway rejects a channel-scoped token at connect time, so the
    // socket carries no token of its own.
    expect(centrifugeMock.state.constructorArgs[1]).toMatchObject({
      minReconnectDelay: 1000,
      maxReconnectDelay: 30000,
    });
    expect(centrifugeMock.state.constructorArgs[1]).not.toHaveProperty('token');
    expect(centrifugeMock.state.connectCalled).toBe(true);
  });

  it('subscribes to the alert channel with the issued token and forwards publications', () => {
    const onMessage = vi.fn();
    createCentrifugoTransport('token-1', { onMessage, onFailure: vi.fn() });

    expect(ALERTS_CHANNEL).toBe('hrd:alerts');
    expect(centrifugeMock.state.channels).toEqual([ALERTS_CHANNEL]);
    expect(centrifugeMock.state.subscriptionOptions[0]).toMatchObject({
      token: 'token-1',
    });
    expect(centrifugeMock.state.subscribeCalled).toBe(true);

    centrifugeMock.state.publicationHandler?.({ data: { alertId: 'evt-9' } });
    expect(onMessage).toHaveBeenCalledWith({ alertId: 'evt-9' });
  });

  it('disconnects the client when the transport closes', () => {
    const transport = createCentrifugoTransport('token-1', {
      onMessage: vi.fn(),
      onFailure: vi.fn(),
    });

    transport.close();

    expect(centrifugeMock.state.disconnectCalled).toBe(true);
  });
});

describe('realtimeEndpoint', () => {
  it('targets the websocket path of this origin’s realtime proxy', () => {
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';

    expect(realtimeEndpoint()).toBe(
      `${scheme}://${window.location.host}/realtime/connection/websocket`,
    );
  });
});
