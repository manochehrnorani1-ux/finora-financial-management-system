'use client';

import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, setDoc } from '@/lib/firestoreCompat';
import { db } from '@/lib/firebaseCompat';
import DabOfficialCompanyRenewalForm from './DabOfficialCompanyRenewalForm';

type Tab = 'dashboard' | 'company' | 'people' | 'branches' | 'documents' | 'compliance' | 'workflow' | 'reports';

type Person = { id: string; name: string; father: string; role: string; idNo: string; share: string };
type Branch = { id: string; name: string; province: string; district: string; address: string; manager: string; phone: string };
type DocumentItem = { id: string; title: string; required: boolean; status: 'missing' | 'uploaded' | 'verified' | 'rejected'; fileName: string; notes: string };

type CaseData = {
  companyName: string;
  licenseNo: string;
  licenseType: string;
  issueDate: string;
  expiryDate: string;
  tin: string;
  province: string;
  district: string;
  address: string;
  phone: string;
  email: string;
  representative: string;
  shareholders: Person[];
  management: Person[];
  branches: Branch[];
  documents: DocumentItem[];
  compliance: Record<string, 'pending' | 'clear' | 'flagged'>;
  status: string;
  caseNumber: string;
  updatedAt: string;
};

const newId = () => Math.random().toString(36).slice(2, 10);
const initialDocuments: DocumentItem[] = [
  { id: 'license', title: 'اصل جواز فعلی', required: true, status: 'missing', fileName: '', notes: '' },
  { id: 'tax', title: 'تصفیه / عدم باقیداری مالیاتی', required: true, status: 'missing', fileName: '', notes: '' },
  { id: 'id', title: 'اسناد هویتی سهمداران و مسئولان', required: true, status: 'missing', fileName: '', notes: '' },
  { id: 'guarantee', title: 'اسناد تضمین / ضمانت', required: true, status: 'missing', fileName: '', notes: '' },
  { id: 'company', title: 'اسناد ثبتی و اساسنامه', required: true, status: 'missing', fileName: '', notes: '' },
  { id: 'changes', title: 'اسناد تغییرات عمده، در صورت موجودیت', required: false, status: 'missing', fileName: '', notes: '' },
  { id: 'clearance', title: 'تصدیق عدم مسئولیت جنایی، در صورت مطالبه', required: false, status: 'missing', fileName: '', notes: '' },
];

const initialCase = (): CaseData => ({
  companyName: '', licenseNo: '', licenseType: 'صرافی و خدمات پولی', issueDate: '', expiryDate: '', tin: '',
  province: '', district: '', address: '', phone: '', email: '', representative: '',
  shareholders: [{ id: newId(), name: '', father: '', role: 'سهمدار', idNo: '', share: '' }],
  management: [{ id: newId(), name: '', father: '', role: 'مسئول', idNo: '', share: '' }],
  branches: [], documents: initialDocuments, compliance: { kyc: 'pending', aml: 'pending', sanctions: 'pending', tax: 'pending', governance: 'pending' },
  status: 'draft', caseNumber: `DAB-${new Date().getFullYear()}-${newId().toUpperCase()}`, updatedAt: new Date().toISOString(),
});

const statuses = ['draft', 'documents_pending', 'internal_review', 'ready_for_submission', 'submitted', 'under_dab_review', 'additional_information_requested', 'approved', 'rejected', 'completed'];
const statusLabels: Record<string, string> = {
  draft: 'پیش‌نویس', documents_pending: 'اسناد ناقص', internal_review: 'بررسی داخلی', ready_for_submission: 'آماده ارسال',
  submitted: 'ارسال‌شده', under_dab_review: 'تحت بررسی DAB', additional_information_requested: 'معلومات اضافی', approved: 'تأییدشده', rejected: 'ردشده', completed: 'تکمیل‌شده'
};

export default function DabCompleteRenewalWorkspace({ companyId = 'default' }: { companyId?: string }) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [data, setData] = useState<CaseData>(initialCase);
  const [message, setMessage] = useState('');

  const path = `companies/${companyId}/dabRenewalCases/${data.caseNumber}`;
  useEffect(() => onSnapshot(doc(db, path), snap => { if (snap.exists()) setData(current => ({ ...current, ...(snap.data() as Partial<CaseData>) })); }), [companyId, data.caseNumber]);

  const requiredMissing = useMemo(() => data.documents.filter(x => x.required && x.status !== 'verified').length, [data.documents]);
  const compliancePending = Object.values(data.compliance).filter(x => x === 'pending').length;
  const peopleCount = data.shareholders.length + data.management.length;
  const completion = useMemo(() => {
    const checks = [data.companyName, data.licenseNo, data.tin, data.province, data.representative, data.shareholders.some(x => x.name), data.management.some(x => x.name), requiredMissing === 0, compliancePending === 0];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [data, requiredMissing, compliancePending]);

  const update = <K extends keyof CaseData>(key: K, value: CaseData[K]) => setData(current => ({ ...current, [key]: value, updatedAt: new Date().toISOString() }));
  const save = async () => { await setDoc(doc(db, path), { ...data, updatedAt: new Date().toISOString() }, { merge: true }); setMessage('معلومات پرونده ذخیره شد.'); window.setTimeout(() => setMessage(''), 2500); };

  const addPerson = (group: 'shareholders' | 'management') => update(group, [...data[group], { id: newId(), name: '', father: '', role: group === 'shareholders' ? 'سهمدار' : 'مسئول', idNo: '', share: '' }]);
  const addBranch = () => update('branches', [...data.branches, { id: newId(), name: '', province: '', district: '', address: '', manager: '', phone: '' }]);
  const setDocument = (id: string, patch: Partial<DocumentItem>) => update('documents', data.documents.map(x => x.id === id ? { ...x, ...patch } : x));
  const submit = async () => {
    if (requiredMissing > 0 || compliancePending > 0 || completion < 100) { setMessage('پرونده هنوز آماده ارسال نیست. اسناد و بررسی‌های باقی‌مانده را تکمیل کنید.'); return; }
    update('status', 'submitted'); await save();
  };

  const tabs: Array<[Tab, string]> = [
    ['dashboard', 'مرکز پرونده'], ['company', 'شرکت و جواز'], ['people', 'سهمداران و مسئولان'], ['branches', 'شعب و نمایندگی‌ها'],
    ['documents', 'اسناد'], ['compliance', 'Compliance'], ['workflow', 'گردش پرونده'], ['reports', 'گزارش و چاپ']
  ];
  const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100';
  const card = 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm';

  const field = (label: string, value: string, onChange: (v: string) => void, type = 'text') => <label className="space-y-1"><span className="block text-xs font-bold text-slate-600">{label}</span><input className={input} type={type} value={value} onChange={e => onChange(e.target.value)} /></label>;

  return <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div><div className="text-xs font-bold text-blue-700">DAB LICENSE MANAGEMENT</div><h1 className="text-xl font-black">مرکز جامع تمدید جواز صرافی و خدمات پولی</h1><p className="mt-1 text-xs text-slate-500">پرونده واحد، فورم، اسناد، Compliance، گردش کار و گزارش رسمی</p></div>
        <div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold">{data.caseNumber}</span><button onClick={save} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white">ذخیره</button></div>
      </div>
    </header>

    <div className="mx-auto max-w-7xl px-4 py-4">
      <nav className="flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm">{tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold ${tab === key ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{label}</button>)}</nav>
      {message && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</div>}

      {tab === 'dashboard' && <div className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['تکمیل پرونده', `${completion}%`], ['اسناد ناقص', String(requiredMissing)], ['بررسی‌های Compliance', `${5 - compliancePending}/5`], ['اشخاص ثبت‌شده', String(peopleCount)]].map(([a,b]) => <div className={card} key={a}><div className="text-xs font-bold text-slate-500">{a}</div><div className="mt-2 text-2xl font-black">{b}</div></div>)}</div>
        <div className={card}><div className="flex items-center justify-between"><div><h2 className="font-black">وضعیت پرونده</h2><p className="text-xs text-slate-500">{statusLabels[data.status] || data.status}</p></div><div className="text-3xl font-black text-blue-700">{completion}%</div></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-700" style={{ width: `${completion}%` }} /></div><div className="mt-4 grid gap-2 md:grid-cols-5">{['شرکت', 'اشخاص', 'اسناد', 'Compliance', 'ارسال'].map((x,i) => <div className="rounded-lg border p-3 text-center text-xs font-bold" key={x}>{i < Math.ceil(completion / 20) ? '✓' : '○'} {x}</div>)}</div></div>
        <div className="grid gap-4 lg:grid-cols-2"><div className={card}><h2 className="font-black">اقدامات سریع</h2><div className="mt-3 grid gap-2 sm:grid-cols-2"><button onClick={() => setTab('company')} className="rounded-lg border p-3 text-right text-sm font-bold">۱. تکمیل معلومات شرکت</button><button onClick={() => setTab('people')} className="rounded-lg border p-3 text-right text-sm font-bold">۲. ثبت سهمداران و مسئولان</button><button onClick={() => setTab('documents')} className="rounded-lg border p-3 text-right text-sm font-bold">۳. تکمیل اسناد</button><button onClick={() => setTab('compliance')} className="rounded-lg border p-3 text-right text-sm font-bold">۴. تکمیل Compliance</button></div></div><div className={card}><h2 className="font-black">مراحل پرونده</h2><div className="mt-3 space-y-2">{statuses.slice(0, 8).map(s => <div key={s} className={`flex items-center justify-between rounded-lg border p-2 text-xs font-bold ${s === data.status ? 'border-blue-300 bg-blue-50' : ''}`}><span>{statusLabels[s]}</span><span>{s === data.status ? 'مرحله فعلی' : ''}</span></div>)}</div></div></div>
      </div>}

      {tab === 'company' && <div className="mt-4 space-y-4"><div className={card}><h2 className="mb-4 text-lg font-black">معلومات اصلی شرکت و جواز</h2><div className="grid gap-3 md:grid-cols-3">
        {field('نام رسمی شرکت', data.companyName, v => update('companyName', v))}{field('شماره جواز', data.licenseNo, v => update('licenseNo', v))}{field('نوع جواز', data.licenseType, v => update('licenseType', v))}{field('تاریخ صدور', data.issueDate, v => update('issueDate', v), 'date')}{field('تاریخ ختم', data.expiryDate, v => update('expiryDate', v), 'date')}{field('TIN', data.tin, v => update('tin', v))}{field('ولایت', data.province, v => update('province', v))}{field('ولسوالی/ناحیه', data.district, v => update('district', v))}{field('شماره تماس', data.phone, v => update('phone', v))}{field('ایمیل', data.email, v => update('email', v))}{field('مسئول باصلاحیت', data.representative, v => update('representative', v))}<label className="space-y-1 md:col-span-2"><span className="text-xs font-bold text-slate-600">آدرس مکمل</span><textarea className={`${input} min-h-20`} value={data.address} onChange={e => update('address', e.target.value)} /></label>
      </div></div><div className={card}><h2 className="font-black">فورم رسمی تمدید</h2><p className="mb-3 text-xs text-slate-500">فورم رسمی پروژه در همین پرونده نگهداری می‌شود. برای تطبیق چاپی با نسخه جاری DAB از مرجع رسمی استفاده کنید.</p><DabOfficialCompanyRenewalForm companyId={companyId} /></div></div>}

      {tab === 'people' && <div className="mt-4 grid gap-4 lg:grid-cols-2">{(['shareholders', 'management'] as const).map(group => <div className={card} key={group}><div className="flex items-center justify-between"><h2 className="font-black">{group === 'shareholders' ? 'سهمداران' : 'هیئت رهبری و مسئولان'}</h2><button onClick={() => addPerson(group)} className="rounded-lg border px-3 py-2 text-xs font-bold">+ افزودن</button></div><div className="mt-3 space-y-3">{data[group].map((p, i) => <div className="rounded-lg border p-3" key={p.id}><div className="mb-2 flex justify-between text-xs font-bold"><span>ردیف {i + 1}</span><button onClick={() => update(group, data[group].filter(x => x.id !== p.id))} className="text-red-700">حذف</button></div><div className="grid gap-2 md:grid-cols-2">{field('شهرت مکمل', p.name, v => update(group, data[group].map(x => x.id === p.id ? {...x, name:v} : x)))}{field('ولد', p.father, v => update(group, data[group].map(x => x.id === p.id ? {...x, father:v} : x)))}{field('نمبر تذکره', p.idNo, v => update(group, data[group].map(x => x.id === p.id ? {...x, idNo:v} : x)))}{field(group === 'shareholders' ? 'فیصدی سهم' : 'سمت', group === 'shareholders' ? p.share : p.role, v => update(group, data[group].map(x => x.id === p.id ? {...x, ...(group === 'shareholders' ? {share:v} : {role:v})} : x)) )}</div></div>)}</div></div>)}</div>}

      {tab === 'branches' && <div className="mt-4 space-y-4"><div className={card}><div className="flex items-center justify-between"><h2 className="font-black">شعب و نمایندگی‌ها</h2><button onClick={addBranch} className="rounded-lg border px-3 py-2 text-sm font-bold">+ افزودن شعبه</button></div><div className="mt-3 grid gap-3 md:grid-cols-2">{data.branches.map((b,i) => <div className="rounded-lg border p-3" key={b.id}><div className="mb-2 flex justify-between text-xs font-bold"><span>شعبه {i+1}</span><button onClick={() => update('branches', data.branches.filter(x=>x.id!==b.id))} className="text-red-700">حذف</button></div><div className="grid gap-2">{field('نام شعبه/نمایندگی', b.name, v => update('branches', data.branches.map(x=>x.id===b.id?{...x,name:v}:x)))}{field('ولایت', b.province, v => update('branches', data.branches.map(x=>x.id===b.id?{...x,province:v}:x)))}{field('ولسوالی/ناحیه', b.district, v => update('branches', data.branches.map(x=>x.id===b.id?{...x,district:v}:x)))}{field('آدرس', b.address, v => update('branches', data.branches.map(x=>x.id===b.id?{...x,address:v}:x)))}{field('مسئول', b.manager, v => update('branches', data.branches.map(x=>x.id===b.id?{...x,manager:v}:x)))}{field('شماره تماس', b.phone, v => update('branches', data.branches.map(x=>x.id===b.id?{...x,phone:v}:x)))}</div></div>)}</div></div></div>}

      {tab === 'documents' && <div className="mt-4 space-y-4"><div className={card}><h2 className="font-black">کنترل اسناد پرونده</h2><p className="mt-1 text-xs text-slate-500">هر سند باید ثبت و توسط مسئول بررسی تأیید شود. فایل واقعی باید در Storage شرکت نگهداری شود؛ این صفحه مشخصات و وضعیت سند را در پرونده ثبت می‌کند.</p><div className="mt-3 space-y-3">{data.documents.map(d => <div className="rounded-lg border p-3" key={d.id}><div className="flex flex-wrap items-center justify-between gap-2"><div><b className="text-sm">{d.title}</b>{d.required && <span className="mr-2 rounded bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700">اجباری</span>}</div><select className="rounded-lg border px-2 py-2 text-xs font-bold" value={d.status} onChange={e => setDocument(d.id,{status:e.target.value as DocumentItem['status']})}><option value="missing">ناقص</option><option value="uploaded">آپلودشده</option><option value="verified">تأییدشده</option><option value="rejected">ردشده</option></select></div><div className="mt-2 grid gap-2 md:grid-cols-2"><label className="rounded-lg border border-dashed p-3 text-xs font-bold"><span>انتخاب فایل</span><input type="file" className="mt-2 block w-full text-xs" onChange={e => setDocument(d.id,{fileName:e.target.files?.[0]?.name || '', status:e.target.files?.[0] ? 'uploaded' : d.status})} /></label><input className={input} placeholder="یادداشت بررسی" value={d.notes} onChange={e=>setDocument(d.id,{notes:e.target.value})} /></div>{d.fileName && <div className="mt-2 text-xs font-bold text-emerald-700">فایل ثبت‌شده: {d.fileName}</div>}</div>)}</div></div></div>}

      {tab === 'compliance' && <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{Object.entries(data.compliance).map(([key,value]) => <div className={card} key={key}><div className="text-sm font-black">{({kyc:'KYC',aml:'AML/CFT',sanctions:'تحریم‌ها',tax:'مالیاتی',governance:'حاکمیت شرکت'} as Record<string,string>)[key]}</div><select className={`${input} mt-3`} value={value} onChange={e=>update('compliance',{...data.compliance,[key]:e.target.value as 'pending'|'clear'|'flagged'})}><option value="pending">در انتظار بررسی</option><option value="clear">تأیید / Clear</option><option value="flagged">Flag / نیازمند بررسی</option></select></div>)}<div className={`${card} md:col-span-2 lg:col-span-3`}><b>قاعده ارسال:</b> تا زمانی که تمام بررسی‌های اجباری Clear نشود، پرونده به مرحله ارسال نمی‌رود.</div></div>}

      {tab === 'workflow' && <div className="mt-4 space-y-4"><div className={card}><h2 className="font-black">گردش رسمی پرونده</h2><div className="mt-4 space-y-2">{statuses.map((s,i) => <div key={s} className={`flex items-center justify-between rounded-lg border p-3 ${s===data.status?'border-blue-400 bg-blue-50':''}`}><div><span className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-black">{i+1}</span><b>{statusLabels[s]}</b></div>{s===data.status && <span className="text-xs font-black text-blue-700">مرحله فعلی</span>}</div>)}</div><div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>update('status','internal_review')} className="rounded-lg border px-3 py-2 text-sm font-bold">شروع بررسی داخلی</button><button onClick={()=>update('status','ready_for_submission')} className="rounded-lg border px-3 py-2 text-sm font-bold">آماده ارسال</button><button onClick={submit} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white">ارسال پرونده</button></div></div></div>}

      {tab === 'reports' && <div className="mt-4 space-y-4"><div className={card}><h2 className="text-lg font-black">گزارش رسمی پرونده تمدید</h2><div className="mt-4 grid gap-3 md:grid-cols-3">{[['شماره پرونده',data.caseNumber],['شرکت',data.companyName || '—'],['شماره جواز',data.licenseNo || '—'],['وضعیت',statusLabels[data.status]],['تکمیل',`${completion}%`],['اسناد باقی‌مانده',String(requiredMissing)]].map(([a,b])=><div className="rounded-lg border p-3" key={a}><div className="text-xs font-bold text-slate-500">{a}</div><div className="mt-1 font-black">{b}</div></div>)}</div><div className="mt-4 grid gap-2 sm:grid-cols-3"><button onClick={()=>window.print()} className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-bold text-white">چاپ گزارش</button><button onClick={()=>setMessage('نسخه PDF چاپی از طریق Print → Save as PDF ایجاد می‌شود.')} className="rounded-lg border px-4 py-3 text-sm font-bold">PDF</button><button onClick={save} className="rounded-lg border px-4 py-3 text-sm font-bold">ذخیره نسخه گزارش</button></div></div><div className={card}><h2 className="font-black">فهرست فورم‌های DAB در سیستم</h2><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{['تمدید جواز','شهرت سهمدار','شهرت کارمند','نمایندگی','تضمین سهمدار','تغییر مالکیت','تغییر نام','تغییر موقعیت','تعلیق','ترک پیشه'].map(x=><div className="rounded-lg border p-3 text-sm font-bold" key={x}>✓ {x}</div>)}</div></div></div>}
    </div>
  </div>;
}
