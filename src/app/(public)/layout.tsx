import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { getPublicOfficialResources, getPublicWebsite, localized, type PublicLang } from "@/lib/public-site";
import { PublicHeader } from "@/components/PublicHeader";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const { t, lang } = await getT();
  const data = await getPublicWebsite();
  if (!data) notFound();
  const content = data.content as Record<string, Record<string, string>>;
  const c = content[lang] ?? content.fa ?? {};
  const resources = await getPublicOfficialResources(data.org.id);
  const phone = c.phone1 || data.org.phone || "0744173723";
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <PublicHeader organizationName={data.org.name} phone={phone} />
      <main>{children}</main>
      <footer className="bg-slate-950 text-slate-200 mt-16 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid md:grid-cols-3 gap-8">
          <div>
            <div className="text-xl font-black text-white">FINORA</div>
            <div className="text-emerald-300 text-sm mt-1">{t("slogan")}</div>
            <p className="mt-3 text-sm text-slate-300 leading-7">{t("publicHeroSub")}</p>
          </div>
          <div>
            <h2 className="font-semibold text-white mb-3">{t("contact")}</h2>
            <div className="space-y-2 text-sm text-slate-300">
              {[c.phone1, c.phone2, c.phone3].filter(Boolean).map((p) => <div key={p}><a href={`tel:${p.replace(/\s/g, "")}`} dir="ltr" className="hover:text-white">{p}</a></div>)}
              <div><a href={`mailto:${c.email || "manochehr.mb@gmail.com"}`} className="hover:text-white">{c.email || "manochehr.mb@gmail.com"}</a></div>
              <div>{c.address || t("addressShort")}</div>
            </div>
          </div>
          <div>
            <h2 className="font-semibold text-white mb-3">{t("officialResources")}</h2>
            <div className="space-y-2 text-sm">
              {resources.map((r) => <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="block text-slate-300 hover:text-white underline decoration-slate-600 underline-offset-4">{r.title}</a>)}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 max-w-7xl mx-auto px-4 sm:px-6 py-5 text-xs leading-6 text-slate-400">
          <p>{t("disclaimer")}</p>
          <p className="mt-1 text-slate-300">{t("notGovernment")}</p>
          <div className="mt-3 flex flex-wrap justify-between gap-2"><span>© {new Date().getFullYear()} FINORA · {data.org.name}</span><span>{t("slogan")}</span></div>
        </div>
      </footer>
    </div>
  );
}
