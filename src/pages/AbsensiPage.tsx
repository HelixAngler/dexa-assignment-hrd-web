import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AttendanceRow,
  EmptyState,
  LoadingState,
  ServerErrorState,
} from '../components';
import { AlertIcon } from '../components/icons';
import { useI18n } from '../i18n/provider';
import { ApiError } from '../services/api';
import { fetchAttendance, type AttendanceRowData } from '../services/attendance';

/** Where the list is in its load; a failed refresh keeps no stale rows. */
type ListStatus = 'loading' | 'ready' | 'error';

/** The primary action styling shared by this screen's search buttons. */
const primaryButtonClassName =
  'inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-[var(--space-lg)] font-semibold text-[color:var(--color-on-primary)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)] hover:bg-[var(--color-primary-hover)]';

/** One control column of the filter row: label stacked over its input. */
const fieldClass =
  'min-h-[44px] w-full rounded-[var(--radius-sm)] border border-[color:var(--color-border)] bg-[var(--color-surface)] px-[var(--space-md)] text-[color:var(--color-text-strong)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)] focus:border-[color:var(--color-primary)] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]';

/** Label above a filter input, quiet but readable. */
const labelClass =
  'font-medium text-[color:var(--color-text)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]';

/** The calendar day in the browser's own time zone, as `YYYY-MM-DD`. */
function todayISO(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Every employee's punches for one day, strictly as a reading surface: the
 * date and the name search are the only inputs, rows arrive through the
 * attendance service, and the read-only note above them says out loud that
 * nothing here can be changed. Wide screens get one table with headers, phones
 * get one stacked card per employee, and a date the server rejects is
 * explained next to the field instead of being called a server fault. When
 * the day and query yield nobody, the empty state offers the one thing left
 * to do: run the search again with whatever the fields now hold.
 */
export default function AbsensiPage() {
  const { t } = useI18n();
  const [date, setDate] = useState(todayISO);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<AttendanceRowData[]>([]);
  const [status, setStatus] = useState<ListStatus>('loading');
  const [dateInvalid, setDateInvalid] = useState(false);
  const requestSeq = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const request = ++requestSeq.current;
    setStatus('loading');
    setDateInvalid(false);
    try {
      const next = await fetchAttendance({ date, q: query });
      // Only the newest request may write; an older answer arrives too late.
      if (request !== requestSeq.current) {
        return;
      }
      setRows(next);
      setStatus('ready');
    } catch (error) {
      if (request !== requestSeq.current) {
        return;
      }
      if (error instanceof ApiError && error.code === 'DATE_INVALID') {
        setDateInvalid(true);
        setRows([]);
        setStatus('ready');
        return;
      }
      setStatus('error');
    }
  }, [date, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuery(searchInput.trim());
  };

  /**
   * The empty state's own "Cari": run the search with the fields as they now
   * stand, then leave focus back on the name field for the next attempt.
   */
  const searchAgain = () => {
    setQuery(searchInput.trim());
    searchRef.current?.focus();
  };

  return (
    <section data-testid="absensi" className="space-y-[var(--space-xl)]">
      <h1 className="font-bold text-[color:var(--color-text-strong)] [font-size:var(--text-xl)] [line-height:var(--text-xl-line-height)]">
        {t('absensi.title')}
      </h1>

      <p
        data-testid="absensi-readonly"
        className="flex max-w-[72ch] items-start gap-[var(--space-sm)] rounded-[var(--radius-sm)] bg-[var(--color-primary-subtle)] px-[var(--space-md)] py-[var(--space-sm)] text-[color:var(--color-text)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]"
      >
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-[var(--space-xs)] h-5 w-5 shrink-0 text-[color:var(--color-primary)]"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <path d="M12 8h.01" />
        </svg>
        <span>{t('absensi.readOnlyNote')}</span>
      </p>

      <form
        data-testid="absensi-filters"
        onSubmit={submitSearch}
        className="flex flex-wrap items-end gap-[var(--space-md)]"
      >
        <div className="flex min-w-0 grow shrink basis-[24ch] flex-col gap-[var(--space-xs)]">
          <label htmlFor="absensi-date" className={labelClass}>
            {t('absensi.dateLabel')}
          </label>
          <input
            id="absensi-date"
            data-testid="absensi-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={fieldClass}
          />
        </div>

        <div className="flex min-w-0 grow shrink basis-[24ch] flex-col gap-[var(--space-xs)]">
          <label htmlFor="absensi-search" className={labelClass}>
            {t('absensi.searchLabel')}
          </label>
          <input
            id="absensi-search"
            data-testid="absensi-search"
            ref={searchRef}
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className={fieldClass}
          />
        </div>

        <button
          type="submit"
          data-testid="absensi-search-submit"
          className={[primaryButtonClassName, 'w-full shrink-0 md:w-auto'].join(
            ' ',
          )}
        >
          {t('absensi.searchSubmit')}
        </button>
      </form>

      {dateInvalid && (
        <p
          role="alert"
          data-testid="absensi-date-error"
          className="flex max-w-[72ch] items-start gap-[var(--space-sm)] rounded-[var(--radius-sm)] bg-[var(--color-attention-bg)] px-[var(--space-md)] py-[var(--space-sm)] font-medium text-[color:var(--color-attention)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]"
        >
          <AlertIcon size={20} className="mt-[var(--space-xs)] shrink-0" />
          <span>{t('absensi.error.dateInvalid')}</span>
        </p>
      )}

      {status === 'loading' && <LoadingState />}

      {status === 'error' && <ServerErrorState onRetry={() => void load()} />}

      {status === 'ready' && rows.length === 0 && !dateInvalid && (
        <EmptyState
          title={t('absensi.emptyTitle')}
          description={t('absensi.emptyDescription')}
          action={
            <button
              type="button"
              data-testid="absensi-empty-search"
              onClick={searchAgain}
              className={primaryButtonClassName}
            >
              {t('absensi.searchSubmit')}
            </button>
          }
        />
      )}

      {status === 'ready' && rows.length > 0 && (
        <div className="space-y-[var(--space-md)]">
          {/* Wide screens: one table, four columns, no sideways scrolling. */}
          <div className="hidden rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] md:block">
            <table
              data-testid="absensi-table"
              className="hidden w-full border-collapse text-left text-sm tabular-nums md:table"
            >
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky top-0 z-[1] border-b border-[color:var(--color-border)] bg-[var(--color-surface)] p-[var(--space-md)] font-semibold text-[color:var(--color-text)]"
                  >
                    {t('absensi.column.name')}
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-[1] border-b border-[color:var(--color-border)] bg-[var(--color-surface)] p-[var(--space-md)] font-semibold text-[color:var(--color-text)]"
                  >
                    {t('absensi.column.masuk')}
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-[1] border-b border-[color:var(--color-border)] bg-[var(--color-surface)] p-[var(--space-md)] font-semibold text-[color:var(--color-text)]"
                  >
                    {t('absensi.column.pulang')}
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-[1] border-b border-[color:var(--color-border)] bg-[var(--color-surface)] p-[var(--space-md)] font-semibold text-[color:var(--color-text)]"
                  >
                    {t('absensi.column.status')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <AttendanceRow key={row.employeeId} row={row} layout="table" />
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones: the same people stacked as cards, one column, no overflow. */}
          <ul
            data-testid="absensi-cards"
            className="space-y-[var(--space-md)] md:hidden"
          >
            {rows.map((row) => (
              <AttendanceRow key={row.employeeId} row={row} layout="card" />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
