import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../i18n/id';
import { I18nProvider } from '../i18n/provider';
import { ApiError } from '../services/api';
import * as attendanceService from '../services/attendance';
import type { AttendanceRowData } from '../services/attendance';
import AbsensiPage from './AbsensiPage';

vi.mock('../services/attendance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/attendance')>();
  return { ...actual, fetchAttendance: vi.fn() };
});

const rows: AttendanceRowData[] = [
  {
    employeeId: 'emp-1',
    name: 'Budi Santoso',
    masuk: '2026-10-08T01:00:00.000Z',
    pulang: '2026-10-08T10:00:00.000Z',
    state: 'done',
  },
  {
    employeeId: 'emp-2',
    name: 'Citra Dewi',
    masuk: '2026-10-08T01:00:00.000Z',
    pulang: null,
    state: 'open',
  },
  {
    employeeId: 'emp-3',
    name: 'Rangga Wijaya',
    masuk: null,
    pulang: null,
    state: '-',
  },
];

/** The calendar day the page is expected to ask for on first render. */
function todayISO(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function renderPage() {
  return render(
    <I18nProvider>
      <AbsensiPage />
    </I18nProvider>,
  );
}

describe('AbsensiPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(attendanceService.fetchAttendance).mockReset();
    vi.mocked(attendanceService.fetchAttendance).mockResolvedValue(rows);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks for today by default and reserves the layout while it loads', () => {
    vi.mocked(attendanceService.fetchAttendance).mockReturnValue(
      new Promise(() => {}),
    );
    renderPage();

    expect(screen.getByTestId('absensi')).toBeInTheDocument();

    const dateInput = screen.getByTestId('absensi-date') as HTMLInputElement;
    expect(dateInput).toHaveAttribute('type', 'date');
    expect(dateInput).toHaveValue(todayISO());

    expect(attendanceService.fetchAttendance).toHaveBeenCalledWith({
      date: todayISO(),
      q: '',
    });
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(screen.queryByTestId('absensi-table')).not.toBeInTheDocument();
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('states that the view is read-only', async () => {
    renderPage();

    const note = await screen.findByTestId('absensi-readonly');
    expect(note).toHaveTextContent(id['absensi.readOnlyNote']);
  });

  it('renders every returned employee as a desktop row and a phone card', async () => {
    renderPage();

    const table = await screen.findByTestId('absensi-table');
    expect(table.className).toContain('hidden');
    expect(table.className).toContain('md:table');

    const headers = within(table)
      .getAllByRole('columnheader')
      .map((header) => header.textContent);
    expect(headers).toEqual([
      id['absensi.column.name'],
      id['absensi.column.masuk'],
      id['absensi.column.pulang'],
      id['absensi.column.status'],
    ]);

    const bodyRows = within(table).getAllByTestId('attendance-row');
    expect(bodyRows).toHaveLength(3);
    expect(bodyRows[0]).toHaveTextContent('Budi Santoso');
    expect(bodyRows[0].querySelectorAll('td')).toHaveLength(4);
    expect(within(bodyRows[1]).getByTestId('attendance-still-working')).toBeInTheDocument();
    expect(
      within(bodyRows[2]).getByTestId('attendance-masuk').textContent?.trim(),
    ).toBe('-');

    const cards = screen.getByTestId('absensi-cards');
    expect(cards.tagName).toBe('UL');
    expect(cards.className).toContain('md:hidden');
    expect(cards.querySelectorAll('[data-testid="attendance-card"]')).toHaveLength(3);
    expect(cards).toHaveTextContent('Rangga Wijaya');
    expect(cards).toHaveTextContent(id['absensi.row.status.done']);
  });

  it('keeps the phone half on stacked cards with no sideways scroller', async () => {
    renderPage();

    const cards = await screen.findByTestId('absensi-cards');
    expect(cards.className).not.toContain('overflow-x-auto');
    expect(cards.querySelector('table')).toBeNull();

    const items = cards.querySelectorAll('li');
    expect(items).toHaveLength(3);
    items.forEach((card) => {
      expect(card.querySelectorAll('dt')).toHaveLength(3);
      expect(card.className).not.toContain('whitespace-nowrap');
    });
  });

  it('refetches with the typed name when the search is submitted', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('absensi-table');

    await user.type(screen.getByTestId('absensi-search'), 'budi');
    await user.click(screen.getByTestId('absensi-search-submit'));

    await waitFor(() =>
      expect(attendanceService.fetchAttendance).toHaveBeenCalledTimes(2),
    );
    expect(attendanceService.fetchAttendance).toHaveBeenLastCalledWith({
      date: todayISO(),
      q: 'budi',
    });
  });

  it('refetches when the date changes', async () => {
    renderPage();
    await screen.findByTestId('absensi-table');

    fireEvent.change(screen.getByTestId('absensi-date'), {
      target: { value: '2026-10-01' },
    });

    await waitFor(() =>
      expect(attendanceService.fetchAttendance).toHaveBeenCalledTimes(2),
    );
    expect(attendanceService.fetchAttendance).toHaveBeenLastCalledWith({
      date: '2026-10-01',
      q: '',
    });
  });

  it('refetches with the typed name when the field is submitted with Enter', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('absensi-table');

    await user.type(screen.getByTestId('absensi-search'), 'citra{Enter}');

    await waitFor(() =>
      expect(attendanceService.fetchAttendance).toHaveBeenCalledTimes(2),
    );
    expect(attendanceService.fetchAttendance).toHaveBeenLastCalledWith({
      date: todayISO(),
      q: 'citra',
    });
  });

  it('offers no create, edit or delete affordance anywhere on the page', async () => {
    renderPage();
    await screen.findByTestId('absensi-table');

    const buttons = screen
      .getAllByRole('button')
      .map((button) => button.getAttribute('data-testid'));
    expect(buttons).toEqual(['absensi-search-submit']);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows the empty state with an explanation when nobody matches', async () => {
    vi.mocked(attendanceService.fetchAttendance).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText(id['absensi.emptyTitle'])).toBeInTheDocument();
    expect(
      screen.getByText(id['absensi.emptyDescription']),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('absensi-table')).not.toBeInTheDocument();
  });

  it('shows the server error state and retries the load on demand', async () => {
    const user = userEvent.setup();
    vi.mocked(attendanceService.fetchAttendance).mockRejectedValueOnce(
      new ApiError(500, 'INTERNAL', 'boom'),
    );
    renderPage();

    expect(await screen.findByTestId('server-error-state')).toBeInTheDocument();

    await user.click(screen.getByTestId('retry-button'));

    expect(await screen.findByTestId('absensi-table')).toBeInTheDocument();
    expect(attendanceService.fetchAttendance).toHaveBeenCalledTimes(2);
  });

  it('turns a rejected date into a friendly inline message', async () => {
    vi.mocked(attendanceService.fetchAttendance).mockRejectedValueOnce(
      new ApiError(400, 'DATE_INVALID', 'bad date'),
    );
    renderPage();

    const message = await screen.findByTestId('absensi-date-error');
    expect(message).toHaveAttribute('role', 'alert');
    expect(message).toHaveTextContent(id['absensi.error.dateInvalid']);

    expect(screen.queryByTestId('server-error-state')).not.toBeInTheDocument();
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    expect(screen.queryByTestId('absensi-table')).not.toBeInTheDocument();
  });

  it('only ever asks the attendance service for a read', async () => {
    renderPage();
    await screen.findByTestId('absensi-table');

    const service = await import('../services/attendance');
    expect(Object.keys(service).sort()).toEqual([
      'ATTENDANCE_BASE',
      'fetchAttendance',
    ]);

    const calls = vi.mocked(attendanceService.fetchAttendance).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    for (const [query] of calls) {
      expect(query).toBeDefined();
      expect(Object.keys(query ?? {}).sort()).toEqual(['date', 'q']);
      expect(query).not.toHaveProperty('method');
      expect(query).not.toHaveProperty('body');
      expect(query).not.toHaveProperty('headers');
    }
  });
});
