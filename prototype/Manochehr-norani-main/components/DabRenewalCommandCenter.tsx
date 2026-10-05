'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, FileCheck2, ShieldCheck, Users } from 'lucide-react';
import { collection, doc, onSnapshot } from '@/lib/firestoreCompat';
import { db } from '@/lib/firebaseCompat';
import { calculateCaseCompleteness, type DABRenewalCase, type DABParty, type DABDocumentRecord } from '@/lib/dabRenewalDomain';
import DabRenewalCaseOverview from './DabRenewalCaseOverview';
import DabRenewalOfficialReport from './DabRenewalOfficialReport';

export default function DabRenewalCommandCenter({ companyId }: { companyId?: string }) {
  const [caseFile, setCaseFile] = useState<DABRenewalCase>({
    applicationId: `DAB-${companyId ?? 'default'}-${new Date().getFullYear()}`,
    companyId: companyId ?? 'default', licenseNo: '', applicationDate: new Date().toISOString().slice(0, 10),
    status: 'draft', parties: [], branches: [], documents: [],
  });

  useEffect(() => {
    if (!companyId) return;
    const applicationId = `DAB-${companyId}-${new Date().getFullYear()}`;
    const appUnsub = onSnapshot(doc(db, 'companies', companyId, 'dabRenewalApplications', 'current'), (snap) => {
      if (!snap.exists()) return;
      const value = snap.data();
      setCaseFile((current) => ({ ...current, ...value, companyId, applicationId: value.applicationId ?? applicationId }));
    });
    const docsUnsub = onSnapshot(collection(db, 'companies', companyId, 'dabRenewalDocuments'), (snap) => {
      const documents = snap.docs.map((item) => item.data() as DABDocumentRecord);
      setCaseFile((current) => ({ ...current, documents }));
    });
    const partiesUnsub = onSnapshot(collection(db, 'companies', companyId, 'dabRenewalParties'), (snap) => {
      const parties = snap.docs.map((item) => item.data() as DABParty);
      setCaseFile((current) => ({ ...current, parties }));
    });
    return () => { appUnsub(); docsUnsub(); partiesUnsub(); };
  }, [companyId]);

  const completeness = useMemo(() => calculateCaseCompleteness(caseFile), [caseFile]);
  const cards = [
    ['شرکت', caseFile.licenseNo ? 'ثبت شده' : 'ناقص', Building2],
    ['سهمداران / مسئولان', caseFile.parties.length, Users],
    ['اسناد', caseFile.documents.length, FileCheck2],
    ['Compliance', caseFile.compliance?.overallStatus === 'cleared' ? 'Cleared' : 'Pending', ShieldCheck],
  ] as const;

  return <div className="space-y-4 dir-rtl">
    <DabRenewalCaseOverview caseFile={caseFile} />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(([label, value, Icon]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><Icon className="h-5 w-5 text-slate-600" /><p className="mt-2 text-xs font-bold text-slate-500">{label}</p><p className="mt-1 font-black text-slate-900">{value}</p></div>)}
    </div>
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700">آمادگی پرونده: {completeness.completed} از {completeness.total} بخش اصلی تکمیل است.</div>
    <DabRenewalOfficialReport caseFile={caseFile} />
  </div>;
}
