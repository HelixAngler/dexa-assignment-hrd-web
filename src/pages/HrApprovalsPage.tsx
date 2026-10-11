import ApprovalSection from '../components/hr-access/ApprovalSection';
import { useI18n } from '../i18n/provider';

/**
 * HR approvals screen: the four-eyes maker-checker flow for HR accounts got a
 * dedicated route, so this page owns the section heading the component used
 * to render itself and the component owns the forms and the proposal table.
 */
export default function HrApprovalsPage() {
  const { t } = useI18n();

  return (
    <section data-testid="hr-approvals" className="space-y-[var(--space-lg)]">
      <div className="flex flex-col gap-[var(--space-md)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-[color:var(--color-text-strong)] [font-size:var(--text-xl)] [line-height:var(--text-xl-line-height)]">
            {t('karyawan.approval.title')}
          </h1>
          <p className="mt-[var(--space-xs)] text-[color:var(--color-text-muted)] [font-size:var(--text-sm)] [line-height:var(--text-sm-line-height)]">
            {t('karyawan.approval.subtitle')}
          </p>
        </div>
      </div>

      <ApprovalSection />
    </section>
  );
}
