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
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 print:hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-[72px] flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 min-w-0">
          <FinoraLogo height={40} />
          <div className="min-w-0">
            <div className="text-lg font-black tracking-wide text-emerald-900">FINORA</div>
            <div className="text-[10px] text-slate-500 truncate max-w-40">{t("slogan")}</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-5 mx-auto text-sm text-slate-600">
          {links.map((l) => <Link key={l.href} href={l.href} className="hover:text-emerald-800 transition">{t(l.key)}</Link>)}
        </nav>
        <div className="flex-1 md:flex-none" />
        <a href={`tel:${phone.replace(/\s/g, "")}`} className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-emerald-700 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50">
          <span>☎</span><span>{t("urgentCall")}</span>
        </a>
        <Link href="/login" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-900">🔐 {t("adminLogin")}</Link>
        <select aria-label={t("language")} value={lang} disabled={pending} onChange={(e) => start(async () => { await setLanguageAction(e.target.value); router.refresh(); })} className="input !w-auto !px-2 !py-2 text-xs">
          {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
      </div>
      <nav className="md:hidden flex justify-around border-t border-slate-100 px-1 py-2 text-[11px] text-slate-600">
        {links.map((l) => <Link key={l.href} href={l.href} className="px-2 py-1">{t(l.key)}</Link>)}
        <a href={`tel:${phone.replace(/\s/g, "")}`} className="px-2 py-1 text-emerald-800">{t("urgentCall")}</a>
      </nav>
      <div className="sr-only">{organizationName}</div>
    </header>
  );
}
