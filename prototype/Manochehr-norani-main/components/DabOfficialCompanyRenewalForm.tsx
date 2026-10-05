'use client';
import { toEnglishDigits } from '@/lib/utils';

import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, setDoc } from '@/lib/firestoreCompat';
import { CheckCircle2, FileText, Plus, Save, Trash2 } from 'lucide-react';
import { db } from '@/lib/firebaseCompat';

const DAB_FORMS_URL = 'https://dab.gov.af/index.php/dr/node/1949';

type Person = {
  id: string;
  fullName: string;
  fatherName: string;
  tazkiraNo: string;
  tin: string;
  role: string;
  sharePercent: string;
};

type Branch = {
  id: string;
  name: string;
  province: string;
  district: string;
  nahia: string;
  market: string;
  shopNo: string;
  representative: string;
  representativeTazkira: string;
  phone: string;
};

type OfficialRenewalData = {
  companyName: string;
  companyNameEnglish: string;
  licenseNo: string;
  licenseIssueDate: string;
  licenseExpiryDate: string;
  province: string;
  district: string;
  nahia: string;
  market: string;
  shopNo: string;
  phone: string;
  email: string;
  tin: string;
  shareholders: Person[];
  responsibleStaff: Person[];
  branches: Branch[];
  hasChanges: boolean;
  changeDescription: string;
  taxClearanceAvailable: boolean;
  originalLicenseAvailable: boolean;
  guaranteeUpdated: boolean;
  applicationDate: string;
  applicantName: string;
  applicantRole: string;
};

const emptyPerson = (): Person => ({ id: crypto.randomUUID(), fullName: '', fatherName: '', tazkiraNo: '', tin: '', role: '', sharePercent: '' });
const emptyBranch = (): Branch => ({ id: crypto.randomUUID(), name: '', province: '', district: '', nahia: '', market: '', shopNo: '', representative: '', representativeTazkira: '', phone: '' });

const initialData: OfficialRenewalData = {
  companyName: '', companyNameEnglish: '', licenseNo: '', licenseIssueDate: '', licenseExpiryDate: '',
  province: '', district: '', nahia: '', market: '', shopNo: '', phone: '', email: '', tin: '',
  shareholders: [emptyPerson()], responsibleStaff: [emptyPerson()], branches: [], hasChanges: false,
  changeDescription: '', taxClearanceAvailable: false, originalLicenseAvailable: false,
  guaranteeUpdated: false, applicationDate: new Date().toISOString().slice(0, 10), applicantName: '', applicantRole: '',
};

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100';

export default function DabOfficialCompanyRenewalForm({ companyId = 'default' }: { companyId?: string }) {
  const [data, setData] = useState<OfficialRenewalData>(initialData);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const ref = doc(db, 'settings', `dab_official_company_renewal_v2_${companyId}`);
    return onSnapshot(ref, snapshot => {
      if (snapshot.exists()) setData(current => ({ ...current, ...(snapshot.data().formData as Partial<OfficialRenewalData>) }));
    });
  }, [companyId]);

  const update = <K extends keyof OfficialRenewalData>(key: K, value: OfficialRenewalData[K]) => setData(current => ({ ...current, [key]: value }));
  const updatePerson = (group: 'shareholders' | 'responsibleStaff', id: string, key: keyof Person, value: string) => {
    update(group, data[group].map(item => item.id === id ? { ...item, [key]: value } : item));
  };
  const updateBranch = (id: string, key: keyof Branch, value: string) => update('branches', data.branches.map(item => item.id === id ? { ...item, [key]: value } : item));

  const requiredMissing = useMemo(() => {
    const required = [
      ['نام شرکت', data.companyName], ['شماره جواز', data.licenseNo], ['ولایت', data.province],
      ['ولسوالی/ناحیه', data.district], ['TIN', data.tin], ['نام درخواست کننده', data.applicantName],
    ];
    return required.filter(([, value]) => !String(value).trim()).map(([label]) => label);
  }, [data]);

  const save = async () => {
    await setDoc(doc(db, 'settings', `dab_official_company_renewal_v2_${companyId}`), { formData: data, updatedAt: new Date().toISOString() }, { merge: true });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 border-b border-slate-200 pb-2 text-base font-black text-slate-900">{title}</h3>
      {children}
    </section>
  );

  return (
    <div dir="rtl" className="space-y-4 text-slate-900">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <FileText className="mt-1 h-5 w-5 text-blue-800" />
            <div><h2 className="font-black">فورم درخواستی تمدید جواز شرکت صرافی و خدمات پولی</h2><p className="mt-1 text-xs text-slate-600">ساختار این فورم بر اساس فهرست رسمی فورمه‌های جوازدهی د افغانستان بانک تنظیم شده است. متن و شماره‌گذاری PDF رسمی باید هنگام چاپ با نسخه جاری DAB تطبیق شود.</p></div>
          </div>
          <a href={DAB_FORMS_URL} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-800 underline">مرجع رسمی DAB</a>
        </div>
      </div>

      <Section title="بخش اول — مشخصات شرکت صرافی و خدمات پولی">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ['companyName','نام شرکت'],['companyNameEnglish','نام شرکت به انگلیسی'],['licenseNo','شماره جواز'],
            ['licenseIssueDate','تاریخ صدور جواز'],['licenseExpiryDate','تاریخ ختم/اعتبار جواز'],['tin','نمبر تشخیصیه مالیاتی (TIN)'],
            ['province','ولایت'],['district','ولسوالی/ناحیه'],['nahia','ناحیه'],['market','مارکیت/محل'],['shopNo','شماره دکان'],['phone','شماره تماس'],['email','آدرس ایمیل'],
          ].map(([key,label]) => <label key={key} className="space-y-1"><span className="text-xs font-bold text-slate-600">{label}</span><input dir={key.toLowerCase().includes('tazkira') ? 'ltr' : undefined} className={`${inputClass} ${key.toLowerCase().includes('tazkira') ? 'text-left font-sans' : ''}`} value={String(data[key as keyof OfficialRenewalData])} onChange={e => update(key as keyof OfficialRenewalData, (key.toLowerCase().includes('tazkira') ? toEnglishDigits(e.target.value) : e.target.value) as never)} /></label>)}
        </div>
      </Section>

      <Section title="بخش دوم — سهمداران">
        <div className="space-y-3">{data.shareholders.map((person, index) => <div key={person.id} className="rounded-lg border border-slate-200 p-3">
          <div className="mb-2 flex items-center justify-between"><b className="text-sm">سهمدار {index + 1}</b>{data.shareholders.length > 1 && <button type="button" onClick={() => update('shareholders', data.shareholders.filter(x => x.id !== person.id))} className="text-red-700"><Trash2 className="h-4 w-4" /></button>}</div>
          <div className="grid gap-2 md:grid-cols-6">{([['fullName','شهرت مکمل'],['fatherName','ولد'],['tazkiraNo','نمبر تذکره'],['tin','TIN'],['sharePercent','فیصدی سهم'],['role','سمت']] as [keyof Person,string][]).map(([key,label]) => <label key={key}><span className="text-xs font-bold">{label}</span><input dir={key.toLowerCase().includes('tazkira') ? 'ltr' : undefined} className={`${inputClass} ${key.toLowerCase().includes('tazkira') ? 'text-left font-sans' : ''}`} value={person[key]} onChange={e => updatePerson('shareholders', person.id, key, key.toLowerCase().includes('tazkira') ? toEnglishDigits(e.target.value) : e.target.value)} /></label>)}</div>
        </div>)}<button type="button" onClick={() => update('shareholders', [...data.shareholders, emptyPerson()])} className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold"><Plus className="h-4 w-4" /> افزودن سهمدار</button></div>
      </Section>

      <Section title="بخش سوم — کارمندان و مسئولین معرفی‌شده">
        <div className="space-y-3">{data.responsibleStaff.map((person, index) => <div key={person.id} className="rounded-lg border border-slate-200 p-3"><div className="mb-2 flex items-center justify-between"><b className="text-sm">کارمند/مسئول {index + 1}</b>{data.responsibleStaff.length > 1 && <button type="button" onClick={() => update('responsibleStaff', data.responsibleStaff.filter(x => x.id !== person.id))} className="text-red-700"><Trash2 className="h-4 w-4" /></button>}</div><div className="grid gap-2 md:grid-cols-6">{([['fullName','شهرت مکمل'],['fatherName','ولد'],['tazkiraNo','نمبر تذکره'],['tin','TIN'],['role','وظیفه'],['sharePercent','سهم در صورت موجودیت']] as [keyof Person,string][]).map(([key,label]) => <label key={key}><span className="text-xs font-bold">{label}</span><input dir={key.toLowerCase().includes('tazkira') ? 'ltr' : undefined} className={`${inputClass} ${key.toLowerCase().includes('tazkira') ? 'text-left font-sans' : ''}`} value={person[key]} onChange={e => updatePerson('responsibleStaff', person.id, key, key.toLowerCase().includes('tazkira') ? toEnglishDigits(e.target.value) : e.target.value)} /></label>)}</div></div>)}<button type="button" onClick={() => update('responsibleStaff', [...data.responsibleStaff, emptyPerson()])} className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold"><Plus className="h-4 w-4" /> افزودن کارمند/مسئول</button></div>
      </Section>

      <Section title="بخش چهارم — نمایندگی‌ها و محل فعالیت">
        <div className="space-y-3">{data.branches.map((branch, index) => <div key={branch.id} className="rounded-lg border border-slate-200 p-3"><div className="mb-2 flex items-center justify-between"><b className="text-sm">نمایندگی {index + 1}</b><button type="button" onClick={() => update('branches', data.branches.filter(x => x.id !== branch.id))} className="text-red-700"><Trash2 className="h-4 w-4" /></button></div><div className="grid gap-2 md:grid-cols-5">{([['name','نام نمایندگی'],['province','ولایت'],['district','ولسوالی'],['nahia','ناحیه'],['market','مارکیت'],['shopNo','شماره دکان'],['representative','شهرت نماینده باصلاحیت'],['representativeTazkira','نمبر تذکره نماینده'],['phone','شماره تماس']] as [keyof Branch,string][]).map(([key,label]) => <label key={key}><span className="text-xs font-bold">{label}</span><input dir={key.toLowerCase().includes('tazkira') ? 'ltr' : undefined} className={`${inputClass} ${key.toLowerCase().includes('tazkira') ? 'text-left font-sans' : ''}`} value={branch[key]} onChange={e => updateBranch(branch.id, key, key.toLowerCase().includes('tazkira') ? toEnglishDigits(e.target.value) : e.target.value)} /></label>)}</div></div>)}<button type="button" onClick={() => update('branches', [...data.branches, emptyBranch()])} className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold"><Plus className="h-4 w-4" /> افزودن نمایندگی</button></div>
      </Section>

      <Section title="بخش پنجم — تغییرات و معلومات تکمیلی">
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={data.hasChanges} onChange={e => update('hasChanges', e.target.checked)} /> از زمان جواز قبلی تغییرات عمده در معلومات شرکت ایجاد شده است.</label>
        {data.hasChanges && <textarea className={`${inputClass} mt-3 min-h-24`} placeholder="نوع تغییر، تاریخ تغییر و توضیحات را درج کنید." value={data.changeDescription} onChange={e => update('changeDescription', e.target.value)} />}
      </Section>

      <Section title="بخش ششم — چک اسناد قبل از ارائه">
        <div className="grid gap-2 md:grid-cols-3">{([['originalLicenseAvailable','اصل جواز موجود است'],['taxClearanceAvailable','سند تصفیه/عدم باقیداری مالیاتی موجود است'],['guaranteeUpdated','ضمانت/تضمین مربوطه به‌روز است']] as [keyof OfficialRenewalData,string][]).map(([key,label]) => <label key={key} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm font-bold"><input type="checkbox" checked={Boolean(data[key])} onChange={e => update(key, e.target.checked as never)} />{label}</label>)}</div>
      </Section>

      <Section title="بخش هفتم — درخواست و امضاء مسئول شرکت">
        <div className="grid gap-3 md:grid-cols-4">{([['applicationDate','تاریخ درخواست'],['applicantName','نام مسئول درخواست‌کننده'],['applicantRole','وظیفه'],['phone','شماره تماس']] as [keyof OfficialRenewalData,string][]).map(([key,label]) => <label key={key}><span className="text-xs font-bold">{label}</span><input dir={key.toLowerCase().includes('tazkira') ? 'ltr' : undefined} className={`${inputClass} ${key.toLowerCase().includes('tazkira') ? 'text-left font-sans' : ''}`} value={String(data[key])} onChange={e => update(key, (key.toLowerCase().includes('tazkira') ? toEnglishDigits(e.target.value) : e.target.value) as never)} /></label>)}</div>
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">این فورم باید قبل از ارسال، با نسخه جاری PDF د افغانستان بانک تطبیق، امضاء و شصت شود.</div>
      </Section>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <div className="text-sm font-bold">{requiredMissing.length === 0 ? <span className="flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-4 w-4" /> معلومات اصلی تکمیل است.</span> : <span className="text-amber-700">موارد اصلی ناقص: {requiredMissing.join('، ')}</span>}</div>
        <button type="button" onClick={save} className="flex items-center gap-2 rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-bold text-white"><Save className="h-4 w-4" /> {saved ? 'ذخیره شد' : 'ذخیره فورم'}</button>
      </div>
    </div>
  );
}
