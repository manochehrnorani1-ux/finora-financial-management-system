import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getPublicOfferings, getPublicWebsite, localized, localizedList, type PublicLang } from "@/lib/public-site";
import type { Metadata } from "next";
import { SERVICE_GROUPS, groupLabel, itemLabel } from "@/lib/service-groups";

export const metadata: Metadata = {
  title: "خدمات اداری، مالی و جوازها",
  description: "فهرست خدمات FINORA، روند اجرایی و مدارک مورد نیاز.",
};

export default async function PublicServicesPage() {
  const { t, lang } = await getT();
  const site = await getPublicWebsite();
  if (!site) return null;
  const offerings = await getPublicOfferings(site.org.id);
  const content = site.content as Record<string, Record<string, string>>;
  const c = content[lang] ?? content.fa ?? {};
  const phone = (c.phone1 || site.org.phone || "").replace(/\s/g, "");

  return (
    <div>
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-18">
          <p className="text-xs font-black uppercase tracking-[.2em] text-emerald-300">FINORA / SERVICES</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black sm:text-5xl">{t("publicServices")}</h1>
          <p className="mt-5 max-w-3xl text-sm leading-8 text-slate-300 sm:text-base">{t("publicIntro")}</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="mb-10 grid gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:grid-cols-2">
          <div><div className="text-xs font-black text-amber-800">{t("serviceFee")}</div><p className="mt-2 text-sm leading-6 text-amber-900">{t("feeOnReview")}</p></div>
          <div><div className="text-xs font-black text-amber-800">{t("requiredDocuments")}</div><p className="mt-2 text-sm leading-6 text-amber-900">{t("provisionalChecklist")}</p></div>
        </div>

        {SERVICE_GROUPS.map((group) => (
          <section key={group.id} className="mb-14">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div><p className="text-xs font-black text-emerald-700">FINORA</p><h2 className="mt-1 text-2xl font-black text-slate-950">{groupLabel(group, lang)}</h2></div>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">{group.items.length} {t("service")}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item, idx) => (
                <article key={item.fa} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-xs font-black text-emerald-800">{String(idx + 1).padStart(2, "0")}</span><span className="text-[10px] font-bold text-slate-400">{t("serviceFee")}</span></div>
                  <h3 className="mt-4 text-base font-black text-slate-950">{itemLabel(item, lang)}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{itemLabel({ fa: item.dFa, ps: item.dPs, en: item.dEn }, lang)}</p>
                  <div className="mt-5 border-t border-slate-100 pt-4 text-xs font-semibold text-emerald-800">{t("feeOnReview")}</div>
                </article>
              ))}
            </div>
          </section>
        ))}

        {offerings.length > 0 && (
          <section className="mb-14">
            <div className="mb-6"><p className="text-xs font-black text-emerald-700">{t("publicProcess")}</p><h2 className="mt-1 text-2xl font-black">{t("workflowSteps")} · {t("requiredDocuments")}</h2></div>
            <div className="grid gap-5 lg:grid-cols-2">
              {offerings.map((s) => {
                const oc = (s.publicContent ?? {}) as Record<string, unknown>;
                const requirements = localizedList(oc.requirements, lang as PublicLang);
                const workflow = localizedList(oc.workflow, lang as PublicLang);
                return <article key={s.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-bold text-emerald-700">{s.category ? t(s.category) : t("services")}</p>
                  <h3 className="mt-1 text-lg font-black">{localized(oc.title, lang as PublicLang, s.name)}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-500">{localized(oc.description, lang as PublicLang, s.description ?? "")}</p>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <div><h4 className="text-xs font-black">{t("requiredDocuments")}</h4><ul className="mt-2 space-y-2 text-xs leading-5 text-slate-600">{(requirements.length ? requirements : [t("provisionalChecklist")]).map((x, i) => <li key={i}>• {x}</li>)}</ul></div>
                    <div><h4 className="text-xs font-black">{t("workflowSteps")}</h4><ol className="mt-2 space-y-2 text-xs leading-5 text-slate-600">{workflow.map((x, i) => <li key={i}>{i + 1}. {x}</li>)}</ol></div>
                  </div>
                </article>;
              })}
            </div>
          </section>
        )}

        <section className="rounded-[2rem] bg-emerald-900 px-6 py-10 text-center text-white sm:px-10">
          <h2 className="text-2xl font-black">{t("publicHeroSub")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-emerald-100">{t("publicScope")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {phone && <a href={`tel:${phone}`} className="rounded-xl bg-white px-5 py-3 text-sm font-black text-emerald-900">☎ {t("urgentCall")}</a>}
            <Link href="/contact" className="rounded-xl border border-white/40 px-5 py-3 text-sm font-bold">{t("contact")}</Link>
          </div>
        </section>
      </section>
    </div>
  );
}
