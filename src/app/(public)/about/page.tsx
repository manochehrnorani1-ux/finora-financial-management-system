import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getPublicWebsite } from "@/lib/public-site";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "درباره ما",
};

export default async function AboutPage() {
  const { t } = await getT();
  const site = await getPublicWebsite();
  if (!site) return null;
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <PageHeader title={t("about")} subtitle={t("slogan")} />
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm">
        <div className="text-emerald-800 font-black text-2xl">FINORA</div>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">{t("publicHeroSub")}</h2>
        <p className="mt-4 text-sm sm:text-base text-slate-600 leading-8">{t("publicIntro")}</p>
        <p className="mt-3 text-sm sm:text-base text-slate-600 leading-8">{t("publicScope")}</p>
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          {["taxSettlement", "administrative", "documents"].map((k) => <div key={k} className="rounded-xl bg-slate-50 border border-slate-200 p-4"><div className="font-semibold">{t(k)}</div><div className="mt-2 text-xs leading-6 text-slate-500">{t("publicStep2")}</div></div>)}
        </div>
        <div className="mt-8 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm leading-7 text-amber-900"><p>{t("disclaimer")}</p><p className="mt-2 font-semibold">{t("notGovernment")}</p></div>
        <Link href="/contact" className="inline-flex mt-6 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white">{t("contact")}</Link>
      </div>
    </div>
  );
}
