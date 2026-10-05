'use client';

import type { DABRenewalCase } from '@/lib/dabRenewalDomain';

export default function DabRenewalOfficialReport({ caseFile }: { caseFile: DABRenewalCase }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dir-rtl print:border-0 print:shadow-none" id="dab-renewal-report">
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
      <div><p className="text-xs font-bold text-slate-500">گزارش رسمی پرونده</p><h2 className="text-xl font-black text-slate-900">گزارش تمدید جواز</h2></div>
      <button type="button" onClick={() => window.print()} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold print:hidden">چاپ گزارش</button>
    </div>
    <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div><dt className="text-xs text-slate-500">شماره پرونده</dt><dd className="font-black">{caseFile.applicationId}</dd></div>
      <div><dt className="text-xs text-slate-500">شماره جواز</dt><dd className="font-black">{caseFile.licenseNo || '—'}</dd></div>
      <div><dt className="text-xs text-slate-500">تاریخ درخواست</dt><dd className="font-black">{caseFile.applicationDate}</dd></div>
      <div><dt className="text-xs text-slate-500">وضعیت</dt><dd className="font-black">{caseFile.status}</dd></div>
    </dl>
    <div className="mt-6 grid gap-4 sm:grid-cols-3">
      <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">سهمداران و مسئولان</p><p className="mt-1 text-lg font-black">{caseFile.parties.length}</p></div>
      <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">شعب</p><p className="mt-1 text-lg font-black">{caseFile.branches.length}</p></div>
      <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">اسناد</p><p className="mt-1 text-lg font-black">{caseFile.documents.length}</p></div>
    </div>
  </section>;
}
