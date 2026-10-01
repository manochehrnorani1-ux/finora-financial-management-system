import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getPublicWebsite, localized, type PublicLang } from "@/lib/public-site";
import { Card } from "@/components/ui";
import { FinoraLogo } from "@/components/BrandLogos";
import { SERVICE_GROUPS, groupLabel, itemLabel } from "@/lib/service-groups";



export default async function PublicHomePage() {
  const { t, lang } = await getT();
  const site = await getPublicWebsite();
  if (!site) return null;

  const content = site.content as Record<string, Record<string, string>>;
  const c = content[lang] ?? content.fa ?? {};
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white">
        <div className="absolute inset-0 opacity-10" aria-hidden="true"><div className="absolute -top-32 -end-24 h-96 w-96 rounded-full border-[48px] border-emerald-300" /><div className="absolute -bottom-48 start-1/4 h-[32rem] w-[32rem] rounded-full border-[1px] border-white" /></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-28 grid lg:grid-cols-[1.15fr_.85fr] gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs text-emerald-100">
              <FinoraLogo height={26} className="brightness-0 invert" />
              <span>Afghanistan</span>
            </div>
            <p className="mt-6 text-sm sm:text-base text-emerald-300">{t("publicHeroTitle")}</p>
            <h1 className="mt-3 text-3xl sm:text-5xl lg:text-6xl font-black leading-[1.35] max-w-3xl">{t("publicHeroLead")}</h1>
            <p className="mt-5 text-lg text-slate-300">{localized(c.tagline ? { [lang]: c.tagline } : null, lang, t("slogan"))}</p>
            <p className="mt-5 max-w-2xl text-sm sm:text-base leading-8 text-slate-300">{t("publicIntro")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/services" className="rounded-lg bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400">{t("publicServices")} <span className="ms-1">→</span></Link>
              <a href={`tel:${(c.phone1 || "0744173723").replace(/\s/g, "")}`} className="rounded-lg border border-white/25 px-5 py-3 text-sm font-semibold hover:bg-white/10">☎ {t("urgentCall")}</a>
              <Link href="/login" className="rounded-lg border border-white/25 px-5 py-3 text-sm font-semibold hover:bg-white/10">🔐 {t("adminLogin")}</Link>
            </div>
          </div>
          <div className="mx-auto w-full max-w-md">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-7 shadow-2xl backdrop-blur">
              <div className="flex items-center gap-4 border-b border-white/10 pb-5">
                <div className="h-14 w-14 rounded-xl bg-emerald-600 grid place-items-center text-2xl font-black">F</div>
                <div><div className="text-xl font-bold">FINORA</div><div className="text-sm text-slate-300">{t("slogan")}</div></div>
              </div>
              <p className="py-5 text-sm leading-7 text-slate-300">{t("publicScope")}</p>
              <div className="grid grid-cols-2 gap-3">
                {["taxSettlement", "officialForms", "documents", "reports"].map((key) => <div key={key} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-3 text-sm"><span className="text-emerald-300">✓</span>{t(key)}</div>)}
              </div>
              <div className="mt-5 rounded-lg border border-amber-200/20 bg-amber-100/5 p-3 text-xs leading-6 text-amber-100">{t("notGovernment")}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
          <div><p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">FINORA</p><h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">{t("publicServices")}</h2><p className="mt-2 text-sm text-slate-500">{t("publicHeroSub")}</p></div>
          <Link href="/services" className="text-sm font-semibold text-emerald-800 hover:underline">{t("learnMore")} →</Link>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {SERVICE_GROUPS.map((group) => (
            <section key={group.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-base font-bold text-white">{groupLabel(group, lang)}</h3>
                <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-100">{group.items.length} {t("service")}</span>
              </div>
              <div className="space-y-3">
                {group.items.map((item, idx) => (
                  <div key={item.fa} className="flex items-start gap-3 rounded-xl bg-white/5 px-3 py-3 transition hover:bg-white/10">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-600/30 text-sm font-bold text-emerald-200">{String(idx + 1).padStart(2, "0")}</span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-white">{itemLabel(item, lang)}</h4>
                      <p className="mt-1 text-xs leading-5 text-slate-300">{itemLabel({ fa: item.dFa, ps: item.dPs, en: item.dEn }, lang)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
          <div className="text-center max-w-2xl mx-auto"><p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">FINORA</p><h2 className="mt-2 text-2xl sm:text-3xl font-bold">{t("publicProcess")}</h2><p className="mt-3 text-sm leading-7 text-slate-500">{t("publicScope")}</p></div>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {["publicStep1", "publicStep2", "publicStep3", "publicStep4"].map((step, i) => <div key={step} className="rounded-xl border border-slate-200 p-5"><div className="text-emerald-700 font-black text-2xl">0{i + 1}</div><p className="mt-3 text-sm leading-6 font-medium">{t(step)}</p></div>)}
          </div>
          <p className="mt-8 text-center text-xs leading-6 text-slate-500">{t("disclaimer")}</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-2xl bg-emerald-900 px-6 py-8 sm:px-10 sm:py-10 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div><h2 className="text-xl font-bold">{t("contact")}</h2><p className="mt-2 text-sm text-emerald-100">{c.address || t("addressShort")}</p></div>
          <div className="flex flex-wrap gap-3"><a href={`tel:${(c.phone1 || "0744173723").replace(/\s/g, "")}`} className="rounded-lg bg-white text-emerald-900 px-4 py-2.5 text-sm font-semibold">☎ {t("urgentCall")}</a><Link href="/contact" className="rounded-lg border border-white/40 px-4 py-2.5 text-sm font-semibold">{t("contact")}</Link></div>
        </div>
      </section>
    </>
  );
}
