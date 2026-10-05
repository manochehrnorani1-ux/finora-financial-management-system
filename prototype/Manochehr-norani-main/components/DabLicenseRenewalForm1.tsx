'use client';

import { useState } from 'react';

type Row = { key: string; label: string; type?: 'text' | 'date' | 'textarea' };

const shareholderRows: Row[] = [
  { key: 'name', label: 'نام' },
  { key: 'fatherName', label: 'نام پدر' },
  { key: 'identityNo', label: 'شماره تذکره' },
  { key: 'sharePercent', label: 'فیصدی سهم' },
  { key: 'province', label: 'ولایت' },
  { key: 'districtArea', label: 'ولسوالی / ناحیه' },
  { key: 'fingerprint', label: 'شصت' },
  { key: 'signature', label: 'امضاء' },
];

const representativeRows: Row[] = [
  { key: 'fullName', label: 'اسم' },
  { key: 'fatherName', label: 'ولد' },
  { key: 'identityNo', label: 'نمبر تذکره' },
  { key: 'province', label: 'ولایت' },
  { key: 'district', label: 'ولسوالی' },
  { key: 'area', label: 'ناحیه' },
  { key: 'market', label: 'مارکیت' },
  { key: 'shopNo', label: 'نمبر دکان طبق جواز' },
  { key: 'phone', label: 'تماس' },
];

export default function DabLicenseRenewalForm1() {
  const [values, setValues] = useState<Record<string, string>>({});
  const set = (key: string, value: string) => setValues(v => ({ ...v, [key]: value }));
  const input = (row: Row) => row.type === 'textarea'
    ? <textarea value={values[row.key] ?? ''} onChange={e => set(row.key, e.target.value)} rows={4} className="w-full border border-slate-500 p-2" />
    : <input type={row.type ?? 'text'} value={values[row.key] ?? ''} onChange={e => set(row.key, e.target.value)} className="w-full border border-slate-500 p-2" />;

  return (
    <main dir="rtl" className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      <article className="mx-auto max-w-5xl bg-white p-6 print:max-w-none print:p-0">
        <header className="border-2 border-slate-800 p-5 text-center">
          <div className="font-bold">د افغانستان بانک</div>
          <div className="mt-1 font-semibold">آمریت عمومی نظارت از مؤسسات مالی غیر بانکی</div>
          <div>مدیریت جوازدهی صرافی‌ها و خدمات پولی</div>
          <h1 className="mt-5 text-xl font-bold">فورم شماره (۱) — فورم درخواستی تمدید جواز شرکت صرافی و خدمات پولی (دفتر مرکزی)</h1>
        </header>

        <section className="mt-4 border-2 border-slate-800 p-4 leading-7">
          <h2 className="font-bold">رهنمود عمومی</h2>
          <p>این فورم باید با حضور سهمدار/سهمداران در مقابل کارمند مسئول در مدیریت جوازدهی آمریت عمومی نظارت از مؤسسات مالی غیر بانکی یا در حضور داشت کارمند مسئول در آمریت زون مربوط/مدیریت نمایندگی در ولایات امضاء و شصتگذاری گردد. کارمند مسئول خود را مطمئن سازد که فورم درخواستی حسب اسناد و مدارک مربوط خانه‌پُری گردیده و توسط شخص خود سهمدار/سهمداران امضاء و شصتگذاری می‌گردد.</p>
        </section>

        <section className="mt-4 border-2 border-slate-800 p-4">
          <h2 className="mb-4 text-lg font-bold">بخش اول: مشخصات سهمدار</h2>
          <p className="mb-4 leading-7">به آمریت عمومی نظارت از مؤسسات مالی غیر بانکی / مدیریت نمایندگی! اینجانب/مایان که شهرت ام/ما در جدول آتی تذکر گردیده منحیث سهمدار/سهمداران شرکت صرافی و خدمات پولی ({values.companyName ?? ''}) دارای جواز شماره ({values.licenseNo ?? ''}) که به تاریخ ({values.licenseIssueDate ?? ''}) جواز فعالیت را از د افغانستان بانک بدست آورده بودم/بودیم، مدت اعتبار آن ختم گردیده است. بدین وسیله تقاضا می‌نمایم که در راستای تمدید جواز فعالیت این شرکت همکاری نموده ممنون سازید.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { key: 'companyName', label: 'نام شرکت صرافی و خدمات پولی' },
              { key: 'licenseNo', label: 'شماره جواز' },
              { key: 'licenseIssueDate', label: 'تاریخ اخذ جواز', type: 'date' as const },
              ...shareholderRows,
            ].map(row => <label key={row.key} className="text-sm font-semibold">{row.label}{input(row)}</label>)}
          </div>
        </section>

        <section className="mt-4 border-2 border-slate-800 p-4">
          <h2 className="mb-4 text-lg font-bold">بخش دوم: مشخصات جواز فعالیت</h2>
          <h3 className="mb-3 font-bold">۱. در جدول ذیل مشخصات جواز فعالیت را درج نمایید.</h3>
          <div className="grid gap-3 md:grid-cols-3">
            {['address','province','district','area','market','shopNo','phone','email'].map(key => <label key={key} className="text-sm font-semibold">{({address:'آدرس شرکت',province:'ولایت',district:'ولسوالی',area:'ناحیه',market:'مارکیت',shopNo:'منزل و شماره دکان',phone:'شماره تماس',email:'ایمیل آدرس'} as Record<string,string>)[key]}<input value={values[key] ?? ''} onChange={e => set(key,e.target.value)} className="w-full border border-slate-500 p-2" /></label>)}
            <label className="text-sm font-semibold">نام شرکت (فارسی)<input value={values.companyNameFa ?? ''} onChange={e => set('companyNameFa',e.target.value)} className="w-full border border-slate-500 p-2" /></label>
            <label className="text-sm font-semibold">نام شرکت به انگلیسی<input value={values.companyNameEn ?? ''} onChange={e => set('companyNameEn',e.target.value)} className="w-full border border-slate-500 p-2" dir="ltr" /></label>
          </div>

          <h3 className="mb-3 mt-6 font-bold">۲. لیست و مشخصات تمام نمایندگی‌ها و کارمندان رسمی</h3>
          <div className="overflow-x-auto"><table className="w-full border-collapse text-sm"><thead><tr>{representativeRows.map(r => <th key={r.key} className="border border-slate-500 p-2">{r.label}</th>)}</tr></thead><tbody><tr>{representativeRows.map(r => <td key={r.key} className="border border-slate-500 p-1"><input value={values[`rep_${r.key}`] ?? ''} onChange={e => set(`rep_${r.key}`,e.target.value)} className="w-full p-1" /></td>)}</tr></tbody></table></div>

          <h3 className="mb-3 mt-6 font-bold">۳. لیست حسابات بانکی مربوط به شرکت</h3>
          <div className="grid gap-3 md:grid-cols-2">{[1,2].map(n => <div key={n} className="grid grid-cols-3 gap-2 border p-2"><strong>{n}</strong>{['نام حساب','نمبر حساب','بانک مربوطه'].map((label,i) => <label key={label} className="text-sm">{label}<input value={values[`bank_${n}_${i}`] ?? ''} onChange={e => set(`bank_${n}_${i}`,e.target.value)} className="w-full border p-1" /></label>)}</div>)}</div>
        </section>

        <section className="mt-4 border-2 border-slate-800 p-4">
          <h2 className="font-bold">بخش سوم: تغییرات مطالبه شده حین تمدید جواز فعالیت</h2>
          <p className="mt-2 leading-7">این بخش صرف در حالتی تکمیل می‌گردد که شرکت صرافی و خدمات پولی خواهان تغییرات در مشخصات جواز حین پروسه تمدید باشد.</p>
          <label className="mt-3 block font-semibold">آیا شرکت شما حین پروسه تمدید خواهان تغییرات عمده از قبیل تغییر محل فعالیت، تغییر نام تجارتی، انتقال مالکیت، حذف یا ازدیاد سهمدار، تغییر در تشکیلات، تغییرات در نوع خدمات، تغییر در ضامن، تغییرات در نماینده‌ها، تغییرات در نمایندگی و غیره می‌باشد؟<textarea value={values.requestedChanges ?? ''} onChange={e => set('requestedChanges',e.target.value)} rows={4} className="mt-2 w-full border border-slate-500 p-2" /></label>
          <div className="mt-4 grid gap-3 md:grid-cols-2"><label className="font-semibold">آیا شرکت از سال گذشته تا اکنون فعالیت داشته است؟<input value={values.activityLastYear ?? ''} onChange={e => set('activityLastYear',e.target.value)} className="w-full border p-2" placeholder="بلی / نخیر" /></label><label className="font-semibold">در صورت منفی بودن، دلایل<textarea value={values.activityReason ?? ''} onChange={e => set('activityReason',e.target.value)} rows={3} className="w-full border p-2" /></label><label className="font-semibold md:col-span-2">آیا علیه شما یا شرکت‌هایی که در آن سهمدار هستید دعوی صورت گرفته است؟<input value={values.legalClaims ?? ''} onChange={e => set('legalClaims',e.target.value)} className="w-full border p-2" placeholder="بلی / نخیر" /></label><label className="font-semibold md:col-span-2">در صورت مثبت بودن، دلایل را شرح دهید<textarea value={values.legalClaimsDetails ?? ''} onChange={e => set('legalClaimsDetails',e.target.value)} rows={4} className="w-full border p-2" /></label></div>
        </section>

        <section className="mt-4 border-2 border-slate-800 p-4">
          <h2 className="font-bold">بخش چهارم: شصت و امضای سهمداران</h2>
          <p className="mt-2 leading-7">بدین وسیله اقرار می‌دارم/می‌داریم که معلومات ارائه شده در این فورم توسط من/ما درست بوده و مکمل می‌باشد. در صورتیکه معلومات ارائه شده من/ما نادرست باشد و یا کدام تخلف در آن دیده شود، حاضرم/حاضریم که با من/ما طبق قوانین و مقررات نافذۀ کشور برخورد صورت گیرد.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3"><div className="border p-4">سهمدار 1: برکت‌الله غفوری<br />(100% سهام)<br /><br />شصت: __________________<br />امضاء: __________________<br />تاریخ: ____ / ____ / ______</div><div className="border p-4">سهمدار 2<br /><br />شصت: __________________<br />امضاء: __________________<br />تاریخ: ____ / ____ / ______</div><div className="border p-4">سهمدار 3<br /><br />شصت: __________________<br />امضاء: __________________<br />تاریخ: ____ / ____ / ______</div></div>
        </section>

        <section className="mt-4 border-2 border-slate-800 p-4">
          <h2 className="font-bold">بخش پنجم: ارزیابی کارمند د افغانستان بانک</h2>
          <p className="mt-2 leading-7">این قسمت توسط کارمند مسئول (ارزیابی‌کننده) د افغانستان بانک خانه‌پُری و امضاء می‌گردد.</p>
          <p className="mt-2 leading-7">کارمند مسئول مدیریت جوازدهی و کارمند مسئول در آمریت زون مربوط/نمایندگی د افغانستان بانک در ولایات با دریافت درخواستی، اسناد آن را بررسی می‌نماید و با در نظرداشت سوابق و اسناد موجود، گزینه‌های مربوط به اصل جواز، استعلام جرم مالیاتی و جنایی، رفع مسئولیت مالیاتی، اعتبار جواز تضمین‌کننده، فورم تضمین، مبلغ تضمین پولی و تکمیل تمام شرایط و معیارهای تمدید جواز را بررسی می‌نماید.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3"><label className="font-semibold">اسم ارزیابی‌کننده<input value={values.evaluatorName ?? ''} onChange={e => set('evaluatorName',e.target.value)} className="w-full border p-2" /></label><label className="font-semibold">امضاء ارزیابی‌کننده<input value={values.evaluatorSignature ?? ''} onChange={e => set('evaluatorSignature',e.target.value)} className="w-full border p-2" /></label><label className="font-semibold">تاریخ<input type="date" value={values.evaluationDate ?? ''} onChange={e => set('evaluationDate',e.target.value)} className="w-full border p-2" /></label></div>
        </section>

        <div className="mt-5 flex gap-2 print:hidden"><button type="button" onClick={() => window.print()} className="border bg-slate-900 px-5 py-2 text-white">چاپ فورم A4</button></div>
      </article>
      <style jsx global>{`@page{size:A4 portrait;margin:10mm}@media print{html,body{background:#fff!important}.print\\:hidden{display:none!important}input,textarea{border-color:#666!important}}`}</style>
    </main>
  );
}
