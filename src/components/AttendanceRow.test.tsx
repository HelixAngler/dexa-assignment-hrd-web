import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { id } from '../i18n/id';
import { I18nProvider } from '../i18n/provider';
import type { AttendanceRowData, AttendanceState } from '../services/attendance';
import AttendanceRow from './AttendanceRow';

const rows: Record<AttendanceState, AttendanceRowData> = {
  done: {
    employeeId: 'emp-1',
    name: 'Budi Santoso',
    masuk: '2026-10-08T01:00:00.000Z',
    pulang: '2026-10-08T10:00:00.000Z',
    state: 'done',
  },
  open: {
    employeeId: 'emp-2',
    name: 'Citra Dewi',
    masuk: '2026-10-08T01:00:00.000Z',
    pulang: null,
    state: 'open',
  },
  '-': {
    employeeId: 'emp-3',
    name: 'Rangga Wijaya',
    masuk: null,
    pulang: null,
    state: '-',
  },
};

const allStates: AttendanceState[] = ['done', 'open', '-'];

/** Every state rendered once in each half, each half inside its own parent. */
function renderRows() {
  render(
    <I18nProvider>
      <table>
        <tbody>
          {allStates.map((state) => (
            <AttendanceRow key={rows[state].employeeId} row={rows[state]} layout="table" />
          ))}
        </tbody>
      </table>
      <ul>
        {allStates.map((state) => (
          <AttendanceRow key={rows[state].employeeId} row={rows[state]} layout="card" />
        ))}
      </ul>
    </I18nProvider>,
  );
}

/** The desktop row and the phone card that both carry the given state. */
function entriesFor(state: AttendanceState) {
  const table = document.querySelector(
    `[data-testid="attendance-row"][data-state="${state}"]`,
  );
  const card = document.querySelector(
    `[data-testid="attendance-card"][data-state="${state}"]`,
  );
  if (table === null || card === null) {
    throw new Error(`no attendance entry for state ${state}`);
  }
  return { table: table as HTMLElement, card: card as HTMLElement };
}

describe('AttendanceRow', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders one desktop row and one phone card per employee', () => {
    renderRows();

    const tableRows = screen.getAllByTestId('attendance-row');
    const cards = screen.getAllByTestId('attendance-card');
    expect(tableRows).toHaveLength(3);
    expect(cards).toHaveLength(3);

    tableRows.forEach((row) => {
      expect(row.tagName).toBe('TR');
      expect(row.closest('table')).not.toBeNull();
      expect(row.querySelectorAll('td')).toHaveLength(4);
    });
    cards.forEach((card) => {
      expect(card.tagName).toBe('LI');
      expect(card.closest('ul')).not.toBeNull();
      expect(card.querySelectorAll('dt')).toHaveLength(3);
    });
  });

  it('wraps a long employee name in both halves instead of widening either one', () => {
    const longName =
      'Muhammad Abdurrahman Wahyudiansyah Kusumaatmadja Wirasenjaya';
    render(
      <I18nProvider>
        <table>
          <tbody>
            <AttendanceRow
              row={{ ...rows.done, name: longName }}
              layout="table"
            />
          </tbody>
        </table>
        <ul>
          <AttendanceRow row={{ ...rows.done, name: longName }} layout="card" />
        </ul>
      </I18nProvider>,
    );

    const names = screen.getAllByText(longName);
    expect(names).toHaveLength(2);
    for (const name of names) {
      expect(name.className).toContain('break-words');
    }
  });

  it('shows locale times and the finished label for a completed punch', () => {
    renderRows();
    const { table, card } = entriesFor('done');

    expect(table).toHaveTextContent('Budi Santoso');
    expect(card).toHaveTextContent('Budi Santoso');

    expect(within(table).getByTestId('attendance-masuk')).toHaveTextContent(
      /^\d{2}[.:]\d{2}$/,
    );
    expect(within(table).getByTestId('attendance-pulang')).toHaveTextContent(
      /^\d{2}[.:]\d{2}$/,
    );
    expect(within(card).getByTestId('attendance-masuk')).toHaveTextContent(
      /^\d{2}[.:]\d{2}$/,
    );
    expect(within(card).getByTestId('attendance-pulang')).toHaveTextContent(
      /^\d{2}[.:]\d{2}$/,
    );

    expect(within(table).getByTestId('attendance-status')).toHaveTextContent(
      id['absensi.row.status.done'],
    );
    expect(within(card).getByTestId('attendance-status')).toHaveTextContent(
      id['absensi.row.status.done'],
    );
    expect(
      within(table).queryByTestId('attendance-still-working'),
    ).not.toBeInTheDocument();
  });

  it('says the session is still open in the pulang cell and in the status', () => {
    renderRows();
    const { table, card } = entriesFor('open');

    expect(within(table).getByTestId('attendance-masuk')).toHaveTextContent(
      /^\d{2}[.:]\d{2}$/,
    );
    expect(within(card).getByTestId('attendance-masuk')).toHaveTextContent(
      /^\d{2}[.:]\d{2}$/,
    );

    expect(within(table).getByTestId('attendance-pulang')).toHaveTextContent(
      id['absensi.row.stillWorking'],
    );
    expect(within(card).getByTestId('attendance-pulang')).toHaveTextContent(
      id['absensi.row.stillWorking'],
    );
    expect(within(table).getByTestId('attendance-pulang')).not.toHaveTextContent(
      /^\d{2}[.:]\d{2}$/,
    );
    expect(within(table).getByTestId('attendance-still-working')).toBeInTheDocument();
    expect(within(card).getByTestId('attendance-still-working')).toBeInTheDocument();

    expect(within(table).getByTestId('attendance-status')).toHaveTextContent(
      id['absensi.row.status.open'],
    );
    expect(within(card).getByTestId('attendance-status')).toHaveTextContent(
      id['absensi.row.status.open'],
    );
  });

  it('prints a dash in both time cells and an explicit label when nobody punched', () => {
    renderRows();
    const { table, card } = entriesFor('-');

    expect(table).toHaveTextContent('Rangga Wijaya');
    expect(card).toHaveTextContent('Rangga Wijaya');

    expect(within(table).getByTestId('attendance-masuk').textContent?.trim()).toBe('-');
    expect(within(table).getByTestId('attendance-pulang').textContent?.trim()).toBe('-');
    expect(within(card).getByTestId('attendance-masuk').textContent?.trim()).toBe('-');
    expect(within(card).getByTestId('attendance-pulang').textContent?.trim()).toBe('-');

    expect(within(table).getByTestId('attendance-status')).toHaveTextContent(
      id['absensi.row.status.noPunch'],
    );
    expect(within(card).getByTestId('attendance-status')).toHaveTextContent(
      id['absensi.row.status.noPunch'],
    );
    expect(
      within(card).queryByTestId('attendance-still-working'),
    ).not.toBeInTheDocument();
  });

  it('keeps the paired halves readable as label and value on the phone card', () => {
    renderRows();
    const { card } = entriesFor('done');
    const labels = Array.from(card.querySelectorAll('dt')).map(
      (term) => term.textContent,
    );

    expect(labels).toEqual([
      id['absensi.column.masuk'],
      id['absensi.column.pulang'],
      id['absensi.column.status'],
    ]);
  });

  it('offers no interactive control in either layout', () => {
    renderRows();

    const interactive = document.querySelectorAll(
      'button, input, select, textarea, a, [role="button"], [contenteditable="true"]',
    );
    expect(interactive).toHaveLength(0);
  });

  it('renders the English labels when English is the stored language', () => {
    window.localStorage.setItem('lang', 'en');
    renderRows();

    const open = entriesFor('open');
    expect(within(open.table).getByTestId('attendance-status')).toHaveTextContent(
      'Working',
    );
    expect(
      within(open.table).getByTestId('attendance-pulang'),
    ).toHaveTextContent('(still working)');

    const noPunch = entriesFor('-');
    expect(
      within(noPunch.card).getByTestId('attendance-status'),
    ).toHaveTextContent('No punch yet');
    const labels = Array.from(noPunch.card.querySelectorAll('dt')).map(
      (term) => term.textContent,
    );
    expect(labels).toContain('Clock in');
  });
});
