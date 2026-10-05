'use client';

import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, setDoc } from '@/lib/firestoreCompat';
import { db } from '@/lib/firebaseCompat';
import { barakatullahGhafouriProfile as profile } from '@/lib/barakatullahGhafouriProfile';
import { DAB_OFFICIAL_FORMS, type DabOfficialFormDefinition } from '@/lib/dabOfficialFormRegistry';
import { getDabOfficialFormPrefill } from '@/lib/dabOfficialFormPrefill';

type FieldType = 'text' | 'date' | 'number' | 'textarea';
type Field = { key: string; label: string; type?: FieldType; required?: boolean };
type Values = Record<string, string>;
type HeaderValues = {
  bank: string;
  department: string;
  directorate: string;
  companyName: string;
  licenseNo: string;
  province: string;
  address: string;
  logoUrl: string;
};

type SavedForm = {
  values?: Values;
  header?: Partial<HeaderValues>;
  status?: string;
};

const defaultDabHeader: HeaderValues = {
  bank: 'د افغانستان بانک',
  department: 'آمریت عمومی نظارت از مؤسسات مالی غیر بانکی',
  directorate: 'مدیریت جوازدهی',
  companyName: profile.legalName,
  licenseNo: profile.licenseNo,
  province: profile.province,
  address: profile.address,
  logoUrl: '',
};

const defaultCompanyHeader: HeaderValues = {
  bank: '',
  department: '',
  directorate: '',
  companyName: profile.legalName,
  licenseNo: profile.licenseNo,
  province: profile.province,
  address: profile.address,
  logoUrl: '',
};

function isCompanyIssuedForm(form: DabOfficialFormDefinition): boolean {
  return form.category === 'company' || form.category === 'supporting-documents';
}

function getDefaultHeader(form: DabOfficialFormDefinition): HeaderValues {
  return isCompanyIssuedForm(form) ? defaultCompanyHeader : defaultDabHeader;
}

function mergeHeader(form: DabOfficialFormDefinition, saved?: Partial<HeaderValues>): HeaderValues {
  const base = getDefaultHeader(form);
  const merged = { ...base, ...(saved ?? {}) };
  if (isCompanyIssuedForm(form)) {
    merged.bank = '';
    merged.department = '';
    merged.directorate = '';
  }
  return merged;
}

const companyFields: Field[] = [
  { key: 'companyName', label: 'نام رسمی شرکت', required: true },
  { key: 'licenseNo', label: 'شماره جواز', required: true },
  { key: 'province', label: 'ولایت' },
  { key: 'district', label: 'ولسوالی / ناحیه' },
  { key: 'address', label: 'آدرس مکمل', type: 'textarea' },
  { key: 'phone', label: 'شماره تماس' },
  { key: 'email', label: 'آدرس برقی' },
];

const personFields: Field[] = [
  { key: 'fullName', label: 'نام و تخلص', required: true },
  { key: 'fatherName', label: 'نام پدر', required: true },
  { key: 'identityNo', label: 'شماره تذکره' },
  { key: 'education', label: 'سویه تحصیلی' },
  { key: 'field', label: 'رشته تحصیلی' },
  { key: 'phone', label: 'شماره تماس' },
  { key: 'address', label: 'آدرس', type: 'textarea' },
];

const agencyFields: Field[] = [
  { key: 'agencyName', label: 'نام نمایندگی', required: true },
  { key: 'agencyNo', label: 'شماره نمایندگی' },
  { key: 'agencyLocation', label: 'موقعیت نمایندگی' },
  { key: 'agencyAddress', label: 'آدرس نمایندگی', type: 'textarea' },
  { key: 'representativeFullName', label: 'نام نماینده باصلاحیت', required: true },
  { key: 'representativeFatherName', label: 'نام پدر نماینده' },
  { key: 'representativeIdentityNo', label: 'شماره تذکره نماینده' },
  { key: 'representativeEducation', label: 'سویه تحصیلی نماینده' },
  { key: 'representativePhone', label: 'شماره تماس نماینده' },
];

const fieldsByForm: Record<string, Field[]> = {
  'license-application': [...companyFields, { key: 'capital', label: 'سرمایه' }, { key: 'shareholders', label: 'مشخصات سهمداران', type: 'textarea' }, { key: 'businessScope', label: 'نوع و ساحه فعالیت', type: 'textarea' }, { key: 'representative', label: 'نماینده باصلاحیت' }],
  'license-renewal': [...companyFields, { key: 'expiryDate', label: 'تاریخ ختم جواز', type: 'date' }, { key: 'renewalDate', label: 'تاریخ درخواست تمدید', type: 'date' }, { key: 'authorizedName', label: 'شخص مجاز' }, { key: 'shareholders', label: 'مشخصات سهمدار / سهمداران', type: 'textarea' }, { key: 'branches', label: 'تمام نمایندگی‌ها', type: 'textarea' }, { key: 'bankAccounts', label: 'حسابات بانکی', type: 'textarea' }, { key: 'requestedChanges', label: 'تغییرات مطالبه‌شده', type: 'textarea' }, { key: 'activityLastYear', label: 'فعالیت از سال گذشته تا اکنون', type: 'textarea' }, { key: 'legalClaims', label: 'دعوی حقوقی / قضایی', type: 'textarea' }],
  'shareholder-employee-profile': [...personFields, { key: 'position', label: 'موقف در شرکت', required: true }, { key: 'sharePercent', label: 'فیصدی سهم', type: 'number' }, { key: 'tin', label: 'شماره تشخیصیه مالیاتی' }, { key: 'criminalInquiry', label: 'استعلام جنایت' }, { key: 'sanctionsCheck', label: 'تطبیق تعزیرات' }],
  articles: [...companyFields, { key: 'articlesDate', label: 'تاریخ اساسنامه', type: 'date' }, { key: 'legalBasis', label: 'مبنی و شخصیت حقوقی', type: 'textarea' }, { key: 'companyPurpose', label: 'هدف و ساحه فعالیت', type: 'textarea' }, { key: 'shareStructure', label: 'ساختار سهام و سرمایه', type: 'textarea' }, { key: 'management', label: 'تشکیلات و مدیریت', type: 'textarea' }, { key: 'financialRules', label: 'احکام مالی و حسابداری', type: 'textarea' }],
  'agency-establishment': [...companyFields, ...agencyFields],
  'agency-renewal': [...companyFields, ...agencyFields, { key: 'boardCertification', label: 'تصدیق هیئت نظار', type: 'textarea' }, { key: 'employeeList', label: 'لیست کارمندان نمایندگی', type: 'textarea' }],
  'agency-change': [...companyFields, ...agencyFields, { key: 'changeType', label: 'نوع تغییر', required: true }, { key: 'reason', label: 'دلیل تغییر', type: 'textarea' }],
  'agency-suspension': [...companyFields, ...agencyFields, { key: 'suspensionDate', label: 'تاریخ تعلیق', type: 'date' }, { key: 'reason', label: 'دلیل تعلیق', type: 'textarea' }],
  'agency-closure': [...companyFields, ...agencyFields, { key: 'closureDate', label: 'تاریخ ترک پیشه', type: 'date' }, { key: 'reason', label: 'دلیل ترک پیشه', type: 'textarea' }],
  'agency-closure-permit': [...companyFields, ...agencyFields, { key: 'permitNo', label: 'شماره اجازه‌نامه' }, { key: 'closureDate', label: 'تاریخ ترک پیشه', type: 'date' }, { key: 'statement', label: 'تعهد و توضیحات', type: 'textarea' }],
  'shareholder-guarantee': [...companyFields, { key: 'shareholderFullName', label: 'نام سهمدار', required: true }, { key: 'shareholderFatherName', label: 'نام پدر سهمدار' }, { key: 'shareholderIdentityNo', label: 'شماره تذکره سهمدار' }, { key: 'guarantorFullName', label: 'نام تضمین‌کننده' }, { key: 'guarantorFatherName', label: 'نام پدر تضمین‌کننده' }, { key: 'guarantorIdentityNo', label: 'شماره تذکره تضمین‌کننده' }, { key: 'guaranteeAmount', label: 'مبلغ ضمانت', type: 'number' }, { key: 'guaranteeUndertakings', label: 'تعهدات تضمین‌کننده', type: 'textarea' }],
  'aml-cft-policy': [...companyFields, { key: 'complianceOfficer', label: 'مسئول پیروی از قوانین و مقررات', required: true }, { key: 'officerFatherName', label: 'نام پدر مسئول' }, { key: 'officerIdentityNo', label: 'شماره تذکره مسئول' }, { key: 'officerEducation', label: 'سویه تحصیلی مسئول' }, { key: 'policyStatement', label: 'متن پالیسی', type: 'textarea' }, { key: 'riskAssessment', label: 'ارزیابی خطر', type: 'textarea' }, { key: 'monitoring', label: 'نظارت و راپوردهی', type: 'textarea' }],
  'ownership-transfer': [...companyFields, { key: 'transferor', label: 'سهمدار انتقال‌دهنده', required: true }, { key: 'transferee', label: 'سهمدار انتقال‌گیرنده', required: true }, { key: 'sharePercent', label: 'فیصدی انتقال', type: 'number' }, { key: 'transferDate', label: 'تاریخ انتقال', type: 'date' }, { key: 'approvalReference', label: 'شماره صورت‌جلسه / مرجع' }],
  'name-change': [...companyFields, { key: 'oldName', label: 'نام قبلی', required: true }, { key: 'newName', label: 'نام جدید', required: true }, { key: 'changeDate', label: 'تاریخ تغییر', type: 'date' }, { key: 'approvalReference', label: 'مرجع / شماره تأیید' }, { key: 'reason', label: 'دلیل تغییر', type: 'textarea' }],
  'location-change': [...companyFields, { key: 'oldLocation', label: 'موقعیت قبلی', type: 'textarea', required: true }, { key: 'newLocation', label: 'موقعیت جدید', type: 'textarea', required: true }, { key: 'changeDate', label: 'تاریخ تغییر', type: 'date' }, { key: 'siteInspection', label: 'نتیجه بازدید ساحه', type: 'textarea' }],
  'license-suspension': [...companyFields, { key: 'suspensionDate', label: 'تاریخ تعلیق', type: 'date' }, { key: 'reason', label: 'دلیل تعلیق', type: 'textarea' }, { key: 'authority', label: 'مرجع صادرکننده' }],
  'license-closure': [...companyFields, { key: 'closureDate', label: 'تاریخ ترک پیشه', type: 'date' }, { key: 'reason', label: 'دلیل ترک پیشه', type: 'textarea' }, { key: 'settlement', label: 'تصفیه حساب و اسناد', type: 'textarea' }],
  'commencement-letter': [...companyFields, { key: 'approvedLicenseNo', label: 'شماره جواز تأییدشده' }, { key: 'authorizedPerson', label: 'شخص مجاز' }, { key: 'operatingAddress', label: 'آدرس محل فعالیت', type: 'textarea' }, { key: 'commencementDate', label: 'تاریخ آغاز فعالیت', type: 'date' }],
  'organization-chart': [...companyFields, { key: 'details', label: 'جزئیات چارت تشکیلاتی', type: 'textarea' }],
  'employee-signature-samples': [...companyFields, { key: 'details', label: 'مشخصات کارکنان و نمونه امضا', type: 'textarea' }],
  'employee-introduction-letter': [...companyFields, { key: 'details', label: 'مشخصات کارکنان معرفی‌شده', type: 'textarea' }],
  'hr-policy': [...companyFields, { key: 'policyStatement', label: 'متن پالیسی منابع بشری', type: 'textarea' }],
};

const categoryNames: Record<string, string> = {
  licensing: 'جوازدهی', company: 'اسناد شرکت', representative: 'نمایندگی', renewal: 'تمدید', compliance: 'رعایت قوانین و مقررات', change: 'تغییرات', suspension: 'تعلیق', closure: 'ترک پیشه', commencement: 'آغاز فعالیت', exchange: 'صرافی', 'money-services': 'خدمات پولی', 'supporting-documents': 'اسناد حمایوی',
};

function getFields(form: DabOfficialFormDefinition): Field[] {
  return fieldsByForm[form.id] ?? [...companyFields, { key: 'applicantName', label: 'نام درخواست‌کننده' }, { key: 'applicationDate', label: 'تاریخ درخواست', type: 'date' }, { key: 'details', label: 'جزئیات و معلومات لازم', type: 'textarea' }, { key: 'supportingDocuments', label: 'اسناد حمایوی', type: 'textarea' }];
}

function initialValues(form: DabOfficialFormDefinition): Values {
  return { ...Object.fromEntries(getFields(form).map(field => [field.key, ''])), ...getDabOfficialFormPrefill(form) };
}

function Header({ form, header, editing, onEdit, onChange }: { form: DabOfficialFormDefinition; header: HeaderValues; editing: boolean; onEdit: () => void; onChange: (key: keyof HeaderValues, value: string) => void }) {
  const companyIssued = isCompanyIssuedForm(form);
  return (
    <header className="break-inside-avoid border-2 border-slate-800 bg-white px-6 py-5 text-center print:border-x-0 print:border-t-0 print:overflow-visible">
      {header.logoUrl ? <img src={header.logoUrl} alt="لوگوی شرکت" className="mx-auto mb-3 h-16 w-16 object-contain print:break-inside-avoid" /> : null}
      {editing ? (
        <div className="mx-auto mb-4 grid max-w-5xl gap-3 text-right print:hidden md:grid-cols-2">
          <label className="text-sm">نام نهاد صادرکننده<input value={header.bank} onChange={e => onChange('bank', e.target.value)} className="mt-1 w-full border p-2" /></label>
          <label className="text-sm">آمریت<input value={header.department} onChange={e => onChange('department', e.target.value)} className="mt-1 w-full border p-2" /></label>
          <label className="text-sm">مدیریت<input value={header.directorate} onChange={e => onChange('directorate', e.target.value)} className="mt-1 w-full border p-2" /></label>
          <label className="text-sm">نام شرکت<input value={header.companyName} onChange={e => onChange('companyName', e.target.value)} className="mt-1 w-full border p-2" /></label>
          <label className="text-sm">شماره جواز<input value={header.licenseNo} onChange={e => onChange('licenseNo', e.target.value)} className="mt-1 w-full border p-2" /></label>
          <label className="text-sm">ولایت<input value={header.province} onChange={e => onChange('province', e.target.value)} className="mt-1 w-full border p-2" /></label>
          <label className="text-sm md:col-span-2">آدرس<input value={header.address} onChange={e => onChange('address', e.target.value)} className="mt-1 w-full border p-2" /></label>
          <label className="text-sm md:col-span-2">نشانی لوگو<input value={header.logoUrl} onChange={e => onChange('logoUrl', e.target.value)} className="mt-1 w-full border p-2" dir="ltr" /></label>
        </div>
      ) : null}
      {companyIssued ? (
        <p className="text-lg font-bold leading-8">{header.companyName}</p>
      ) : (
        <>
          <p className="text-base font-bold">{header.bank}</p>
          <p className="mt-1 text-sm font-semibold">{header.department}</p>
          <p className="text-sm">{header.directorate}</p>
        </>
      )}
      <div className="mx-auto mt-4 max-w-4xl border-t border-slate-300 pt-4">
        <h1 className="text-xl font-bold leading-8">{form.title}</h1>
        <p className="mt-1 text-sm text-slate-600">دسته‌بندی: {categoryNames[form.category] ?? 'اسناد رسمی'}</p>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 border-t pt-3 text-sm print:break-inside-avoid md:grid-cols-4">
        <div>نام شرکت: <strong>{header.companyName}</strong></div>
        <div>شماره جواز: <strong>{header.licenseNo}</strong></div>
        <div>ولایت: <strong>{header.province}</strong></div>
        <div>آدرس: <strong>{header.address}</strong></div>
      </div>
      <div className="mt-4 flex justify-center print:hidden">
        <button type="button" onClick={onEdit} className="border px-4 py-2 text-sm font-semibold">{editing ? 'پایان ویرایش سربرگ' : 'ویرایش سربرگ'}</button>
      </div>
    </header>
  );
}

export default function DabUnifiedOfficialFormsWorkspace({ companyId = 'default' }: { companyId?: string; [key: string]: unknown }) {
  const [active, setActive] = useState(DAB_OFFICIAL_FORMS[0]?.id ?? 'license-application');
  const [valuesByForm, setValuesByForm] = useState<Record<string, Values>>({});
  const [headersByForm, setHeadersByForm] = useState<Record<string, HeaderValues>>({});
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingHeader, setEditingHeader] = useState(false);

  const form = DAB_OFFICIAL_FORMS.find(item => item.id === active) ?? DAB_OFFICIAL_FORMS[0];
  const values = form ? valuesByForm[form.id] ?? initialValues(form) : {};
  const header = form ? headersByForm[form.id] ?? getDefaultHeader(form) : defaultDabHeader;
  const fields = form ? getFields(form) : [];
  const filteredForms = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return term ? DAB_OFFICIAL_FORMS.filter(item => `${item.title} ${categoryNames[item.category] ?? ''}`.toLocaleLowerCase().includes(term)) : DAB_OFFICIAL_FORMS;
  }, [query]);

  useEffect(() => {
    if (!form) return;
    let cancelled = false;
    setLoading(true);
    const load = async () => {
      try {
        const snapshot = await getDoc(doc(db, `companies/${companyId}/dabOfficialForms/${form.id}`));
        if (cancelled) return;
        const saved = snapshot.exists() ? (snapshot.data() as SavedForm) : {};
        const loadedValues = { ...initialValues(form), ...(saved.values ?? {}) };
        if (form.id === 'aml-cft-policy' && !loadedValues.complianceOfficer) {
          loadedValues.complianceOfficer = 'عبدالعزیز مهرزاد';
          loadedValues.officerFatherName = 'عبدالخلیل';
          loadedValues.officerIdentityNo = '72198-0300-1401';
        }
        setValuesByForm(current => ({ ...current, [form.id]: loadedValues }));
        setHeadersByForm(current => ({ ...current, [form.id]: mergeHeader(form, saved.header) }));
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? `خواندن معلومات موفق نشد: ${error.message}` : 'خواندن معلومات موفق نشد.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [companyId, form]);

  if (!form) return null;

  const update = (key: string, value: string) => {
    setValuesByForm(current => ({ ...current, [form.id]: { ...(current[form.id] ?? initialValues(form)), [key]: value } }));
  };

  const updateHeader = (key: keyof HeaderValues, value: string) => {
    setHeadersByForm(current => ({ ...current, [form.id]: { ...(current[form.id] ?? getDefaultHeader(form)), [key]: value } }));
  };

  const selectForm = (id: string) => {
    setActive(id);
    setEditingHeader(false);
    setMessage('');
  };

  const save = async () => {
    const missing = fields.filter(field => field.required && !values[field.key]?.trim()).map(field => field.label);
    if (missing.length) {
      setMessage(`فیلدهای ضروری تکمیل نشده است: ${missing.slice(0, 5).join('، ')}${missing.length > 5 ? ' و موارد دیگر.' : '.'}`);
      return;
    }
    setBusy(true);
    try {
      await setDoc(doc(db, `companies/${companyId}/dabOfficialForms/${form.id}`), {
        formId: form.id,
        title: form.title,
        category: form.category,
        values,
        header,
        status: 'draft',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      setMessage('فورم و سربرگ با موفقیت ذخیره شد.');
    } catch (error) {
      setMessage(error instanceof Error ? `ذخیره ناموفق بود: ${error.message}` : 'ذخیره ناموفق بود.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-slate-100 p-4 md:p-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-4 lg:grid-cols-[300px_1fr] print:block">
          <aside className="border-2 border-slate-700 bg-white p-4 print:hidden">
            <h2 className="mb-3 text-lg font-bold">فورم‌های رسمی</h2>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="جستجوی فورم" className="mb-3 w-full border p-2 text-right" />
            <div className="max-h-[72vh] space-y-1 overflow-auto">
              {filteredForms.map(item => (
                <button key={item.id} type="button" onClick={() => selectForm(item.id)} className={`w-full border px-3 py-2 text-right text-sm ${item.id === form.id ? 'border-slate-900 bg-slate-100 font-bold' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <span className="block">{item.title}</span>
                  <span className="mt-1 block text-xs text-slate-500">{categoryNames[item.category] ?? 'اسناد رسمی'}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="overflow-hidden bg-white shadow-sm print:overflow-visible print:shadow-none">
            <Header form={form} header={header} editing={editingHeader} onEdit={() => setEditingHeader(value => !value)} onChange={updateHeader} />
            <div className="border-x-2 border-b-2 border-slate-800 p-5 print:border-x-0 print:p-8">
              {loading ? <div className="mb-4 border bg-slate-50 p-3 text-sm print:hidden">در حال خواندن معلومات ثبت‌شده...</div> : null}
              <div className="mb-5 grid gap-4 md:grid-cols-2">
                {fields.map(field => (
                  <label key={field.key} className={`break-inside-avoid ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}>
                    <span className="mb-1 block text-sm font-semibold">{field.label}{field.required ? ' *' : ''}</span>
                    {field.type === 'textarea' ? <textarea value={values[field.key] ?? ''} onChange={e => update(field.key, e.target.value)} rows={5} className="w-full border border-slate-400 p-2" /> : <input type={field.type ?? 'text'} value={values[field.key] ?? ''} onChange={e => update(field.key, e.target.value)} className="w-full border border-slate-400 p-2" />}
                  </label>
                ))}
              </div>



              <div className="mt-5 break-inside-avoid border-t pt-4 text-xs leading-6 text-slate-600">{form.printNotice}</div>

              <div className="mt-5 flex flex-wrap gap-2 print:hidden">
                <button type="button" disabled={busy || loading} onClick={save} className="border bg-slate-900 px-5 py-2 text-white disabled:opacity-50">{busy ? 'در حال ذخیره...' : 'ذخیره فورم و سربرگ'}</button>
                <button type="button" onClick={() => window.print()} className="border px-5 py-2">چاپ فورم</button>
              </div>
              {message ? <p className="mt-3 border p-2 text-sm print:hidden">{message}</p> : null}
            </div>
          </section>
        </div>
      </div>
      <style jsx global>{`
        @page { size: A4 portrait; margin: 12mm; }
        @media print {
          html, body { background: #fff !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
          h1, h2, h3, label { break-after: avoid; page-break-after: avoid; }
          input, textarea { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
    </main>
  );
}
