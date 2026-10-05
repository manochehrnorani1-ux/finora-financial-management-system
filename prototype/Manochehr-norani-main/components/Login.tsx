'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Building2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) setError('ایمیل یا رمز عبور درست نیست. دسترسی حساب را در Supabase بررسی کنید.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 font-vazirmatn" dir="rtl">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="p-8 text-center bg-amber-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
          <div className="w-16 h-16 mx-auto bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4"><Building2 className="w-8 h-8" /></div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">سامانه مدیریت شرکت‌ها</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">برای ورود، ایمیل و رمز عبور خود را وارد کنید.</p>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && <div role="alert" className="p-3 text-sm font-semibold text-red-700 bg-red-100 rounded-lg text-center">{error}</div>}
          <div className="space-y-1"><label className="text-sm font-bold text-slate-700 dark:text-slate-300">ایمیل</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" required dir="ltr" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl dark:text-white text-left outline-none" /></div>
          <div className="space-y-1"><label className="text-sm font-bold text-slate-700 dark:text-slate-300">رمز عبور</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required dir="ltr" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl dark:text-white text-left outline-none" /></div>
          <button type="submit" disabled={loading} className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl disabled:opacity-60">{loading ? 'در حال ورود...' : 'ورود'}</button>
        </form>
      </div>
    </div>
  );
}
