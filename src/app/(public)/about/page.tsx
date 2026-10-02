import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getPublicWebsite } from "@/lib/public-site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "درباره FINORA",
  description: "آشنایی با FINORA و رویکرد آن در ارائه خدمات اداری، مالی و مالیاتی.",
};

export default async function AboutPage() {
  const { t, lang } = await getT();
  const site = await getPublicWebsite();
  if (!site) return null;
  const content = site.content as Record<string, Record<string, string>>;
  const c = content[lang] ?? content.fa ?? {};

  return (
    <div>
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <p className="text-xs font-black uppercase tracking-[.2em] text-emerald-300">FINORA</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight sm:text-5xl">{t("about")}؛ {t("publicHeroSub")}</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">{t("publicIntro")}</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
            <p className="text-xs font-black text-emerald-700">{t("slogan")}</p>
            <h2 className="mt-3 text-2xl font-black text-slate-950">{t("publicHeroLead")}</h2>
            <p className="mt-5 text-sm leading-8 text-slate-600">{t("publicScope")}</p>
            <p className="mt-4 text-sm leading-8 text-slate-600">{t("publicIntro")}</p>
          </article>
          <aside className="rounded-3xl bg-emerald-950 p-7 text-white sm:p-10">
            <h2 className="text-xl font-black">{site.org.name}</h2>
            <p className="mt-3 text-sm leading-7 text-emerald-100">{c.address || t("addressShort")}</p>
            <div className="mt-7 space-y-3 text-sm text-emerald-50">
              {[c.phone1, c.phone2, c.phone3].filter(Boolean).map((p) => <a key={p} href={`tel:${p.replace(/\s/g, "")}`} className="block hover:underline">{p}</a>)}
              {c.email && <a href={`mailto:${c.email}`} className="block hover:underline">{c.email}</a>}
            </div>
            <Link href="/contact" className="mt-7 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-black text-emerald-950">{t("contact")}</Link>
          </aside>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            [t("publicServices"), t("publicStep1")],
            [t("documents"), t("publicStep2")],
            [t("officialForms"), t("publicStep3")],
          ].map(([title, text]) => <article key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6"><div className="text-emerald-700">✓</div><h3 className="mt-3 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></article>)}
        </div>
        <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900"><p>{t("disclaimer")}</p><p className="mt-2 font-bold">{t("notGovernment")}</p></div>
      </section>
    </div>
  );
}
