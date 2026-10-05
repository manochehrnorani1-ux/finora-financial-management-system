export const dynamic = 'force-dynamic';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-800 p-4" dir="rtl">
      <h2 className="text-2xl font-bold mb-2">صفحه مورد نظر پیدا نشد</h2>
      <p className="text-gray-600 mb-4">متأسفانه صفحه‌ای که به دنبال آن بودید وجود ندارد.</p>
      <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
        بازگشت به صفحه اصلی
      </Link>
    </div>
  );
}
