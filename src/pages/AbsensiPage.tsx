import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AttendanceRow,
  EmptyState,
  LoadingState,
  ServerErrorState,
} from '../components';
import { useI18n } from '../i18n/provider';
import { ApiError } from '../services/api';
import { fetchAttendance, type AttendanceRowData } from '../services/attendance';

/** Where the list is in its load; a failed refresh keeps no stale rows. */
type ListStatus = 'loading' | 'ready' | 'error';

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
 * explained next to the field instead of being called a server fault.
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

  const fieldClass =
    'min-h-[44px] rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900';
  const labelClass = 'text-sm font-medium text-gray-700';

  return (
    <section data-testid="absensi" className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">
        {t('absensi.title')}
      </h1>

      <p
        data-testid="absensi-readonly"
        className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800"
      >
        {t('absensi.readOnlyNote')}
      </p>

      <form
        data-testid="absensi-filters"
        onSubmit={submitSearch}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="flex flex-col gap-1">
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

        <div className="flex flex-col gap-1">
          <label htmlFor="absensi-search" className={labelClass}>
            {t('absensi.searchLabel')}
          </label>
          <input
            id="absensi-search"
            data-testid="absensi-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className={fieldClass}
          />
        </div>

        <button
          type="submit"
          data-testid="absensi-search-submit"
          className="min-h-[44px] rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {t('absensi.searchSubmit')}
        </button>
      </form>

      {dateInvalid && (
        <p
          role="alert"
          data-testid="absensi-date-error"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          {t('absensi.error.dateInvalid')}
        </p>
      )}

      {status === 'loading' && <LoadingState />}

      {status === 'error' && <ServerErrorState onRetry={() => void load()} />}

      {status === 'ready' && rows.length === 0 && !dateInvalid && (
        <EmptyState
          title={t('absensi.emptyTitle')}
          description={t('absensi.emptyDescription')}
        />
      )}

      {status === 'ready' && rows.length > 0 && (
        <div className="space-y-3">
          {/* Wide screens: one table, four columns, no sideways scrolling. */}
          <table
            data-testid="absensi-table"
            className="hidden w-full border-collapse text-left text-sm tabular-nums md:table"
          >
            <thead>
              <tr className="border-b border-gray-200 text-gray-600">
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t('absensi.column.name')}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t('absensi.column.masuk')}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t('absensi.column.pulang')}
                </th>
                <th scope="col" className="py-2 font-medium">
                  {t('absensi.column.status')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <AttendanceRow key={row.employeeId} row={row} layout="table" />
              ))}
            </tbody>
          </table>

          {/* Phones: the same people stacked as cards, one column, no overflow. */}
          <ul data-testid="absensi-cards" className="space-y-3 md:hidden">
            {rows.map((row) => (
              <AttendanceRow key={row.employeeId} row={row} layout="card" />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
