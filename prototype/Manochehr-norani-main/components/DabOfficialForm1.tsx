'use client';

import { useState } from 'react';
import { dabForm1Official as form } from '@/lib/dabForm1Official';
import { barakatullahGhafouriProfile as profile } from '@/lib/barakatullahGhafouriProfile';

type Answers = Record<string, string>;

export default function DabOfficialForm1() {
  const [answers, setAnswers] = useState<Answers>({
    companyName: profile.legalName,
    licenseNo: profile.licenseNo,
    licenseDate: '',
    renewalChanges: 'بلی',
    activeLastYear: 'بلی',
    legalClaims: 'نخیر',
  });
  const set = (key: string, value: string) => setAnswers((s) => ({ ...s, [key]: value }));

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 print:bg-white">
      <article className="mx-auto max-w-6xl space-y-5 rounded-2xl bg-white p-6 shadow-sm print:shadow-none">
        <header className="border-b pb-5 text-center">
          <div className="text-sm font-semibold">{form.authority}</div>
          <div className="mt-1 text-sm">{form.department}</div>
          <div className="mt-1 text-sm">{form.management}</div>
          <h1 className="mt-5 text-2xl font-bold">فورم شماره ({form.number}) — {form.title}</h1>
          <p className="mt-1 text-sm text-slate-600">{form.englishTitle}</p>
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-right text-sm leading-7">{form.guidance}</div>
        </header>

        <section>
          <h2 className="mb-3 text-lg font-bold">{form.sections[0].title}</h2>
          <p className="mb-2 text-sm">{form.sections[0].intro}</p>
          <p className="mb-4 text-sm leading-7">{form.sections[0].declaration}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <label>نام شرکت<input value={answers.companyName ?? ''} onChange={e => set('companyName', e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
            <label>شماره جواز<input value={answers.licenseNo ?? ''} onChange={e => set('licenseNo', e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
            <label>تاریخ اخذ جواز<input value={answers.licenseDate ?? ''} onChange={e => set('licenseDate', e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
          </div>
          <div className="mt-4 overflow-x-auto"><table className="w-full border-collapse text-sm"><thead><tr>{form.sections[0].columns.map(c => <th key={c} className="border p-2 text-right">{c}</th>)}</tr></thead><tbody><tr>{['1', 'برکت‌الله ولد عبدالغفور', 'عبدالغفور', profile.shareholders[0].identityNo, '100%', profile.province, '', '________', '________'].map((v, i) => <td key={i} className="border p-2">{v}</td>)}</tr></tbody></table></div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">{form.sections[1].title}</h2>
          <div className="grid gap-3 md:grid-cols-3">{form.sections[1].companyColumns.map(c => <label key={c}>{c}<input value={c === 'آدرس شرکت' ? profile.address : c === 'ولایت' ? profile.province : c === 'مارکیت' ? profile.market : c === 'منزل و شماره دکان' ? `${profile.floor}، دکان نمبر ${profile.shopNo}` : c === 'نام شرکت (فارسی)' ? profile.legalName : ''} onChange={() => {}} className="mt-1 w-full rounded-lg border bg-white p-2" /></label>)}</div>
          <h3 className="mb-2 mt-5 font-semibold">لیست و مشخصات تمام نمایندگی‌ها و کارمندان رسمی</h3>
          <div className="overflow-x-auto"><table className="w-full border-collapse text-sm"><thead><tr>{form.sections[1].representativeColumns.map(c => <th key={c} className="border p-2 text-right">{c}</th>)}</tr></thead><tbody>{profile.representatives.map((r) => <tr key={r.location}><td className="border p-2">{r.representative}</td><td className="border p-2">—</td><td className="border p-2">—</td><td className="border p-2">{r.location}</td><td className="border p-2">—</td><td className="border p-2">—</td><td className="border p-2">—</td><td className="border p-2">—</td><td className="border p-2">—</td></tr>)}</tbody></table></div>
          <h3 className="mb-2 mt-5 font-semibold">لیست حسابات بانکی مربوط به شرکت</h3>
          <table className="w-full border-collapse text-sm"><thead><tr>{form.sections[1].bankColumns.map(c => <th key={c} className="border p-2 text-right">{c}</th>)}</tr></thead><tbody>{['1', '2'].map(n => <tr key={n}>{[n, '', '', ''].map((v, i) => <td key={i} className="border p-2">{v}</td>)}</tr>)}</tbody></table>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">{form.sections[2].title}</h2>
          <p className="mb-3 text-sm">{form.sections[2].guidance}</p>
          {form.sections[2].questions.map((q, i) => <div key={q} className="mb-4 rounded-xl border p-4"><p className="text-sm leading-7">{q}</p><div className="mt-3 flex gap-5">{form.sections[2].options.map(o => <label key={o} className="flex items-center gap-2"><input type="radio" name={`q-${i}`} value={o} checked={answers[i === 0 ? 'renewalChanges' : i === 1 ? 'activeLastYear' : 'legalClaims'] === o} onChange={e => set(i === 0 ? 'renewalChanges' : i === 1 ? 'activeLastYear' : 'legalClaims', e.target.value)} />{o}</label>)}</div>{i > 0 && <textarea className="mt-3 min-h-20 w-full rounded-lg border p-2" placeholder="در صورت نیاز، توضیحات و دلایل را درج نمایید." />}</div>)}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">{form.sections[3].title}</h2>
          <p className="rounded-xl bg-slate-50 p-4 text-sm leading-7">{form.sections[3].declaration}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3"><div><b>{form.sections[3].shareholder}</b><p>{form.sections[3].share}</p></div>{form.sections[3].signatureFields.map(f => <label key={f}>{f}<input className="mt-1 w-full rounded-lg border p-2" /></label>)}</div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">{form.sections[4].title}</h2>
          <p className="mb-3 text-sm">{form.sections[4].guidance}</p>
          <div className="space-y-3">{form.sections[4].checks.map((c) => <label key={c} className="flex gap-3 rounded-lg border p-3 text-sm leading-6"><input type="checkbox" className="mt-1 h-4 w-4" />{c}</label>)}</div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">{form.sections[4].evaluatorFields.map(f => <label key={f}>{f}<input className="mt-1 w-full rounded-lg border p-2" /></label>)}</div>
        </section>

        <footer className="flex flex-wrap justify-end gap-2 border-t pt-5 print:hidden"><button onClick={() => window.print()} className="rounded-lg bg-slate-900 px-5 py-2 text-white">چاپ فورم</button><button onClick={() => window.history.back()} className="rounded-lg border px-5 py-2">بازگشت</button></footer>
      </article>
    </main>
  );
}
