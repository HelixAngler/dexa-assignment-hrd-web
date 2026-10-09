import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmployeeForm, type EmployeeFormValues } from '../components';
import { ServerErrorState, useSuccessToast } from '../components/states';
import { useI18n } from '../i18n/provider';
import { ApiError } from '../services/api';
import {
  createEmployee,
  type EmployeeCreated,
  type EmployeeCreateInput,
} from '../services/employees';

/** Alphabet without look-alike characters, used for the local preview only. */
const PREVIEW_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789-';

/** Length of the client-side preview password. */
const PREVIEW_LENGTH = 14;

/**
 * Builds a random preview value. The real credential is issued by the server
 * when the record is created; this one only shows the admin what kind of
 * password to expect and can be rolled before the save.
 */
function generatePreviewPassword(): string {
  const bytes = new Uint32Array(PREVIEW_LENGTH);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < PREVIEW_LENGTH; index += 1) {
      bytes[index] = Math.floor(Math.random() * 0xffffffff);
    }
  }
  return Array.from(
    bytes,
    (value) => PREVIEW_ALPHABET[value % PREVIEW_ALPHABET.length],
  ).join('');
}

/** Maps validated form values onto the documented create payload. */
function toCreateInput(values: EmployeeFormValues): EmployeeCreateInput {
  return {
    name: values.name,
    email: values.email,
    position: values.position,
    phone: values.phone,
    ...(values.photo === '' ? {} : { photo: values.photo }),
  };
}

/**
 * Create screen for a new employee. Before the save it states the
 * forced-first-login rule and offers a local preview of the kind of temporary
 * password the account will receive; the save posts only the profile fields
 * (never any password material) and the server's one-time password is then
 * revealed with copy guidance until the admin returns to the list. A
 * duplicate address is answered as a field error, while a server that never
 * completed the create hands off to the shared server-error state, which
 * re-posts the same values — the record does not exist until the save lands.
 */
export default function KaryawanAddPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const toast = useSuccessToast();
  const [pending, setPending] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const [fault, setFault] = useState(false);
  const [lastValues, setLastValues] = useState<EmployeeFormValues | null>(null);
  const [issued, setIssued] = useState<EmployeeCreated | null>(null);
  const [previewPassword, setPreviewPassword] = useState(generatePreviewPassword);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(values: EmployeeFormValues) {
    if (pending) {
      return;
    }
    setPending(true);
    setEmailTaken(false);
    setFault(false);
    setLastValues(values);
    try {
      const created = await createEmployee(toCreateInput(values));
      setIssued(created);
      toast.show(t('toast.karyawan.created'));
    } catch (caught) {
      if (
        caught instanceof ApiError &&
        caught.status === 409 &&
        caught.code === 'EMAIL_TAKEN'
      ) {
        setEmailTaken(true);
      } else {
        setFault(true);
      }
    } finally {
      setPending(false);
    }
  }

  async function handleCopy() {
    if (issued === null) {
      return;
    }
    try {
      await navigator.clipboard.writeText(issued.temporaryPassword);
      setCopied(true);
    } catch {
      // The password stays visible for manual copying when the API is absent.
    }
  }

  if (issued !== null) {
    return (
      <section data-testid="karyawan-add" className="mx-auto max-w-2xl">
        <h1 className="text-xl font-semibold text-gray-900">
          {t('karyawan.add.createdTitle')}
        </h1>
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-900">
            {t('karyawan.add.createdPasswordLabel')}
          </p>
          <code
            data-testid="temporary-password"
            className="mt-2 block break-all rounded-md border border-green-300 bg-white px-3 py-2 font-mono text-base text-gray-900"
          >
            {issued.temporaryPassword}
          </code>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="copy-password"
              onClick={() => void handleCopy()}
              className="min-h-[44px] rounded-md bg-green-700 px-4 text-sm font-semibold text-white hover:bg-green-800"
            >
              {copied ? t('karyawan.add.createdCopied') : t('karyawan.add.createdCopy')}
            </button>
            <button
              type="button"
              data-testid="created-done"
              onClick={() => navigate('/karyawan')}
              className="min-h-[44px] rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {t('karyawan.add.createdDone')}
            </button>
          </div>
          <p className="mt-3 text-sm text-green-900">
            {t('karyawan.add.createdGuidance')}
          </p>
        </div>
        {toast.toast}
      </section>
    );
  }

  return (
    <section data-testid="karyawan-add" className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900">
        {t('karyawan.add.title')}
      </h1>

      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
        <EmployeeForm
          mode="add"
          pending={pending}
          emailTaken={emailTaken}
          onValuesChange={() => setFault(false)}
          onSubmit={(values) => void handleSubmit(values)}
          notice={
            <div
              data-testid="temp-password-preview"
              className="rounded-md border border-gray-200 bg-gray-50 p-3"
            >
              <label
                htmlFor="temp-password-preview"
                className="block text-sm font-medium text-gray-700"
              >
                {t('karyawan.add.passwordLabel')}
              </label>
              <input
                id="temp-password-preview"
                data-testid="temp-password-preview-input"
                type="text"
                readOnly
                value={previewPassword}
                className="mt-1 h-11 w-full rounded-md border border-gray-300 bg-white px-3 font-mono text-sm text-gray-900"
              />
              <button
                type="button"
                data-testid="regenerate-password"
                onClick={() => setPreviewPassword(generatePreviewPassword())}
                className="mt-2 min-h-[44px] rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {t('karyawan.add.passwordRegenerate')}
              </button>
              <p className="mt-2 text-sm text-gray-500">
                {t('karyawan.add.passwordPreviewNote')}
              </p>
              <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
                {t('karyawan.add.forcedChangeNote')}
              </p>
            </div>
          }
        />
      </div>

      {fault && (
        <div className="mt-4">
          <ServerErrorState
            title={t('form.error.save')}
            onRetry={() => {
              if (lastValues !== null) {
                void handleSubmit(lastValues);
              }
            }}
          />
        </div>
      )}

      {toast.toast}
    </section>
  );
}
