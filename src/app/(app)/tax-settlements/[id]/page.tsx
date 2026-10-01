import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { attachments, cases, customers, profiles, taxRules, taxSettlementPayments, taxSettlements, taxTypes } from "@/db/schema";
import { pageContext } from "@/lib/page";
import { approveTaxSettlementAction, recordTaxSettlementPaymentAction } from "@/actions/tax-settlement";
import type { TaxComputationStep, TaxRuleConditions } from "@/lib/tax-engine";
import { ActionButton, FormDialog, PrintButton } from "@/components/forms";
import { Badge, Card, KV, Money, PageHeader, Table } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/jalali";

const SKEY: Record<string, string> = { calculated: "calculated", approved: "approved", part_paid: "part_paid", paid: "paid", REQUIRES_LEGAL_REVIEW: "requiresLegalReview" };

export default async function TaxSettlementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, t, fmt } = await pageContext("tax_settlements.read");
  const [r] = await db.select({ s: taxSettlements, customer: customers, tax: taxTypes.name, caseNumber: cases.caseNumber, rule: taxRules })
    .from(taxSettlements).innerJoin(customers, eq(taxSettlements.customerId, customers.id)).leftJoin(taxTypes, eq(taxSettlements.taxTypeId, taxTypes.id)).leftJoin(cases, eq(taxSettlements.caseId, cases.id)).leftJoin(taxRules, eq(taxSettlements.ruleId, taxRules.id)).where(and(eq(taxSettlements.id, id), eq(taxSettlements.organizationId, ctx.org.id)));
  if (!r) notFound();
  const payments = await db.select({ p: taxSettlementPayments, user: profiles.fullName, fileName: attachments.fileName })
    .from(taxSettlementPayments).leftJoin(profiles, eq(taxSettlementPayments.recordedBy, profiles.id)).leftJoin(attachments, eq(taxSettlementPayments.evidenceAttachmentId, attachments.id)).where(and(eq(taxSettlementPayments.settlementId, id), eq(taxSettlementPayments.organizationId, ctx.org.id))).orderBy(desc(taxSettlementPayments.paymentDate));
  const snap = r.s.ruleSnapshot as Record<string, unknown>;
  const cond = ((snap.conditions ?? r.rule?.conditions ?? {}) as TaxRuleConditions);
  const steps = Array.isArray(snap.steps) ? (snap.steps as TaxComputationStep[]) : [];
  const approved = ["approved", "part_paid", "paid"].includes(r.s.status);
  return (
    <>
      <PageHeader title={<span className="flex flex-wrap items-center gap-2">{r.s.settlementNumber}<Badge status={r.s.status === "paid" || r.s.status === "approved" ? "approved" : r.s.status === "REQUIRES_LEGAL_REVIEW" ? "pending_approval" : "draft"} label={t(SKEY[r.s.status] ?? r.s.status)} /></span>} subtitle={`${r.customer.name} · ${r.tax ?? ""}`} actions={<>
        <Link href="/tax-settlements" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">← {t("back")}</Link>
        <Link href={`/tax-settlements/${r.s.id}/return`} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800">🖨 {t("printReturn")}</Link>
        <PrintButton label={t("print")} audit={{ entityType: "tax_settlement", entityId: r.s.id }} />
        {r.s.status === "calculated" && ctx.can("tax_settlements.approve") && <ActionButton action={approveTaxSettlementAction} args={[r.s.id]} label={t("approve")} variant="primary" confirm={t("confirm") + "?"} />}
        {approved && Number(r.s.remainingAmount) > 0 && ctx.can("tax_settlements.write") && <FormDialog title={t("officialPaymentRef")} triggerLabel={`+ ${t("officialPaymentRef")}`} action={recordTaxSettlementPaymentAction} hidden={{ settlementId: r.s.id }} fields={[
          { name: "amount", label: `${t("amount")} (${ctx.org.currency})`, type: "number", required: true, defaultValue: r.s.remainingAmount },
          { name: "paymentDate", label: t("date"), type: "date", required: true },
          { name: "officialReceiptNumber", label: t("officialPaymentRef") },
          { name: "evidenceFile", label: t("evidence"), type: "file" },
          { name: "notes", label: t("notes"), type: "textarea", full: true },
        ]} />}
      </>} />
      {r.s.status === "REQUIRES_LEGAL_REVIEW" && <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"><strong>{t("requiresLegalReview")}</strong> — {t("ruleNotFound")} {t("noAutomaticTax")}</div>}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card title={t("taxSettlement")} className="lg:col-span-2">
          <KV items={[
            [t("settlementNumber"), r.s.settlementNumber],
            [t("customer"), <Link key="c" href={`/customer-accounts/${r.customer.id}`} className="text-emerald-700">{r.customer.name}</Link>],
            [t("tin"), r.customer.tin ?? "-"],
            [t("licenseNumber"), r.customer.licenseNumber ?? "-"],
            [t("case"), r.caseNumber ?? "-"],
            [t("taxType"), r.tax ?? "-"],
            [t("taxPeriod"), `${formatDate(r.s.periodStart, fmt)} — ${formatDate(r.s.periodEnd, fmt)}${snap.monthsCount ? ` (${String(snap.monthsCount)} ماه)` : ""}`],
            [t("taxableAmount"), <Money key="a" value={r.s.taxableAmount} currency={ctx.org.currency} />],
            [t("allowableExpenses"), <Money key="e" value={r.s.allowableExpenses} currency={ctx.org.currency} />],
            [t("exemptions"), <Money key="x" value={r.s.exemptions} currency={ctx.org.currency} />],
            [t("deductions"), <Money key="d" value={r.s.deductions} currency={ctx.org.currency} />],
            [t("taxableBase"), snap.taxableBase === undefined ? "—" : <Money key="tb" value={Number(snap.taxableBase)} currency={ctx.org.currency} />],
            [t("taxRate"), r.s.taxRate === null ? "—" : `${Number(r.s.taxRate)}%`],
            [t("taxAmount"), r.s.taxAmount === null ? "—" : <Money key="ta" value={r.s.taxAmount} currency={ctx.org.currency} />],
            [t("paidAmount"), <Money key="p" value={r.s.paidAmount} currency={ctx.org.currency} />],
            [t("remainingAmount"), r.s.remainingAmount === null ? "—" : <Money key="rm" value={r.s.remainingAmount} currency={ctx.org.currency} />],
          ]} />
          {Boolean(snap.formulaSummary) && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2.5 text-xs text-emerald-950">
              <strong>فرمول اعمال‌شده وزارت مالیه: </strong>{String(snap.formulaSummary)}
            </div>
          )}
          {r.s.notes && <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">{r.s.notes}</p>}
        </Card>
        <Card title={t("ruleVersion")}>
          <KV items={[
            [t("legalRuleName"), String(snap.ruleName ?? t("requiresLegalReview"))],
            [t("legalName"), String(snap.legalName ?? "-")],
            [t("articleNumber"), String(snap.articleNumber ?? "-")],
            ["فورم رسمی مربوطه", String(cond.filingFormCode ?? "-")],
            ["معافیت جرایم مالیاتی", cond.penaltyAmnestyApplied ? "تطبیق‌شده (۱۰۰٪ معافیت جرایم)" : "مطابق حکم جاری بررسی شود"],
            [t("ruleVersion"), snap.version === undefined ? "-" : `v${String(snap.version)}`],
            [t("lastReviewed"), r.rule?.lastReviewedAt ? formatDateTime(r.rule.lastReviewedAt, fmt) : "-"],
            [t("sourceUrl"), r.s.legalSource ? <a key="src" href={r.s.legalSource} target="_blank" rel="noreferrer" className="text-emerald-700 underline">{t("view")}</a> : "-"],
            [t("verification"), r.rule?.verificationStatus ?? t("requiresLegalReview")],
          ]} />
          <p className="mt-3 text-xs leading-6 text-slate-500">{t("calculatedSnapshot")}</p>
        </Card>
        {steps.length > 0 && (
          <Card title="جدول گام‌به‌گام سنجش مالیه مطابق طرزالعمل وزارت مالیه" className="lg:col-span-2">
            <Table
              headers={["شرح طبقه / پله قانونی", "مبنای مشمول در این پله", "نرخ (%)", "مالیه سنجش‌شده"]}
              empty={t("noData")}
              rows={steps.map((st, idx) => [
                <span key={`l-${idx}`} className="font-medium">{st.label}</span>,
                <Money key={`b-${idx}`} value={st.base} currency={ctx.org.currency} />,
                <span key={`r-${idx}`} className="font-mono">{st.rate}%</span>,
                <Money key={`t-${idx}`} value={st.tax} currency={ctx.org.currency} />,
              ])}
              footer={["مجموع مالیه سنجش‌شده", "", "", <Money key="tot" value={r.s.taxAmount} currency={ctx.org.currency} />]}
            />
          </Card>
        )}
        <Card title="اسناد حمایوی طرزالعمل جدید تصفیه مالیاتی (ماده ۵۹ قانون اداره امور مالیات)" className={steps.length > 0 ? "lg:col-span-1" : "lg:col-span-3"}>
          <ol className="space-y-1.5 text-xs text-slate-700 list-decimal ps-4">
            <li>اظهارنامه مالیاتی و بیلانس شیت</li>
            <li>کاپی جواز فعالیت</li>
            <li>فورم‌های م-۱۶</li>
            <li>فورم‌های ربع‌وار مالیه انتفاعی (BRT)</li>
            <li>فورم‌های مالیات موضوعی (معاشات، کرایه، قراردادی و غیره)</li>
          </ol>
          <p className="mt-2 text-[11px] text-slate-500">منبع: اطلاعیه رسمی ریاست عمومی عواید وزارت مالیه (ard.gov.af/497/497 — طی مراحل تصفیه ابتدایی در ۲۱ روز).</p>
        </Card>
        <Card title={t("officialPaymentRef")} className="lg:col-span-3">
          <Table headers={[t("date"), t("amount"), t("officialPaymentRef"), t("evidence"), t("user"), t("notes")]} empty={t("noData")} rows={payments.map(({ p, user, fileName }) => [formatDate(p.paymentDate, fmt), <Money key="m" value={p.amount} currency={p.currency} />, p.officialReceiptNumber ?? "-", p.evidenceAttachmentId ? <a key="f" href={`/api/files/${p.evidenceAttachmentId}`} target="_blank" rel="noreferrer" className="text-emerald-700">{fileName ?? t("download")}</a> : "-", user ?? "-", p.notes ?? "-"])} />
        </Card>
      </div>
      <div className="mt-4 text-xs text-slate-500">{t("internalReport")}: FINORA internal record; it is not an official government tax calculation or filing.</div>
    </>
  );
}
