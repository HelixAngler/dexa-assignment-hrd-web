import type { ReactNode } from 'react';

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AlertBanner from '../../src/components/AlertBanner';
import { I18nProvider } from '../../src/i18n/provider';
import type { AlertProjection } from '../../src/services/alerts';
import type { CreateTransport } from '../../src/services/realtime';

/**
 * The banner stack as the console shell shows it: at most three banners stay
 * on screen while more pile up (the rest is offered through a "+N more"
 * line), every visible banner keeps its own dismiss control with a real
 * accessible name, and the stack is plain page content — never a dialog,
 * never something that traps focus or blocks the page around it.
 */

/** Five distinct profile-change alerts: more than the stack may show. */
const QUEUE_OF_FIVE: AlertProjection[] = [1, 2, 3, 4, 5].map((index) => ({
  alertId: `qa-alert-${index}`,
  employeeId: `employee-${index}`,
  employeeName: `Employee ${index}`,
  changedFields: ['phone'],
  passwordChanged: false,
  occurredAt: '2026-10-07T10:12:33Z',
}));

/** Three alerts: exactly what the stack may show without a collapse line. */
const QUEUE_OF_THREE: AlertProjection[] = QUEUE_OF_FIVE.slice(0, 3);

/**
 * jsdom runs without the app's stylesheet, so a banner can only be hidden
 * through the `hidden` attribute, a computed (or inline) display/visibility
 * rule, or the `hidden` utility class the stylesheet defines as
 * display:none. Walking the ancestors mirrors what "visible" means in a
 * browser: an ancestor's rule hides everything below it.
 */
function isRendered(node: HTMLElement): boolean {
  let current: Element | null = node;
  while (current !== null) {
    if (current instanceof HTMLElement && current.hidden) {
      return false;
    }
    const style = window.getComputedStyle(current);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }
    if (current.classList.contains('hidden')) {
      return false;
    }
    current = current.parentElement;
  }
  return true;
}

/** The banners a reader would actually see right now. */
function visibleBanners(): HTMLElement[] {
  return screen.getAllByTestId('alert-banner').filter((node) => isRendered(node));
}

/**
 * Replaces the global fetch with a router for the two endpoints the banner
 * feed calls: the recent-alerts pull answers with the given queue, the
 * realtime token endpoint answers with a server error so no live channel is
 * ever built during a test.
 */
function stubFetch(recent: AlertProjection[]) {
  const mock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith('/api/notification/alerts/recent')) {
      return new Response(JSON.stringify({ alerts: recent }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url === '/api/notification/realtime/auth') {
      return new Response(JSON.stringify({ message: 'unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

/** A transport factory that never dials anything; auth fails before use. */
const offlineTransport: CreateTransport = () => ({ close: () => undefined });

function renderStack(extra?: ReactNode) {
  return render(
    <I18nProvider>
      <AlertBanner createTransport={offlineTransport} />
      {extra}
    </I18nProvider>,
  );
}

describe('AlertBanner stack', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows exactly three banners and a "+N more" line when more arrive', async () => {
    stubFetch(QUEUE_OF_FIVE);
    renderStack();

    await waitFor(() =>
      expect(screen.getAllByTestId('alert-banner').length).toBeGreaterThanOrEqual(3),
    );

    expect(
      visibleBanners(),
      'only three banners may stay visible while five are queued',
    ).toHaveLength(3);

    const list = screen.getByTestId('alert-banner-list');
    const collapsedCount = QUEUE_OF_FIVE.length - 3;
    expect(
      within(list).getByText(new RegExp(`^\\+\\s*${collapsedCount}\\b`)),
      'the hidden remainder must be offered as a "+N more" line',
    ).toBeInTheDocument();
  });

  it('offers no collapse line while three or fewer banners are queued', async () => {
    stubFetch(QUEUE_OF_THREE);
    renderStack();

    await waitFor(() =>
      expect(screen.getAllByTestId('alert-banner')).toHaveLength(3),
    );

    expect(visibleBanners()).toHaveLength(3);
    const list = screen.getByTestId('alert-banner-list');
    expect(
      within(list).queryByText(/^\+\s*\d+\b/),
      'nothing is collapsed at three banners, so no "+N more" line belongs here',
    ).toBeNull();
  });

  it('lets every banner be dismissed on its own through a named control', async () => {
    stubFetch(QUEUE_OF_THREE);
    const user = userEvent.setup();
    renderStack();

    const banners = await screen.findAllByTestId('alert-banner');
    expect(banners).toHaveLength(3);
    for (const banner of banners) {
      const dismiss = within(banner).getByTestId('alert-banner-dismiss');
      expect(dismiss, 'each dismiss control must carry an accessible name').toHaveAccessibleName(
        /\S/,
      );
    }

    // Dismissing the middle banner removes that banner and only that one.
    await user.click(within(banners[1]).getByTestId('alert-banner-dismiss'));
    expect(
      screen.getAllByTestId('alert-banner').map((node) => node.getAttribute('data-alert-id')),
    ).toEqual(['qa-alert-1', 'qa-alert-3']);

    // The two remaining banners are each still dismissible on their own.
    await user.click(within(screen.getAllByTestId('alert-banner')[0]).getByTestId('alert-banner-dismiss'));
    expect(screen.getAllByTestId('alert-banner').map((node) => node.getAttribute('data-alert-id'))).toEqual([
      'qa-alert-3',
    ]);

    await user.click(within(screen.getByTestId('alert-banner')).getByTestId('alert-banner-dismiss'));
    expect(screen.queryByTestId('alert-banner')).toBeNull();
    expect(screen.queryByTestId('alert-banner-list')).toBeNull();
  });

  it('keeps the stack non-modal: no dialog semantics, no focus or pointer trap', async () => {
    stubFetch(QUEUE_OF_FIVE);
    const user = userEvent.setup();

    let outsideClicks = 0;
    renderStack(
      <button
        type="button"
        data-testid="outside-control"
        onClick={() => {
          outsideClicks += 1;
        }}
      >
        work beside the stack
      </button>,
    );

    const banners = await screen.findAllByTestId('alert-banner');
    expect(banners.length).toBeGreaterThanOrEqual(3);
    const list = screen.getByTestId('alert-banner-list');

    // The stack and everything inside it stay plain content: no dialog
    // role, no aria-modal claiming a modal context.
    expect(list).not.toHaveAttribute('role', 'dialog');
    expect(list).not.toHaveAttribute('aria-modal', 'true');
    expect(
      list.querySelectorAll('[role="dialog"], [role="alertdialog"], [aria-modal="true"]'),
      'nothing inside the stack may declare modal semantics',
    ).toHaveLength(0);

    // Focus must be able to leave the stack: tabbing from the first dismiss
    // control reaches the control rendered after the stack. A trap would
    // keep cycling inside the stack and this loop would never escape.
    const outside = screen.getByTestId('outside-control');
    const innerTabbables = list.querySelectorAll(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ).length;
    within(banners[0]).getByTestId('alert-banner-dismiss').focus();
    let focusEscaped = false;
    for (let step = 0; step <= innerTabbables && !focusEscaped; step += 1) {
      await user.tab();
      focusEscaped = document.activeElement === outside;
    }
    expect(focusEscaped, 'tabbing must be able to leave the banner stack').toBe(true);

    // The page around the stack stays operable while banners are shown:
    // an outside control is clickable and neither the body nor the main
    // content is made inert or hidden behind the banners.
    await user.click(outside);
    expect(outsideClicks).toBe(1);
    expect(document.body.hasAttribute('inert')).toBe(false);
    expect(document.body.getAttribute('aria-hidden')).not.toBe('true');
    expect(outside.closest('[inert], [aria-hidden="true"]')).toBeNull();
    expect(window.getComputedStyle(document.body).pointerEvents).not.toBe('none');
  });
});
