import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cases, customers, taxRules, taxSettlements, taxTypes } from "@/db/schema";
import { pageContext, sp1, type SP } from "@/lib/page";
import { saveTaxRuleAction, verifyTaxRuleAction, createTaxSettlementAction, syncMofRulesAction } from "@/actions/tax-settlement";
import { ensureMofTaxCatalog, type TaxRuleConditions } from "@/lib/tax-engine";
import { ActionButton, FormDialog, type Field } from "@/components/forms";
import { Badge, Card, Money, PageHeader, Table } from "@/components/ui";
import { formatDate } from "@/lib/jalali";
import { TaxNav } from "@/components/TaxNav";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "تصفیه مالیه و قواعد قانونی",
};

const SKEY: Record<string, string> = { calculated: "calculated", approved: "approved", part_paid: "part_paid", paid: "paid", REQUIRES_LEGAL_REVIEW: "requiresLegalReview" };

const FORMULA_LABELS: Record<string, string> = {
  net_percentage: "فیصدی بر عاید خالص (ماده ۴ — پس از وضع مصارف مجاز)",
  gross_percentage: "فیصدی بر عواید ناخالص (ماده ۶۴ انتفاعی / ماده ۷۲ قراردادی)",
  progressive_brackets: "جدول پلکانی ماهوار (ماده ۵۸ — مالیه موضوعی معاشات)",
  flat_tier: "طبقه‌بندی مقطوع بر کل مبلغ (ماده ۵۹ — مالیه کرایه عقارات)",
  exempt_threshold_excess: "معافیت پایه + فیصدی بر مازاد (طرزالعمل جدید اصناف)",
};

export default async function TaxSettlementsPage({ searchParams }: { searchParams: SP }) {
  const { ctx, t, fmt } = await pageContext("tax_settlements.read");
  const q = await searchParams;
  const caseId = sp1(q.caseId);

  // Ensure the active organization has the Ministry of Finance tax rules catalog seeded
  await db.transaction((tx) => ensureMofTaxCatalog(tx, ctx.org.id, ctx.user.id));

  const [rules, settlements, customersList, caseList, types] = await Promise.all([
    db.select().from(taxRules).where(eq(taxRules.organizationId, ctx.org.id)).orderBy(taxRules.ruleKey, desc(taxRules.version)),
    db.select({ s: taxSettlements, customer: customers.name, code: customers.customerCode })
      .from(taxSettlements).innerJoin(customers, eq(taxSettlements.customerId, customers.id)).where(eq(taxSettlements.organizationId, ctx.org.id)).orderBy(desc(taxSettlements.createdAt)).limit(300),
    db.select({ id: customers.id, name: customers.name, code: customers.customerCode }).from(customers).where(eq(customers.organizationId, ctx.org.id)).orderBy(customers.name),
    db.select({ id: cases.id, caseNumber: cases.caseNumber, customerId: cases.customerId }).from(cases).where(eq(cases.organizationId, ctx.org.id)).orderBy(desc(cases.createdAt)).limit(300),
    db.select().from(taxTypes).where(eq(taxTypes.organizationId, ctx.org.id)).orderBy(taxTypes.name),
  ]);

  const ruleFields: Field[] = [
    { name: "ruleKey", label: "Rule key", required: true, placeholder: "mof-custom-rule-2026" },
    { name: "ruleName", label: t("legalRuleName"), required: true },
    { name: "legalName", label: "نام سند قانونی / طرزالعمل وزارت مالیه" },
    { name: "articleNumber", label: t("articleNumber"), placeholder: "ماده ۵۸ / رهنمود ۲۵" },
    { name: "taxTypeId", label: t("taxType"), type: "select", options: types.map((x) => ({ value: x.id, label: `${x.name} (${x.code})` })) },
    {
      name: "formulaMode",
      label: "نوع فرمول محاسبه وزارت مالیه",
      type: "select",
      required: true,
      defaultValue: "net_percentage",
      options: Object.entries(FORMULA_LABELS).map(([value, label]) => ({ value, label })),
    },
    { name: "rate", label: `${t("taxRate")} %`, type: "number", step: "0.000001", help: t("noAutomaticTax") },
    { name: "exemptThreshold", label: "سقف معافیت پایه (افغانی — ویژه اصناف)", type: "number", defaultValue: 0, showIf: { field: "formulaMode", values: ["exempt_threshold_excess"] } },
    { name: "filingFormCode", label: "کود / نام فورم رسمی مربوطه", placeholder: "فورم م-۱۶ / اظهارنامه ربع‌وار" },
    { name: "sourceName", label: t("sourceUrl") + " — " + t("name"), required: true, defaultValue: "وزارت مالیه — ریاست عمومی عواید" },
    { name: "sourceUrl", label: t("sourceUrl"), required: true, full: true, defaultValue: "https://ard.gov.af/?c=tax-guidlines-dr&s=dari", help: "HTTPS .gov.af — قاعده جدید پس از بررسی منبع رسمی تأیید می‌شود." },
    { name: "effectiveFrom", label: t("effectiveFrom"), type: "date", required: true },
    { name: "effectiveTo", label: t("effectiveTo"), type: "date" },
    { name: "formulaDescriptionFa", label: "شرح فرمول (دری)", type: "textarea", full: true },
    { name: "conditions", label: `${t("conditions")} (JSON — پله‌ها یا طبقات)`, type: "textarea", full: true, placeholder: "{}" },
  ];

  const settlementFields: Field[] = [
    { name: "customerId", label: t("customer"), type: "select", required: true, defaultValue: caseList.find((v) => v.id === caseId)?.customerId, options: customersList.map((x) => ({ value: x.id, label: `${x.code} — ${x.name}` })) },
    { name: "caseId", label: t("case"), type: "select", defaultValue: caseId, options: caseList.map((x) => ({ value: x.id, label: x.caseNumber })) },
    { name: "taxTypeId", label: t("taxType"), type: "select", options: types.map((x) => ({ value: x.id, label: `${x.name} (${x.code})` })) },
    {
      name: "ruleId",
      label: `${t("ruleVersion")} (فرمول رسمی وزارت مالیه)`,
      type: "select",
      options: rules
        .filter((r) => r.verificationStatus === "verified")
        .map((r) => ({
          value: r.id,
          label: `${r.ruleName} [v${r.version}] — ${r.articleNumber ?? ""}`,
        })),
    },
    { name: "periodStart", label: t("from"), type: "date", required: true },
    { name: "periodEnd", label: t("to"), type: "date", required: true },
    { name: "monthsCount", label: "تعداد ماه‌های دوره (برای معاشات و کرایه ماهوار)", type: "number", defaultValue: 1, required: true },
    { name: "taxableAmount", label: `${t("taxableAmount")} (عواید ناخالص / فروش / معاش یا کرایه کل دوره)`, type: "number", required: true },
    { name: "allowableExpenses", label: `${t("allowableExpenses")} (مصارف قابل مجرایی — ماده ۱۸)`, type: "number", defaultValue: 0 },
    { name: "exemptions", label: `${t("exemptions")} (معافیت‌های قانونی)`, type: "number", defaultValue: 0 },
    { name: "deductions", label: `${t("deductions")} (کسرات / مالیات موضوعی پیش‌پرداخت‌شده)`, type: "number", defaultValue: 0 },
    { name: "notes", label: t("notes"), type: "textarea", full: true },
  ];

  const verifiedCount = rules.filter((x) => x.verificationStatus === "verified").length;

  const rateDisplay = (r: typeof taxRules.$inferSelect) => {
    const cond = (r.conditions ?? {}) as TaxRuleConditions;
    if (cond.formulaMode === "progressive_brackets") return "پلکانی ۰٪ / ۲٪ / ۱۰٪ / ۲۰٪";
    if (cond.formulaMode === "flat_tier") return "طبقه‌بندی ۰٪ / ۱۰٪ / ۱۵٪";
    if (cond.formulaMode === "exempt_threshold_excess") return `معاف تا ${(cond.exemptThreshold ?? 2000000).toLocaleString()} + ${Number(r.rate ?? 0)}% مازاد`;
    if (r.rate === null) return t("requiresLegalReview");
    return `${Number(r.rate)}%`;
  };

  return (
    <>
      <PageHeader title={t("taxSettlement")} subtitle="موتور محاسبه و تصفیه مالیه مبتنی بر قوانین، رهنمودها و طرزالعمل‌های جدید وزارت مالیه افغانستان (mof.gov.af / ard.gov.af)" actions={<>
        {ctx.can("tax_rules.write") && <ActionButton action={syncMofRulesAction} label="↻ همگام‌سازی قواعد وزارت مالیه" variant="secondary" size="md" />}
        {ctx.can("tax_rules.write") && <FormDialog title={t("taxRules")} triggerLabel={`+ ${t("taxRules")}`} action={saveTaxRuleAction} fields={ruleFields} wide />}
        {ctx.can("tax_settlements.write") && <FormDialog title={t("create")} triggerLabel={`+ ${t("create")} ${t("taxSettlement")}`} action={createTaxSettlementAction} fields={settlementFields} wide successPath="/tax-settlements/{id}" />}
        <Link href="/taxes" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{t("taxes")}</Link>
      </>} />

      <TaxNav active="overview" t={t} />
      <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs leading-6 text-emerald-950">
        <strong>طرزالعمل‌های تطبیق‌شده وزارت مالیه و ریاست عمومی عواید: </strong>
        ۱) مالیه موضوعی معاشات (ماده ۵۸ — پلکانی تا ۵,۰۰۰ معاف، ۲٪، ۱۰٪+۱۵۰، ۲۰٪+۸,۹۰۰) ·
        ۲) مالیه کرایه عقارات (ماده ۵۹ — زیر ۱۰,۰۰۰ معاف، ۱۰٪ تا ۱۰۰,۰۰۰، ۱۵٪ بالای ۱۰۰,۰۰۰) ·
        ۳) مالیه قراردادی (ماده ۷۲ — با جواز ۲٪ قابل مجرایی، بدون جواز ۷٪ مقطوع) ·
        ۴) مالیه معاملات انتفاعی BRT (ماده ۶۴ — ۴٪ و ۲٪ بر عواید ناخالص) ·
        ۵) مالیه بر عایدات سالانه شرکت‌ها (ماده ۴ — ۲۰٪ بر مفاد خالص پس از وضع مصارف مجاز ماده ۱۸) ·
        ۶) طرزالعمل جدید اصناف و کسبه‌کاران (معافیت فروش سالانه تا ۲,۰۰۰,۰۰۰ افغانی + ۰.۳٪ بر مازاد و معافیت جرایم مالیاتی) ·
        ۷) طرزالعمل تصفیه ابتدایی مالیات با ۵ سند حمایوی (اظهارنامه و بیلانس شیت، کاپی جواز، فورم م-۱۶، فورم ربع‌وار انتفاعی، فورم‌های مالیات موضوعی — ماده ۵۹ قانون اداره امور مالیات).
      </div>

      {verifiedCount === 0 && <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"><strong>{t("requiresLegalReview")}</strong> — {t("ruleNotFound")} {t("noAutomaticTax")}</div>}

      <Card title={`${t("taxRules")} (${rules.length})`} className="mb-4">
        <Table headers={[t("legalRuleName"), t("taxType"), "فرمول و نرخ رسمی", t("articleNumber"), t("effectivePeriod"), t("ruleVersion"), t("sourceUrl"), t("verification"), t("actions")]} empty={t("noData")}
          rows={rules.map((r) => {
            const cond = (r.conditions ?? {}) as TaxRuleConditions;
            return [
              <div key="n">
                <div className="font-medium text-slate-800">{r.ruleName}</div>
                {cond.formulaDescriptionFa && <div className="text-[11px] text-slate-500 mt-0.5 max-w-xl">{cond.formulaDescriptionFa}</div>}
              </div>,
              <span key="tt" className="font-mono text-xs">{types.find((x) => x.id === r.taxTypeId)?.code ?? "-"}</span>,
              <span key="r" className="font-mono text-xs font-semibold text-emerald-800">{rateDisplay(r)}</span>,
              r.articleNumber ?? "-",
              <span key="e" className="text-xs whitespace-nowrap">{formatDate(r.effectiveFrom, fmt)}{r.effectiveTo ? ` → ${formatDate(r.effectiveTo, fmt)}` : ""}</span>,
              <span key="v" className="font-mono">v{r.version}</span>,
              <a key="u" href={r.sourceUrl ?? undefined} target="_blank" rel="noreferrer" className="text-emerald-700 underline text-xs">{r.sourceName ?? t("view")}</a>,
              <Badge key="s" status={r.verificationStatus === "verified" ? "approved" : "pending_approval"} label={t(r.verificationStatus === "verified" ? "verified" : "requiresLegalReview")} />,
              ctx.can("tax_rules.verify") && r.verificationStatus !== "verified" ? <ActionButton key="v" action={verifyTaxRuleAction} args={[r.id]} label={t("verify")} variant="warning" confirm={t("confirm") + "?"} /> : null,
            ];
          })} />
      </Card>

      <Card title={`${t("taxSettlement")} (${settlements.length})`}>
        <Table headers={[t("settlementNumber"), t("customer"), t("case"), t("taxType"), t("taxPeriod"), t("taxableAmount"), t("taxRate"), t("taxAmount"), t("paidAmount"), t("remainingAmount"), t("status"), t("actions")]} empty={t("noData")}
          rows={settlements.map(({ s, customer, code }) => [
            <Link key="n" href={`/tax-settlements/${s.id}`} className="font-mono text-xs font-semibold text-emerald-700">{s.settlementNumber}</Link>,
            `${code} · ${customer}`,
            caseList.find((x) => x.id === s.caseId)?.caseNumber ?? "-",
            types.find((x) => x.id === s.taxTypeId)?.code ?? "-",
            `${formatDate(s.periodStart, fmt)} — ${formatDate(s.periodEnd, fmt)}`,
            <Money key="b" value={s.taxableAmount} currency={ctx.org.currency} />,
            s.taxRate === null ? "—" : `${Number(s.taxRate)}%`,
            s.taxAmount === null ? "—" : <Money key="t" value={s.taxAmount} currency={ctx.org.currency} />,
            <Money key="p" value={s.paidAmount} currency={ctx.org.currency} />,
            s.remainingAmount === null ? "—" : <Money key="r" value={s.remainingAmount} currency={ctx.org.currency} />,
            <Badge key="s" status={s.status === "paid" || s.status === "approved" ? "approved" : s.status === "REQUIRES_LEGAL_REVIEW" ? "pending_approval" : "draft"} label={t(SKEY[s.status] ?? s.status)} />,
            <div key="d" className="flex gap-1">
              <Link href={`/tax-settlements/${s.id}/return`} className="rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-800">🖨 {t("printReturn")}</Link>
              <Link href={`/tax-settlements/${s.id}`} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs">{t("details")}</Link>
            </div>,
          ])} />
      </Card>
    </>
  );
}
