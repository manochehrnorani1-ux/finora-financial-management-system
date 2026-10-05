'use client';

import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query } from '@/lib/firestoreCompat';
import { Printer, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/firebaseCompat';
import type { DabRenewalApplication } from '@/lib/dabLicenseRenewalRequirements';

interface AuditItem { id: string; companyId: string; from: string; to: string; by: string; at: string; }
interface Props { companyId?: string; }

export default function DabRenewalFinalReport({ companyId = 'default' }: Props) {
  const [application, setApplication] = useState<DabRenewalApplication>();
  const [audit, setAudit] = useState<AuditItem[]>([]);
  useEffect(() => {
    const appUnsubscribe = onSnapshot(doc(db, 'companies', companyId, 'dabRenewalApplications', 'current'), snapshot => { if (snapshot.exists()) setApplication(snapshot.data() as DabRenewalApplication); });
    const auditQuery = query(collection(db, 'renewal_audit_logs'), orderBy('at', 'desc'));
    const auditUnsubscribe = onSnapshot(auditQuery, snapshot => { const rows = snapshot.docs.map(item => ({ id: item.id, ...(item.data() as Omit<AuditItem, 'id'>) })); setAudit(rows.filter(item => item.companyId === companyId)); });
    return () => { appUnsubscribe(); auditUnsubscribe(); };
  }, [companyId]);

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:border-0 print:shadow-none">
    <div className="mb-5 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-xl bg-slate-900 p-2.5 text-white"><ShieldCheck className="h-5 w-5" /></div><div><h2 className="font-black text-slate-900">گزارش نهایی پرونده تمدید جواز</h2><p className="text-xs text-slate-500">خلاصه پرونده و سابقه مراحل ثبت‌شده.</p></div></div><button type="button" onClick={() => window.print()} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 print:hidden"><Printer className="h-4 w-4" /> چاپ گزارش</button></div>
    <div className="grid gap-3 text-sm md:grid-cols-4"><div><span className="text-xs text-slate-500">شماره پرونده</span><p className="font-bold">{application?.applicationId || '—'}</p></div><div><span className="text-xs text-slate-500">شماره جواز</span><p className="font-bold">{application?.licenseId || '—'}</p></div><div><span className="text-xs text-slate-500">تاریخ درخواست</span><p className="font-bold">{application?.applicationDate || '—'}</p></div><div><span className="text-xs text-slate-500">وضعیت</span><p className="font-bold">{application?.status || '—'}</p></div></div>
    <div className="mt-5 overflow-x-auto"><table className="w-full text-right text-sm"><thead><tr className="border-b"><th className="p-2">از مرحله</th><th className="p-2">به مرحله</th><th className="p-2">کاربر</th><th className="p-2">تاریخ</th></tr></thead><tbody>{audit.map(item => <tr key={item.id} className="border-b last:border-0"><td className="p-2">{item.from}</td><td className="p-2 font-bold">{item.to}</td><td className="p-2">{item.by}</td><td className="p-2">{item.at}</td></tr>)}{audit.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-500">هنوز سابقه‌ای ثبت نشده است.</td></tr>}</tbody></table></div>
  </section>;
}
