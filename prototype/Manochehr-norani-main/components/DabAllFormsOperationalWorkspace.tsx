'use client';

import { useMemo, useState } from 'react';
import { doc, getDoc, setDoc } from '@/lib/firestoreCompat';
import { db } from '@/lib/firebaseCompat';
import { barakatullahGhafouriProfile as profile } from '@/lib/barakatullahGhafouriProfile';

type Field = { key: string; label: string; type?: 'text' | 'date' | 'number' | 'textarea'; required?: boolean };
type Values = Record<string, string>;
type FormDef = { id: string; title: string; category: string; fields: Field[] };

const companyFields: Field[] = [
  { key: 'companyName', label: 'نام رسمی شرکت', required: true },
  { key: 'formerName', label: 'نام قبلی شرکت' },
  { key: 'englishName', label: 'نام انگلیسی' },
  { key: 'licenseNo', label: 'شماره جواز', required: true },
  { key: 'province', label: 'ولایت' },
  { key: 'district', label: 'ولسوالی / ناحیه' },
  { key: 'neighborhood', label: 'ناحیه' },
  { key: 'market', label: 'مارکیت' },
  { key: 'floor', label: 'منزل' },
  { key: 'shopNo', label: 'نمبر دکان' },
  { key: 'address', label: 'آدرس کامل', type: 'textarea' },
  { key: 'phone', label: 'شماره تماس' },
  { key: 'email', label: 'ایمیل' },
];

const forms: FormDef[] = [
  { id: 'license-application', title: 'فورم درخواستی صدور جواز شرکت صرافی و خدمات پولی', category: 'جوازدهی', fields: [...companyFields, { key: 'shareholders', label: 'مشخصات سهمداران', type: 'textarea' }, { key: 'capital', label: 'سرمایه کاری', type: 'number' }, { key: 'businessScope', label: 'نوع و ساحه فعالیت', type: 'textarea' }] },
  { id: 'license-renewal', title: 'فورم شماره (۱) — درخواستی تمدید جواز دفتر مرکزی', category: 'تمدید جواز', fields: [...companyFields, { key: 'licenseExpiryDate', label: 'تاریخ ختم جواز' }, { key: 'renewalDate', label: 'تاریخ درخواست' }, { key: 'shareholders', label: 'مشخصات سهمدار / سهمداران', type: 'textarea' }, { key: 'branches', label: 'تمام نمایندگی‌ها', type: 'textarea' }, { key: 'bankAccounts', label: 'حسابات بانکی', type: 'textarea' }, { key: 'requestedChanges', label: 'تغییرات مطالبه‌شده حین تمدید', type: 'textarea' }, { key: 'activityLastYear', label: 'فعالیت از سال گذشته تا اکنون' }, { key: 'legalClaims', label: 'دعوی حقوقی / قضایی' }, { key: 'shareholderDeclaration', label: 'اقرار و تعهد سهمدار', type: 'textarea' }] },
  { id: 'shareholder-employee-profile', title: 'فورم شهرت سهمدار / کارمند', category: 'اشخاص', fields: [{ key: 'position', label: 'موقف در شرکت', required: true }, { key: 'fullName', label: 'نام و تخلص', required: true }, { key: 'fatherName', label: 'نام پدر' }, { key: 'identityNo', label: 'شماره تذکره' }, { key: 'education', label: 'سویه تحصیلی' }, { key: 'field', label: 'رشته' }, { key: 'sharePercent', label: 'فیصدی سهم', type: 'number' }, { key: 'tin', label: 'TIN' }, { key: 'criminalInquiry', label: 'استعلام جنایت' }, { key: 'sanctionsCheck', label: 'تطبیق تعزیرات' }] },
  { id: 'articles', title: 'اساسنامه معیاری شرکت صرافی و خدمات پولی', category: 'اسناد شرکت', fields: [...companyFields, { key: 'articlesDate', label: 'تاریخ اساسنامه' }, { key: 'legalBasis', label: 'مبنی و شخصیت حقوقی', type: 'textarea' }, { key: 'purpose', label: 'هدف شرکت', type: 'textarea' }, { key: 'organization', label: 'تشکیلات شرکت', type: 'textarea' }, { key: 'shareCapital', label: 'سهام و سرمایه', type: 'textarea' }, { key: 'financialYear', label: 'سال مالی' }, { key: 'financialRules', label: 'احکام مالی و حسابداری', type: 'textarea' }, { key: 'miscRules', label: 'احکام متفرقه', type: 'textarea' }] },
  { id: 'agency-establishment', title: 'فورم ایجاد نمایندگی و معرفی نماینده باصلاحیت', category: 'نمایندگی', fields: [...companyFields, { key: 'agencyNo', label: 'شماره نمایندگی' }, { key: 'agencyLocation', label: 'موقعیت نمایندگی' }, { key: 'agencyRepresentative', label: 'نماینده باصلاحیت', required: true }, { key: 'representativeFather', label: 'ولد' }, { key: 'representativeIdentityNo', label: 'نمبر تذکره' }, { key: 'representativeEducation', label: 'تحصیلات' }, { key: 'agencyAddress', label: 'آدرس نمایندگی', type: 'textarea' }] },
  { id: 'agency-renewal', title: 'فورم شماره (۲) — تمدید جواز نمایندگی', category: 'تمدید نمایندگی', fields: [{ key: 'companyName', label: 'نام شرکت', required: true }, { key: 'licenseNo', label: 'شماره جواز' }, { key: 'headOffice', label: 'موقعیت دفتر مرکزی' }, { key: 'agencyNo', label: 'شماره نمایندگی' }, { key: 'agencyLocation', label: 'ولایت / محل فعالیت' }, { key: 'agencyMarket', label: 'مارکیت' }, { key: 'agencyShopNo', label: 'دکان و منزل' }, { key: 'agencyRepresentative', label: 'شهرت نماینده باصلاحیت', required: true }, { key: 'representativeFather', label: 'ولد' }, { key: 'representativeIdentityNo', label: 'نمبر تذکره' }, { key: 'representativePhone', label: 'شماره تماس نماینده' }, { key: 'representativeEducation', label: 'سطح تحصیلات' }, { key: 'boardCertification', label: 'تصدیق هیئت نظار', type: 'textarea' }, { key: 'undertakings', label: 'تعهدات سهمدار', type: 'textarea' }, { key: 'employeeList', label: 'لیست کارمندان نمایندگی', type: 'textarea' }] },
  { id: 'shareholder-guarantee', title: 'تعهدنامه و تضمین‌خط سهمداران شرکت صرافی و خدمات پولی', category: 'تضمین', fields: [{ key: 'guarantor1', label: 'شهرت تضمین‌کننده اول', type: 'textarea' }, { key: 'guarantor2', label: 'شهرت تضمین‌کننده دوم', type: 'textarea' }, { key: 'guarantor3', label: 'شهرت تضمین‌کننده سوم', type: 'textarea' }, { key: 'guarantorBusiness', label: 'مشخصات شرکت تضمین‌کننده', type: 'textarea' }, { key: 'guaranteedShareholder', label: 'سهمدار تضمین‌شونده', required: true }, { key: 'guaranteeUndertakings', label: 'تعهدات تضمین‌کنندگان', type: 'textarea' }, { key: 'guaranteeDate', label: 'تاریخ' }] },
  { id: 'aml-cft-policy', title: 'پالیسی مبارزه علیه تطهیر پول و تمویل تروریزم', category: 'AML/CFT', fields: [...companyFields, { key: 'complianceOfficer', label: 'مسئول پیروی از قوانین', required: true }, { key: 'officerFatherName', label: 'ولد' }, { key: 'officerIdentityNo', label: 'تذکره' }, { key: 'officerEducation', label: 'تحصیلات' }, { key: 'policyStatement', label: 'متن پالیسی', type: 'textarea' }, { key: 'riskAssessment', label: 'ارزیابی خطر', type: 'textarea' }, { key: 'monitoring', label: 'نظارت و راپوردهی', type: 'textarea' }] },
  { id: 'agency-change', title: 'فورم تغییرات نمایندگی', category: 'تغییرات', fields: [...companyFields, { key: 'agencyName', label: 'نام نمایندگی' }, { key: 'changeType', label: 'نوع تغییر', required: true }, { key: 'oldRepresentative', label: 'نماینده قبلی' }, { key: 'newRepresentative', label: 'نماینده جدید' }, { key: 'reason', label: 'دلیل تغییر', type: 'textarea' }] },
  { id: 'ownership-transfer', title: 'فورم انتقال مالکیت / سهام', category: 'تغییرات', fields: [...companyFields, { key: 'oldOwner', label: 'سهمدار انتقال‌دهنده', required: true }, { key: 'newOwner', label: 'سهمدار انتقال‌گیرنده', required: true }, { key: 'transferPercent', label: 'فیصدی انتقال', type: 'number' }, { key: 'transferDate', label: 'تاریخ انتقال' }, { key: 'approvalReference', label: 'شماره صورت‌جلسه / مرجع' }] },
  { id: 'name-change', title: 'فورم تغییر نام شرکت', category: 'تغییرات', fields: [...companyFields, { key: 'oldName', label: 'نام قبلی', required: true }, { key: 'newName', label: 'نام جدید', required: true }, { key: 'changeDate', label: 'تاریخ تغییر' }, { key: 'approvalReference', label: 'مرجع / شماره تأیید' }, { key: 'reason', label: 'دلیل تغییر', type: 'textarea' }] },
  { id: 'location-change', title: 'فورم تغییر موقعیت شرکت', category: 'تغییرات', fields: [...companyFields, { key: 'oldAddress', label: 'موقعیت قبلی', type: 'textarea', required: true }, { key: 'newAddress', label: 'موقعیت جدید', type: 'textarea', required: true }, { key: 'changeDate', label: 'تاریخ تغییر' }, { key: 'siteInspection', label: 'نتیجه بازدید ساحه', type: 'textarea' }] },
  { id: 'license-suspension', title: 'فورم تعلیق جواز شرکت', category: 'وضعیت جواز', fields: [...companyFields, { key: 'suspensionDate', label: 'تاریخ تعلیق' }, { key: 'reason', label: 'دلیل تعلیق', type: 'textarea' }, { key: 'authority', label: 'مرجع صادرکننده' }] },
  { id: 'agency-suspension', title: 'فورم تعلیق جواز نمایندگی', category: 'وضعیت نمایندگی', fields: [...companyFields, { key: 'agencyName', label: 'نام نمایندگی', required: true }, { key: 'suspensionDate', label: 'تاریخ تعلیق' }, { key: 'reason', label: 'دلیل تعلیق', type: 'textarea' }, { key: 'authority', label: 'مرجع صادرکننده' }] },
  { id: 'license-closure', title: 'فورم ترک پیشه جواز فعالیت شرکت', category: 'ترک پیشه', fields: [...companyFields, { key: 'closureDate', label: 'تاریخ ترک پیشه' }, { key: 'reason', label: 'دلیل ترک پیشه', type: 'textarea' }, { key: 'settlement', label: 'تصفیه حساب و اسناد', type: 'textarea' }] },
  { id: 'agency-closure', title: 'فورم ترک پیشه اجازه‌نامه نمایندگی', category: 'ترک پیشه', fields: [...companyFields, { key: 'agencyName', label: 'نام نمایندگی', required: true }, { key: 'permitNo', label: 'شماره اجازه‌نامه' }, { key: 'closureDate', label: 'تاریخ ترک پیشه' }, { key: 'reason', label: 'دلیل ترک پیشه', type: 'textarea' }] },
  { id: 'agency-closure-permit', title: 'فورم مستقل ترک پیشه اجازه‌نامه نمایندگی', category: 'ترک پیشه', fields: [...companyFields, { key: 'agencyName', label: 'نام نمایندگی', required: true }, { key: 'permitNo', label: 'شماره اجازه‌نامه' }, { key: 'closureDate', label: 'تاریخ ترک پیشه' }, { key: 'statement', label: 'تعهد و توضیحات', type: 'textarea' }] },
  { id: 'commencement-letter', title: 'مکتوب رسمی آغاز فعالیت', category: 'فعالیت', fields: [...companyFields, { key: 'commencementDate', label: 'تاریخ آغاز فعالیت' }, { key: 'authorizedPerson', label: 'شخص مجاز' }, { key: 'letterReference', label: 'شماره مکتوب' }, { key: 'notes', label: 'توضیحات', type: 'textarea' }] },
];

const masterValues: Values = {
  companyName: profile.legalName, formerName: profile.formerName, englishName: profile.englishName, licenseNo: profile.licenseNo,
  province: profile.province, district: profile.district, neighborhood: profile.neighborhood, market: profile.market, floor: profile.floor, shopNo: profile.shopNo,
  address: profile.address, phone: profile.phone, email: profile.email, licenseExpiryDate: profile.licenseExpiryDate,
  branches: profile.branches.map((b) => `${b.no}. ${b.location} — ${b.representative}`).join('\n'),
  shareholders: profile.shareholders.map((s) => `${s.name} ولد ${s.fatherName} — ${s.sharePercent}% — سرمایه ${s.capital} افغانی — تذکره ${s.identityNo}`).join('\n'),
  capital: String(profile.shareholders[0].capital),
  oldOwner: profile.formerShareholders[0].name, newOwner: profile.shareholders[0].name, transferPercent: '100',
  oldName: profile.formerName, newName: profile.legalName, approvalReference: profile.meetingNo,
  agencyNo: profile.branches[0].no, agencyLocation: profile.branches[0].location, agencyMarket: profile.branches[0].market, agencyShopNo: profile.branches[0].shopNo,
  agencyRepresentative: profile.branches[0].representative, representativeFather: profile.branches[0].representativeFather, representativeIdentityNo: profile.branches[0].identityNo,
  representativePhone: profile.branches[0].phone, representativeEducation: profile.branches[0].education, headOffice: profile.address,
  complianceOfficer: profile.complianceOfficer.name, officerFatherName: profile.complianceOfficer.fatherName, officerIdentityNo: profile.complianceOfficer.identityNo, officerEducation: profile.complianceOfficer.education,
  guarantor1: 'اسم: ولی محمد حبیبی ذاخیل\nولد: وحید الله\nولدیت: شرکت صرافی و خدمات پولی ولی محمد ذاخیل\nتذکره: 1402-0900-08912\nتماس: 0744761943\nسکونت: کندز، مرکز، مرکز کندز، مرکز',
  guarantor2: 'اسم: عبدالقادر\nولایت: کندز\nولسوالی: مرکز\nناحیه: مرکز',
  guarantor3: '',
  guarantorBusiness: `اسم تشبث: ${profile.guarantorBusiness.name}\nنوع فعالیت: ${profile.guarantorBusiness.type}\nنمبر جواز: ${profile.guarantorBusiness.licenseNo}\nتماس: ${profile.guarantorBusiness.phone}\nتاریخ اعتبار: ${profile.guarantorBusiness.expiryDate}\nاداره صادر کننده: ${profile.guarantorBusiness.issuer}\nآدرس: ${profile.guarantorBusiness.address}`,
  guaranteedShareholder: profile.shareholders[0].name, guaranteeDate: '2026-08-09',
  boardCertification: `بسم‌الله شیرزی، رئیس هیئت نظار، اهلیت و شهرت نماینده معرفی‌شده را تصدیق می‌نماید.`,
  employeeList: profile.branches[0].staff.map((s) => `${s.name} ولد ${s.fatherName} — ${s.education} — TIN ${s.tin || '-'}`).join('\n'),
};

function initialValues(form: FormDef): Values {
  return Object.fromEntries(form.fields.map((field) => [field.key, masterValues[field.key] ?? '']));
}

export default function DabAllFormsOperationalWorkspace({ companyId }: { companyId: string }) {
  const [activeId, setActiveId] = useState('license-renewal');
  const [values, setValues] = useState<Record<string, Values>>(() => Object.fromEntries(forms.map((form) => [form.id, initialValues(form)])));
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [logo, setLogo] = useState('');
  const active = forms.find((form) => form.id === activeId) ?? forms[0];
  const current = values[active.id] ?? initialValues(active);
  const filtered = useMemo(() => { const q = search.trim().toLocaleLowerCase(); return q ? forms.filter((form) => `${form.title} ${form.category}`.toLocaleLowerCase().includes(q)) : forms; }, [search]);
  const update = (key: string, value: string) => setValues((state) => ({ ...state, [active.id]: { ...(state[active.id] ?? initialValues(active)), [key]: value } }));
  const saveAll = async () => {
    setBusy(true);
    try {
      await Promise.all(forms.map((form) => setDoc(doc(db, `companies/${companyId}/dabOfficialForms/${form.id}`), { formId: form.id, title: form.title, category: form.category, company: profile.legalName, values: values[form.id] ?? initialValues(form), logo, source: 'barakatullah-ghafouri-master-profile', updatedAt: new Date().toISOString() }, { merge: true })));
      setStatus('تمام ۱۸ فورم با اطلاعات شرکت ذخیره شد.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'ذخیره ناموفق بود.'); }
    finally { setBusy(false); }
  };
  const loadAll = async () => {
    setBusy(true);
    try {
      const next: Record<string, Values> = {};
      for (const form of forms) {
        const snap = await getDoc(doc(db, `companies/${companyId}/dabOfficialForms/${form.id}`));
        next[form.id] = snap.exists() ? { ...initialValues(form), ...((snap.data().values as Values) ?? {}) } : initialValues(form);
        if (!logo && snap.exists() && typeof snap.data().logo === 'string') setLogo(snap.data().logo);
      }
      setValues(next); setStatus('تمام فورم‌ها خوانده شد.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'خواندن ناموفق بود.'); }
    finally { setBusy(false); }
  };
  const uploadLogo = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setStatus('فقط فایل تصویر برای لوگو مجاز است.');
    if (file.size > 900 * 1024) return setStatus('حجم لوگو باید کمتر از 900KB باشد.');
    const reader = new FileReader(); reader.onload = () => setLogo(String(reader.result)); reader.readAsDataURL(file);
  };
  const completion = (form: FormDef) => { const required = form.fields.filter((field) => field.required); if (!required.length) return 100; const data = values[form.id] ?? initialValues(form); return Math.round(required.filter((field) => Boolean(data[field.key]?.trim())).length * 100 / required.length); };
  const exportCase = () => {
    const payload = { company: profile, logo, meeting: { number: profile.meetingNo, date: profile.meetingDate, time: profile.meetingTime, place: profile.meetingPlace, resolutions: profile.resolutions, agenda: profile.agenda }, forms: forms.map((form) => ({ id: form.id, title: form.title, category: form.category, values: values[form.id] ?? initialValues(form) })) };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'barakatullah-ghafouri-dab-case.json'; anchor.click(); URL.revokeObjectURL(url);
  };

  return <main dir="rtl" className="min-h-screen bg-slate-50 p-4 print:bg-white">
    <section className="mx-auto max-w-7xl space-y-4">
      <header className="rounded-2xl bg-white p-5 shadow-sm print:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {logo ? <img src={logo} alt="لوگوی شرکت" className="h-20 w-20 rounded-xl object-contain ring-1 ring-slate-200" /> : <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-xs text-slate-500">لوگو</div>}
            <div><p className="text-sm text-slate-500">د افغانستان بانک — آمریت عمومی نظارت از مؤسسات مالی غیر بانکی</p><h1 className="text-2xl font-bold">{profile.legalName}</h1><p className="text-sm text-slate-600">جواز {profile.licenseNo} — {profile.address}</p></div>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <label className="cursor-pointer rounded-lg border bg-white px-3 py-2 text-sm">آپلود لوگو<input className="hidden" type="file" accept="image/*" onChange={(event) => uploadLogo(event.target.files?.[0])} /></label>
            <button onClick={loadAll} disabled={busy} className="rounded-lg border px-3 py-2 text-sm">خواندن</button>
            <button onClick={saveAll} disabled={busy} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">{busy ? 'در حال اجرا...' : 'ذخیره تمام ۱۸ فورم'}</button>
            <button onClick={exportCase} className="rounded-lg border px-3 py-2 text-sm">خروجی پرونده</button>
            <button onClick={() => window.print()} className="rounded-lg border px-3 py-2 text-sm">چاپ فورم</button>
          </div>
        </div>
        {status && <p className="mt-4 rounded-lg bg-slate-100 p-3 text-sm">{status}</p>}
      </header>
      <div className="grid gap-4 lg:grid-cols-[330px_1fr]">
        <aside className="rounded-2xl bg-white p-3 shadow-sm print:hidden">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جستجوی فورم..." className="mb-3 w-full rounded-lg border px-3 py-2 text-sm" />
          {filtered.map((form, index) => <button key={form.id} onClick={() => setActiveId(form.id)} className={`mb-1 w-full rounded-lg p-3 text-right ${active.id === form.id ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}><div className="flex justify-between gap-2"><span className="text-sm font-medium">{index + 1}. {form.title}</span><span className="text-xs">{completion(form)}%</span></div><div className="mt-1 text-xs opacity-70">{form.category}</div></button>)}
        </aside>
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-5 border-b pb-4"><h2 className="text-xl font-bold">{active.title}</h2><p className="mt-1 text-sm text-slate-500">{active.category} — تمام فیلدها قابل ویرایش است.</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            {active.fields.map((field) => <label key={`${active.id}-${field.key}`} className={field.type === 'textarea' ? 'md:col-span-2' : ''}><span className="mb-1 block text-sm font-medium">{field.label}{field.required ? ' *' : ''}</span>{field.type === 'textarea' ? <textarea value={current[field.key] ?? ''} onChange={(event) => update(field.key, event.target.value)} rows={5} className="w-full rounded-lg border px-3 py-2 text-sm leading-6" /> : <input type={field.type === 'number' ? 'number' : 'text'} value={current[field.key] ?? ''} onChange={(event) => update(field.key, event.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />}</label>)}
          </div>
          <div className="mt-6 flex gap-2 print:hidden"><button onClick={async () => { setBusy(true); try { await setDoc(doc(db, `companies/${companyId}/dabOfficialForms/${active.id}`), { formId: active.id, title: active.title, category: active.category, company: profile.legalName, values: current, logo, updatedAt: new Date().toISOString() }, { merge: true }); setStatus('فورم فعال ذخیره شد.'); } finally { setBusy(false); } }} disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-white">ذخیره فورم</button></div>
        </section>
      </div>
    </section>
  </main>;
}
