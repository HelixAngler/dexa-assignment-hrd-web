import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  EmployeeForm,
  EmptyState,
  LoadingState,
  ServerErrorState,
  type EmployeeFormValues,
} from '../components';
import { EyeIcon } from '../components/icons';
import { useSuccessToast } from '../components/states';
import { useI18n } from '../i18n/provider';
import { ApiError } from '../services/api';
import {
  fetchEmployeeById,
  resetEmployeePassword,
  setEmployeeStatus,
  updateEmployee,
  type EmployeeStatus,
  type EmployeeSummary,
  type EmployeeUpdateInput,
} from '../services/employees';

/** Where the screen is in the load of the row it edits. */
type LoadState = 'loading' | 'ready' | 'error' | 'missing';

/** Which action the shared server-error state is currently waiting on. */
type FailedAction = 'save' | 'status' | 'reset' | null;

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
  'relative inline-flex min-h-[44px] cursor-pointer items-center gap-[var(--space-sm)] rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[var(--color-surface)] px-[var(--space-md)] font-medium text-[color:var(--color-text)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)] has-[input:checked]:border-[color:var(--color-primary)] has-[input:checked]:bg-[var(--color-primary-subtle)] has-[input:checked]:font-semibold has-[input:checked]:text-[color:var(--color-primary)]';

/** Visual radio dot drawn over the transparent full-pill native input. */
const radioDotClassName =
  'h-4 w-4 shrink-0 rounded-full border-2 border-[color:var(--color-border)] bg-[var(--color-surface)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] peer-checked:border-[color:var(--color-primary)] peer-checked:bg-[var(--color-primary)] peer-checked:shadow-[inset_0_0_0_3px_var(--color-surface)]';

/**
 * Maps validated form values onto the patch payload: required identity
 * fields always travel, while the optional columns are only sent when the
 * admin actually filled them in, so an untouched phone is never overwritten.
 */
function toUpdateInput(values: EmployeeFormValues): EmployeeUpdateInput {
  return {
    name: values.name,
    email: values.email,
    position: values.position,
    ...(values.phone === '' ? {} : { phone: values.phone }),
    ...(values.photo === '' ? {} : { photo: values.photo }),
  };
}

/**
 * Edit screen for one employee: the shared form for the profile columns, a
 * status control wired to its own endpoint (deactivation goes through a
 * confirmation because it signs the employee out) and a password reset that
 * reveals the new temporary password exactly once. An HR account is managed
 * through the four-eyes approval flow instead, so it gets a pointer to that
 * flow and none of the controls. Attendance data has no place on this screen,
 * so none of its fields exist here.
 */
export default function KaryawanEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const toast = useSuccessToast();

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [employee, setEmployee] = useState<EmployeeSummary | null>(null);
  const [statusChoice, setStatusChoice] = useState<EmployeeStatus | null>(null);
  const [confirmingStatus, setConfirmingStatus] = useState(false);
  const [statusPending, setStatusPending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [failedAction, setFailedAction] = useState<FailedAction>(null);
  const [lastValues, setLastValues] = useState<EmployeeFormValues | null>(null);
  const [lastStatus, setLastStatus] = useState<EmployeeStatus | null>(null);
  const [formPending, setFormPending] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);

  const load = useCallback(async () => {
    if (id === undefined) {
      setLoadState('missing');
      return;
    }
    setLoadState('loading');
    setFailedAction(null);
    try {
      const row = await fetchEmployeeById(id);
      if (row === null) {
        setEmployee(null);
        setStatusChoice(null);
        setLoadState('missing');
        return;
      }
      setEmployee(row);
      setStatusChoice(row.status);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(values: EmployeeFormValues) {
    if (id === undefined || formPending) {
      return;
    }
    setFormPending(true);
    setEmailTaken(false);
    setFailedAction(null);
    setLastValues(values);
    try {
      await updateEmployee(id, toUpdateInput(values));
      setEmployee((current) =>
        current === null
          ? current
          : {
              ...current,
              name: values.name,
              email: values.email,
              position: values.position,
            },
      );
      toast.show(t('toast.karyawan.updated'));
    } catch (caught) {
      if (
        caught instanceof ApiError &&
        caught.status === 409 &&
        caught.code === 'EMAIL_TAKEN'
      ) {
        setEmailTaken(true);
      } else {
        setFailedAction('save');
      }
    } finally {
      setFormPending(false);
    }
  }

  async function commitStatus(status: EmployeeStatus) {
    if (id === undefined || statusPending) {
      return;
    }
    setStatusPending(true);
    setFailedAction(null);
    setLastStatus(status);
    try {
      await setEmployeeStatus(id, status);
      setEmployee((current) => (current === null ? current : { ...current, status }));
      setStatusChoice(status);
      setConfirmingStatus(false);
      toast.show(t('toast.karyawan.statusChanged'));
    } catch {
      setConfirmingStatus(false);
      setFailedAction('status');
    } finally {
      setStatusPending(false);
    }
  }

  function handleApplyStatus() {
    if (employee === null || statusChoice === null) {
      return;
    }
    if (statusChoice === employee.status) {
      return;
    }
    // Only the deactivation is destructive, so it is the one that asks first.
    if (statusChoice === 'deactivated') {
      setConfirmingStatus(true);
      return;
    }
    void commitStatus(statusChoice);
  }

  async function handleResetPassword() {
    if (id === undefined || resetting) {
      return;
    }
    setResetting(true);
    setFailedAction(null);
    setRevealedPassword(null);
    try {
      const result = await resetEmployeePassword(id);
      setRevealedPassword(result.temporaryPassword);
      toast.show(t('toast.karyawan.passwordReset'));
    } catch {
      setFailedAction('reset');
    } finally {
      setResetting(false);
    }
  }

  /** Re-runs whichever action failed, with the values that were submitted. */
  function retryFailedAction() {
    if (failedAction === 'save' && lastValues !== null) {
      void handleSave(lastValues);
    } else if (failedAction === 'status' && lastStatus !== null) {
      void commitStatus(lastStatus);
    } else if (failedAction === 'reset') {
      void handleResetPassword();
    }
  }

  const selectedStatus = statusChoice ?? employee?.status ?? 'active';

  return (
    <section
      data-testid="karyawan-edit"
      className="mx-auto max-w-2xl space-y-[var(--space-xl)]"
    >
      <h1 className="font-bold text-[color:var(--color-text-strong)] [font-size:var(--text-xl)] [line-height:var(--text-xl-line-height)]">
        {t('karyawan.edit.title')}
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
          title={t('karyawan.edit.notFoundTitle')}
          description={t('karyawan.edit.notFoundDescription')}
          action={
            <button
              type="button"
              data-testid="not-found-back"
              onClick={() => navigate('/karyawan')}
              className={primaryButtonClassName}
            >
              {t('karyawan.edit.notFoundBack')}
            </button>
          }
        />
      )}

      {/* HR accounts never take the direct controls: every change to them is
          a proposal filed from the HR account screens, so this screen only
          points at where those proposals are made. */}
      {loadState === 'ready' && employee !== null && employee.role === 'hrd' && (
        <div data-testid="karyawan-edit-hr-managed" className={cardClassName}>
          <h2 className="font-semibold text-[color:var(--color-text-strong)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)]">
            {t('karyawan.edit.hrManagedTitle')}
          </h2>
          <p className="text-[color:var(--color-text-muted)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
            {t('karyawan.edit.hrManagedDescription')}
          </p>
          <div className="flex flex-wrap gap-[var(--space-md)]">
            <Link
              to={`/hr/${employee.id}/edit`}
              data-testid="karyawan-edit-open-hr-page"
              className={secondaryButtonClassName}
            >
              {t('karyawan.edit.hrManagedAction')}
            </Link>
          </div>
        </div>
      )}

      {loadState === 'ready' && employee !== null && employee.role !== 'hrd' && (
        <>
          <div className={cardClassName}>
            <EmployeeForm
              mode="edit"
              pending={formPending}
              emailTaken={emailTaken}
              onValuesChange={() =>
                setFailedAction((current) =>
                  current === 'save' ? null : current,
                )
              }
              initialValues={{
                name: employee.name,
                email: employee.email,
                position: employee.position,
                phone: '',
                photo: '',
              }}
              onSubmit={(values) => void handleSave(values)}
            />
          </div>

          <div data-testid="status-card" className={cardClassName}>
            <h2 className="font-semibold text-[color:var(--color-text-strong)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)]">
              {t('karyawan.edit.statusTitle')}
            </h2>
            <div className="flex flex-wrap gap-[var(--space-md)]">
              <label className={radioPillClassName}>
                <input
                  type="radio"
                  name="employee-status"
                  value="active"
                  checked={selectedStatus === 'active'}
                  onChange={() => {
                    setStatusChoice('active');
                    setConfirmingStatus(false);
                  }}
                  className="peer absolute -inset-px cursor-pointer appearance-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
                />
                <span aria-hidden="true" className={radioDotClassName} />
                {t('karyawan.status.active')}
              </label>
              <label className={radioPillClassName}>
                <input
                  type="radio"
                  name="employee-status"
                  value="deactivated"
                  checked={selectedStatus === 'deactivated'}
                  onChange={() => {
                    setStatusChoice('deactivated');
                    setConfirmingStatus(false);
                  }}
                  className="peer absolute -inset-px cursor-pointer appearance-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
                />
                <span aria-hidden="true" className={radioDotClassName} />
                {t('karyawan.status.deactivated')}
              </label>
            </div>

            {confirmingStatus ? (
              <div
                data-testid="status-confirm"
                className="flex flex-col gap-[var(--space-md)] rounded-[var(--radius-md)] border border-[color:var(--color-attention)] bg-[var(--color-attention-bg)] p-[var(--space-lg)]"
              >
                <p className="font-bold text-[color:var(--color-text-strong)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)]">
                  {t('karyawan.edit.statusConfirmTitle')}
                </p>
                <p className="text-[color:var(--color-text)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
                  {t('karyawan.edit.statusConfirmBody')}
                </p>
                <div className="flex flex-wrap gap-[var(--space-md)]">
                  <button
                    type="button"
                    data-testid="status-confirm-yes"
                    disabled={statusPending}
                    onClick={() => commitStatus('deactivated')}
                    className={dangerButtonClassName}
                  >
                    {t('karyawan.edit.statusConfirm')}
                  </button>
                  <button
                    type="button"
                    data-testid="status-confirm-cancel"
                    disabled={statusPending}
                    onClick={() => setConfirmingStatus(false)}
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
                  data-testid="status-apply"
                  disabled={statusPending || statusChoice === employee.status}
                  onClick={handleApplyStatus}
                  className={secondaryButtonClassName}
                >
                  {t('karyawan.edit.statusApply')}
                </button>
              </div>
            )}
          </div>

          <div data-testid="password-card" className={cardClassName}>
            <h2 className="font-semibold text-[color:var(--color-text-strong)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)]">
              {t('karyawan.edit.resetTitle')}
            </h2>
            <p className="text-[color:var(--color-text-muted)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
              {t('karyawan.edit.resetHint')}
            </p>
            <div className="flex flex-wrap gap-[var(--space-md)]">
              <button
                type="button"
                data-testid="reset-password"
                disabled={resetting}
                onClick={() => void handleResetPassword()}
                className={secondaryButtonClassName}
              >
                {t('karyawan.edit.resetAction')}
              </button>
            </div>

            {revealedPassword !== null && (
              <div
                data-testid="reset-reveal"
                className="flex flex-col gap-[var(--space-md)] rounded-[var(--radius-md)] bg-[var(--color-success-bg)] p-[var(--space-lg)]"
              >
                <p className="flex items-center gap-[var(--space-sm)] font-semibold text-[color:var(--color-success)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
                  <EyeIcon size={20} className="shrink-0" />
                  <span>{t('karyawan.edit.resetRevealTitle')}</span>
                </p>
                <code
                  data-testid="temporary-password"
                  className="block w-full break-all rounded-[var(--radius-sm)] border border-[color:var(--color-border)] bg-[var(--color-surface)] px-[var(--space-md)] py-[var(--space-md)] font-mono tracking-[0.04em] text-[color:var(--color-text-strong)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)]"
                >
                  {revealedPassword}
                </code>
                <p className="text-[color:var(--color-text-muted)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
                  {t('karyawan.edit.resetGuidance')}
                </p>
                <div className="flex flex-wrap gap-[var(--space-md)]">
                  <button
                    type="button"
                    data-testid="reset-close"
                    onClick={() => setRevealedPassword(null)}
                    className={secondaryButtonClassName}
                  >
                    {t('karyawan.edit.resetClose')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {toast.toast}
    </section>
  );
}
