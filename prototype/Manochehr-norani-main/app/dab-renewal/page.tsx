'use client';

import DabLicenseRenewalOfficialForm from '@/components/DabLicenseRenewalOfficialForm';
import DabRenewalApplicationWorkflow from '@/components/DabRenewalApplicationWorkflow';
import DabRenewalFinalReport from '@/components/DabRenewalFinalReport';
import { useCompany } from '@/lib/companyContext';

export default function DabRenewalPage() {
  const { activeCompanyId } = useCompany();
  return (
    <main className="space-y-6">
      <DabLicenseRenewalOfficialForm companyId={activeCompanyId} />
      <DabRenewalApplicationWorkflow companyId={activeCompanyId} />
      <DabRenewalFinalReport companyId={activeCompanyId} />
    </main>
  );
}
