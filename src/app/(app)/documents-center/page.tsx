import Link from "next/link";
import type { Metadata } from "next";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { complianceEvents, documents, generatedForms, letters, officialForms } from "@/db/schema";
import { pageContext } from "@/lib/page";
import { Card, Stat } from "@/components/ui";

export const metadata: Metadata = { title: "مرکز اسناد و فورم‌ها" };

export default async function DocumentsCenterPage() {
  const { ctx, t } = await pageContext();
  const modules = [
    { key: "documents", href: "/documents", icon: "📄", perm: "documents.read", helpKey: "documentsModuleHelp" },
    { key: "officialForms", href: "/official-forms", icon: "🧮", perm: "official_forms.read", helpKey: "formsModuleHelp" },
    { key: "letters", href: "/letters", icon: "✉", perm: "letters.read", helpKey: "lettersModuleHelp" },
    { key: "compliance", href: "/compliance", icon: "🛡", perm: "compliance.read", helpKey: "complianceModuleHelp" },
  ].filter((m) => ctx.can(m.perm as never));

  if (modules.length === 0) return <div className="rounded-xl bg-white p-8 text-center text-red-600">{t("forbidden")}</div>;

  const canDocs = ctx.can("documents.read");
  const canForms = ctx.can("official_forms.read");
  const canLetters = ctx.can("letters.read");
  const canCompliance = ctx.can("compliance.read");
  const [docTotal, pendingDocs, forms, generated, letterRows, complianceRows] = await Promise.all([
    canDocs ? db.select({ n: sql<number>`count(*)::int` }).from(documents).where(eq(documents.organizationId, ctx.org.id)) : Promise.resolve([{ n: 0 }]),
    canDocs ? db.select({ n: sql<number>`count(*)::int` }).from(documents).where(and(eq(documents.organizationId, ctx.org.id), inArray(documents.status, ["submitted", "under_review"]))) : Promise.resolve([{ n: 0 }]),
    canForms ? db.select({ n: sql<number>`count(*)::int` }).from(officialForms).where(eq(officialForms.organizationId, ctx.org.id)) : Promise.resolve([{ n: 0 }]),
    canForms ? db.select({ n: sql<number>`count(*)::int` }).from(generatedForms).where(eq(generatedForms.organizationId, ctx.org.id)) : Promise.resolve([{ n: 0 }]),
    canLetters ? db.select({ total: sql<number>`count(*)::int`, draft: sql<number>`count(*) filter (where ${letters.status}='draft')::int` }).from(letters).where(eq(letters.organizationId, ctx.org.id)) : Promise.resolve([{ total: 0, draft: 0 }]),
    canCompliance ? db.select({ total: sql<number>`count(*)::int`, pending: sql<number>`count(*) filter (where ${complianceEvents.result}='needs_review')::int` }).from(complianceEvents).where(eq(complianceEvents.organizationId, ctx.org.id)) : Promise.resolve([{ total: 0, pending: 0 }]),
  ]);

  const counts: Record<string, number> = {
    documents: docTotal[0]?.n ?? 0,
    officialForms: forms[0]?.n ?? 0,
    letters: letterRows[0]?.total ?? 0,
    compliance: complianceRows[0]?.total ?? 0,
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">{t("operationalCenter")}</p><h1 className="mt-1 text-2xl font-bold text-slate-900">{t("documentsCenter")}</h1><p className="mt-1 text-sm text-slate-500">{t("documentsCenterHelp")}</p></div>
        {ctx.can("documents.write") && <Link href="/documents" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">+ {t("document")}</Link>}
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {canDocs && <Stat label={t("documents")} value={docTotal[0]?.n ?? 0} tone="blue" sub={`${pendingDocs[0]?.n ?? 0} ${t("pendingApprovals")}`} />}
        {canForms && <Stat label={t("officialForms")} value={forms[0]?.n ?? 0} sub={`${generated[0]?.n ?? 0} ${t("generatedDocument")}`} />}
        {canLetters && <Stat label={t("letters")} value={letterRows[0]?.total ?? 0} sub={`${letterRows[0]?.draft ?? 0} ${t("draft")}`} />}
        {canCompliance && <Stat label={t("compliance")} value={complianceRows[0]?.total ?? 0} tone={(complianceRows[0]?.pending ?? 0) > 0 ? "amber" : "default"} sub={`${complianceRows[0]?.pending ?? 0} ${t("awaitingReview")}`} />}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {modules.map((m) => (
          <Card key={m.key} className="transition hover:border-emerald-300 hover:shadow-md">
            <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-50 text-2xl">{m.icon}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="font-bold text-slate-800">{t(m.key)}</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold">{counts[m.key]}</span></div><p className="mt-1 text-sm leading-6 text-slate-500">{t(m.helpKey)}</p><Link href={m.href} className="mt-3 inline-flex text-sm font-semibold text-emerald-700 hover:underline">{t("openModule")} →</Link></div></div>
          </Card>
        ))}
      </div>
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-500"><strong className="text-slate-700">{t("workflow")}:</strong> {t("case")} → {t("documents")} → {t("officialForms")} / {t("letters")} → {t("approve")} → {t("archive")}</div>
    </>
  );
}
