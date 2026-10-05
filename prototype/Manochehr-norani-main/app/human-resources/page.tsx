'use client';

import EmployeeManagement from '@/components/EmployeeManagement';

export default function HumanResourcesPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">منابع بشری</h1>
          <p className="mt-1 text-sm text-slate-600">
            مدیریت کادر پرسنل و پرونده‌های پرسنلی
          </p>
        </header>
        <EmployeeManagement />
      </div>
    </main>
  );
}
