'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, FileCheck2, Save, ShieldCheck, Upload, ExternalLink } from 'lucide-react';
import { doc, onSnapshot, setDoc } from '@/lib/firestoreCompat';
import { db, auth } from '@/lib/firebaseCompat';
import { uploadRenewalDocument } from '@/lib/renewalDocumentStorage';
import {
  DAB_LICENSE_RENEWAL_REQUIREMENTS,
  DabRenewalDocumentRecord,
  RenewalDocumentKey,
  RenewalDocumentStatus,
  canSubmitDabRenewal,
} from '@/lib/dabLicenseRenewalRequirements';

interface Props {
  companyId?: string;
  initialMajorChanges?: boolean;
}

const emptyRecords = (): DabRenewalDocumentRecord[] =>
  DAB_LICENSE_RENEWAL_REQUIREMENTS.map((requirement) => ({
    requirementKey: requirement.key,
    status: 'missing',
  }));

const statusLabels: Record<RenewalDocumentStatus, string> = {
  missing: 'ناقص',
  uploaded: 'آپلود شده',
  verified: 'تأیید شده',
  rejected: 'رد شده',
};

export default function DabRenewalCompliancePanel({ companyId = 'default', initialMajorChanges = false }: Props) {
  const [majorChanges, setMajorChanges] = useState(initialMajorChanges);
  const [documents, setDocuments] = useState<DabRenewalDocumentRecord[]>(emptyRecords);
  const [verifiedKeys, setVerifiedKeys] = useState<RenewalDocumentKey[]>([]);
  const [saved, setSaved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busyKey, setBusyKey] = useState<RenewalDocumentKey | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    const checkRole = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdTokenResult();
      if (active) setIsAdmin(token.claims.admin === true);
    };
    void checkRole();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const ref = doc(db, 'settings', `dab_renewal_compliance_v1_${companyId}`);
    return onSnapshot(ref, (snapshot) => {
      if (!snapshot.exists()) return;
      const value = snapshot.data();
      if (Array.isArray(value?.documents)) setDocuments(value.documents);
      if (Array.isArray(value?.verifiedKeys)) setVerifiedKeys(value.verifiedKeys);
      if (typeof value?.majorChanges === 'boolean') setMajorChanges(value.majorChanges);
    }, (error) => {
      console.error('DAB renewal compliance load error:', error);
      setMessage('بارگذاری معلومات کنترول تمدید جواز موفق نشد.');
    });
  }, [companyId]);

  const readiness = useMemo(
    () => canSubmitDabRenewal(documents, majorChanges, verifiedKeys),
    [documents, majorChanges, verifiedKeys],
  );

  const persist = async (
    nextDocuments = documents,
    nextVerifiedKeys = verifiedKeys,
    nextMajorChanges = majorChanges,
  ) => {
    await setDoc(doc(db, 'settings', `dab_renewal_compliance_v1_${companyId}`), {
      companyId,
      majorChanges: nextMajorChanges,
      documents: nextDocuments,
      verifiedKeys: nextVerifiedKeys,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  };

  const updateMajorChanges = (value: boolean) => {
    setMajorChanges(value);
    setMessage('');
  };

  const updateStatus = async (key: RenewalDocumentKey, status: RenewalDocumentStatus) => {
    if (!isAdmin) return;
    const user = auth.currentUser;
    if (!user) {
      setMessage('برای تأیید سند باید وارد حساب کاربری شوید.');
      return;
    }

    const now = new Date().toISOString();
    const nextDocuments = documents.map((item) => item.requirementKey === key
      ? {
          ...item,
          status,
          verifiedBy: status === 'verified' ? user.uid : undefined,
          verifiedAt: status === 'verified' ? now : undefined,
          rejectionReason: status === 'rejected' ? item.rejectionReason : undefined,
        }
      : item,
    );
    const nextVerifiedKeys = status === 'verified'
      ? Array.from(new Set([...verifiedKeys, key]))
      : verifiedKeys.filter((item) => item !== key);

    try {
      setBusyKey(key);
      await persist(nextDocuments, nextVerifiedKeys);
      setDocuments(nextDocuments);
      setVerifiedKeys(nextVerifiedKeys);
      setMessage(status === 'verified' ? 'سند توسط کاربر مجاز تأیید شد.' : 'وضعیت سند تغییر کرد.');
    } catch (error) {
      console.error('DAB renewal review error:', error);
      setMessage('تغییر وضعیت سند ذخیره نشد.');
    } finally {
      setBusyKey(null);
    }
  };

  const upload = async (key: RenewalDocumentKey, file: File) => {
    const user = auth.currentUser;
    if (!user) {
      setMessage('برای آپلود سند باید وارد حساب کاربری شوید.');
      return;
    }

    try {
      setBusyKey(key);
      setMessage('در حال آپلود سند...');
      const uploaded = await uploadRenewalDocument(companyId, key, file, user.uid);
      const nextDocuments = documents.map((item) => item.requirementKey === key
        ? { ...item, status: 'uploaded' as const, ...uploaded, verifiedBy: undefined, verifiedAt: undefined }
        : item,
      );
      const nextVerifiedKeys = verifiedKeys.filter((item) => item !== key);
      await persist(nextDocuments, nextVerifiedKeys);
      setDocuments(nextDocuments);
      setVerifiedKeys(nextVerifiedKeys);
      setMessage('سند با موفقیت آپلود شد و برای بررسی آماده است.');
    } catch (error) {
      console.error('DAB renewal document upload error:', error);
      setMessage(error instanceof Error ? error.message : 'آپلود سند موفق نشد.');
    } finally {
      setBusyKey(null);
    }
  };

  const save = async () => {
    try {
      await persist();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('DAB renewal compliance save error:', error);
      setMessage('ذخیره کنترول موفق نشد.');
    }
  };

  return (
    <section className="dir-rtl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-900 p-2.5 text-white"><ShieldCheck className="h-5 w-5" /></div>
          <div>
            <h2 className="font-black text-slate-900">کنترول الزامات تمدید جواز DAB</h2>
            <p className="text-xs text-slate-500">اسناد باید آپلود شوند و تأیید نهایی فقط توسط کاربر مجاز انجام می‌شود.</p>
          </div>
        </div>
        <button type="button" onClick={save} className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white">
          <Save className="h-4 w-4" />
          {saved ? 'ذخیره شد' : 'ذخیره کنترول'}
        </button>
      </div>

      <label className="mb-5 flex cursor-pointer items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
        <input type="checkbox" checked={majorChanges} onChange={(event) => updateMajorChanges(event.target.checked)} />
        در معلومات اولیه شرکت تغییر عمده ایجاد شده است.
      </label>

      <div className={`mb-3 flex items-center gap-2 rounded-xl p-3 text-sm font-black ${readiness.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
        {readiness.ok ? <CheckCircle2 className="h-5 w-5" /> : <CircleAlert className="h-5 w-5" />}
        {readiness.ok ? 'پرونده از نگاه اسناد اجباری آماده ارسال است.' : `پرونده هنوز ${readiness.missing.length} مورد ناقص دارد.`}
      </div>

      {message && <div className="mb-4 rounded-xl bg-slate-100 p-3 text-sm font-bold text-slate-700">{message}</div>}

      <div className="space-y-3">
        {DAB_LICENSE_RENEWAL_REQUIREMENTS.map((requirement) => {
          const record = documents.find((item) => item.requirementKey === requirement.key);
          const conditional = requirement.key === 'updatedInitialApplicationInformation';
          const required = requirement.required || (conditional && majorChanges);
          const busy = busyKey === requirement.key;
          return (
            <div key={requirement.key} className="rounded-xl border border-slate-200 p-3">
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <FileCheck2 className="h-4 w-4 text-blue-700" />
                    <span className="font-bold text-slate-900">{requirement.titleFa}</span>
                    {required ? <span className="text-xs font-bold text-red-600">الزامی</span> : <span className="text-xs text-slate-500">شرطی</span>}
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{statusLabels[record?.status ?? 'missing']}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{requirement.legalBasis} — {requirement.descriptionFa}</p>
                  {record?.fileName && <p className="mt-2 text-xs font-bold text-slate-700">فایل: {record.fileName}</p>}
                  {record?.downloadUrl && (
                    <a href={record.downloadUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-700">
                      <ExternalLink className="h-3 w-3" /> مشاهده سند
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800">
                    <Upload className="h-4 w-4" />
                    {busy ? 'در حال انجام...' : 'آپلود سند'}
                    <input
                      type="file"
                      className="hidden"
                      accept="application/pdf,image/jpeg,image/png"
                      disabled={busy}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void upload(requirement.key, file);
                        event.currentTarget.value = '';
                      }}
                    />
                  </label>

                  {isAdmin && (
                    <select
                      className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold"
                      value={record?.status ?? 'missing'}
                      disabled={busy}
                      onChange={(event) => void updateStatus(requirement.key, event.target.value as RenewalDocumentStatus)}
                    >
                      {(Object.keys(statusLabels) as RenewalDocumentStatus[]).map((status) => (
                        <option key={status} value={status}>{statusLabels[status]}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs font-bold text-slate-500">
        {isAdmin ? 'شما دسترسی بررسی اسناد را دارید.' : 'شما می‌توانید سند را آپلود کنید. تأیید نهایی فقط برای کاربر مجاز فعال است.'}
      </p>
    </section>
  );
}
