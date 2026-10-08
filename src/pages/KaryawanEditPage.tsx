import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  EmployeeForm,
  EmptyState,
  LoadingState,
  ServerErrorState,
  type EmployeeFormValues,
} from '../components';
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
 * reveals the new temporary password exactly once. Attendance data has no
 * place on this screen, so none of its fields exist here.
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
  const [pageError, setPageError] = useState<string | null>(null);
  const [formPending, setFormPending] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (id === undefined) {
      setLoadState('missing');
      return;
    }
    setLoadState('loading');
    setPageError(null);
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
    setFormError(null);
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
        setFormError(t('form.error.save'));
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
    setPageError(null);
    try {
      await setEmployeeStatus(id, status);
      setEmployee((current) => (current === null ? current : { ...current, status }));
      setStatusChoice(status);
      setConfirmingStatus(false);
      toast.show(t('toast.karyawan.statusChanged'));
    } catch {
      setConfirmingStatus(false);
      setPageError(t('form.error.save'));
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
    setPageError(null);
    setRevealedPassword(null);
    try {
      const result = await resetEmployeePassword(id);
      setRevealedPassword(result.temporaryPassword);
      toast.show(t('toast.karyawan.passwordReset'));
    } catch {
      setPageError(t('form.error.save'));
    } finally {
      setResetting(false);
    }
  }

  const selectedStatus = statusChoice ?? employee?.status ?? 'active';

  return (
    <section data-testid="karyawan-edit" className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">
        {t('karyawan.edit.title')}
      </h1>

      {pageError !== null && (
        <div
          role="alert"
          data-testid="karyawan-edit-error"
          className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          <p>{pageError}</p>
        </div>
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
              className="mt-2 min-h-[44px] rounded-md bg-gray-800 px-4 text-sm font-medium text-white hover:bg-gray-900"
            >
              {t('karyawan.edit.notFoundBack')}
            </button>
          }
        />
      )}

      {loadState === 'ready' && employee !== null && (
        <>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <EmployeeForm
              mode="edit"
              pending={formPending}
              emailTaken={emailTaken}
              serverError={formError}
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

          <div
            data-testid="status-card"
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
            <h2 className="text-base font-semibold text-gray-900">
              {t('karyawan.edit.statusTitle')}
            </h2>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-6">
              <label className="flex min-h-[44px] items-center gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="employee-status"
                  value="active"
                  checked={selectedStatus === 'active'}
                  onChange={() => {
                    setStatusChoice('active');
                    setConfirmingStatus(false);
                  }}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                {t('karyawan.status.active')}
              </label>
              <label className="flex min-h-[44px] items-center gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="employee-status"
                  value="deactivated"
                  checked={selectedStatus === 'deactivated'}
                  onChange={() => {
                    setStatusChoice('deactivated');
                    setConfirmingStatus(false);
                  }}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                {t('karyawan.status.deactivated')}
              </label>
            </div>

            {confirmingStatus ? (
              <div
                data-testid="status-confirm"
                className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3"
              >
                <p className="text-sm font-semibold text-amber-900">
                  {t('karyawan.edit.statusConfirmTitle')}
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  {t('karyawan.edit.statusConfirmBody')}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-testid="status-confirm-yes"
                    disabled={statusPending}
                    onClick={() => commitStatus('deactivated')}
                    className="min-h-[44px] rounded-md bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                  >
                    {t('karyawan.edit.statusConfirm')}
                  </button>
                  <button
                    type="button"
                    data-testid="status-confirm-cancel"
                    disabled={statusPending}
                    onClick={() => setConfirmingStatus(false)}
                    className="min-h-[44px] rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    {t('karyawan.edit.statusCancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                data-testid="status-apply"
                disabled={statusPending || statusChoice === employee.status}
                onClick={handleApplyStatus}
                className="mt-3 min-h-[44px] rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {t('karyawan.edit.statusApply')}
              </button>
            )}
          </div>

          <div
            data-testid="password-card"
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
            <h2 className="text-base font-semibold text-gray-900">
              {t('karyawan.edit.resetTitle')}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {t('karyawan.edit.resetHint')}
            </p>
            <button
              type="button"
              data-testid="reset-password"
              disabled={resetting}
              onClick={() => void handleResetPassword()}
              className="mt-3 min-h-[44px] rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
            >
              {t('karyawan.edit.resetAction')}
            </button>

            {revealedPassword !== null && (
              <div
                data-testid="reset-reveal"
                className="mt-3 rounded-md border border-green-200 bg-green-50 p-3"
              >
                <p className="text-sm font-medium text-green-900">
                  {t('karyawan.edit.resetRevealTitle')}
                </p>
                <code
                  data-testid="temporary-password"
                  className="mt-2 block break-all rounded-md border border-green-300 bg-white px-3 py-2 font-mono text-base text-gray-900"
                >
                  {revealedPassword}
                </code>
                <p className="mt-2 text-sm text-green-900">
                  {t('karyawan.edit.resetGuidance')}
                </p>
                <button
                  type="button"
                  data-testid="reset-close"
                  onClick={() => setRevealedPassword(null)}
                  className="mt-3 min-h-[44px] rounded-md bg-green-700 px-4 text-sm font-semibold text-white hover:bg-green-800"
                >
                  {t('karyawan.edit.resetClose')}
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
