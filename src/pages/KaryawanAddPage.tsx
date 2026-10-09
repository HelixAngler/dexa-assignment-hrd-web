import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmployeeForm, type EmployeeFormValues } from '../components';
import { AlertIcon, EyeIcon } from '../components/icons';
import { ServerErrorState, useSuccessToast } from '../components/states';
import { useI18n } from '../i18n/provider';
import { ApiError } from '../services/api';
import {
  createEmployee,
  type EmployeeCreated,
  type EmployeeCreateInput,
} from '../services/employees';

/** Outlined action: visible and tappable, but never the dominant one. */
const secondaryButtonClassName =
  'inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[var(--color-surface)] px-[var(--space-md)] font-semibold text-[color:var(--color-text)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)] hover:bg-[var(--color-page)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]';

/** The one filled action of its screen. */
const primaryButtonClassName =
  'inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-[var(--space-lg)] font-semibold text-[color:var(--color-on-primary)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]';

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
        <h1 className="font-bold text-[color:var(--color-text-strong)] [font-size:var(--text-xl)] [line-height:var(--text-xl-line-height)]">
          {t('karyawan.add.createdTitle')}
        </h1>
        <div className="mt-[var(--space-xl)] flex flex-col gap-[var(--space-lg)] rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[var(--color-success-bg)] p-[var(--space-lg)] shadow-[var(--shadow-card)]">
          <p className="flex items-center gap-[var(--space-sm)] font-semibold text-[color:var(--color-success)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
            <EyeIcon size={20} className="shrink-0" />
            <span>{t('karyawan.add.createdPasswordLabel')}</span>
          </p>
          <code
            data-testid="temporary-password"
            className="block w-full break-all rounded-[var(--radius-sm)] border border-[color:var(--color-border)] bg-[var(--color-surface)] px-[var(--space-md)] py-[var(--space-md)] font-mono tracking-[0.04em] text-[color:var(--color-text-strong)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)]"
          >
            {issued.temporaryPassword}
          </code>
          <p className="text-[color:var(--color-text-muted)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
            {t('karyawan.add.createdGuidance')}
          </p>
          <div className="flex flex-wrap gap-[var(--space-md)]">
            <button
              type="button"
              data-testid="copy-password"
              onClick={() => void handleCopy()}
              className={secondaryButtonClassName}
            >
              {copied ? t('karyawan.add.createdCopied') : t('karyawan.add.createdCopy')}
            </button>
            <button
              type="button"
              data-testid="created-done"
              onClick={() => navigate('/karyawan')}
              className={primaryButtonClassName}
            >
              {t('karyawan.add.createdDone')}
            </button>
          </div>
        </div>
        {toast.toast}
      </section>
    );
  }

  return (
    <section data-testid="karyawan-add" className="mx-auto max-w-2xl">
      <h1 className="font-bold text-[color:var(--color-text-strong)] [font-size:var(--text-xl)] [line-height:var(--text-xl-line-height)]">
        {t('karyawan.add.title')}
      </h1>

      <div className="mt-[var(--space-xl)] flex flex-col gap-[var(--space-lg)] rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[var(--color-surface)] p-[var(--space-lg)] shadow-[var(--shadow-card)]">
        <EmployeeForm
          mode="add"
          pending={pending}
          emailTaken={emailTaken}
          onValuesChange={() => setFault(false)}
          onSubmit={(values) => void handleSubmit(values)}
          notice={
            <div
              data-testid="temp-password-preview"
              className="flex flex-col gap-[var(--space-xl)]"
            >
              <hr className="w-full border-0 border-t border-[color:var(--color-border)]" />
              <div className="flex flex-col gap-[var(--space-xs)]">
                <div className="flex flex-wrap items-center justify-between gap-[var(--space-sm)]">
                  <label
                    htmlFor="temp-password-preview"
                    className="font-medium text-[color:var(--color-text)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]"
                  >
                    {t('karyawan.add.passwordLabel')}
                  </label>
                  <button
                    type="button"
                    data-testid="regenerate-password"
                    onClick={() => setPreviewPassword(generatePreviewPassword())}
                    className={secondaryButtonClassName}
                  >
                    {t('karyawan.add.passwordRegenerate')}
                  </button>
                </div>
                <input
                  id="temp-password-preview"
                  data-testid="temp-password-preview-input"
                  type="text"
                  readOnly
                  value={previewPassword}
                  className="min-h-[44px] w-full rounded-[var(--radius-sm)] border border-[color:var(--color-border)] bg-[var(--color-surface)] px-[var(--space-md)] font-mono tracking-[0.04em] text-[color:var(--color-text-strong)] [font-size:var(--text-body)] [line-height:var(--text-body-line-height)] focus:border-[color:var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
                />
                <p className="text-[color:var(--color-text-muted)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
                  {t('karyawan.add.passwordPreviewNote')}
                </p>
              </div>
              <p className="flex items-start gap-[var(--space-sm)] rounded-[var(--radius-sm)] bg-[var(--color-attention-bg)] px-[var(--space-md)] py-[var(--space-sm)] font-medium text-[color:var(--color-attention)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
                <AlertIcon size={20} className="mt-[var(--space-xs)] shrink-0" />
                <span>{t('karyawan.add.forcedChangeNote')}</span>
              </p>
            </div>
          }
        />
      </div>

      {fault && (
        <div className="mt-[var(--space-xl)]">
          <ServerErrorState
            title={t('form.error.save')}
            onRetry={() => {
              if (lastValues !== null) {
                void handleSubmit(lastValues);
              }
            }}
            actionVariant="secondary"
          />
        </div>
      )}

      {toast.toast}
    </section>
  );
}
