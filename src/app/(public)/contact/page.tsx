import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getPublicWebsite } from "@/lib/public-site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "تماس با FINORA",
  description: "راه‌های تماس با FINORA و دریافت اطلاعات خدمات.",
};

export default async function ContactPage() {
  const { t, lang } = await getT();
  const site = await getPublicWebsite();
  if (!site) return null;
  const content = site.content as Record<string, Record<string, string>>;
  const c = content[lang] ?? content.fa ?? {};
  const phones = [c.phone1, c.phone2, c.phone3].filter(Boolean);
  const email = c.email || site.org.email || "";
  const address = c.address || site.org.address || t("addressShort");

  return (
    <div>
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
          <p className="text-xs font-black uppercase tracking-[.2em] text-emerald-300">FINORA / CONTACT</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black sm:text-5xl">{t("contact")}</h1>
          <p className="mt-5 max-w-2xl text-sm leading-8 text-slate-300 sm:text-base">{t("publicScope")}</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
            <p className="text-xs font-black text-emerald-700">{site.org.name}</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">{t("publicHeroSub")}</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div><h3 className="text-xs font-black text-slate-400">{t("phone")}</h3><div className="mt-2 space-y-2">{phones.length ? phones.map((p) => <a key={p} href={`tel:${p.replace(/\s/g, "")}`} dir="ltr" className="block w-fit font-bold text-emerald-800 hover:underline">{p}</a>) : <span className="text-sm text-slate-500">—</span>}</div></div>
              <div><h3 className="text-xs font-black text-slate-400">{t("email")}</h3>{email ? <a href={`mailto:${email}`} className="mt-2 block font-bold text-emerald-800 hover:underline">{email}</a> : <span className="mt-2 block text-sm text-slate-500">—</span>}</div>
            </div>
            <div className="mt-7 rounded-2xl bg-slate-50 p-5"><h3 className="text-xs font-black text-slate-400">{t("address")}</h3><p className="mt-2 text-sm font-bold leading-7 text-slate-700">{address}</p></div>
            <div className="mt-7 flex flex-wrap gap-3">
              {phones[0] && <a href={`tel:${phones[0].replace(/\s/g, "")}`} className="rounded-xl bg-emerald-800 px-5 py-3 text-sm font-black text-white">{t("urgentCall")}</a>}
              {email && <a href={`mailto:${email}`} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700">{t("email")}</a>}
            </div>
          </div>
          <div className="rounded-3xl bg-emerald-950 p-7 text-white sm:p-10">
            <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-300">FINORA</p>
            <h2 className="mt-3 text-2xl font-black">{t("publicProcess")}</h2>
            <div className="mt-7 space-y-5">
              {[t("publicStep1"), t("publicStep2"), t("publicStep3"), t("publicStep4")].map((x, i) => <div key={x} className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-xs font-black text-emerald-200">{i + 1}</span><p className="text-sm leading-6 text-emerald-50">{x}</p></div>)}
            </div>
            <Link href="/services" className="mt-8 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-black text-emerald-950">{t("publicServices")}</Link>
          </div>
        </div>
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900"><p>{t("disclaimer")}</p><p className="mt-2 font-bold">{t("notGovernment")}</p></div>
      </section>
    </div>
  );
}
