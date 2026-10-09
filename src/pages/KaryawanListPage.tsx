import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, LoadingState, ServerErrorState } from '../components';
import { useI18n } from '../i18n/provider';
import {
  listEmployees,
  type EmployeeStatus,
  type EmployeeSummary,
} from '../services/employees';

/** Where the list is in its load; a failed refresh keeps the current rows. */
type ListStatus = 'loading' | 'ready' | 'error';

/**
 * Status pill with its own colour pairing: the two states must read apart
 * without relying on the word alone.
 */
function StatusBadge({ status }: { status: EmployeeStatus }) {
  const { t } = useI18n();
  const active = status === 'active';

  return (
    <span
      data-testid={`status-${status}`}
      className={[
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
        active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600',
      ].join(' ')}
    >
      {active ? t('karyawan.status.active') : t('karyawan.status.deactivated')}
    </span>
  );
}

/**
 * Employee directory. Rows are fetched through the service layer, rendered
 * as a table on wide screens and as stacked cards on phones so the phone
 * layout never scrolls sideways, and refreshed whenever the window regains
 * focus — the way a mutation on another tab shows up here.
 */
export default function KaryawanListPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<EmployeeSummary[]>([]);
  const [status, setStatus] = useState<ListStatus>('loading');

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setStatus('loading');
    }
    try {
      const next = await listEmployees();
      setRows(next);
      setStatus('ready');
    } catch {
      // A failed background refresh keeps whatever is already on screen.
      if (!silent) {
        setStatus('error');
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handleFocus = () => {
      void load(true);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [load]);

  const addButtonClass =
    'inline-flex min-h-[44px] w-full items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto';

  return (
    <section data-testid="karyawan-list" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          {t('karyawan.list.title')}
        </h1>
        <Link
          to="/karyawan/add"
          data-testid="karyawan-add-button"
          className={addButtonClass}
        >
          {t('karyawan.list.add')}
        </Link>
      </div>

      {status === 'loading' && <LoadingState />}

      {status === 'error' && (
        <ServerErrorState onRetry={() => void load()} />
      )}

      {status === 'ready' && rows.length === 0 && (
        <EmptyState
          title={t('karyawan.list.emptyTitle')}
          description={t('karyawan.list.emptyDescription')}
          action={
            <Link to="/karyawan/add" className={`mt-2 ${addButtonClass}`}>
              {t('karyawan.list.add')}
            </Link>
          }
        />
      )}

      {status === 'ready' && rows.length > 0 && (
        <>
          {/* Wide screens: one table, fixed columns, no sideways scrolling. */}
          <div className="hidden md:block">
            <table
              data-testid="karyawan-table"
              className="w-full border-collapse text-left text-sm"
            >
              <thead>
                <tr className="border-b border-gray-200 text-gray-600">
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    {t('karyawan.column.name')}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    {t('karyawan.column.email')}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    {t('karyawan.column.position')}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    {t('karyawan.column.status')}
                  </th>
                  <th scope="col" className="py-2 font-semibold">
                    {t('karyawan.column.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    data-testid="karyawan-row"
                    className="border-b border-gray-100 bg-white"
                  >
                    <td className="py-3 pr-4 font-medium break-words text-gray-900">
                      {row.name}
                    </td>
                    <td className="py-3 pr-4 break-all text-gray-700">{row.email}</td>
                    <td className="py-3 pr-4 break-words text-gray-700">
                      {row.position}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="py-3">
                      <Link
                        to={`/karyawan/${row.id}/edit`}
                        data-testid={`edit-${row.id}`}
                        className="inline-flex min-h-[44px] items-center rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
                      >
                        {t('karyawan.list.edit')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones: the same rows stacked as cards, one column, no overflow. */}
          <ul
            data-testid="karyawan-cards"
            className="space-y-3 md:hidden"
          >
            {rows.map((row) => (
              <li
                key={row.id}
                data-testid="karyawan-card"
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <p className="text-base font-semibold break-words text-gray-900">
                  {row.name}
                </p>
                <p className="mt-1 break-all text-sm text-gray-700">
                  {row.email}
                </p>
                <p className="mt-1 break-words text-sm text-gray-700">
                  {row.position}
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <StatusBadge status={row.status} />
                  <Link
                    to={`/karyawan/${row.id}/edit`}
                    data-testid={`edit-card-${row.id}`}
                    className="inline-flex min-h-[44px] items-center rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    {t('karyawan.list.edit')}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
