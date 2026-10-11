import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertIcon, EyeIcon } from '../icons';
import type { DictKey } from '../../i18n/id';
import { useI18n } from '../../i18n/provider';
import { ApiError } from '../../services/api';
import {
  approveHrAccessRequest,
  listHrAccessRequests,
  rejectHrAccessRequest,
  withdrawHrAccessRequest,
  type HrAccessRequest,
  type HrAccessRequestState,
} from '../../services/hrAccess';
import { TYPE_KEY } from './requestTypeKey';

/** Where the proposal list is in its load; a failed refresh keeps the rows. */
type ListStatus = 'loading' | 'ready' | 'error';

/** Which proposal the confirmation panel is currently asking about. */
type Confirming = { row: HrAccessRequest; kind: 'approve' | 'reject' } | null;

const STATE_KEY: Record<HrAccessRequestState, DictKey> = {
  pending: 'karyawan.approval.state.pending',
  approved: 'karyawan.approval.state.approved',
  rejected: 'karyawan.approval.state.rejected',
  withdrawn: 'karyawan.approval.state.withdrawn',
};

/**
 * The account a row is about: a targeted row (deactivation, reset) speaks
 * for the account it points at, so a stale `proposed*` value can never stand
 * in for the account being changed. Every other kind speaks for the profile
 * it proposes, with the target's own address as the fallback — an `update_hr`
 * row never carries an address, because that column cannot be changed.
 */
function subjectOf(row: HrAccessRequest): { name: string; email: string } {
  if (row.type === 'deactivate_hr' || row.type === 'reset_password') {
    return {
      name: row.target?.name ?? '',
      email: row.target?.email ?? '',
    };
  }
  return {
    name: row.proposedName ?? row.target?.name ?? '',
    email: row.proposedEmail ?? row.target?.email ?? '',
  };
}

/**
 * State pill colour pairings: pending, approved and rejected must read apart
 * without relying on the word alone; withdrawn settles into a quiet grey.
 */
const STATE_CHIP_CLASS: Record<HrAccessRequestState, string> = {
  pending: 'bg-[var(--color-attention-bg)] text-[color:var(--color-attention)]',
  approved: 'bg-[var(--color-success-bg)] text-[color:var(--color-success)]',
  rejected: 'bg-[var(--color-danger-bg)] text-[color:var(--color-danger)]',
  withdrawn:
    'border border-[color:var(--color-border)] bg-[var(--color-page)] text-[color:var(--color-text-muted)]',
};

function stateChipClassName(state: HrAccessRequestState): string {
  return [
    'inline-flex whitespace-nowrap rounded-[var(--radius-full)] px-[var(--space-md)] py-[var(--space-xs)] font-semibold [font-size:var(--text-xs)] [line-height:var(--text-xs-line-height)]',
    STATE_CHIP_CLASS[state],
  ].join(' ');
}

/**
 * Decisions are stamped by the server in UTC; printing that instant as it
 * arrived keeps the audit trail identical for every viewer, whatever clock
 * their own machine runs on.
 */
function formatDecidedAt(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return value;
  }
  return `${value.slice(0, 10)} ${value.slice(11, 16)}`;
}

/** Maps a failed request onto the shared network/generic wording. */
function messageKey(error: unknown): DictKey {
  if (!(error instanceof ApiError)) {
    return 'auth.error.generic';
  }
  if (error.status === 0) {
    return 'auth.error.network';
  }
  // A 409 is the server refusing a decision it re-checked itself; the copy
  // must promise that nothing on the row changed, because every refusal path
  // leaves the proposal exactly as it was.
  if (error.status === 409) {
    return 'karyawan.approval.refused';
  }
  return 'auth.error.generic';
}

const primaryButtonClassName =
  'inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-[var(--space-md)] font-semibold text-[color:var(--color-on-primary)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)] disabled:cursor-not-allowed disabled:bg-[var(--color-border)] disabled:text-[color:var(--color-text-muted)]';

const secondaryButtonClassName =
  'inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[var(--color-surface)] px-[var(--space-md)] font-semibold text-[color:var(--color-text)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)] hover:bg-[var(--color-page)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60';

const labelClassName =
  'font-medium text-[color:var(--color-text)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]';

const inputClassName = (hasError: boolean) =>
  [
    'min-h-[44px] w-full rounded-[var(--radius-sm)] bg-[var(--color-surface)] px-[var(--space-md)] text-[color:var(--color-text-strong)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]',
    hasError
      ? 'border border-[color:var(--color-danger)] focus:border-[color:var(--color-danger)]'
      : 'border border-[color:var(--color-border)] focus:border-[color:var(--color-primary)]',
  ].join(' ');

const tableHeaderClassName =
  'border-b border-[color:var(--color-border)] bg-[var(--color-surface)] p-[var(--space-md)] text-left font-semibold text-[color:var(--color-text)]';

const tableCellClassName =
  'p-[var(--space-md)] align-top text-[color:var(--color-text)]';

/**
 * The four-eyes HR approvals inbox: a decide-only view of every proposal —
 * a new HR profile, a profile change, an account to deactivate and an
 * account whose password to reset — with the maker/checker audit columns,
 * decision actions gated by the server's `canDecide` and `viewerIsTarget`
 * hints, and the one-time password reveal that only an approve answer can
 * produce. Filing proposals belongs to the account screens; every decision
 * goes through a confirmation so a single mis-tap never decides a row. The
 * password lives in component state for as long as the panel is open and is
 * dropped on dismissal — no request can ever bring it back, because the
 * server keeps no copy. The page around this section owns the screen heading.
 */
export default function ApprovalSection() {
  const { t } = useI18n();
  const [rows, setRows] = useState<HrAccessRequest[]>([]);
  const [status, setStatus] = useState<ListStatus>('loading');
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectNoteError, setRejectNoteError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<DictKey | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const confirmRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setStatus('loading');
    }
    try {
      const next = await listHrAccessRequests();
      setRows(next);
      setStatus('ready');
    } catch {
      // A failed background refresh keeps whatever is already on screen.
      if (!silent) {
        setStatus('error');
      }
    }
  }, []);

  // The list is read on mount only; a decision refreshes it in place.
  useEffect(() => {
    void load();
  }, [load]);

  // The confirmation panel lives below the whole table, so a long list would
  // otherwise leave it below the fold — the decision must scroll into view
  // the moment it opens, or the buttons look dead. Optional call: jsdom does
  // not implement scrollIntoView.
  useEffect(() => {
    if (confirming !== null) {
      confirmRef.current?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [confirming]);

  function openConfirm(row: HrAccessRequest, kind: 'approve' | 'reject') {
    setConfirming({ row, kind });
    setRejectNote('');
    setRejectNoteError(false);
    setActionError(null);
  }

  function closeConfirm() {
    setConfirming(null);
    setRejectNote('');
    setRejectNoteError(false);
  }

  async function confirmDecision() {
    if (confirming === null || busyId !== null) {
      return;
    }
    const { row, kind } = confirming;
    if (kind === 'reject' && rejectNote.trim() === '') {
      setRejectNoteError(true);
      return;
    }
    setBusyId(row.id);
    setActionError(null);
    try {
      if (kind === 'approve') {
        const decided = await approveHrAccessRequest(row.id);
        // The one-time password exists only inside this answer; hold it for
        // the reveal panel and never ask for it again once dismissed.
        if (decided.temporaryPassword !== undefined) {
          setTemporaryPassword(decided.temporaryPassword);
          setCopied(false);
        }
      } else {
        await rejectHrAccessRequest(row.id, rejectNote.trim());
      }
      closeConfirm();
      await load(true);
    } catch (caught) {
      // A refused decision keeps the row and the confirmation as they were;
      // the refusal text says nothing changed, which is exactly the truth.
      setActionError(messageKey(caught));
    } finally {
      setBusyId(null);
    }
  }

  async function handleWithdraw(row: HrAccessRequest) {
    if (busyId !== null) {
      return;
    }
    setBusyId(row.id);
    setActionError(null);
    try {
      await withdrawHrAccessRequest(row.id);
      await load(true);
    } catch (caught) {
      setActionError(messageKey(caught));
    } finally {
      setBusyId(null);
    }
  }

  async function handleCopy() {
    if (temporaryPassword === null) {
      return;
    }
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
    } catch {
      // The password stays visible for manual copying when the API is absent.
    }
  }

  function dismissPassword() {
    setTemporaryPassword(null);
    setCopied(false);
  }

  return (
    <section
      data-testid="approval-section"
      className="space-y-[var(--space-lg)]"
    >
      {temporaryPassword !== null ? (
        <div
          data-testid="approval-temp-password"
          className="flex flex-col gap-[var(--space-lg)] rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[var(--color-success-bg)] p-[var(--space-lg)] shadow-[var(--shadow-card)]"
        >
          <p className="flex items-center gap-[var(--space-sm)] font-semibold text-[color:var(--color-success)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
            <EyeIcon size={20} className="shrink-0" />
            <span>{t('karyawan.approval.tempPassword')}</span>
          </p>
          <code className="block w-full break-all rounded-[var(--radius-sm)] border border-[color:var(--color-border)] bg-[var(--color-surface)] px-[var(--space-md)] py-[var(--space-md)] font-mono tracking-[0.04em] text-[color:var(--color-text-strong)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)]">
            {temporaryPassword}
          </code>
          <p className="text-[color:var(--color-text-muted)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
            {t('karyawan.approval.tempPasswordNote')}
          </p>
          <div className="flex flex-wrap gap-[var(--space-md)]">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className={secondaryButtonClassName}
            >
              {copied ? t('karyawan.add.createdCopied') : t('karyawan.add.createdCopy')}
            </button>
            <button
              type="button"
              onClick={dismissPassword}
              className={primaryButtonClassName}
            >
              {t('password.done')}
            </button>
          </div>
        </div>
      ) : (
        <>
          {actionError !== null && (
            <p
              data-testid="approval-action-error"
              role="alert"
              className="flex items-start gap-[var(--space-sm)] rounded-[var(--radius-md)] bg-[var(--color-danger-bg)] px-[var(--space-md)] py-[var(--space-sm)] font-medium text-[color:var(--color-danger)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]"
            >
              <AlertIcon size={20} className="mt-[var(--space-xs)] shrink-0" />
              <span>{t(actionError)}</span>
            </p>
          )}

          {status === 'ready' && rows.length === 0 && (
            <p className="text-[color:var(--color-text-muted)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
              {t('karyawan.approval.empty')}
            </p>
          )}

          {status === 'ready' && rows.length > 0 && (
            <div
              className="overflow-x-auto rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]"
              tabIndex={0}
              role="region"
              aria-label={t('karyawan.approval.title')}
            >
              <table className="w-full border-collapse text-left [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
                <thead>
                  <tr>
                    <th scope="col" className={tableHeaderClassName}>
                      {t('karyawan.column.name')}
                    </th>
                    <th scope="col" className={tableHeaderClassName}>
                      {t('karyawan.column.status')}
                    </th>
                    <th scope="col" className={tableHeaderClassName}>
                      {t('karyawan.approval.maker')}
                    </th>
                    <th scope="col" className={tableHeaderClassName}>
                      {t('karyawan.approval.checker')}
                    </th>
                    <th scope="col" className={tableHeaderClassName}>
                      {t('karyawan.approval.decidedAt')}
                    </th>
                    <th scope="col" className={tableHeaderClassName}>
                      {t('karyawan.approval.note')}
                    </th>
                    <th scope="col" className={tableHeaderClassName}>
                      {t('karyawan.column.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const subject = subjectOf(row);
                    return (
                      <tr
                        key={row.id}
                        data-testid="approval-row"
                        className="border-b border-[color:var(--color-border)] even:bg-[var(--color-page)]"
                      >
                        <td className={tableCellClassName}>
                          <span className="block break-words font-semibold text-[color:var(--color-text-strong)]">
                            {subject.name}
                          </span>
                          <span className="block break-all text-[color:var(--color-text-muted)] [font-size:var(--text-xs)] [line-height:var(--text-xs-line-height)]">
                            {subject.email}
                          </span>
                          <span className="mt-[var(--space-xs)] inline-flex whitespace-nowrap rounded-[var(--radius-full)] border border-[color:var(--color-border)] bg-[var(--color-page)] px-[var(--space-md)] py-[var(--space-xs)] font-semibold text-[color:var(--color-text-muted)] [font-size:var(--text-xs)] [line-height:var(--text-xs-line-height)]">
                            {t(TYPE_KEY[row.type])}
                          </span>
                        </td>
                        <td className={tableCellClassName}>
                          <span className={stateChipClassName(row.state)}>
                            {t(STATE_KEY[row.state])}
                          </span>
                        </td>
                        <td className={tableCellClassName}>
                          <span className="block break-words">
                            {row.maker.name}
                          </span>
                          <span className="block break-all text-[color:var(--color-text-muted)] [font-size:var(--text-xs)] [line-height:var(--text-xs-line-height)]">
                            {row.maker.email}
                          </span>
                        </td>
                        <td className={tableCellClassName}>
                          {row.checker === null ? null : (
                            <span className="break-words">{row.checker.name}</span>
                          )}
                        </td>
                        <td className={tableCellClassName}>
                          {row.decidedAt === null
                            ? null
                            : formatDecidedAt(row.decidedAt)}
                        </td>
                        <td className={`${tableCellClassName} break-words`}>
                          {row.decisionNote ?? ''}
                        </td>
                        <td className={tableCellClassName}>
                          {row.state === 'pending' &&
                            row.viewerIsTarget === true && (
                              <p
                                data-testid="approval-target-hint"
                                className="text-[color:var(--color-text-muted)] [font-size:var(--text-xs)] [line-height:var(--text-xs-line-height)]"
                              >
                                {t('karyawan.approval.targetHint')}
                              </p>
                            )}
                          {row.state === 'pending' &&
                            row.viewerIsTarget !== true &&
                            row.canDecide && (
                            <div className="flex flex-col gap-[var(--space-sm)]">
                              <div className="flex flex-wrap gap-[var(--space-sm)]">
                                <button
                                  type="button"
                                  data-testid="approval-approve"
                                  disabled={busyId !== null}
                                  onClick={() => openConfirm(row, 'approve')}
                                  className={primaryButtonClassName}
                                >
                                  {t('karyawan.approval.approve')}
                                </button>
                                <button
                                  type="button"
                                  data-testid="approval-reject"
                                  disabled={busyId !== null}
                                  onClick={() => openConfirm(row, 'reject')}
                                  className={secondaryButtonClassName}
                                >
                                  {t('karyawan.approval.reject')}
                                </button>
                              </div>
                            </div>
                          )}
                          {row.state === 'pending' &&
                            row.viewerIsTarget !== true &&
                            !row.canDecide && (
                            <div className="flex flex-col gap-[var(--space-sm)]">
                              <p className="text-[color:var(--color-text-muted)] [font-size:var(--text-xs)] [line-height:var(--text-xs-line-height)]">
                                {t('karyawan.approval.selfHint')}
                              </p>
                              <button
                                type="button"
                                data-testid="approval-withdraw"
                                disabled={busyId !== null}
                                onClick={() => void handleWithdraw(row)}
                                className={secondaryButtonClassName}
                              >
                                {t('karyawan.approval.withdraw')}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* One decision at a time: the panel restates which proposal is
              being decided, and the reject side must be given a reason
              before any request leaves the browser. */}
          {confirming !== null && (
            <div
              ref={confirmRef}
              data-testid="approval-confirm"
              role="alertdialog"
              aria-labelledby="approval-confirm-title"
              className="flex flex-col gap-[var(--space-md)] rounded-[var(--radius-md)] border border-[color:var(--color-attention)] bg-[var(--color-attention-bg)] p-[var(--space-lg)] shadow-[var(--shadow-card)]"
            >
              <p
                id="approval-confirm-title"
                className="font-bold text-[color:var(--color-text-strong)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)]"
              >
                {t(
                  confirming.kind === 'approve'
                    ? 'karyawan.approval.confirmApproveTitle'
                    : 'karyawan.approval.confirmRejectTitle',
                )}
              </p>
              {confirming.kind === 'reject' && (
                <div className="flex flex-col gap-[var(--space-xs)]">
                  <label
                    htmlFor="approval-reason"
                    className={labelClassName}
                  >
                    {t('karyawan.approval.rejectNote')}
                  </label>
                  <textarea
                    id="approval-reason"
                    data-testid="approval-reason"
                    rows={3}
                    value={rejectNote}
                    onChange={(event) => {
                      setRejectNote(event.target.value);
                      setRejectNoteError(false);
                    }}
                    aria-invalid={rejectNoteError}
                    className={inputClassName(rejectNoteError)}
                  />
                  {rejectNoteError && (
                    <p
                      role="alert"
                      className="font-medium text-[color:var(--color-danger)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]"
                    >
                      {t('form.error.required')}
                    </p>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-[var(--space-md)]">
                <button
                  type="button"
                  data-testid="approval-confirm-yes"
                  disabled={busyId !== null}
                  aria-busy={busyId !== null}
                  onClick={() => void confirmDecision()}
                  className={primaryButtonClassName}
                >
                  {t(
                    confirming.kind === 'approve'
                      ? 'karyawan.approval.approve'
                      : 'karyawan.approval.reject',
                  )}
                </button>
                <button
                  type="button"
                  data-testid="approval-confirm-cancel"
                  disabled={busyId !== null}
                  onClick={closeConfirm}
                  className={secondaryButtonClassName}
                >
                  {t('karyawan.edit.statusCancel')}
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div
              role="alert"
              className="flex flex-col items-start gap-[var(--space-md)] rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[var(--color-danger-bg)] p-[var(--space-lg)] shadow-[var(--shadow-card)]"
            >
              <p className="flex items-start gap-[var(--space-sm)] font-medium text-[color:var(--color-danger)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
                <AlertIcon size={20} className="mt-[var(--space-xs)] shrink-0" />
                <span>{t('karyawan.approval.loadError')}</span>
              </p>
              <button
                type="button"
                data-testid="approval-retry"
                onClick={() => void load()}
                className={secondaryButtonClassName}
              >
                {t('state.serverError.retry')}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
