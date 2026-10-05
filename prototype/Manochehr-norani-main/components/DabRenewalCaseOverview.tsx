'use client';

import { useMemo } from 'react';
import { CheckCircle2, FileText, ShieldCheck, Users, Building2 } from 'lucide-react';
import type { DABRenewalCase } from '@/lib/dabRenewalDomain';
import { calculateCaseCompleteness } from '@/lib/dabRenewalDomain';

export default function DabRenewalCaseOverview({ caseFile }: { caseFile: DABRenewalCase }) {
  const completeness = useMemo(() => calculateCaseCompleteness(caseFile), [caseFile]);
  const cards = [
    ['معلومات شرکت', caseFile.licenseNo ? 'تکمیل' : 'ناقص', Building2],
    ['سهمداران و مسئولان', String(caseFile.parties.length), Users],
    ['اسناد پرونده', String(caseFile.documents.length), FileText],
    ['Compliance', caseFile.compliance?.overallStatus === 'cleared' ? 'تأیید' : 'در انتظار', ShieldCheck],
  ] as const;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dir-rtl">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-black text-slate-900">نمای کلی پرونده تمدید</h2><p className="text-xs text-slate-500">کنترل مرکزی معلومات، اسناد و Compliance</p></div>
      <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-black text-slate-700"><CheckCircle2 className="h-4 w-4" /> {completeness.percent}% تکمیل</div>
    </div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(([label, value, Icon]) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-4"><Icon className="h-5 w-5 text-slate-600" /><p className="mt-2 text-xs font-bold text-slate-500">{label}</p><p className="mt-1 font-black text-slate-900">{value}</p></div>)}
    </div>
  </section>;
}
