import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../i18n/id';
import { I18nProvider } from '../i18n/provider';
import { ApiError } from '../services/api';
import * as employeesService from '../services/employees';
import HrAccountsPage from './HrAccountsPage';

vi.mock('../services/employees', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/employees')>();
  return { ...actual, listEmployees: vi.fn() };
});

/** Every role and status the directory must sort through. */
const rows: employeesService.EmployeeSummary[] = [
  {
    id: 'emp-1',
    name: 'Budi Santoso',
    email: 'budi@corp.test',
    position: 'Engineer',
    status: 'active',
    role: 'employee',
  },
  {
    id: 'emp-2',
    name: 'Sari Wati',
    email: 'sari@corp.test',
    position: 'HR Officer',
    status: 'active',
    role: 'hrd',
  },
  {
    id: 'emp-3',
    name: 'Citra Dewi',
    email: 'citra@corp.test',
    position: 'Designer',
    status: 'deactivated',
    role: 'employee',
  },
  {
    id: 'emp-4',
    name: 'Rudi Hartono',
    email: 'rudi@corp.test',
    position: 'HR Manager',
    status: 'deactivated',
    role: 'hrd',
  },
];

/** Only the two HR rows, in the order the list returned them. */
const hrRows = [rows[1], rows[3]];

function renderHrAccounts() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/hr']}>
        <Routes>
          <Route path="/hr" element={<HrAccountsPage />} />
          <Route
            path="/hr/add"
            element={<div data-testid="hr-add-destination">add</div>}
          />
          <Route
            path="/hr/:id/edit"
            element={<div data-testid="hr-edit-destination">edit</div>}
          />
          <Route
            path="/approvals"
            element={<div data-testid="approvals-destination">approvals</div>}
          />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('HrAccountsPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(employeesService.listEmployees).mockReset();
    vi.mocked(employeesService.listEmployees).mockResolvedValue(rows);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reserves the layout with the loading state until the rows arrive', () => {
    vi.mocked(employeesService.listEmployees).mockReturnValue(
      new Promise(() => {}),
    );
    renderHrAccounts();

    expect(screen.getByTestId('hr-accounts')).toBeInTheDocument();
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(screen.queryByTestId('hr-accounts-table')).not.toBeInTheDocument();
  });

  it('routes the header actions into the proposal form and the approvals inbox', async () => {
    const user = userEvent.setup();
    renderHrAccounts();

    expect(
      await screen.findByRole('heading', { name: id['hr.accounts.title'] }),
    ).toBeInTheDocument();
    expect(screen.getByText(id['hr.accounts.subtitle'])).toBeInTheDocument();

    const add = await screen.findByTestId('hr-add-button');
    expect(add).toHaveAttribute('href', '/hr/add');
    expect(add).toHaveTextContent(id['karyawan.list.add']);

    const link = screen.getByRole('link', {
      name: id['hr.accounts.openApprovals'],
    });
    expect(link).toHaveAttribute('href', '/approvals');

    await user.click(link);

    expect(await screen.findByTestId('approvals-destination')).toBeInTheDocument();
  });

  it('opens the proposal form from the header add action', async () => {
    const user = userEvent.setup();
    renderHrAccounts();

    await user.click(await screen.findByTestId('hr-add-button'));

    expect(await screen.findByTestId('hr-add-destination')).toBeInTheDocument();
  });

  it('lists only the HR accounts, deactivated ones included, in the desktop table', async () => {
    renderHrAccounts();

    const table = await screen.findByTestId('hr-accounts-table');
    const bodyRows = within(table).getAllByTestId('hr-account-row');
    expect(bodyRows).toHaveLength(2);

    const active = within(bodyRows[0]);
    expect(active.getByText('Sari Wati')).toBeInTheDocument();
    expect(active.getByText('sari@corp.test')).toBeInTheDocument();
    expect(active.getByText('HR Officer')).toBeInTheDocument();
    expect(active.getByTestId('status-active')).toHaveTextContent(
      id['karyawan.status.active'],
    );

    const deactivated = within(bodyRows[1]);
    expect(deactivated.getByText('Rudi Hartono')).toBeInTheDocument();
    expect(deactivated.getByTestId('status-deactivated')).toHaveTextContent(
      id['karyawan.status.deactivated'],
    );

    expect(screen.queryByText('Budi Santoso')).not.toBeInTheDocument();
    expect(screen.queryByText('Citra Dewi')).not.toBeInTheDocument();
  });

  it('links every row and card to that account’s proposal screen', async () => {
    const user = userEvent.setup();
    renderHrAccounts();

    const table = await screen.findByTestId('hr-accounts-table');
    const bodyRows = within(table).getAllByTestId('hr-account-row');
    const tableEdits = within(table).getAllByTestId('hr-account-edit');
    expect(tableEdits).toHaveLength(2);
    expect(tableEdits[0]).toHaveAttribute('href', '/hr/emp-2/edit');
    expect(tableEdits[1]).toHaveAttribute('href', '/hr/emp-4/edit');
    expect(within(bodyRows[0]).getByText('Sari Wati')).toBeInTheDocument();

    const cards = screen.getByTestId('hr-accounts-cards');
    const cardEdits = within(cards).getAllByTestId('hr-account-edit');
    expect(cardEdits).toHaveLength(2);
    expect(cardEdits[0]).toHaveAttribute('href', '/hr/emp-2/edit');

    await user.click(tableEdits[0]);

    expect(await screen.findByTestId('hr-edit-destination')).toBeInTheDocument();
  });

  it('stacks the same HR rows as phone cards without a horizontal scroller', async () => {
    renderHrAccounts();

    const cards = await screen.findByTestId('hr-accounts-cards');
    expect(cards).toHaveClass('md:hidden');
    const items = within(cards).getAllByTestId('hr-account-card');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Sari Wati');
    expect(items[1]).toHaveTextContent('Rudi Hartono');
    expect(within(items[1]).getByTestId('status-deactivated')).toBeInTheDocument();

    // The table is hidden on phone widths, so the cards carry the layout there.
    const table = screen.getByTestId('hr-accounts-table');
    expect(table.closest('div')).toHaveClass('hidden');
    expect(table.closest('div')).toHaveClass('md:block');
  });

  it('shows the empty state when no HR account exists yet', async () => {
    vi.mocked(employeesService.listEmployees).mockResolvedValue(
      rows.filter((row) => row.role !== 'hrd'),
    );
    renderHrAccounts();

    expect(await screen.findByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText(id['hr.accounts.emptyTitle'])).toBeInTheDocument();
    expect(
      screen.getByText(id['hr.accounts.emptyDescription']),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: id['hr.accounts.openApprovals'] }),
    ).toBeInTheDocument();
  });

  it('shows the server error state and retries the load on demand', async () => {
    const user = userEvent.setup();
    vi.mocked(employeesService.listEmployees).mockRejectedValueOnce(
      new ApiError(500, 'INTERNAL', 'boom'),
    );
    renderHrAccounts();

    expect(await screen.findByTestId('server-error-state')).toBeInTheDocument();

    await user.click(screen.getByTestId('retry-button'));

    expect(await screen.findByTestId('hr-accounts-table')).toBeInTheDocument();
    expect(employeesService.listEmployees).toHaveBeenCalledTimes(2);
  });

  it('re-fetches when the window regains focus', async () => {
    renderHrAccounts();
    await screen.findByTestId('hr-accounts-table');

    window.dispatchEvent(new Event('focus'));

    await waitFor(() =>
      expect(employeesService.listEmployees).toHaveBeenCalledTimes(2),
    );
    await waitFor(() =>
      expect(
        within(screen.getByTestId('hr-accounts-table')).getAllByTestId(
          'hr-account-row',
        ),
      ).toHaveLength(hrRows.length),
    );
  });
});
