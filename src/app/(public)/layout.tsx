import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { getPublicOfficialResources, getPublicWebsite } from "@/lib/public-site";
import { PublicHeader } from "@/components/PublicHeader";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const { t, lang } = await getT();
  const data = await getPublicWebsite();
  if (!data) notFound();
  const content = data.content as Record<string, Record<string, string>>;
  const c = content[lang] ?? content.fa ?? {};
  const resources = await getPublicOfficialResources(data.org.id);
  const phone = c.phone1 || data.org.phone || "";

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <PublicHeader organizationName={data.org.name} phone={phone} />
      <main>{children}</main>
      <footer className="mt-16 bg-slate-950 text-slate-200 print:hidden">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_.8fr_.8fr]">
          <div>
            <div className="text-2xl font-black text-white">FINORA</div>
            <div className="mt-1 text-sm font-semibold text-emerald-300">{t("slogan")}</div>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-400">{t("publicHeroSub")}</p>
          </div>
          <div>
            <h2 className="mb-4 font-black text-white">{t("contact")}</h2>
            <div className="space-y-2 text-sm text-slate-300">
              {[c.phone1, c.phone2, c.phone3].filter(Boolean).map((p) => <a key={p} href={`tel:${p.replace(/\s/g, "")}`} dir="ltr" className="block hover:text-white">{p}</a>)}
              {c.email && <a href={`mailto:${c.email}`} className="block hover:text-white">{c.email}</a>}
              <div className="leading-6">{c.address || data.org.address || t("addressShort")}</div>
            </div>
          </div>
          <div>
            <h2 className="mb-4 font-black text-white">{t("officialResources")}</h2>
            <div className="space-y-2 text-sm">
              {resources.slice(0, 6).map((r) => <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="block text-slate-400 underline decoration-slate-700 underline-offset-4 hover:text-white">{r.title}</a>)}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 px-4 py-5 text-xs leading-6 text-slate-500 sm:flex-row sm:px-6">
            <span>© {new Date().getFullYear()} FINORA · {data.org.name}</span>
            <span>{t("notGovernment")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
