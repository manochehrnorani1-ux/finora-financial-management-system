import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getPublicWebsite, localized, type PublicLang } from "@/lib/public-site";
import { FinoraLogo } from "@/components/BrandLogos";
import { SERVICE_GROUPS, groupLabel, itemLabel } from "@/lib/service-groups";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "مدیریت مالی، مالیاتی و خدمات اداری",
  description: "FINORA؛ خدمات اداری، مالی، مالیاتی، جوازها و تکمیل اسناد در افغانستان.",
};

export default async function PublicHomePage() {
  const { t, lang } = await getT();
  const site = await getPublicWebsite();
  if (!site) return null;
  const content = site.content as Record<string, Record<string, string>>;
  const c = content[lang] ?? content.fa ?? {};
  const phone = site.contactPhones[0] || c.phone1 || site.org.phone || "";
  const cleanPhone = phone.replace(/\s/g, "");

  const benefits = [
    ["01", t("taxSettlement"), t("publicStep2")],
    ["02", t("officialForms"), t("officialResources")],
    ["03", t("documents"), t("publicStep3")],
    ["04", t("reports"), t("publicStep4")],
  ];

  return (
    <div className="overflow-hidden">
      <section className="relative bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(16,185,129,.22),transparent_32%),radial-gradient(circle_at_10%_90%,rgba(14,116,144,.18),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.08fr_.92fr] lg:py-28">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-100">
              <FinoraLogo height={25} className="brightness-0 invert" />
              <span>{site.org.name}</span>
            </div>
            <p className="mt-7 text-sm font-bold text-emerald-300">{t("publicHeroTitle")}</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[1.35] tracking-tight sm:text-5xl lg:text-6xl">{t("publicHeroLead")}</h1>
            <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-slate-200">{localized({ [lang]: c.tagline }, lang as PublicLang, t("slogan"))}</p>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-400 sm:text-base">{t("publicIntro")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/services" className="rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400">{t("publicServices")} <span className="ms-1">←</span></Link>
              <Link href="/login" className="rounded-xl border border-emerald-300/40 bg-emerald-400/10 px-6 py-3.5 text-sm font-black text-emerald-100 transition hover:bg-emerald-400/20">🔐 {t("adminLogin")}</Link>
              {phone && <a href={`tel:${cleanPhone}`} className="rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold transition hover:bg-white/10">☎ {t("urgentCall")}</a>}
              <Link href="/contact" className="rounded-xl border border-white/20 px-6 py-3.5 text-sm font-bold transition hover:bg-white/10">{t("contact")}</Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-xs text-slate-400">
              <span>✓ {t("notGovernment")}</span>
              <span>✓ {t("feeOnReview")}</span>
              <span>✓ {t("provisionalChecklist")}</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="rounded-[2rem] border border-white/10 bg-white/[.07] p-4 shadow-2xl backdrop-blur sm:p-6">
              <div className="rounded-2xl bg-white p-6 text-slate-900 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                  <div><div className="text-xl font-black text-emerald-900">FINORA</div><div className="mt-1 text-xs text-slate-500">{t("slogan")}</div></div>
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-xl font-black text-emerald-800">F</div>
                </div>
                <p className="mt-6 text-sm font-bold leading-7">{t("publicHeroSub")}</p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {benefits.map(([n, title, desc]) => <div key={n} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="text-xs font-black text-emerald-700">{n}</div><div className="mt-2 text-sm font-bold">{title}</div><div className="mt-1 text-[11px] leading-5 text-slate-500">{desc}</div></div>)}
                </div>
                <div className="mt-5 rounded-xl bg-emerald-950 p-4 text-xs leading-6 text-emerald-50">{t("publicScope")}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:py-14 md:grid-cols-3">
          {[["01", t("publicProcess"), t("publicStep1")], ["02", t("documents"), t("publicStep2")], ["03", t("officialForms"), t("publicStep3")]].map(([n, title, text]) => (
            <div key={n} className="flex gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-sm font-black text-emerald-800">{n}</div><div><h2 className="font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></div></div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-700">FINORA</p><h2 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">{t("publicServices")}</h2><p className="mt-4 text-sm leading-7 text-slate-500 sm:text-base">{t("publicIntro")}</p></div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {SERVICE_GROUPS.map((group) => (
            <section key={group.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4"><h3 className="text-lg font-black text-slate-950">{groupLabel(group, lang)}</h3><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">{group.items.length} {t("service")}</span></div>
              <div className="mt-5 space-y-2">
                {group.items.slice(0, 5).map((item, idx) => <div key={item.fa} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3"><span className="text-xs font-black text-emerald-700">{String(idx + 1).padStart(2, "0")}</span><div className="text-sm font-semibold text-slate-700">{itemLabel(item, lang)}</div></div>)}
              </div>
            </section>
          ))}
        </div>
        <div className="mt-8 text-center"><Link href="/services" className="inline-flex rounded-xl border border-emerald-700 px-6 py-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50">{t("learnMore")} ←</Link></div>
      </section>

      <section className="bg-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              [t("security"), t("publicScope")],
              [t("workflow"), t("publicStep3")],
              [t("reports"), t("publicStep4")],
              [t("officialResources"), t("provisionalChecklist")],
            ].map(([title, desc]) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6"><div className="text-2xl text-emerald-700">✦</div><h3 className="mt-4 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{desc}</p></article>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="rounded-[2rem] bg-emerald-900 px-6 py-10 text-white sm:px-10 sm:py-12 lg:flex lg:items-center lg:justify-between lg:gap-8">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-300">FINORA</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">{t("publicHeroSub")}</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-100">{t("publicScope")}</p></div>
          <div className="mt-6 flex shrink-0 flex-wrap gap-3 lg:mt-0"><Link href="/services" className="rounded-xl bg-white px-5 py-3 text-sm font-black text-emerald-900">{t("publicServices")}</Link><Link href="/contact" className="rounded-xl border border-white/40 px-5 py-3 text-sm font-bold text-white">{t("contact")}</Link></div>
        </div>
      </section>
    </div>
  );
}
