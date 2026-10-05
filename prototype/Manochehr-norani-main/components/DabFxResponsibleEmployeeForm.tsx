'use client';
import { toEnglishDigits } from '@/lib/utils';

import { useState } from 'react';
import DabOfficialHeader from './DabOfficialHeader';

const fields = [
  ['companyName', 'نام صرافی', true],
  ['licenseNo', 'شماره جواز صرافی', true],
  ['province', 'ولایت', true],
  ['district', 'ولسوالی / ناحیه', false],
  ['address', 'آدرس محل فعالیت', false],
  ['employeeName', 'نام و تخلص کارمند مسئول (منشی)', true],
  ['fatherName', 'نام پدر', true],
  ['grandfatherName', 'نام پدرکلان', false],
  ['identityNo', 'شماره تذکره تابعیت', true],
  ['birthPlace', 'محل تولد', false],
  ['birthDate', 'تاریخ تولد', 'date'],
  ['residence', 'محل سکونت اصلی و فعلی', false],
  ['education', 'سویه تحصیلی', false],
  ['previousJob', 'وظیفه قبلی', false],
  ['phone', 'شماره تماس', true],
  ['email', 'ایمیل آدرس', false],
  ['appointmentDate', 'تاریخ تعیین به حیث کارمند مسئول', 'date'],
] as const;

type Values = Record<string, string>;

export default function DabFxResponsibleEmployeeForm() {
  const [values, setValues] = useState<Values>({});
  const [photoUrl, setPhotoUrl] = useState('');

  const update = (key: string, value: string) => setValues(current => ({ ...current, [key]: value }));

  return (
    <main dir="rtl" className="min-h-screen bg-slate-100 p-4 md:p-8 print:bg-white print:p-0">
      <article className="mx-auto max-w-5xl bg-white p-6 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <DabOfficialHeader
          storageKey="dab_fx_responsible_employee_header"
          
          bankName="د افغانستان بانک"
          department="آمریت عمومی نظارت از مؤسسات مالی غیر بانکی"
          directorate="مدیریت جوازدهی"
          formNumber=""
          formTitle="فورم معرفی کارمند مسئول (منشی) صرافی"
          isEditable={true}
        />

        <section className="mt-5 border-2 border-slate-800 p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_150px]">
            <div className="grid gap-4 md:grid-cols-2">
              {fields.map(([key, label, type]) => (
                <label key={key} className="text-sm font-semibold">
                  {label}{type === true ? ' *' : ''}
                  <input
                    type={type === 'date' ? 'date' : 'text'}
                    value={values[key] ?? ''}
                    onChange={event => update(key, key === 'identityNo' ? toEnglishDigits(event.target.value) : event.target.value)}
                    dir={key === 'identityNo' ? 'ltr' : undefined}
                    className={`mt-1 w-full border border-slate-400 p-2 font-normal ${key === 'identityNo' ? 'text-left font-sans' : ''}`}
                  />
                </label>
              ))}
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-40 w-32 items-center justify-center border-2 border-slate-500 text-center text-xs">
                {photoUrl ? <img src={photoUrl} alt="عکس کارمند مسئول" className="h-full w-full object-cover" /> : 'عکس کارمند مسئول'}
              </div>
              <input value={photoUrl} onChange={event => setPhotoUrl(event.target.value)} placeholder="نشانی عکس" className="w-full border p-2 text-xs print:hidden" dir="ltr" />
            </div>
          </div>
        </section>

        <section className="mt-5 border-2 border-slate-800 p-5 leading-8">
          <h2 className="mb-3 font-bold">اظهار و معرفی</h2>
          <p>
            اینجانب/اینجانبان به نمایندگی از صرافی فوق، کارمند متذکره را به حیث کارمند مسئول (منشی) صرافی معرفی می‌نمایم و صحت معلومات ارائه‌شده و اسناد ضمیمه را تأیید می‌کنم.
          </p>
          <label className="mt-4 block text-sm font-semibold">
            توضیحات و معلومات اضافی
            <textarea value={values.statement ?? ''} onChange={event => update('statement', event.target.value)} rows={5} className="mt-1 w-full border border-slate-400 p-2 font-normal" />
          </label>
        </section>

        <section className="mt-5 border-2 border-slate-800 p-5">
          <h2 className="mb-4 font-bold">اسناد ضمیمه</h2>
          <textarea value={values.attachments ?? ''} onChange={event => update('attachments', event.target.value)} rows={4} className="w-full border border-slate-400 p-2" placeholder="فهرست کاپی تذکره، اسناد تحصیلی، اسناد وظیفه و سایر ضمایم" />
        </section>



        <div className="mt-5 text-xs leading-6 text-slate-600">
          این نسخه دیجیتال برای ثبت معلومات و مدیریت دوسیه ساخته شده است. برای تسلیم به د افغانستان بانک، فورم چاپی باید با آخرین فایل رسمی DAB تطبیق نهایی شود.
        </div>

        <div className="mt-5 flex gap-2 print:hidden">
          <button type="button" onClick={() => window.print()} className="border bg-slate-900 px-5 py-2 text-white">چاپ A4</button>
          <button type="button" onClick={() => setValues({})} className="border px-5 py-2">پاک کردن</button>
        </div>
      </article>
      <style jsx global>{`
        @page { size: A4 portrait; margin: 12mm; }
        @media print {
          html, body { background: #fff !important; }
          .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
    </main>
  );
}
