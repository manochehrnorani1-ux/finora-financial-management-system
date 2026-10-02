"use client";
import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { LANGS } from "@/lib/i18n/dictionary";
import { setLanguageAction } from "@/actions/auth";
import { FinoraLogo } from "./BrandLogos";

export function PublicHeader({ organizationName, phone }: { organizationName: string; phone: string }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const links = [
    { href: "/", key: "home" },
    { href: "/services", key: "services" },
    { href: "/about", key: "about" },
    { href: "/contact", key: "contact" },
  ];
  const cleanPhone = phone.replace(/\s/g, "");
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl print:hidden">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="FINORA">
          <FinoraLogo height={42} />
          <div className="min-w-0">
            <div className="text-lg font-black tracking-wide text-emerald-950">FINORA</div>
            <div className="max-w-44 truncate text-[10px] text-slate-500">{t("slogan")}</div>
          </div>
        </Link>
        <nav className="mx-auto hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex">
          {links.map((l) => <Link key={l.href} href={l.href} className="transition hover:text-emerald-800">{t(l.key)}</Link>)}
        </nav>
        <div className="flex-1 lg:flex-none" />
        <a href={`tel:${cleanPhone}`} className="hidden items-center gap-2 rounded-xl border border-emerald-700 px-3.5 py-2.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50 sm:inline-flex">
          <span>☎</span><span>{t("urgentCall")}</span>
        </a>
        <Link href="/login" className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-900">🔐 {t("adminLogin")}</Link>
        <select aria-label={t("language")} value={lang} disabled={pending} onChange={(e) => start(async () => { await setLanguageAction(e.target.value); router.refresh(); })} className="input !w-auto !px-2.5 !py-2.5 text-xs">
          {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
      </div>
      <nav className="flex justify-around border-t border-slate-100 bg-white/95 px-1 py-2 text-[11px] font-medium text-slate-600 lg:hidden">
        {links.map((l) => <Link key={l.href} href={l.href} className="rounded-lg px-2 py-1.5 hover:bg-emerald-50 hover:text-emerald-800">{t(l.key)}</Link>)}
        <a href={`tel:${cleanPhone}`} className="rounded-lg px-2 py-1.5 font-bold text-emerald-800">{t("urgentCall")}</a>
      </nav>
      <span className="sr-only">{organizationName}</span>
    </header>
  );
}
