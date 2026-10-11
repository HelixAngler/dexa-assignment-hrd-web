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

/** Outlined action: the secondary header link and the per-row edit link. */
const secondaryButtonClassName =
  'inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[var(--color-surface)] px-[var(--space-md)] font-semibold text-[color:var(--color-text)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)] hover:bg-[var(--color-page)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]';

/** The single primary action of the screen, full width on phones. */
const primaryButtonClassName =
  'inline-flex min-h-[44px] w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-[var(--space-lg)] font-semibold text-[color:var(--color-on-primary)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)] sm:w-auto';

/** Circular initials badge shown beside an account name. */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter((part) => part !== '')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}

/**
 * Status pill with its own colour pairing: the two states must read apart
 * without relying on the word alone. Copied from the employee list so the
 * two screens keep the same reading without a shared-module refactor.
 */
function StatusBadge({ status }: { status: EmployeeStatus }) {
  const { t } = useI18n();
  const active = status === 'active';

  return (
    <span
      data-testid={`status-${status}`}
      className={[
        'inline-flex items-center gap-[var(--space-xs)] whitespace-nowrap rounded-[var(--radius-full)] px-[var(--space-md)] py-[var(--space-xs)] font-semibold [font-size:var(--text-xs)] [line-height:var(--text-xs-line-height)]',
        active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600',
      ].join(' ')}
    >
      {active ? t('karyawan.status.active') : t('karyawan.status.deactivated')}
    </span>
  );
}

/**
 * HR account directory: every account carrying the HR role in this console,
 * active and deactivated alike, in the same responsive layout as the employee
 * list — a table on wide screens, stacked cards on phones. Adding an account
 * and editing one both live here and both file proposals: the header action
 * opens the proposal form, each row links to that account's proposal screen.
 */
export default function HrAccountsPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<EmployeeSummary[]>([]);
  const [status, setStatus] = useState<ListStatus>('loading');

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setStatus('loading');
    }
    try {
      const all = await listEmployees();
      setRows(all.filter((row) => row.role === 'hrd'));
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

  const emptyOnScreen = status === 'ready' && rows.length === 0;

  return (
    <section data-testid="hr-accounts" className="space-y-[var(--space-lg)]">
      <div className="flex flex-col gap-[var(--space-md)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-[color:var(--color-text-strong)] [font-size:var(--text-xl)] [line-height:var(--text-xl-line-height)]">
            {t('hr.accounts.title')}
          </h1>
          <p className="mt-[var(--space-xs)] text-[color:var(--color-text-muted)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
            {t('hr.accounts.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap gap-[var(--space-md)]">
          <Link
            to="/hr/add"
            data-testid="hr-add-button"
            className={primaryButtonClassName}
          >
            {t('karyawan.list.add')}
          </Link>
          <Link
            to="/approvals"
            data-testid="hr-accounts-open-approvals"
            className={secondaryButtonClassName}
          >
            {t('hr.accounts.openApprovals')}
          </Link>
        </div>
      </div>

      {status === 'loading' && <LoadingState />}

      {status === 'error' && (
        <ServerErrorState
          onRetry={() => void load()}
          actionVariant="secondary"
        />
      )}

      {emptyOnScreen && (
        <EmptyState
          title={t('hr.accounts.emptyTitle')}
          description={t('hr.accounts.emptyDescription')}
        />
      )}

      {status === 'ready' && rows.length > 0 && (
        <>
          {/* Wide screens: one card-flushed table, sticky header, 48 px
              zebra rows, no sideways scrolling. */}
          <div className="hidden rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] md:block">
            <table
              data-testid="hr-accounts-table"
              className="w-full border-collapse text-left [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]"
            >
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky top-0 z-[1] border-b border-[color:var(--color-border)] bg-[var(--color-surface)] p-[var(--space-md)] font-semibold text-[color:var(--color-text)]"
                  >
                    {t('karyawan.column.name')}
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-[1] border-b border-[color:var(--color-border)] bg-[var(--color-surface)] p-[var(--space-md)] font-semibold text-[color:var(--color-text)]"
                  >
                    {t('karyawan.column.email')}
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-[1] border-b border-[color:var(--color-border)] bg-[var(--color-surface)] p-[var(--space-md)] font-semibold text-[color:var(--color-text)]"
                  >
                    {t('karyawan.column.position')}
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-[1] border-b border-[color:var(--color-border)] bg-[var(--color-surface)] p-[var(--space-md)] font-semibold text-[color:var(--color-text)]"
                  >
                    {t('karyawan.column.status')}
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-[1] border-b border-[color:var(--color-border)] bg-[var(--color-surface)] p-[var(--space-md)] font-semibold text-[color:var(--color-text)]"
                  >
                    {t('karyawan.column.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    data-testid="hr-account-row"
                    className="border-b border-[color:var(--color-border)] even:bg-[var(--color-page)]"
                  >
                    <td className="h-[48px] px-[var(--space-md)] text-[color:var(--color-text)] align-middle">
                      <span
                        title={row.name}
                        className="flex items-center gap-[var(--space-md)] font-semibold break-words text-[color:var(--color-text-strong)]"
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-10 w-10 flex-none items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-primary-subtle)] font-bold text-[color:var(--color-primary)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]"
                        >
                          {initialsOf(row.name)}
                        </span>
                        {row.name}
                      </span>
                    </td>
                    <td className="h-[48px] break-all px-[var(--space-md)] text-[color:var(--color-text)] align-middle">
                      {row.email}
                    </td>
                    <td className="h-[48px] break-words px-[var(--space-md)] text-[color:var(--color-text)] align-middle">
                      {row.position}
                    </td>
                    <td className="h-[48px] px-[var(--space-md)] text-[color:var(--color-text)] align-middle">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="h-[48px] px-[var(--space-md)] text-[color:var(--color-text)] align-middle">
                      <Link
                        to={`/hr/${row.id}/edit`}
                        data-testid="hr-account-edit"
                        className={secondaryButtonClassName}
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
            data-testid="hr-accounts-cards"
            className="space-y-[var(--space-lg)] md:hidden"
          >
            {rows.map((row) => (
              <li
                key={row.id}
                data-testid="hr-account-card"
                className="rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[var(--color-surface)] p-[var(--space-lg)] shadow-[var(--shadow-card)]"
              >
                <div className="flex items-center gap-[var(--space-md)]">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 flex-none items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-primary-subtle)] font-bold text-[color:var(--color-primary)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]"
                  >
                    {initialsOf(row.name)}
                  </span>
                  <div className="min-w-0">
                    <p
                      title={row.name}
                      className="break-words font-semibold text-[color:var(--color-text-strong)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)]"
                    >
                      {row.name}
                    </p>
                    <p className="break-words text-[color:var(--color-text-muted)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
                      {row.position}
                    </p>
                  </div>
                </div>
                <p className="mt-[var(--space-sm)] break-all text-[color:var(--color-text)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
                  {row.email}
                </p>
                <div className="mt-[var(--space-md)] flex items-center justify-between gap-[var(--space-md)]">
                  <StatusBadge status={row.status} />
                  <Link
                    to={`/hr/${row.id}/edit`}
                    data-testid="hr-account-edit"
                    className={secondaryButtonClassName}
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
