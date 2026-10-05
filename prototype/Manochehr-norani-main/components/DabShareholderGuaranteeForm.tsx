'use client';

import DabGuaranteeForm from './DabGuaranteeForm';

export default function DabShareholderGuaranteeForm() {
  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-3 py-4 text-slate-950 sm:px-6 sm:py-6 print:bg-white print:p-0">
      <section className="mx-auto w-full max-w-6xl rounded-xl border border-slate-200 bg-white shadow-sm print:border-0 print:shadow-none">
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-4 sm:px-6 print:hidden">
          <h1 className="text-base font-bold text-slate-950 sm:text-lg">فورم تضمین سهمدار</h1>
          <p className="mt-1 text-xs leading-5 text-slate-600">فورم رسمی معلومات ضامن، شرکت و سهمدار تضمین‌شونده</p>
        </div>
        <div className="p-2 sm:p-4 print:p-0">
          <DabGuaranteeForm isEditMode={true} />
        </div>
      </section>
    </main>
  );
}
