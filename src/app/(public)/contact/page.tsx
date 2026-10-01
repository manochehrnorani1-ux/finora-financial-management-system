import { getT } from "@/lib/i18n/server";
import { getPublicWebsite } from "@/lib/public-site";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "تماس با FINORA",
};

export default async function ContactPage() {
  const { t, lang } = await getT();
  const site = await getPublicWebsite();
  if (!site) return null;
  const content = site.content as Record<string, Record<string, string>>;
  const c = content[lang] ?? content.fa ?? {};
  const phones = [c.phone1 || "0744173723", c.phone2 || "0744232689", c.phone3 || "0744436286"];
  const email = c.email || "manochehr.mb@gmail.com";
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <PageHeader title={t("contact")} subtitle={site.org.name} />
      <div className="grid md:grid-cols-2 gap-5">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-lg">FINORA</h2><p className="mt-1 text-sm text-slate-500">{t("slogan")}</p>
          <div className="mt-6 space-y-4">
            <div><h3 className="text-xs text-slate-500">{t("phone")}</h3><div className="mt-1 space-y-1">{phones.map((p) => <a key={p} href={`tel:${p.replace(/\s/g, "")}`} dir="ltr" className="block w-fit font-semibold text-emerald-800 hover:underline">{p}</a>)}</div></div>
            <div><h3 className="text-xs text-slate-500">{t("email")}</h3><a href={`mailto:${email}`} className="font-semibold text-emerald-800 hover:underline">{email}</a></div>
            <div><h3 className="text-xs text-slate-500">{t("address")}</h3><p className="mt-1 font-medium">{c.address || t("addressShort")}</p></div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">{phones.map((p) => <a key={`c${p}`} href={`tel:${p.replace(/\s/g, "")}`} className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">☎ {t("urgentCall")}</a>)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-lg">{t("publicProcess")}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{t("publicScope")}</p>
          <div className="mt-5 rounded-lg bg-slate-50 p-4 text-xs leading-6 text-slate-500">{t("disclaimer")}<p className="mt-2 font-semibold text-slate-700">{t("notGovernment")}</p></div>
          <p className="mt-4 text-xs text-slate-500">{t("publicRequests")} — {t("no")} · {t("onlinePayments")} — {t("no")}</p>
        </div>
      </div>
    </div>
  );
}
