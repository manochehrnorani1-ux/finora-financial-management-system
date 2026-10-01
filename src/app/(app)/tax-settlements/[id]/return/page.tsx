import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cases, customers, profiles, taxRules, taxSettlementPayments, taxSettlements, taxTypes } from "@/db/schema";
import { pageContext } from "@/lib/page";
import { PageHeader, Money } from "@/components/ui";
import { PrintButton } from "@/components/forms";
import { CustomerLogo, FinoraLogo } from "@/components/BrandLogos";
import type { TaxComputationStep, TaxRuleConditions } from "@/lib/tax-engine";
import { formatDate, formatDateTime } from "@/lib/jalali";

const SKEY: Record<string, string> = { calculated: "calculated", approved: "approved", part_paid: "part_paid", paid: "paid", REQUIRES_LEGAL_REVIEW: "requiresLegalReview" };\n\nconst Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-slate-300 py-1.5 text-sm">
    <span className="shrink-0 text-slate-600">{label}</span>
    <span className="text-end font-medium text-slate-900">{value ?? "—"}</span>
  </div>
);

export default async function TaxReturnPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, t, fmt } = await pageContext("tax_settlements.read");
  const [r] = await db
    .select({ s: taxSettlements, customer: customers, tax: taxTypes.name, taxCode: taxTypes.code, caseNumber: cases.caseNumber, rule: taxRules, preparer: profiles.fullName })
    .from(taxSettlements)
    .innerJoin(customers, eq(taxSettlements.customerId, customers.id))
    .leftJoin(taxTypes, eq(taxSettlements.taxTypeId, taxTypes.id))
    .leftJoin(cases, eq(taxSettlements.caseId, cases.id))
    .leftJoin(taxRules, eq(taxSettlements.ruleId, taxRules.id))
    .leftJoin(profiles, eq(taxSettlements.createdBy, profiles.id))
    .where(and(eq(taxSettlements.id, id), eq(taxSettlements.organizationId, ctx.org.id)));
  if (!r) notFound();
  const payments = await db
    .select()
    .from(taxSettlementPayments)
    .where(and(eq(taxSettlementPayments.settlementId, id), eq(taxSettlementPayments.organizationId, ctx.org.id)))
    .orderBy(asc(taxSettlementPayments.paymentDate));

  const s = r.s;
  const c = r.customer;
  const snap = (s.ruleSnapshot ?? {}) as Record<string, unknown>;
  const cond = (snap.conditions ?? r.rule?.conditions ?? {}) as TaxRuleConditions;
  const steps = Array.isArray(snap.steps) ? (snap.steps as TaxComputationStep[]) : [];
  const cur = ctx.org.currency;
  const approved = ["approved", "part_paid", "paid"].includes(s.status);
  const needsReview = s.status === "REQUIRES_LEGAL_REVIEW";
  const today = new Date();

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-slate-300 py-1.5 text-sm">
      <span className="shrink-0 text-slate-600">{label}</span>
      <span className="text-end font-medium text-slate-900">{value ?? "—"}</span>
    </div>
  );

  return (
    <>
      <PageHeader
        title={`${t("taxReturn")} — ${s.settlementNumber}`}
        subtitle={`${c.name} · ${r.tax ?? ""}`}
        actions={<>
          <Link href={`/tax-settlements/${s.id}`} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">← {t("back")}</Link>
          <PrintButton label={`🖨 ${t("printReturn")}`} audit={{ entityType: "tax_settlement", entityId: s.id }} />
        </>}
      />

      {needsReview && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 print:hidden">
          <strong>{t("requiresLegalReview")}</strong> — {t("ruleNotFound")}
        </div>
      )}

      <article className="relative mx-auto max-w-4xl rounded-xl border border-slate-300 bg-white p-6 shadow-sm sm:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {!approved && (
          <div className="pointer-events-none absolute inset-0 hidden select-none items-center justify-center print:flex" aria-hidden="true">
            <span className="-rotate-25 text-5xl font-black tracking-widest text-slate-200">{t("draftWatermark")}</span>
          </div>
        )}

        {/* Letterhead */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-emerald-800 pb-4">
          <div className="flex items-center gap-3">
            <FinoraLogo height={56} />
            <div className="text-xs leading-5 text-slate-500">
              <div>{t("slogan")}</div>
              <div>{ctx.org.address ?? t("addressShort")}</div>
              {ctx.org.phone && <div dir="ltr" className="text-start">{ctx.org.phone}</div>}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl font-black text-slate-900">{t("taxReturn")}</div>
            <div className="mt-1 text-xs text-slate-500">{r.tax ?? t("taxSettlement")}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-end text-xs leading-6">
              <div><strong>{t("returnNumber")}:</strong> <span dir="ltr" className="font-mono">{s.settlementNumber}</span></div>
              <div><strong>{t("date")}:</strong> {formatDate(s.createdAt, fmt)}</div>
              {r.caseNumber && <div><strong>{t("caseNumber")}:</strong> <span dir="ltr" className="font-mono">{r.caseNumber}</span></div>}
              <div><strong>{t("status")}:</strong> {t(SKEY[s.status] ?? s.status)}</div>
            </div>
            <CustomerLogo attachmentId={c.logoAttachmentId} name={c.name} height={56} />
          </div>
        </header>

        <div className="mt-4 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-[11px] font-semibold leading-5 text-blue-900">
          FINORA INTERNAL DECLARATION WORKSHEET — {t("returnDisclaimer")}
        </div>

        {/* Taxpayer + period */}
        <section className="mt-5 grid gap-x-8 sm:grid-cols-2">
          <div>
            <h2 className="mb-1 border-b border-slate-400 pb-1 text-sm font-bold text-emerald-900">١. {t("taxpayerInfo")}</h2>
            <Row label={t("name")} value={c.name} />
            <Row label={t("fatherName")} value={c.fatherName} />
            <Row label={t("customerType")} value={t(c.customerType === "business" ? "business" : "individual")} />
            <Row label={t("tin")} value={<span dir="ltr" className="font-mono">{c.tin ?? "—"}</span>} />
            <Row label={t("licenseNumber")} value={c.licenseNumber} />
            <Row label={t("nationalId")} value={c.nationalId} />
            <Row label={t("activity")} value={c.activity} />
            <Row label={t("phone")} value={<span dir="ltr">{c.phone ?? "—"}</span>} />
            <Row label={`${t("province")} / ${t("district")}`} value={[c.province, c.district, c.area].filter(Boolean).join(" / ") || "—"} />
            <Row label={t("address")} value={c.address} />
          </div>
          <div>
            <h2 className="mb-1 border-b border-slate-400 pb-1 text-sm font-bold text-emerald-900">٢. {t("taxPeriod")}</h2>
            <Row label={t("taxType")} value={r.tax} />
            <Row label={t("from")} value={formatDate(s.periodStart, fmt)} />
            <Row label={t("to")} value={formatDate(s.periodEnd, fmt)} />
            {snap.monthsCount !== undefined && <Row label={t("monthsCount")} value={String(snap.monthsCount)} />}
            <Row label={t("officialFilingForm")} value={cond.filingFormCode} />
            <h2 className="mb-1 mt-4 border-b border-slate-400 pb-1 text-sm font-bold text-emerald-900">٣. {t("legalBasis")}</h2>
            <Row label={t("legalRuleName")} value={snap.ruleName ? String(snap.ruleName) : t("requiresLegalReview")} />
            <Row label={t("articleNumber")} value={snap.articleNumber ? String(snap.articleNumber) : "—"} />
            <Row label={t("ruleVersion")} value={snap.version !== undefined ? `v${String(snap.version)}` : "—"} />
            <Row label={t("lastReviewed")} value={r.rule?.lastReviewedAt ? formatDate(r.rule.lastReviewedAt, fmt) : "—"} />
            <Row label={t("sourceUrl")} value={s.legalSource ? <span dir="ltr" className="break-all text-[11px]">{s.legalSource}</span> : "—"} />
          </div>
        </section>

        {/* Calculation */}
        <section className="mt-6">
          <h2 className="mb-2 border-b border-slate-400 pb-1 text-sm font-bold text-emerald-900">٤. {t("calculationDetails")}</h2>
          <table className="w-full text-sm">
            <tbody>
              {([
                [t("taxableAmount"), s.taxableAmount],
                [t("allowableExpenses"), s.allowableExpenses],
                [t("exemptions"), s.exemptions],
                [t("deductions"), s.deductions],
              ] as [string, number][]).map(([label, val]) => (
                <tr key={label} className="border-b border-slate-200">
                  <td className="py-1.5 text-slate-600">{label}</td>
                  <td className="py-1.5 text-end"><Money value={val} currency={cur} /></td>
                </tr>
              ))}
              <tr className="border-b border-slate-200">
                <td className="py-1.5 text-slate-600">{t("taxableBase")}</td>
                <td className="py-1.5 text-end">{snap.taxableBase === undefined ? "—" : <Money value={Number(snap.taxableBase)} currency={cur} />}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-1.5 text-slate-600">{t("taxRate")}</td>
                <td className="py-1.5 text-end font-mono">{s.taxRate === null ? "—" : `${Number(s.taxRate)}%`}</td>
              </tr>
              <tr className="border-b-2 border-emerald-700 bg-emerald-50">
                <td className="py-2 font-bold text-emerald-900">{t("taxAmount")}</td>
                <td className="py-2 text-end text-base font-bold text-emerald-900">{s.taxAmount === null ? "—" : <Money value={s.taxAmount} currency={cur} />}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-1.5 text-slate-600">{t("paidAmount")}</td>
                <td className="py-1.5 text-end"><Money value={s.paidAmount} currency={cur} /></td>
              </tr>
              <tr>
                <td className="py-1.5 font-semibold">{t("remainingAmount")}</td>
                <td className="py-1.5 text-end font-semibold">{s.remainingAmount === null ? "—" : <Money value={s.remainingAmount} currency={cur} />}</td>
              </tr>
            </tbody>
          </table>

          {steps.length > 0 && (
            <table className="mt-4 w-full text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600">
                  <th className="p-1.5 text-start">{t("calculationDetails")}</th>
                  <th className="p-1.5">{t("taxableBase")}</th>
                  <th className="p-1.5">{t("taxRate")}</th>
                  <th className="p-1.5">{t("taxAmount")}</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((st, i) => (
                  <tr key={i} className="border-b border-slate-200">
                    <td className="p-1.5">{st.label}</td>
                    <td className="p-1.5 text-center"><Money value={st.base} /></td>
                    <td className="p-1.5 text-center font-mono">{st.rate}%</td>
                    <td className="p-1.5 text-center"><Money value={st.tax} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {Boolean(snap.formulaSummary) && <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-700">{String(snap.formulaSummary)}</p>}
        </section>

        {/* Payments */}
        {payments.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 border-b border-slate-400 pb-1 text-sm font-bold text-emerald-900">٥. {t("officialPaymentRef")}</h2>
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-100 text-slate-600"><th className="p-1.5 text-start">{t("date")}</th><th className="p-1.5">{t("amount")}</th><th className="p-1.5">{t("officialPaymentRef")}</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-slate-200">
                    <td className="p-1.5">{formatDate(p.paymentDate, fmt)}</td>
                    <td className="p-1.5 text-center"><Money value={p.amount} currency={p.currency} /></td>
                    <td className="p-1.5 text-center font-mono">{p.officialReceiptNumber ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {s.notes && <p className="mt-4 whitespace-pre-wrap text-xs leading-6 text-slate-600"><strong>{t("notes")}:</strong> {s.notes}</p>}

        {/* Signatures */}
        <section className="mt-12 grid grid-cols-3 gap-8 text-center text-xs">
          <div><div className="mb-10 text-slate-500">{t("declarantSignature")}</div><div className="border-t border-slate-500 pt-1">{c.name}</div></div>
          <div><div className="mb-10 text-slate-500">{t("preparedBy")}</div><div className="border-t border-slate-500 pt-1">{r.preparer ?? "—"}</div></div>
          <div><div className="mb-10 text-slate-500">{t("stamp")}</div><div className="border-t border-slate-500 pt-1">{t("reviewedBy")}</div></div>
        </section>

        <footer className="mt-8 border-t border-slate-300 pt-2 text-center text-[10px] leading-5 text-slate-500">
          {ctx.org.name} · {t("printedAt")}: {formatDateTime(today, fmt)} · {t("printAudit")}
        </footer>
      </article>
    </>
  );
}
