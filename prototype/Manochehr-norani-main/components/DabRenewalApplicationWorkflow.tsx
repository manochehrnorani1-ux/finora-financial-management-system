'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, Save, ShieldCheck } from 'lucide-react';
import { addDoc, collection, doc, onSnapshot, setDoc } from '@/lib/firestoreCompat';
import { auth, db } from '@/lib/firebaseCompat';
import { DabRenewalApplication, DabRenewalDocumentRecord, DabRenewalStatus, RenewalDocumentKey, canSubmitDabRenewal } from '@/lib/dabLicenseRenewalRequirements';

interface Props { companyId?: string; }
const STATUS_LABELS: Record<DabRenewalStatus, string> = { draft: 'پیش‌نویس', documents_pending: 'اسناد ناقص', ready_for_submission: 'آماده ارسال', submitted: 'ارسال شده', under_dab_review: 'تحت بررسی د افغانستان بانک', additional_information_requested: 'درخواست معلومات اضافی', approved: 'تأیید شده', rejected: 'رد شده', completed: 'تکمیل شده' };
const NEXT: Record<DabRenewalStatus, DabRenewalStatus[]> = { draft: ['documents_pending'], documents_pending: ['ready_for_submission'], ready_for_submission: ['submitted'], submitted: ['under_dab_review'], under_dab_review: ['additional_information_requested', 'approved', 'rejected'], additional_information_requested: ['documents_pending'], approved: ['completed'], rejected: ['draft'], completed: [] };
function initial(companyId: string): DabRenewalApplication { return { applicationId: `DAB-${companyId}-${new Date().getFullYear()}`, companyId, licenseId: '', applicationDate: new Date().toISOString().slice(0, 10), status: 'draft', majorChanges: false, notes: '' }; }

export default function DabRenewalApplicationWorkflow({ companyId = 'default' }: Props) {
  const [application, setApplication] = useState<DabRenewalApplication>(() => initial(companyId));
  const [documents, setDocuments] = useState<DabRenewalDocumentRecord[]>([]);
  const [verifiedKeys, setVerifiedKeys] = useState<RenewalDocumentKey[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { let active = true; const run = async () => { const user = auth.currentUser; if (!user) return; const token = await user.getIdTokenResult(); if (active) setIsAdmin(token.claims.admin === true); }; void run(); return () => { active = false; }; }, []);
  useEffect(() => { const appRef = doc(db, 'companies', companyId, 'dabRenewalApplications', 'current'); const complianceRef = doc(db, 'settings', `dab_renewal_compliance_v1_${companyId}`); const a = onSnapshot(appRef, snapshot => { if (snapshot.exists()) setApplication(current => ({ ...current, ...snapshot.data() } as DabRenewalApplication)); }); const c = onSnapshot(complianceRef, snapshot => { if (!snapshot.exists()) return; const value = snapshot.data(); if (Array.isArray(value?.documents)) setDocuments(value.documents); if (Array.isArray(value?.verifiedKeys)) setVerifiedKeys(value.verifiedKeys); if (typeof value?.majorChanges === 'boolean') setApplication(current => ({ ...current, majorChanges: value.majorChanges })); }); return () => { a(); c(); }; }, [companyId]);
  const readiness = useMemo(() => canSubmitDabRenewal(documents, application.majorChanges, verifiedKeys), [documents, application.majorChanges, verifiedKeys]);
  const save = async () => { const user = auth.currentUser; if (!user) { setMessage('برای ذخیره باید وارد حساب شوید.'); return; } try { setSaving(true); await setDoc(doc(db, 'companies', companyId, 'dabRenewalApplications', 'current'), { ...application, companyId, updatedAt: new Date().toISOString(), lastActionBy: user.uid }, { merge: true }); setMessage('معلومات پرونده ذخیره شد.'); } catch { setMessage('ذخیره معلومات پرونده موفق نشد.'); } finally { setSaving(false); } };
  const transition = async (status: DabRenewalStatus) => {
    if (!isAdmin) { setMessage('تغییر مرحله پرونده فقط توسط کاربر مجاز انجام می‌شود.'); return; }
    if (!NEXT[application.status].includes(status)) { setMessage('این تغییر مرحله از وضعیت فعلی مجاز نیست.'); return; }
    if (status === 'ready_for_submission' && !readiness.ok) { setMessage(`پرونده هنوز ${readiness.missing.length} مورد اجباری ناقص دارد.`); return; }
    const user = auth.currentUser; if (!user) { setMessage('برای تغییر مرحله باید وارد حساب شوید.'); return; }
    const now = new Date().toISOString(); const next = { ...application, status, submittedAt: status === 'submitted' ? now : application.submittedAt, completedAt: status === 'completed' ? now : application.completedAt };
    try { setSaving(true); await setDoc(doc(db, 'companies', companyId, 'dabRenewalApplications', 'current'), { ...next, lastActionBy: user.uid, updatedAt: now }, { merge: true }); await addDoc(collection(db, 'renewal_audit_logs'), { companyId, applicationId: application.applicationId, from: application.status, to: status, by: user.uid, at: now }); setApplication(next); setMessage(`مرحله پرونده به «${STATUS_LABELS[status]}» تغییر کرد.`); } catch { setMessage('تغییر مرحله پرونده ذخیره نشد.'); } finally { setSaving(false); }
  };

  return (
    <section className="dir-rtl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-xl bg-blue-900 p-2.5 text-white"><ShieldCheck className="h-5 w-5" /></div><div><h2 className="font-black text-slate-900">چرخه پرونده تمدید جواز</h2><p className="text-xs text-slate-500">تغییر مراحل رسمی پرونده فقط توسط کاربر مجاز انجام می‌شود.</p></div></div><button type="button" onClick={save} disabled={saving} className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" /> ذخیره پرونده</button></div>
      <div className="grid gap-4 md:grid-cols-3"><label><span className="mb-1 block text-xs font-bold text-slate-600">شماره پرونده</span><input value={application.applicationId} readOnly={!isAdmin} onChange={e => setApplication({ ...application, applicationId: e.target.value })} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm" /></label><label><span className="mb-1 block text-xs font-bold text-slate-600">شماره جواز</span><input value={application.licenseId} onChange={e => setApplication({ ...application, licenseId: e.target.value })} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm" /></label><label><span className="mb-1 block text-xs font-bold text-slate-600">تاریخ درخواست</span><input type="date" value={application.applicationDate} onChange={e => setApplication({ ...application, applicationDate: e.target.value })} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm" /></label></div>
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3"><span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-black text-blue-800">{STATUS_LABELS[application.status]}</span>{readiness.ok ? <span className="flex items-center gap-1 text-sm font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> اسناد اجباری تأیید شده‌اند.</span> : <span className="flex items-center gap-1 text-sm font-bold text-amber-700"><CircleAlert className="h-4 w-4" /> {readiness.missing.length} مورد اسناد اجباری باقی است.</span>}</div>
      {message && <div className="mt-3 rounded-xl bg-slate-100 p-3 text-sm font-bold text-slate-700">{message}</div>}
      <div className="mt-4 flex flex-wrap gap-2">{NEXT[application.status].map(status => <button key={status} type="button" onClick={() => transition(status)} disabled={saving || !isAdmin} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-40">{STATUS_LABELS[status]}</button>)}</div>
      {!isAdmin && <p className="mt-3 text-xs font-bold text-slate-500">تغییر مرحله پرونده نیاز به دسترسی مجاز دارد.</p>}
    </section>
  );
}
