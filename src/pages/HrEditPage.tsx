import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  EmptyState,
  LoadingState,
  ServerErrorState,
  employeeFormSchema,
} from '../components';
import {
  toProfileFieldErrors,
  type ProfileErrors,
} from '../components/formIssues';
import { AlertIcon } from '../components/icons';
import { TYPE_KEY } from '../components/hr-access/requestTypeKey';
import { useSuccessToast } from '../components/states';
import { useI18n } from '../i18n/provider';
import {
  fetchEmployeeRecord,
  type EmployeeRecord,
} from '../services/employees';
import {
  createHrAccessRequest,
  listHrAccessRequests,
  type HrAccessRequest,
} from '../services/hrAccess';

/** Where the screen is in the load of the row it edits. */
type LoadState = 'loading' | 'ready' | 'error' | 'missing';

/** Which proposal the shared confirmation panel is currently asking about. */
type Confirming = 'status' | 'reset' | 'reactivate' | null;

/** Which action the shared server-error state is currently waiting on. */
type FailedAction = 'save' | 'status' | 'reset' | 'reactivate' | null;

/** The three editable profile columns; the address is shown, never edited. */
type ProfileValues = {
  name: string;
  position: string;
  phone: string;
};

/** Surface every card on the screen rests on: border, radius, elevation. */
const cardClassName =
  'flex flex-col gap-[var(--space-lg)] rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[var(--color-surface)] p-[var(--space-lg)] shadow-[var(--shadow-card)]';

/** Outlined action: visible and tappable, but never the dominant one. */
const secondaryButtonClassName =
  'inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[var(--color-surface)] px-[var(--space-md)] font-semibold text-[color:var(--color-text)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)] hover:bg-[var(--color-page)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)] disabled:cursor-not-allowed disabled:bg-[var(--color-border)] disabled:text-[color:var(--color-text-muted)]';

/** Filled brand action for the screen's one primary commitment. */
const primaryButtonClassName =
  'inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-[var(--space-lg)] font-semibold text-[color:var(--color-on-primary)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)] disabled:cursor-not-allowed disabled:bg-[var(--color-border)] disabled:text-[color:var(--color-text-muted)]';

/** Filled destructive action, only inside the confirmation panel that asks. */
const dangerButtonClassName =
  'inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-danger)] px-[var(--space-lg)] font-semibold text-[color:var(--color-on-primary)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)] disabled:cursor-not-allowed disabled:bg-[var(--color-border)] disabled:text-[color:var(--color-text-muted)]';

/** Status choice rendered as a ≥44 px pill with the selection painted on it. */
const radioPillClassName =
  'relative inline-flex min-h-[44px] cursor-pointer items-center gap-[var(--space-sm)] rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[var(--color-surface)] px-[var(--space-md)] font-medium text-[color:var(--color-text)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)] has-[input:checked]:border-[color:var(--color-primary)] has-[input:checked]:bg-[var(--color-primary-subtle)] has-[input:checked]:font-semibold has-[input:checked]:text-[color:var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60';

/** Visual radio dot drawn over the transparent full-pill native input. */
const radioDotClassName =
  'h-4 w-4 shrink-0 rounded-full border-2 border-[color:var(--color-border)] bg-[var(--color-surface)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] peer-checked:border-[color:var(--color-primary)] peer-checked:bg-[color:var(--color-primary)] peer-checked:shadow-[inset_0_0_0_3px_var(--color-surface)]';

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

/**
 * Edit screen for one HR account, where every action files a proposal
 * instead of touching the account: the form proposes the profile columns
 * that actually changed, the status control proposes the deactivation on an
 * active account and the reactivation on a deactivated one, and the password
 * card proposes a reset. The temporary password is only ever revealed to the
 * checker on the approvals screen, never here, and never for a
 * reactivation, which mints no password at all. While a proposal for this
 * account is pending, every action stays disabled and the pending card lists
 * what is waiting, so a second proposal for the same change cannot be filed
 * by accident. The email address is shown read-only: no proposal kind
 * carries an address change.
 */
export default function HrEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const toast = useSuccessToast();

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [employee, setEmployee] = useState<EmployeeRecord | null>(null);
  const [values, setValues] = useState<ProfileValues>({
    name: '',
    position: '',
    phone: '',
  });
  const [fieldErrors, setFieldErrors] = useState<ProfileErrors>({});
  const [noChanges, setNoChanges] = useState(false);
  const [proposals, setProposals] = useState<HrAccessRequest[]>([]);
  const [statusChoice, setStatusChoice] = useState<'active' | 'deactivated'>(
    'active',
  );
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [savePending, setSavePending] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [failedAction, setFailedAction] = useState<FailedAction>(null);
  const [lastValues, setLastValues] = useState<ProfileValues | null>(null);

  /** Every proposal still waiting on a decision for this very account. */
  const loadProposals = useCallback(async () => {
    if (id === undefined) {
      return;
    }
    try {
      const rows = await listHrAccessRequests('pending');
      setProposals(
        rows.filter((row) => row.targetEmployeeId === id),
      );
    } catch {
      // This list only mirrors what the server already refuses; a failed
      // read leaves the actions enabled and the server keeps the authority.
    }
  }, [id]);

  const load = useCallback(async () => {
    if (id === undefined) {
      setLoadState('missing');
      return;
    }
    setLoadState('loading');
    setFailedAction(null);
    try {
      const row = await fetchEmployeeRecord(id);
      if (row === null) {
        setEmployee(null);
        setLoadState('missing');
        return;
      }
      setEmployee(row);
      setValues({ name: row.name, position: row.position, phone: row.phone });
      setStatusChoice(row.status);
      setLoadState('ready');
      await loadProposals();
    } catch {
      setLoadState('error');
    }
  }, [id, loadProposals]);

  useEffect(() => {
    void load();
  }, [load]);

  const blocked = proposals.length > 0;

  async function fileProposal(
    input:
      | { type: 'update_hr'; targetEmployeeId: string; name?: string; position?: string; phone?: string }
      | {
          type: 'deactivate_hr' | 'reactivate_hr' | 'reset_password';
          targetEmployeeId: string;
        },
    action: FailedAction,
  ) {
    if (actionPending) {
      return;
    }
    setActionPending(true);
    setFailedAction(null);
    try {
      await createHrAccessRequest(input);
      setConfirming(null);
      toast.show(t('toast.hr.proposed'));
      await loadProposals();
    } catch {
      setConfirming(null);
      setFailedAction(action);
    } finally {
      setActionPending(false);
    }
  }

  async function handleSave(next: ProfileValues) {
    if (id === undefined || employee === null || savePending) {
      return;
    }
    setSavePending(true);
    setFailedAction(null);
    setLastValues(next);
    try {
      // Only the columns that actually changed travel, so a stale proposal
      // never carries a value the maker did not type.
      const changed = {
        ...(next.name !== employee.name ? { name: next.name } : {}),
        ...(next.position !== employee.position
          ? { position: next.position }
          : {}),
        ...(next.phone !== employee.phone ? { phone: next.phone } : {}),
      };
      if (Object.keys(changed).length === 0) {
        setNoChanges(true);
        return;
      }
      setNoChanges(false);
      await fileProposal(
        { type: 'update_hr', targetEmployeeId: id, ...changed },
        'save',
      );
    } catch {
      setFailedAction('save');
    } finally {
      setSavePending(false);
    }
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (employee === null) {
      return;
    }
    // The shared edit schema already carries the exact rules the server
    // enforces; the address is validated as filled because it always is,
    // but it never leaves this screen.
    const parsed = employeeFormSchema.safeParse({
      ...values,
      email: employee.email,
    });
    if (!parsed.success) {
      setFieldErrors(toProfileFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    void handleSave({
      name: parsed.data.name,
      position: parsed.data.position,
      phone: parsed.data.phone,
    });
  }

  const setField = (field: keyof ProfileValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) =>
      current[field] === undefined ? current : { ...current, [field]: undefined },
    );
    setNoChanges(false);
    setFailedAction((current) => (current === 'save' ? null : current));
  };

  function handleApplyStatus() {
    if (id === undefined || employee === null || blocked) {
      return;
    }
    // Only the deactivation is proposeable from this control; a deactivated
    // account is offered the separate reactivation action instead, so this
    // guard keeps a stale render from ever filing the wrong kind.
    if (employee.status !== 'active' || statusChoice !== 'deactivated') {
      return;
    }
    setConfirming('status');
  }

  /** Opens the confirmation for the reactivation a deactivated account shows. */
  function handleReactivateClick() {
    if (id === undefined || employee === null || blocked || actionPending) {
      return;
    }
    setConfirming('reactivate');
  }

  function handleResetClick() {
    if (blocked) {
      return;
    }
    setConfirming('reset');
  }

  function confirmStatus() {
    if (id === undefined) {
      return;
    }
    void fileProposal({ type: 'deactivate_hr', targetEmployeeId: id }, 'status');
  }

  function confirmReactivate() {
    if (id === undefined) {
      return;
    }
    void fileProposal(
      { type: 'reactivate_hr', targetEmployeeId: id },
      'reactivate',
    );
  }

  function confirmReset() {
    if (id === undefined) {
      return;
    }
    void fileProposal(
      { type: 'reset_password', targetEmployeeId: id },
      'reset',
    );
  }

  /** Re-runs whichever action failed, with the values that were submitted. */
  function retryFailedAction() {
    if (failedAction === 'save' && lastValues !== null) {
      void handleSave(lastValues);
    } else if (failedAction === 'status') {
      confirmStatus();
    } else if (failedAction === 'reactivate') {
      confirmReactivate();
    } else if (failedAction === 'reset') {
      confirmReset();
    }
  }

  return (
    <section
      data-testid="hr-edit"
      className="mx-auto max-w-2xl space-y-[var(--space-xl)]"
    >
      <h1 className="font-bold text-[color:var(--color-text-strong)] [font-size:var(--text-xl)] [line-height:var(--text-xl-line-height)]">
        {t('hr.edit.title')}
      </h1>

      {failedAction !== null && (
        <ServerErrorState
          title={t('form.error.save')}
          onRetry={retryFailedAction}
          actionVariant="secondary"
        />
      )}

      {loadState === 'loading' && <LoadingState />}

      {loadState === 'error' && (
        <ServerErrorState onRetry={() => void load()} />
      )}

      {loadState === 'missing' && (
        <EmptyState
          title={t('hr.edit.notFoundTitle')}
          description={t('hr.edit.notFoundDescription')}
          action={
            <button
              type="button"
              data-testid="not-found-back"
              onClick={() => navigate('/hr')}
              className={primaryButtonClassName}
            >
              {t('hr.edit.notFoundBack')}
            </button>
          }
        />
      )}

      {/* A pending proposal owns this account until a checker decides; the
          card says so up front and every control below stays disabled. */}
      {loadState === 'ready' && blocked && (
        <div data-testid="hr-edit-pending" className={cardClassName}>
          <h2 className="font-semibold text-[color:var(--color-text-strong)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)]">
            {t('hr.edit.pendingTitle')}
          </h2>
          <p className="text-[color:var(--color-text-muted)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
            {t('hr.edit.pendingDescription')}
          </p>
          <div>
            <p className="font-medium text-[color:var(--color-text)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
              {t('hr.edit.pendingListLabel')}
            </p>
            <ul className="mt-[var(--space-sm)] flex flex-col gap-[var(--space-xs)]">
              {proposals.map((proposal) => (
                <li
                  key={proposal.id}
                  data-testid="hr-edit-pending-item"
                  className="inline-flex w-fit whitespace-nowrap rounded-[var(--radius-full)] border border-[color:var(--color-border)] bg-[var(--color-page)] px-[var(--space-md)] py-[var(--space-xs)] font-semibold text-[color:var(--color-text-muted)] [font-size:var(--text-xs)] [line-height:var(--text-xs-line-height)]"
                >
                  {t(TYPE_KEY[proposal.type])}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {loadState === 'ready' && employee !== null && (
        <>
          <div className={cardClassName}>
            <form
              onSubmit={handleFormSubmit}
              noValidate
              className="flex flex-col gap-[var(--space-lg)]"
            >
              <div className="flex flex-col gap-[var(--space-xs)]">
                <label htmlFor="hr-edit-name" className={labelClassName}>
                  {t('form.name')}
                </label>
                <input
                  id="hr-edit-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  disabled={blocked}
                  value={values.name}
                  onChange={(event) => setField('name', event.target.value)}
                  aria-invalid={fieldErrors.name !== undefined}
                  className={inputClassName(fieldErrors.name !== undefined)}
                />
                {fieldErrors.name !== undefined && (
                  <p
                    data-testid="hr-edit-error-name"
                    role="alert"
                    className="flex items-start gap-[var(--space-sm)] rounded-[var(--radius-sm)] bg-[var(--color-danger-bg)] px-[var(--space-md)] py-[var(--space-sm)] font-medium text-[color:var(--color-danger)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]"
                  >
                    <AlertIcon size={20} className="mt-[var(--space-xs)] shrink-0" />
                    <span>{t(fieldErrors.name)}</span>
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-[var(--space-xs)]">
                <label htmlFor="hr-edit-email" className={labelClassName}>
                  {t('form.email')}
                </label>
                <input
                  id="hr-edit-email"
                  name="email"
                  type="email"
                  readOnly
                  value={employee.email}
                  aria-readonly
                  className="min-h-[44px] w-full rounded-[var(--radius-sm)] border border-[color:var(--color-border)] bg-[var(--color-page)] px-[var(--space-md)] text-[color:var(--color-text-muted)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)]"
                />
              </div>

              <div className="flex flex-col gap-[var(--space-xs)]">
                <label htmlFor="hr-edit-position" className={labelClassName}>
                  {t('form.position')}
                </label>
                <input
                  id="hr-edit-position"
                  name="position"
                  type="text"
                  required
                  disabled={blocked}
                  value={values.position}
                  onChange={(event) => setField('position', event.target.value)}
                  aria-invalid={fieldErrors.position !== undefined}
                  className={inputClassName(fieldErrors.position !== undefined)}
                />
                {fieldErrors.position !== undefined && (
                  <p
                    data-testid="hr-edit-error-position"
                    role="alert"
                    className="flex items-start gap-[var(--space-sm)] rounded-[var(--radius-sm)] bg-[var(--color-danger-bg)] px-[var(--space-md)] py-[var(--space-sm)] font-medium text-[color:var(--color-danger)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]"
                  >
                    <AlertIcon size={20} className="mt-[var(--space-xs)] shrink-0" />
                    <span>{t(fieldErrors.position)}</span>
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-[var(--space-xs)]">
                <label htmlFor="hr-edit-phone" className={labelClassName}>
                  {t('form.phone')}
                </label>
                <input
                  id="hr-edit-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  disabled={blocked}
                  value={values.phone}
                  onChange={(event) => setField('phone', event.target.value)}
                  aria-invalid={fieldErrors.phone !== undefined}
                  className={inputClassName(fieldErrors.phone !== undefined)}
                />
                {fieldErrors.phone !== undefined && (
                  <p
                    data-testid="hr-edit-error-phone"
                    role="alert"
                    className="flex items-start gap-[var(--space-sm)] rounded-[var(--radius-sm)] bg-[var(--color-danger-bg)] px-[var(--space-md)] py-[var(--space-sm)] font-medium text-[color:var(--color-danger)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]"
                  >
                    <AlertIcon size={20} className="mt-[var(--space-xs)] shrink-0" />
                    <span>{t(fieldErrors.phone)}</span>
                  </p>
                )}
              </div>

              {noChanges && (
                <p
                  data-testid="hr-edit-no-changes"
                  role="status"
                  className="text-[color:var(--color-text-muted)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]"
                >
                  {t('hr.edit.noChanges')}
                </p>
              )}

              <div>
                <button
                  type="submit"
                  data-testid="hr-edit-save"
                  disabled={savePending || blocked}
                  aria-busy={savePending}
                  className={primaryButtonClassName}
                >
                  {t('form.submit.save')}
                </button>
              </div>
            </form>
          </div>

          <div data-testid="hr-edit-status-card" className={cardClassName}>
            <h2 className="font-semibold text-[color:var(--color-text-strong)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)]">
              {t('karyawan.edit.statusTitle')}
            </h2>

            {/* A deactivated account has no status to choose from — the only
                proposal it can carry is its way back in, so the radios and the
                apply control are replaced by that single action. */}
            {employee.status === 'deactivated' ? (
              confirming === 'reactivate' ? (
                <div
                  data-testid="hr-edit-confirm"
                  className="flex flex-col gap-[var(--space-md)] rounded-[var(--radius-md)] border border-[color:var(--color-attention)] bg-[var(--color-attention-bg)] p-[var(--space-lg)]"
                >
                  <p className="font-bold text-[color:var(--color-text-strong)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)]">
                    {t('hr.edit.reactivateConfirmTitle')}
                  </p>
                  <p className="text-[color:var(--color-text)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
                    {t('hr.edit.reactivateConfirmBody')}
                  </p>
                  <div className="flex flex-wrap gap-[var(--space-md)]">
                    <button
                      type="button"
                      data-testid="hr-edit-confirm-yes"
                      disabled={actionPending}
                      onClick={confirmReactivate}
                      className={primaryButtonClassName}
                    >
                      {t('hr.edit.reactivateConfirm')}
                    </button>
                    <button
                      type="button"
                      data-testid="hr-edit-confirm-cancel"
                      disabled={actionPending}
                      onClick={() => setConfirming(null)}
                      className={secondaryButtonClassName}
                    >
                      {t('karyawan.edit.statusCancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-[var(--space-sm)]">
                  <div className="flex flex-wrap gap-[var(--space-md)]">
                    <button
                      type="button"
                      data-testid="hr-edit-reactivate"
                      disabled={actionPending || blocked}
                      onClick={handleReactivateClick}
                      className={secondaryButtonClassName}
                    >
                      {t('hr.edit.reactivateAction')}
                    </button>
                  </div>
                  {/* The same wording the confirmation repeats: nothing about
                      the account moves until a checker approves, so the maker
                      reads that before the click, not only after it. */}
                  <p className="text-[color:var(--color-text-muted)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
                    {t('hr.edit.reactivateConfirmBody')}
                  </p>
                </div>
              )
            ) : (
              <>
                <div className="flex flex-wrap gap-[var(--space-md)]">
                  <label className={radioPillClassName}>
                    <input
                      type="radio"
                      name="hr-account-status"
                      value="active"
                      checked={statusChoice === 'active'}
                      disabled={blocked}
                      onChange={() => {
                        setStatusChoice('active');
                        setConfirming(null);
                      }}
                      className="peer absolute -inset-px cursor-pointer appearance-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
                    />
                    <span aria-hidden="true" className={radioDotClassName} />
                    {t('karyawan.status.active')}
                  </label>
                  <label className={radioPillClassName}>
                    <input
                      type="radio"
                      name="hr-account-status"
                      value="deactivated"
                      checked={statusChoice === 'deactivated'}
                      disabled={blocked}
                      onChange={() => {
                        setStatusChoice('deactivated');
                        setConfirming(null);
                      }}
                      className="peer absolute -inset-px cursor-pointer appearance-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
                    />
                    <span aria-hidden="true" className={radioDotClassName} />
                    {t('karyawan.status.deactivated')}
                  </label>
                </div>

                {confirming === 'status' ? (
                  <div
                    data-testid="hr-edit-confirm"
                    className="flex flex-col gap-[var(--space-md)] rounded-[var(--radius-md)] border border-[color:var(--color-attention)] bg-[var(--color-attention-bg)] p-[var(--space-lg)]"
                  >
                    <p className="font-bold text-[color:var(--color-text-strong)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)]">
                      {t('hr.edit.statusConfirmTitle')}
                    </p>
                    <p className="text-[color:var(--color-text)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
                      {t('hr.edit.statusConfirmBody')}
                    </p>
                    <div className="flex flex-wrap gap-[var(--space-md)]">
                      <button
                        type="button"
                        data-testid="hr-edit-confirm-yes"
                        disabled={actionPending}
                        onClick={confirmStatus}
                        className={dangerButtonClassName}
                      >
                        {t('karyawan.edit.statusConfirm')}
                      </button>
                      <button
                        type="button"
                        data-testid="hr-edit-confirm-cancel"
                        disabled={actionPending}
                        onClick={() => setConfirming(null)}
                        className={secondaryButtonClassName}
                      >
                        {t('karyawan.edit.statusCancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-[var(--space-md)]">
                    <button
                      type="button"
                      data-testid="hr-edit-status-apply"
                      disabled={
                        actionPending ||
                        blocked ||
                        employee.status !== 'active' ||
                        statusChoice !== 'deactivated'
                      }
                      onClick={handleApplyStatus}
                      className={secondaryButtonClassName}
                    >
                      {t('karyawan.edit.statusApply')}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div data-testid="hr-edit-password-card" className={cardClassName}>
            <h2 className="font-semibold text-[color:var(--color-text-strong)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)]">
              {t('karyawan.edit.resetTitle')}
            </h2>
            <p className="text-[color:var(--color-text-muted)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
              {t('hr.edit.resetHint')}
            </p>

            {confirming === 'reset' ? (
              <div
                data-testid="hr-edit-confirm"
                className="flex flex-col gap-[var(--space-md)] rounded-[var(--radius-md)] border border-[color:var(--color-attention)] bg-[var(--color-attention-bg)] p-[var(--space-lg)]"
              >
                <p className="font-bold text-[color:var(--color-text-strong)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)]">
                  {t('hr.edit.resetConfirmTitle')}
                </p>
                <p className="text-[color:var(--color-text)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
                  {t('hr.edit.resetConfirmBody')}
                </p>
                <div className="flex flex-wrap gap-[var(--space-md)]">
                  <button
                    type="button"
                    data-testid="hr-edit-confirm-yes"
                    disabled={actionPending}
                    onClick={confirmReset}
                    className={primaryButtonClassName}
                  >
                    {t('hr.edit.resetConfirm')}
                  </button>
                  <button
                    type="button"
                    data-testid="hr-edit-confirm-cancel"
                    disabled={actionPending}
                    onClick={() => setConfirming(null)}
                    className={secondaryButtonClassName}
                  >
                    {t('karyawan.edit.statusCancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-[var(--space-md)]">
                <button
                  type="button"
                  data-testid="hr-edit-reset"
                  disabled={actionPending || blocked}
                  onClick={handleResetClick}
                  className={secondaryButtonClassName}
                >
                  {t('hr.edit.resetAction')}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {toast.toast}
    </section>
  );
}
