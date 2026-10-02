import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { taxRules, taxTypes } from "@/db/schema";
import { pageContext, sp1, type SP } from "@/lib/page";
import { taxReport } from "@/lib/reports";
import { ensureMofTaxCatalog, type TaxRuleConditions } from "@/lib/tax-engine";
import { saveTaxType, deleteTaxType } from "@/actions/finance";
import { Badge, Card, Money, PageHeader, Stat, Table } from "@/components/ui";
import { ActionButton, FormDialog } from "@/components/forms";
import { formatDate } from "@/lib/jalali";
import type { Metadata } from "next";
import { TaxNav } from "@/components/TaxNav";

export const metadata: Metadata = {
  title: "انواع مالیه و ریکاردها",
};

export default async function TaxesPage({ searchParams }: { searchParams: SP }) {
  const { ctx, t, fmt } = await pageContext("taxes.read");
  const q = await searchParams;
  const f = { from: sp1(q.from), to: sp1(q.to) };

  await db.transaction((tx) => ensureMofTaxCatalog(tx, ctx.org.id, ctx.user.id));

  const [types, rules, report] = await Promise.all([
    db.select().from(taxTypes).where(eq(taxTypes.organizationId, ctx.org.id)).orderBy(taxTypes.code),
    db.select().from(taxRules).where(eq(taxRules.organizationId, ctx.org.id)).orderBy(desc(taxRules.effectiveFrom), desc(taxRules.version)),
    taxReport(ctx.org.id, f),
  ]);
  const canWrite = ctx.can("taxes.write");

  const activeRuleFor = (typeId: string) =>
    rules.find((r) => r.taxTypeId === typeId && r.verificationStatus === "verified" && !r.effectiveTo);

  const formatRuleRate = (r: typeof taxRules.$inferSelect | undefined) => {
    if (!r) return t("requiresLegalReview");
    const cond = (r.conditions ?? {}) as TaxRuleConditions;
    if (cond.formulaMode === "progressive_brackets") return "پلکانی ۰٪ / ۲٪ / ۱۰٪ / ۲۰٪";
    if (cond.formulaMode === "flat_tier") return "طبقه‌بندی ۰٪ / ۱۰٪ / ۱۵٪";
    if (cond.formulaMode === "exempt_threshold_excess") return `معاف تا ${(cond.exemptThreshold ?? 2000000).toLocaleString()} + ${Number(r.rate ?? 0)}%`;
    return `${Number(r.rate ?? 0)}%`;
  };

  return (
    <>
      <PageHeader title={t("taxes")} subtitle="انواع مالیه، قواعد رسمی وزارت مالیه افغانستان و ریکاردهای مالیاتی ثبت‌شده" actions={<><a href={`/print/reports?type=tax&${new URLSearchParams(Object.fromEntries(Object.entries(f).filter(([, v]) => v)) as Record<string, string>)}`} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">چاپ / PDF</a>
        {canWrite && <FormDialog title={t("taxTypes")} triggerLabel={`+ ${t("taxType")}`} action={saveTaxType} fields={[{ name: "name", label: t("name"), required: true }, { name: "code", label: t("code"), required: true }, { name: "description", label: t("description"), type: "textarea" }]} />}
        <Link href="/tax-settlements" className="rounded-lg bg-emerald-800 text-white px-3 py-2 text-sm font-medium">{t("taxRules")} / {t("taxSettlement")}</Link>
      </>} />
      <TaxNav active="types" t={t} />
      <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-6 text-emerald-950">{t("taxCalculationDisclaimer")} — تمام نرخ‌ها و فرمول‌ها مستقیماً از جدول قواعد رسمی وزارت مالیه (`mof.gov.af` / `ard.gov.af`) خوانده می‌شوند.</div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <Stat label={t("taxesCollected")} value={<Money value={report.total} currency={ctx.org.currency} />} tone="amber" />
        {Object.entries(report.byType).slice(0, 2).map(([k, v]) => <Stat key={k} label={k} value={<Money value={v} currency={ctx.org.currency} />} />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card title={t("taxTypes")}>
          <Table headers={[t("code"), t("name"), "فرمول / نرخ جاری وزارت مالیه", t("actions")]} empty={t("noData")}
            rows={types.map((x) => {
              const ar = activeRuleFor(x.id);
              return [
                <span key="c" className="font-mono text-xs font-semibold">{x.code}</span>,
                <div key="n"><div className="font-medium">{x.name}</div>{x.description && <div className="text-[11px] text-slate-500 max-w-md">{x.description}</div>}</div>,
                <span key="r" className="font-mono text-xs text-emerald-800 font-semibold">{formatRuleRate(ar)}</span>,
                <div key="a" className="flex gap-1">
                  {canWrite && <FormDialog title={t("edit")} triggerLabel={t("edit")} triggerVariant="secondary" triggerSize="sm" action={saveTaxType} hidden={{ id: x.id }} fields={[{ name: "name", label: t("name"), required: true, defaultValue: x.name }, { name: "code", label: t("code"), required: true, defaultValue: x.code }, { name: "description", label: t("description"), type: "textarea", defaultValue: x.description }]} />}
                  {canWrite && <ActionButton action={deleteTaxType} args={[x.id]} label={t("delete")} variant="danger" confirm={t("confirmDelete")} />}
                </div>,
              ];
            })} />
        </Card>
        <Card title="قواعد و طرزالعمل‌های فعال وزارت مالیه">
          <Table headers={[t("taxType"), t("articleNumber"), "نرخ / فرمول", t("ruleVersion"), t("sourceUrl"), t("status")]} empty={t("noData")}
            rows={rules.map((r) => [
              <span key="c" className="font-mono text-xs">{types.find((x) => x.id === r.taxTypeId)?.code ?? "-"}</span>,
              r.articleNumber ?? "-",
              <span key="r" className="font-mono text-xs">{formatRuleRate(r)}</span>,
              <span key="v" className="font-mono">v{r.version}</span>,
              <a key="u" href={r.sourceUrl ?? undefined} target="_blank" rel="noreferrer" className="text-emerald-700 underline text-xs">{t("view")}</a>,
              <Badge key="s" status={r.verificationStatus === "verified" && !r.effectiveTo ? "active" : "inactive"} label={r.effectiveTo ? t("expired") : t(r.verificationStatus === "verified" ? "verified" : "requiresLegalReview")} />,
            ])} />
        </Card>
      </div>
      <Card title={t("taxRecords")} actions={
        <form method="get" className="flex flex-wrap gap-2 text-sm">
          <input type="date" name="from" defaultValue={f.from} className="input !w-auto" />
          <input type="date" name="to" defaultValue={f.to} className="input !w-auto" />
          <button className="rounded-lg bg-slate-800 text-white px-3 py-1.5">{t("apply")}</button>
          <a href={`/api/reports/export?type=tax&format=csv`} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5">{t("exportCsv")}</a>
        </form>
      }>
        <Table headers={[t("date"), t("reference"), t("taxType"), t("taxableAmount"), `${t("taxRate")} %`, t("taxAmount"), `${t("taxAmount")} (${ctx.org.currency})`, t("status")]} empty={t("noData")}
          rows={report.rows.map(({ r, taxType }) => [
            formatDate(r.recordDate, fmt), t(r.referenceType === "income" ? "income" : "expenses"), taxType ?? "-",
            <Money key="ta" value={r.taxableAmount} currency={r.currency} />, <span key="r" className="font-mono">{Number(r.taxRate)}%</span>,
            <Money key="t" value={r.taxAmount} currency={r.currency} />, <Money key="b" value={r.baseTaxAmount} />, <Badge key="s" status={r.status} label={t(r.status)} />,
          ])}
          footer={[t("total"), "", "", "", "", "", <Money key="t" value={report.total} currency={ctx.org.currency} />, ""]} />
      </Card>
    </>
  );
}
