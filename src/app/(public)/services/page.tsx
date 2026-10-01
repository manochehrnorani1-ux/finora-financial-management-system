import { getT } from "@/lib/i18n/server";
import { getPublicOfferings, getPublicWebsite, localized, localizedList, type PublicLang } from "@/lib/public-site";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { SERVICE_GROUPS, groupLabel, itemLabel } from "@/lib/service-groups";

export const metadata: Metadata = {
  title: "خدمات اداری، مالی و جوازها",
};


export default async function PublicServicesPage() {
  const { t, lang } = await getT();
  const site = await getPublicWebsite();
  if (!site) return null;
  const offerings = await getPublicOfferings(site.org.id);
  const content = site.content as Record<string, Record<string, string>>;
  const c = content[lang] ?? content.fa ?? {};
  const phone = (c.phone1 || site.org.phone || "0744173723").replace(/\s/g, "");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <PageHeader title={t("publicServices")} subtitle={t("publicIntro")} />
      <div className="mb-7 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">{t("provisionalChecklist")} {t("feeOnReview")}</div>

      {SERVICE_GROUPS.map((group) => (
        <section key={group.id} className="mb-10">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{groupLabel(group, lang)}</h2>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              {group.items.length} {t("service")}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {group.items.map((item, idx) => (
              <article key={item.fa} className="group relative flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md">
                <span className="absolute end-4 top-4 text-4xl font-black leading-none text-slate-100 transition group-hover:text-emerald-100" aria-hidden="true">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div className="relative">
                  <span className="inline-block h-1 w-10 rounded-full bg-emerald-600" />
                  <h3 className="mt-3 text-base font-bold text-slate-900">{itemLabel(item, lang)}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{itemLabel({ fa: item.dFa, ps: item.dPs, en: item.dEn }, lang)}</p>
                </div>
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-500">{t("serviceFee")}: </span>
                  <span className="text-xs font-semibold text-emerald-800">{t("feeOnReview")}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      {offerings.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-bold text-slate-900">{t("workflowSteps")} · {t("requiredDocuments")}</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {offerings.slice(0, 8).map((s) => {
              const oc = (s.publicContent ?? {}) as Record<string, unknown>;
              const requirements = localizedList((oc as Record<string, unknown>).requirements, lang as PublicLang);
              const workflow = localizedList((oc as Record<string, unknown>).workflow, lang as PublicLang);
              return (
                <article key={s.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-emerald-700">{s.category ? t(s.category) : t("services")}</p>
                  <h3 className="mt-1 text-base font-bold">{localized(oc.title, lang as PublicLang, s.name)}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{localized(oc.description, lang as PublicLang, s.description ?? "")}</p>
                  <div className="mt-4 grid sm:grid-cols-2 gap-4">
                    <div><h4 className="text-xs font-semibold">{t("requiredDocuments")}</h4><ul className="mt-2 space-y-1 text-xs text-slate-600">{(requirements.length ? requirements : [t("provisionalChecklist")]).map((x, i) => <li key={i} className="flex gap-2"><span className="text-emerald-700">•</span><span>{x}</span></li>)}</ul></div>
                    <div><h4 className="text-xs font-semibold">{t("workflowSteps")}</h4><ol className="mt-2 space-y-1 text-xs text-slate-600">{workflow.map((x, i) => <li key={i}>{i + 1}. {x}</li>)}</ol></div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <div className="rounded-xl bg-emerald-900 px-6 py-8 text-center">
        <h2 className="text-lg font-bold text-white">{t("contact")}</h2>
        <p className="mt-2 text-sm text-emerald-100">{c.address || t("addressShort")}</p>
        <a href={`tel:${phone}`} className="mt-4 inline-block rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-emerald-900">☎ {t("urgentCall")}</a>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600">
        <h2 className="font-semibold text-slate-900 mb-2">{t("officialResources")}</h2>
        <p>{t("disclaimer")}</p>
        <p className="mt-2 font-medium text-slate-700">{t("notGovernment")}</p>
      </div>
    </div>
  );
}
