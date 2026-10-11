import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../i18n/id';
import { I18nProvider } from '../i18n/provider';
import { ApiError } from '../services/api';
import * as employeesService from '../services/employees';
import KaryawanListPage from './KaryawanListPage';

vi.mock('../services/employees', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/employees')>();
  return { ...actual, listEmployees: vi.fn() };
});

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
    name: 'Citra Dewi',
    email: 'citra@corp.test',
    position: 'Designer',
    status: 'deactivated',
    role: 'employee',
  },
];

function renderList() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/karyawan']}>
        <Routes>
          <Route path="/karyawan" element={<KaryawanListPage />} />
          <Route
            path="/karyawan/add"
            element={<div data-testid="add-destination">add</div>}
          />
          <Route
            path="/karyawan/:id/edit"
            element={<div data-testid="edit-destination">edit</div>}
          />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('KaryawanListPage', () => {
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
    renderList();

    expect(screen.getByTestId('karyawan-list')).toBeInTheDocument();
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(screen.queryByTestId('karyawan-table')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: id['karyawan.list.add'] }),
    ).toBeInTheDocument();
  });

  it('renders every row as a desktop table entry with status and edit action', async () => {
    renderList();

    const table = await screen.findByTestId('karyawan-table');
    const bodyRows = within(table).getAllByTestId('karyawan-row');
    expect(bodyRows).toHaveLength(2);

    const first = within(bodyRows[0]);
    expect(first.getByText('Budi Santoso')).toBeInTheDocument();
    expect(first.getByText('budi@corp.test')).toBeInTheDocument();
    expect(first.getByText('Engineer')).toBeInTheDocument();
    expect(first.getByTestId('status-active')).toHaveTextContent(
      id['karyawan.status.active'],
    );
    expect(
      first.getByRole('link', { name: id['karyawan.list.edit'] }),
    ).toHaveAttribute('href', '/karyawan/emp-1/edit');

    const second = within(bodyRows[1]);
    expect(second.getByTestId('status-deactivated')).toHaveTextContent(
      id['karyawan.status.deactivated'],
    );
  });

  it('styles the two statuses so they read apart at a glance', async () => {
    renderList();

    await screen.findByTestId('karyawan-table');
    const active = screen.getAllByTestId('status-active')[0];
    const deactivated = screen.getAllByTestId('status-deactivated')[0];

    expect(active.className).toContain('bg-green-100');
    expect(deactivated.className).toContain('bg-gray-200');
    expect(active.className).not.toBe(deactivated.className);
  });

  it('stacks the same rows as phone cards without a horizontal scroller', async () => {
    renderList();

    const cards = await screen.findByTestId('karyawan-cards');
    expect(cards).toHaveClass('md:hidden');
    const items = within(cards).getAllByTestId('karyawan-card');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Budi Santoso');
    expect(items[0]).toHaveTextContent('budi@corp.test');
    expect(within(items[1]).getByTestId('status-deactivated')).toBeInTheDocument();
    expect(
      within(items[0]).getByRole('link', { name: id['karyawan.list.edit'] }),
    ).toHaveAttribute('href', '/karyawan/emp-1/edit');

    // The table is hidden on phone widths, so the cards carry the layout there.
    expect(screen.getByTestId('karyawan-table').closest('div')).toHaveClass(
      'hidden',
    );
    expect(screen.getByTestId('karyawan-table').closest('div')).toHaveClass(
      'md:block',
    );
  });

  it('puts the add action full width on a phone and beside the title wider up', async () => {
    renderList();

    const link = await screen.findByTestId('karyawan-add-button');
    const row = link.parentElement;

    expect(row?.className).toContain('flex-col');
    expect(row?.className).toContain('sm:flex-row');
    expect(link.className).toContain('min-h-[44px]');
    expect(link.className).toContain('w-full');
    expect(link.className).toContain('sm:w-auto');
  });

  it('wraps long employee values in both halves instead of widening either one', async () => {
    const longEmail =
      'firstname.lastname.with.an.extremely.long.local.part@corp.test.example.com';
    vi.mocked(employeesService.listEmployees).mockResolvedValue([
      { ...rows[0], email: longEmail },
    ]);
    renderList();

    await screen.findByTestId('karyawan-table');

    for (const cell of screen.getAllByText(longEmail)) {
      expect(cell.className).toContain('break-all');
    }
    for (const cell of screen.getAllByText('Budi Santoso')) {
      expect(cell.className).toContain('break-words');
    }
    for (const cell of screen.getAllByText('Engineer')) {
      expect(cell.className).toContain('break-words');
    }
  });

  it('shows the empty state with an explanation when nobody is listed', async () => {
    vi.mocked(employeesService.listEmployees).mockResolvedValue([]);
    renderList();

    expect(await screen.findByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText(id['karyawan.list.emptyTitle'])).toBeInTheDocument();
    expect(
      screen.getByText(id['karyawan.list.emptyDescription']),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: id['karyawan.list.add'] }).length,
    ).toBeGreaterThan(0);
  });

  it('shows the server error state and retries the load on demand', async () => {
    const user = userEvent.setup();
    vi.mocked(employeesService.listEmployees).mockRejectedValueOnce(
      new ApiError(500, 'INTERNAL', 'boom'),
    );
    renderList();

    expect(await screen.findByTestId('server-error-state')).toBeInTheDocument();

    await user.click(screen.getByTestId('retry-button'));

    expect(await screen.findByTestId('karyawan-table')).toBeInTheDocument();
    expect(employeesService.listEmployees).toHaveBeenCalledTimes(2);
  });

  it('keeps the loaded rows when a background refresh fails', async () => {
    renderList();
    await screen.findByTestId('karyawan-table');

    vi.mocked(employeesService.listEmployees).mockRejectedValueOnce(
      new ApiError(500, 'INTERNAL', 'boom'),
    );
    window.dispatchEvent(new Event('focus'));

    await waitFor(() =>
      expect(employeesService.listEmployees).toHaveBeenCalledTimes(2),
    );
    expect(screen.getByTestId('karyawan-table')).toBeInTheDocument();
    expect(screen.queryByTestId('server-error-state')).not.toBeInTheDocument();
  });

  it('re-fetches when the window regains focus', async () => {
    renderList();
    await screen.findByTestId('karyawan-table');

    window.dispatchEvent(new Event('focus'));

    await waitFor(() =>
      expect(employeesService.listEmployees).toHaveBeenCalledTimes(2),
    );
    await waitFor(() =>
      expect(screen.getAllByTestId('karyawan-row')).toHaveLength(2),
    );
  });

  it('routes the primary action to the add screen', async () => {
    const user = userEvent.setup();
    renderList();

    await screen.findByTestId('karyawan-table');
    await user.click(screen.getByRole('link', { name: id['karyawan.list.add'] }));

    expect(await screen.findByTestId('add-destination')).toBeInTheDocument();
  });

  it('routes a row edit action to that employee edit screen', async () => {
    const user = userEvent.setup();
    renderList();

    const table = await screen.findByTestId('karyawan-table');
    await user.click(
      within(table).getAllByRole('link', { name: id['karyawan.list.edit'] })[1],
    );

    expect(await screen.findByTestId('edit-destination')).toBeInTheDocument();
  });

  it('no longer mounts the HR approval section on the list screen', async () => {
    renderList();

    await screen.findByTestId('karyawan-table');

    expect(screen.queryByTestId('approval-section')).not.toBeInTheDocument();
  });

  it('hides the edit action on HR-role rows in both layouts', async () => {
    vi.mocked(employeesService.listEmployees).mockResolvedValue([
      rows[0],
      {
        id: 'emp-3',
        name: 'Sari Wati',
        email: 'sari@corp.test',
        position: 'HR Officer',
        status: 'active',
        role: 'hrd',
      },
    ]);
    renderList();

    const table = await screen.findByTestId('karyawan-table');
    const bodyRows = within(table).getAllByTestId('karyawan-row');
    expect(bodyRows).toHaveLength(2);

    expect(
      within(bodyRows[0]).getByRole('link', { name: id['karyawan.list.edit'] }),
    ).toHaveAttribute('href', '/karyawan/emp-1/edit');

    // The actions cell stays so the columns keep aligning; only the link goes.
    expect(bodyRows[1].children).toHaveLength(bodyRows[0].children.length);
    expect(
      within(bodyRows[1]).queryByRole('link', {
        name: id['karyawan.list.edit'],
      }),
    ).not.toBeInTheDocument();

    const cards = within(screen.getByTestId('karyawan-cards')).getAllByTestId(
      'karyawan-card',
    );
    expect(
      within(cards[0]).getByRole('link', { name: id['karyawan.list.edit'] }),
    ).toBeInTheDocument();
    expect(
      within(cards[1]).queryByRole('link', { name: id['karyawan.list.edit'] }),
    ).not.toBeInTheDocument();
    expect(cards[1]).toHaveTextContent('Sari Wati');
  });
});
