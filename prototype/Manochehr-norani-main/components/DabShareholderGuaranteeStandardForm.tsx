'use client';

import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, setDoc } from '@/lib/firestoreCompat';
import { db } from '@/lib/firebaseCompat';
import { barakatullahGhafouriProfile as profile } from '@/lib/barakatullahGhafouriProfile';

export type GuaranteeRow = {
  id: string;
  shareholderName: string;
  shareholderFatherName: string;
  shareholderIdentityNo: string;
  shareholderPhoto: string | null;
  guarantorName: string;
  guarantorFatherName: string;
  guarantorIdentityNo: string;
  guarantorPhone: string;
  guarantorAddress: string;
  relationship: string;
};

type FormData = {
  companyName: string;
  licenseNo: string;
  province: string;
  issueDate: string;
  guaranteeAmount: string;
  rows: GuaranteeRow[];
  undertakings: string;
  authorizedName: string;
  authorizedTitle: string;
};

const storageKey = (companyId: string) => `dab_guarantee_form_data_${companyId}`;
const canonicalPath = (companyId: string) => `companies/${companyId}/dabOfficialForms/shareholder-guarantee`;

function defaults(): FormData {
  return {
    companyName: profile.legalName,
    licenseNo: profile.licenseNo,
    province: profile.province,
    issueDate: new Date().toISOString().slice(0, 10),
    guaranteeAmount: '',
    rows: profile.shareholders.map((shareholder, index) => ({
      id: String(index + 1),
      shareholderName: shareholder.name ?? '',
      shareholderFatherName: shareholder.fatherName ?? '',
      shareholderIdentityNo: shareholder.identityNo ?? '',
      shareholderPhoto: null,
      guarantorName: profile.guarantors[index]?.name ?? profile.guarantors[0]?.name ?? '',
      guarantorFatherName: profile.guarantors[index]?.fatherName ?? profile.guarantors[0]?.fatherName ?? '',
      guarantorIdentityNo: profile.guarantors[index]?.identityNo ?? profile.guarantors[0]?.identityNo ?? '',
      guarantorPhone: profile.guarantors[index]?.phone ?? profile.guarantors[0]?.phone ?? '',
      guarantorAddress: profile.address,
      relationship: '',
    })),
    undertakings: 'اینجانب/اینجانبان صحت معلومات درج‌شده را تأیید نموده و مسئولیت تعهدات مربوط به این تضمین را مطابق قوانین و مقررات نافذه می‌پذیریم.',
    authorizedName: profile.complianceOfficer.name,
    authorizedTitle: 'مسئول پیروی از قوانین و مقررات',
  };
}

export default function DabShareholderGuaranteeStandardForm({ companyId = 'default' }: { companyId?: string }) {
  const initial = useMemo(() => defaults(), []);
  const [data, setData] = useState<FormData>(initial);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(true);

  useEffect(() => {
    try {
      const legacy = localStorage.getItem(storageKey(companyId));
      if (legacy) {
        const old = JSON.parse(legacy);
        if (old?.formData) setData((current) => ({ ...current, ...old.formData }));
        else if (old) setData((current) => ({ ...current, ...old }));
      }
    } catch {
      // Keep safe defaults.
    }

    const unsubscribe = onSnapshot(doc(db, canonicalPath(companyId)), (snapshot) => {
      if (!snapshot.exists()) return;
      const remote = snapshot.data()?.formData;
      if (remote) setData((current) => ({ ...current, ...remote }));
    });

    return () => unsubscribe();
  }, [companyId]);

  const update = (key: keyof Omit<FormData, 'rows'>, value: string) => {
    setData((current) => ({ ...current, [key]: value }));
  };

  const updateRow = (id: string, key: keyof GuaranteeRow, value: string | null) => {
    setData((current) => ({
      ...current,
      rows: current.rows.map((row) => row.id === id ? { ...row, [key]: value } : row),
    }));
  };

  const handleShareholderPhoto = (id: string, file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      window.alert('لطفاً یک فایل عکس انتخاب کنید.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      window.alert('حجم عکس نباید بیشتر از ۲ مگابایت باشد.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => updateRow(id, 'shareholderPhoto', String(reader.result));
    reader.readAsDataURL(file);
  };

  const addRow = () => {
    setData((current) => ({
      ...current,
      rows: [...current.rows, {
        id: crypto.randomUUID(),
        shareholderName: '', shareholderFatherName: '', shareholderIdentityNo: '', shareholderPhoto: null,
        guarantorName: '', guarantorFatherName: '', guarantorIdentityNo: '',
        guarantorPhone: '', guarantorAddress: '', relationship: '',
      }],
    }));
  };

  const removeRow = (id: string) => {
    if (data.rows.length <= 1) return;
    setData((current) => ({ ...current, rows: current.rows.filter((row) => row.id !== id) }));
  };

  const save = async () => {
    await setDoc(doc(db, canonicalPath(companyId)), { formData: data, updatedAt: new Date().toISOString() }, { merge: true });
    localStorage.setItem(storageKey(companyId), JSON.stringify({ formData: data }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const reset = () => {
    if (window.confirm('آیا می‌خواهید معلومات فورم به حالت اولیه برگردد؟')) setData(defaults());
  };

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-3 py-5 text-slate-900 print:bg-white print:p-0">
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <header className="border-b border-slate-200 px-5 py-5 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-500">فورم تضمین سهمدار</p>
              <h1 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">تعهد و تضمین سهمدار</h1>
              <p className="mt-1 text-sm text-slate-500">فورم رسمی ثبت معلومات سهمدار و ضامن</p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <button type="button" onClick={() => setEditing((value) => !value)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{editing ? 'نمایش فورم' : 'ویرایش فورم'}</button>
              <button type="button" onClick={reset} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">بازنشانی</button>
              <button type="button" onClick={save} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">{saved ? 'ذخیره شد' : 'ذخیره فورم'}</button>
            </div>
          </div>
        </header>

        <div className="space-y-6 px-5 py-6 sm:px-8">
          <Section title="۱. معلومات مؤسسه">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Field label="نام شرکت" value={data.companyName} editing={editing} onChange={(value) => update('companyName', value)} wide />
              <Field label="شماره جواز" value={data.licenseNo} editing={editing} onChange={(value) => update('licenseNo', value)} />
              <Field label="ولایت" value={data.province} editing={editing} onChange={(value) => update('province', value)} />
              <Field label="تاریخ" value={data.issueDate} editing={editing} onChange={(value) => update('issueDate', value)} dir="ltr" />
              <Field label="مبلغ تضمین" value={data.guaranteeAmount} editing={editing} onChange={(value) => update('guaranteeAmount', value)} />
            </div>
          </Section>

          <Section title="۲. معلومات سهمدار و ضامن">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[1220px] border-collapse text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold">عکس سهمدار</th>
                    <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold">سهمدار</th>
                    <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold">نام پدر</th>
                    <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold">شماره تذکره</th>
                    <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold">ضامن</th>
                    <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold">نام پدر ضامن</th>
                    <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold">شماره تذکره ضامن</th>
                    <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold">تماس</th>
                    <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold">رابطه</th>
                    <th className="border-b border-slate-200 px-3 py-3 print:hidden" />
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.id} className="align-top even:bg-slate-50/60">
                      <td className="border-b border-slate-200 px-2 py-2">
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-[4cm] w-[3cm] overflow-hidden border border-slate-700 bg-slate-50 text-center print:h-[4cm] print:w-[3cm]">
                            {row.shareholderPhoto ? (
                              <img src={row.shareholderPhoto} alt="عکس سهمدار" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center px-1 text-[9px] leading-4 text-slate-400">عکس ۳×۴</div>
                            )}
                          </div>
                          {editing && (
                            <label className="cursor-pointer rounded-md border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 print:hidden">
                              انتخاب عکس
                              <input type="file" accept="image/*" className="hidden" onChange={(event) => handleShareholderPhoto(row.id, event.target.files?.[0])} />
                            </label>
                          )}
                        </div>
                      </td>
                      <Cell value={row.shareholderName} editing={editing} onChange={(value) => updateRow(row.id, 'shareholderName', value)} />
                      <Cell value={row.shareholderFatherName} editing={editing} onChange={(value) => updateRow(row.id, 'shareholderFatherName', value)} />
                      <Cell value={row.shareholderIdentityNo} editing={editing} onChange={(value) => updateRow(row.id, 'shareholderIdentityNo', value)} dir="ltr" />
                      <Cell value={row.guarantorName} editing={editing} onChange={(value) => updateRow(row.id, 'guarantorName', value)} />
                      <Cell value={row.guarantorFatherName} editing={editing} onChange={(value) => updateRow(row.id, 'guarantorFatherName', value)} />
                      <Cell value={row.guarantorIdentityNo} editing={editing} onChange={(value) => updateRow(row.id, 'guarantorIdentityNo', value)} dir="ltr" />
                      <Cell value={row.guarantorPhone} editing={editing} onChange={(value) => updateRow(row.id, 'guarantorPhone', value)} dir="ltr" />
                      <Cell value={row.relationship} editing={editing} onChange={(value) => updateRow(row.id, 'relationship', value)} />
                      <td className="border-b border-slate-200 px-2 py-2 print:hidden">
                        {editing && <button type="button" onClick={() => removeRow(row.id)} className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">حذف</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">سایز عکس سهمدار: ۳×۴ سانتی‌متر. عکس در همان نسبت چاپ می‌شود.</p>
            {editing && <button type="button" onClick={addRow} className="mt-3 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 print:hidden">+ افزودن ردیف</button>}
          </Section>

          <Section title="۳. معلومات تکمیلی ضامن">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {data.rows.map((row, index) => (
                <div key={`address-${row.id}`} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="mb-3 text-sm font-bold text-slate-800">ضامن {index + 1}: {row.guarantorName || '---'}</p>
                  <Field label="آدرس ضامن" value={row.guarantorAddress} editing={editing} onChange={(value) => updateRow(row.id, 'guarantorAddress', value)} />
                </div>
              ))}
            </div>
          </Section>

          <Section title="۴. تعهدات">
            <Field label="متن تعهد" value={data.undertakings} editing={editing} onChange={(value) => update('undertakings', value)} textarea />
          </Section>

          <Section title="۵. تأیید و مسئول فورم">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="نام مسئول" value={data.authorizedName} editing={editing} onChange={(value) => update('authorizedName', value)} />
              <Field label="وظیفه" value={data.authorizedTitle} editing={editing} onChange={(value) => update('authorizedTitle', value)} />
            </div>
          </Section>
        </div>

        <footer className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500 sm:px-8">
          این فورم برای ثبت و مدیریت معلومات تضمین سهمدار تنظیم شده است. معلومات نهایی باید با اسناد اصلی و الزامات مرجع مربوط تطبیق شود.
        </footer>
      </section>

      <style jsx global>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          html, body { margin: 0; background: white !important; }
          input, textarea { border: 0 !important; outline: none !important; box-shadow: none !important; background: transparent !important; }
          .print\\:hidden { display: none !important; }
          * { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 print:rounded-none print:border-slate-300 print:p-3">
      <h2 className="mb-4 border-r-4 border-slate-700 pr-3 text-base font-bold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, value, editing, onChange, wide, textarea, dir }: { label: string; value: string; editing: boolean; onChange: (value: string) => void; wide?: boolean; textarea?: boolean; dir?: 'rtl' | 'ltr' }) {
  return (
    <label className={wide ? 'md:col-span-2' : ''}>
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      {textarea ? (
        <textarea value={value} readOnly={!editing} onChange={(event) => onChange(event.target.value)} rows={4} dir={dir} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-200 read-only:bg-slate-50" />
      ) : (
        <input value={value} readOnly={!editing} onChange={(event) => onChange(event.target.value)} dir={dir} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-200 read-only:bg-slate-50" />
      )}
    </label>
  );
}

function Cell({ value, editing, onChange, dir }: { value: string; editing: boolean; onChange: (value: string) => void; dir?: 'rtl' | 'ltr' }) {
  return (
    <td className="border-b border-slate-200 px-2 py-2">
      <input value={value} readOnly={!editing} onChange={(event) => onChange(event.target.value)} dir={dir} className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-400 read-only:border-transparent read-only:bg-transparent" />
    </td>
  );
}
