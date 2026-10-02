import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { getPublicWebsite } from "@/lib/public-site";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicLanguageSwitcher } from "@/components/PublicLanguageSwitcher";
import { SERVICE_GROUPS, groupLabel, itemLabel } from "@/lib/service-groups";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const { t, lang } = await getT();
  const data = await getPublicWebsite();
  if (!data) notFound();

  const content = data.content as Record<string, Record<string, string>>;
  const c = content[lang] ?? content.fa ?? {};
  const phones = [c.phone1, c.phone2, c.phone3].filter(Boolean);
  const email = c.email || data.org.email || "";
  const address = c.address || data.org.address || "";
  const serviceLinks = SERVICE_GROUPS.flatMap((group) =>
    group.items.map((item) => ({
      label: itemLabel(item, lang),
      href: "/services",
      group: groupLabel(group, lang),
    })),
  ).slice(0, 6);

  return (
    <div dir={lang === "en" ? "ltr" : "rtl"} className="min-h-screen bg-white text-slate-800">
      <PublicHeader organizationName={data.org.name} phone={phones[0] || ""} logoUrl={data.org.logoUrl ? data.org.logoUrl.replace("/api/organization/logo/", "/api/public/organization-logo/") : null} />
      <main>{children}</main>

      <footer className="mt-16 bg-slate-950 text-slate-200 print:hidden">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.35fr_.8fr_1fr_1fr]">
            <section>
              <Link href="/" className="inline-block text-2xl font-black tracking-wide text-white">FINORA</Link>
              <p className="mt-2 text-sm font-semibold text-emerald-300">{t("slogan")}</p>
              <p className="mt-4 max-w-md text-sm leading-7 text-slate-400">{t("publicHeroSub")}</p>
              <p className="mt-3 max-w-md text-xs leading-6 text-slate-500">{t("publicIntro")}</p>
            </section>

            <nav aria-label={t("quickNav")}>
              <h2 className="mb-4 text-sm font-black text-white">{t("quickNav")}</h2>
              <div className="space-y-2.5 text-sm">
                {[
                  ["/", t("home")],
                  ["/services", t("services")],
                  ["/about", t("about")],
                  ["/contact", t("contact")],
                ].map(([href, label]) => (
                  <Link key={href} href={href} className="block text-slate-400 transition hover:text-white">{label}</Link>
                ))}
              </div>
            </nav>

            <nav aria-label={t("publicServices")}>
              <h2 className="mb-4 text-sm font-black text-white">{t("publicServices")}</h2>
              <div className="space-y-2.5 text-sm">
                {serviceLinks.map((service) => (
                  <Link key={service.label} href={service.href} className="block text-slate-400 transition hover:text-white">
                    {service.label}
                  </Link>
                ))}
              </div>
            </nav>

            <section>
              <h2 className="mb-4 text-sm font-black text-white">{t("contact")}</h2>
              <div className="space-y-2.5 text-sm text-slate-400">
                {phones.map((phone) => (
                  <a key={phone} href={`tel:${phone.replace(/\s/g, "")}`} dir="ltr" className="block w-fit transition hover:text-white">{phone}</a>
                ))}
                {email && <a href={`mailto:${email}`} dir="ltr" className="block w-fit break-all transition hover:text-white">{email}</a>}
                {address && <div className="leading-6">{address}</div>}
              </div>
            </section>
          </div>

          <div className="mt-10 grid gap-6 border-t border-white/10 pt-7 md:grid-cols-[1fr_auto_auto] md:items-center">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-bold text-slate-300">{t("language")}:</span>
              <PublicLanguageSwitcher lang={lang} />
            </div>

            <Link href="/login" className="inline-flex w-fit items-center rounded-xl border border-emerald-500/50 px-4 py-2.5 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/10">
              {t("adminLogin")}
            </Link>

            <p className="text-xs leading-6 text-slate-500">{t("notGovernment")}</p>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs leading-6 text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>© {new Date().getFullYear()} FINORA</span>
            <span>{data.org.name}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
