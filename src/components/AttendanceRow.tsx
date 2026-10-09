import type { DictKey } from '../i18n/id';
import { useI18n, type Lang } from '../i18n/provider';
import type { AttendanceRowData, AttendanceState } from '../services/attendance';

/** Which half of the paired layout the caller is rendering. */
export type AttendanceRowLayout = 'table' | 'card';

export interface AttendanceRowProps {
  /** One employee's punches for the queried day. */
  row: AttendanceRowData;
  /**
   * The wide-screen half sits inside a table body and the phone half inside a
   * list, so the caller renders this component once per half — each half then
   * carries its own breakpoint classes and nothing invalid lands in the DOM.
   */
  layout: AttendanceRowLayout;
}

/** Shown verbatim in a time cell that has no punch behind it. */
const DASH = '-';

/** Status wording per punch state, resolved through the active dictionary. */
const STATUS_KEY: Record<AttendanceState, DictKey> = {
  done: 'absensi.row.status.done',
  open: 'absensi.row.status.open',
  '-': 'absensi.row.status.noPunch',
};

/** Status colour pairing; the three states read apart without the word alone. */
const STATUS_CLASS: Record<AttendanceState, string> = {
  done: 'bg-[var(--color-success-bg)] text-[color:var(--color-success)]',
  open: 'border border-[color:var(--color-border)] bg-[var(--color-page)] text-[color:var(--color-text)]',
  '-': 'bg-[var(--color-attention-bg)] text-[color:var(--color-attention)]',
};

/** Shared pill shell every status label and open-session mark wears. */
const pillClassName =
  'inline-flex items-center gap-[var(--space-xs)] whitespace-nowrap rounded-[var(--radius-full)] px-[var(--space-md)] py-[var(--space-xs)] font-semibold [font-size:var(--text-xs)] [line-height:var(--text-xs-line-height)]';

/** Locale tag for the clock rendering in each UI language. */
function localeTag(lang: Lang): string {
  return lang === 'id' ? 'id-ID' : 'en-GB';
}

/**
 * Clock text for one punch value: full instants are shortened to hours and
 * minutes, anything already short (or unparseable) is shown as it arrived.
 */
function formatClock(value: string | null, lang: Lang): string {
  if (value === null) {
    return '';
  }
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(localeTag(lang), {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

interface CellProps {
  row: AttendanceRowData;
}

/** Masuk cell: a dash without a punch, otherwise the clock-in time. */
function MasukValue({ row }: CellProps) {
  const { lang } = useI18n();
  if (row.state === '-') {
    return <>{DASH}</>;
  }
  return <>{formatClock(row.masuk, lang)}</>;
}

/** Pulang cell: a dash without a punch, the still-working wording while open. */
function PulangValue({ row }: CellProps) {
  const { t, lang } = useI18n();
  if (row.state === '-') {
    return <>{DASH}</>;
  }
  if (row.state === 'open') {
    return (
      <span
        data-testid="attendance-still-working"
        className={[pillClassName, STATUS_CLASS.open].join(' ')}
      >
        {t('absensi.row.stillWorking')}
      </span>
    );
  }
  return <>{formatClock(row.pulang, lang)}</>;
}

/** Status suffix shown at the end of both halves. */
function StatusLabel({ row }: CellProps) {
  const { t } = useI18n();

  return (
    <span
      data-testid="attendance-status"
      data-state={row.state}
      className={[pillClassName, STATUS_CLASS[row.state]].join(' ')}
    >
      {t(STATUS_KEY[row.state])}
    </span>
  );
}

/** Wide-screen half: one table row of name, masuk, pulang and status. */
function AttendanceTableRow({ row }: CellProps) {
  const cellClass =
    'h-[48px] border-b border-[color:var(--color-border)] px-[var(--space-md)] align-middle';

  return (
    <tr
      data-testid="attendance-row"
      data-state={row.state}
      data-employee-id={row.employeeId}
      className="even:bg-[var(--color-page)]"
    >
      <td
        className={`${cellClass} break-words font-semibold text-[color:var(--color-text-strong)]`}
      >
        {row.name}
      </td>
      <td
        data-testid="attendance-masuk"
        className={`${cellClass} tabular-nums text-[color:var(--color-text)]`}
      >
        <MasukValue row={row} />
      </td>
      <td
        data-testid="attendance-pulang"
        className={`${cellClass} tabular-nums text-[color:var(--color-text)]`}
      >
        <PulangValue row={row} />
      </td>
      <td className={cellClass}>
        <StatusLabel row={row} />
      </td>
    </tr>
  );
}

/** Phone half: the same employee as a card of label/value pairs. */
function AttendanceCard({ row }: CellProps) {
  const { t } = useI18n();

  return (
    <li
      data-testid="attendance-card"
      data-state={row.state}
      data-employee-id={row.employeeId}
      className="flex flex-col gap-[var(--space-xs)] rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[var(--color-surface)] p-[var(--space-lg)] shadow-[var(--shadow-card)]"
    >
      <p className="break-words font-semibold text-[color:var(--color-text-strong)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)]">
        {row.name}
      </p>
      <dl className="flex flex-col gap-[var(--space-xs)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
        <div className="flex items-baseline justify-between gap-[var(--space-md)]">
          <dt className="text-[color:var(--color-text-muted)]">{t('absensi.column.masuk')}</dt>
          <dd
            data-testid="attendance-masuk"
            className="tabular-nums text-right text-[color:var(--color-text-strong)]"
          >
            <MasukValue row={row} />
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-[var(--space-md)]">
          <dt className="text-[color:var(--color-text-muted)]">{t('absensi.column.pulang')}</dt>
          <dd
            data-testid="attendance-pulang"
            className="tabular-nums text-right text-[color:var(--color-text-strong)]"
          >
            <PulangValue row={row} />
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-[var(--space-md)]">
          <dt className="text-[color:var(--color-text-muted)]">{t('absensi.column.status')}</dt>
          <dd className="text-right text-[color:var(--color-text-strong)]">
            <StatusLabel row={row} />
          </dd>
        </div>
      </dl>
    </li>
  );
}

/**
 * One employee's attendance row in either half of the paired layout. Every
 * state is spelled out — a completed punch shows both times, an open session
 * says it is still running, a no-punch row prints a dash in both time cells
 * and names that state — and the row carries no control of any kind.
 */
export default function AttendanceRow({ row, layout }: AttendanceRowProps) {
  if (layout === 'table') {
    return <AttendanceTableRow row={row} />;
  }
  return <AttendanceCard row={row} />;
}
