'use client';

import { useState } from 'react';
import DabOfficialHeader from './DabOfficialHeader';

type Guarantor = {
  fullName: string;
  businessNameLocation: string;
  currentResidence: string;
  province: string;
  fatherName: string;
  district: string;
  tazkiraNo: string;
  area: string;
  phone: string;
  village: string;
};

const emptyGuarantor: Guarantor = {
  fullName: '',
  businessNameLocation: '',
  currentResidence: '',
  province: '',
  fatherName: '',
  district: '',
  tazkiraNo: '',
  area: '',
  phone: '',
  village: '',
};

function Field({ label, value, onChange, textarea = false }: { label: string; value: string; onChange: (value: string) => void; textarea?: boolean }) {
  return (
    <label className={textarea ? 'md:col-span-2' : ''}>
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full border border-slate-500 bg-white p-2" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-slate-500 bg-white p-2" />
      )}
    </label>
  );
}

function GuarantorBlock({ index, value, onChange }: { index: number; value: Guarantor; onChange: (value: Guarantor) => void }) {
  const update = (key: keyof Guarantor, next: string) => onChange({ ...value, [key]: next });
  return (
    <section className="break-inside-avoid border-2 border-slate-800 p-5 md:p-7">
      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <Field label={`اسم و محل فعالیت تشبث تضمین کننده ${index}`} value={value.businessNameLocation} onChange={(v) => update('businessNameLocation', v)} textarea />
        <Field label="سکونت فعلی" value={value.currentResidence} onChange={(v) => update('currentResidence', v)} textarea />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="order-first row-span-5 flex min-h-56 items-center justify-center border-2 border-dashed border-slate-500 p-4 text-center text-sm">
          عکس تضمین کننده در اینجا نصب و با مهر تضمین کننده تاپه گردد.
        </div>
        <Field label="اسم" value={value.fullName} onChange={(v) => update('fullName', v)} />
        <Field label="ولد" value={value.fatherName} onChange={(v) => update('fatherName', v)} />
        <Field label="ولایت" value={value.province} onChange={(v) => update('province', v)} />
        <Field label="ولسوالی" value={value.district} onChange={(v) => update('district', v)} />
        <Field label="نمبر تذکره" value={value.tazkiraNo} onChange={(v) => update('tazkiraNo', v)} />
        <Field label="ناحیه" value={value.area} onChange={(v) => update('area', v)} />
        <Field label="شماره تماس" value={value.phone} onChange={(v) => update('phone', v)} />
        <Field label="قریه" value={value.village} onChange={(v) => update('village', v)} />
      </div>
    </section>
  );
}

export default function DabFxGuaranteeForm() {
  const [guarantors, setGuarantors] = useState<Guarantor[]>([
    { ...emptyGuarantor },
    { ...emptyGuarantor },
    { ...emptyGuarantor },
  ]);
  const [company, setCompany] = useState({ name: '', type: '', licenseNo: '', phone: '', expiry: '', email: '', issuer: '', address: '' });
  const [owner, setOwner] = useState({ name: '', province: '', fatherName: '', tazkiraNo: '' });
  const [date, setDate] = useState('');
  const [saved, setSaved] = useState(false);

  const saveDraft = () => {
    window.localStorage.setItem('dab-fx-shareholder-guarantee-draft', JSON.stringify({ guarantors, company, owner, date }));
    setSaved(true);
  };

  return (
    <main dir="rtl" className="min-h-screen bg-slate-100 p-4 md:p-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-6xl bg-white print:max-w-none">
        <DabOfficialHeader
          storageKey="dab_fx_guarantee_header"
          bankName="د افغانستان بانک"
          department="آمریت عمومی نظارت از مؤسسات مالی غیر بانکی"
          directorate="مدیریت جوازدهی"
          formNumber=""
          formTitle="فورم تضمین سر سهمدار / سهمداران شرکت صرافی و خدمات پولی"
          guidelineText=""
          isEditable={true}
        />

        <section className="border-x-2 border-b-2 border-slate-800 p-5 md:p-8">
          <h2 className="mb-4 border-b-2 border-slate-800 pb-2 text-lg font-bold">بخش اول: شهرت تضمین کنندگان</h2>
          <p className="mb-6 text-sm leading-7">تمامی سهمداران شرکت تضمین کننده نیاز است تا از سهمدار شرکت صرافی و خدمات پولی، تضمین نمایند.</p>
          <div className="space-y-6">
            {guarantors.map((g, i) => (
              <GuarantorBlock key={i} index={i + 1} value={g} onChange={(next) => setGuarantors((current) => current.map((item, index) => index === i ? next : item))} />
            ))}
          </div>

          <div className="break-inside-avoid mt-6 border-2 border-slate-800 p-5">
            <p className="font-bold">نوت</p>
            <p className="mt-2 text-sm leading-7">در صورتیکه شرکت تضمین کننده علاوه بر سهمداران موجود، دارایی سهمدار دیگر باشد، فورم جداگانه تکمیل گردد.</p>
          </div>

          <section className="break-inside-avoid mt-6 border-2 border-slate-800 p-5 md:p-7">
            <h3 className="mb-5 border-b pb-2 text-lg font-bold">مشخصات شرکت تضمین کننده</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="اسم تشبث" value={company.name} onChange={(v) => setCompany({ ...company, name: v })} />
              <Field label="نوع فعالیت" value={company.type} onChange={(v) => setCompany({ ...company, type: v })} />
              <Field label="نمبر جواز" value={company.licenseNo} onChange={(v) => setCompany({ ...company, licenseNo: v })} />
              <Field label="شماره تماس شرکت" value={company.phone} onChange={(v) => setCompany({ ...company, phone: v })} />
              <Field label="تاريخ اعتبار" value={company.expiry} onChange={(v) => setCompany({ ...company, expiry: v })} />
              <Field label="ایمیل آدرس" value={company.email} onChange={(v) => setCompany({ ...company, email: v })} />
              <Field label="اداره صادر کننده جواز" value={company.issuer} onChange={(v) => setCompany({ ...company, issuer: v })} />
              <Field label="آدرس تشبث" value={company.address} onChange={(v) => setCompany({ ...company, address: v })} textarea />
            </div>
          </section>

          <section className="break-inside-avoid mt-8 border-2 border-slate-800 p-5 md:p-7">
            <h2 className="mb-5 border-b-2 border-slate-800 pb-2 text-lg font-bold">بخش دوم: شهرت سهمدار شرکت صرافی و خدمات پولی (شخص تضمین شونده)</h2>
            <p className="text-sm leading-8">
              مایان هریک که شهرت مکمل مان در فوق ذکر گردیده است، با رضایت کامل اظهار میداریم که سهمدار/سهمداران آتی الذکر که می‌خواهد جواز شرکت صرافی و خدمات پولی را تحت نام ({owner.name || '_________________'}) در ولایت ({owner.province || '_________________'}) اخذ/تمدید نماید، تضمین نموده و در صورت هر گونه تخلف و تخطی که از قوانین و مقررات نافذه کشور از آدرس شرکت صرافی و خدمات پولی ایشان انجام یابد، ایشان را در وقت معینه به مرجع مربوط یا د افغانستان بانک حاضر می‌نماییم و در اقرار خود صادق می‌باشیم.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="اسم" value={owner.name} onChange={(v) => setOwner({ ...owner, name: v })} />
              <Field label="ولد" value={owner.fatherName} onChange={(v) => setOwner({ ...owner, fatherName: v })} />
              <Field label="شماره تذکره" value={owner.tazkiraNo} onChange={(v) => setOwner({ ...owner, tazkiraNo: v })} />
              <Field label="ولایت" value={owner.province} onChange={(v) => setOwner({ ...owner, province: v })} />
            </div>
          </section>

          <section className="break-inside-avoid mt-8 border-2 border-slate-800 p-5 md:p-7">
            <h2 className="mb-5 border-b-2 border-slate-800 pb-2 text-lg font-bold">بخش سوم: تعهدات تضمین کنندگان</h2>
            <ol className="list-decimal space-y-3 pr-6 text-sm leading-8">
              <li>تضمین هذا باید با حضور شخص تضمین کننده در مقابل کارمند مسئول در مدیریت جوازدهی آمریت عمومی نظارت از مؤسسات مالی غیر بانکی یا در مقابل کارمند مسئول در آمریت زون مربوط/مدیریت نمایندگی د افغانستان بانک در ولایات امضاء و شصت گذاری گردد. کارمند مسئول متذکره خود را مطمئین سازد که فورم تضمین هذا حسب اسناد و مدارک مربوط به تضمین کننده خانه پُری گردیده و توسط شخص خود تضمین کننده امضاء و شصت گذاری می گردد.</li>
              <li>در صورتیکه تضمین کننده، ترک تضمین می‌نماید و یا نمی‌خواهد از مالک شرکت صرافی و خدمات پولی فوق الذکر تضمین نماید، نیاز است تا سهمدار/سهمداران شرکت صرافی و خدمات پولی، کتباً تضمین کننده جدید را به د افغانستان بانک معرفی نماید.</li>
              <li>تضمین کنندگان الی معرفی تضمین کننده جدید توسط سهمدار/سهمداران شرکت صرافی و خدمات پولی، منحیث تضمین کننده نزد د افغانستان بانک قرار میداشته باشند.</li>
              <li>هرگاه معلومات ضامن که در بخش اول این فورم ارائه گردیده تغییر نماید و یا تشبث و جواز فعالیت ضامن لغو گردد، تضمین کننده و سهمدار/سهمداران شرکت صرافی و خدمات پولی مکلف اند تا د افغانستان بانک را عندالموقع کتباً اطلاع دهد. در غیر آن مسئولیت بدوش ضامن و سهمدار/سهمداران شرکت می‌باشد.</li>
              <li>تضمین متذکره صرف برای سه سال بوده و در زمان تمديد جواز فوق الذکر، ضمانت خط هذا تجديد می‌گردد.</li>
              <li>تضمین کننده نمی‌تواند از جمله اقارب درجه اول (پدر، مادر، فرزند، همسر، برادر و خواهر) شخص تضمین شونده باشد.</li>
            </ol>
            <p className="mt-5 border-t pt-4 text-sm leading-7">عکس ها و مُهر شرکت در فورم هذا و نقل تذکره تابعیت با جواز قابل اعتبار به این تضمین خط ضمیمه گردیده و صحت است.</p>

            <div className="mt-7 grid gap-5 md:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="break-inside-avoid border-2 border-slate-700 p-4 text-sm">
                  <p>امضاء تضمین کننده:</p><div className="mt-8 border-b border-slate-700" />
                  <p className="mt-6">شصت تضمین کننده:</p><div className="mt-8 border-b border-slate-700" />
                </div>
              ))}
            </div>
            <div className="mt-6 max-w-xs"><Field label="تاريخ" value={date} onChange={setDate} /></div>
          </section>

          <div className="mt-5 flex flex-wrap gap-2 print:hidden">
            <button type="button" onClick={saveDraft} className="border bg-slate-900 px-5 py-2 text-white">ذخیره پیش‌نویس</button>
            <button type="button" onClick={() => window.print()} className="border px-5 py-2">چاپ A4</button>
          </div>
          {saved ? <p className="mt-3 border p-2 text-sm print:hidden">پیش‌نویس در این دستگاه ذخیره شد.</p> : null}
        </section>
      </div>
      <style jsx global>{`
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          html, body { background: #fff !important; }
          section, .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
          input, textarea { break-inside: avoid; page-break-inside: avoid; }
          * { box-shadow: none !important; }
        }
      `}</style>
    </main>
  );
}
