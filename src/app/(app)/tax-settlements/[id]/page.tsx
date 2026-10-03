import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { attachments, cases, customers, profiles, taxSettlementPayments, taxSettlements, taxTypes } from "@/db/schema";
import { pageContext } from "@/lib/page";
import { approveTaxSettlementAction, recordTaxSettlementPaymentAction } from "@/actions/tax-settlement";
import { ActionButton, FormDialog, PrintButton } from "@/components/forms";
import { Badge, Card, KV, Money, PageHeader, Table } from "@/components/ui";
import { formatDate } from "@/lib/jalali";

const STATUS: Record<string, string> = {
  calculated: "محاسبه‌شده",
  approved: "تأییدشده",
  part_paid: "قسمتی پرداخت‌شده",
  paid: "پرداخت‌شده",
  REQUIRES_LEGAL_REVIEW: "نیازمند بررسی",
};

export default async function TaxSettlementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, t, fmt } = await pageContext("tax_settlements.read");
  const [r] = await db.select({
    s: taxSettlements,
    customer: customers,
    tax: taxTypes.name,
    caseNumber: cases.caseNumber,
  })
    .from(taxSettlements)
    .innerJoin(customers, eq(taxSettlements.customerId, customers.id))
    .leftJoin(taxTypes, eq(taxSettlements.taxTypeId, taxTypes.id))
    .leftJoin(cases, eq(taxSettlements.caseId, cases.id))
    .where(and(eq(taxSettlements.id, id), eq(taxSettlements.organizationId, ctx.org.id)));

  if (!r) notFound();

  const payments = await db.select({
    p: taxSettlementPayments,
    user: profiles.fullName,
    fileName: attachments.fileName,
  })
    .from(taxSettlementPayments)
    .leftJoin(profiles, eq(taxSettlementPayments.recordedBy, profiles.id))
    .leftJoin(attachments, eq(taxSettlementPayments.evidenceAttachmentId, attachments.id))
    .where(and(eq(taxSettlementPayments.settlementId, id), eq(taxSettlementPayments.organizationId, ctx.org.id)))
    .orderBy(desc(taxSettlementPayments.paymentDate));

  const approved = ["approved", "part_paid", "paid"].includes(r.s.status);
  const snap = (r.s.ruleSnapshot ?? {}) as Record<string, unknown>;

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            تصفیه مالیه — {r.s.settlementNumber}
            <Badge
              status={r.s.status === "paid" || r.s.status === "approved" ? "approved" : r.s.status === "REQUIRES_LEGAL_REVIEW" ? "pending_approval" : "draft"}
              label={STATUS[r.s.status] ?? r.s.status}
            />
          </span>
        }
        subtitle={r.customer.name + " · " + (r.tax ?? "مالیه")}
        actions={
          <>
            <Link href="/tax-settlements" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">← برگشت</Link>
            <Link href={"/tax-settlements/" + r.s.id + "/return"} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white">🖨 چاپ نتیجه</Link>
            <PrintButton label={t("print")} audit={{ entityType: "tax_settlement", entityId: r.s.id }} />
            {r.s.status === "calculated" && ctx.can("tax_settlements.approve") && (
              <ActionButton action={approveTaxSettlementAction} args={[r.s.id]} label="تأیید تصفیه" variant="primary" confirm={t("confirm") + "?"} />
            )}
            {approved && Number(r.s.remainingAmount ?? 0) > 0 && ctx.can("tax_settlements.write") && (
              <FormDialog
                title="ثبت پرداخت مالیه"
                triggerLabel="+ ثبت پرداخت"
                action={recordTaxSettlementPaymentAction}
                hidden={{ settlementId: r.s.id }}
                fields={[
                  { name: "amount", label: "مبلغ پرداخت", type: "number", required: true, defaultValue: r.s.remainingAmount },
                  { name: "paymentDate", label: t("date"), type: "date", required: true },
                  { name: "officialReceiptNumber", label: "شماره رسید رسمی" },
                  { name: "evidenceFile", label: "سند پرداخت", type: "file" },
                  { name: "notes", label: t("notes"), type: "textarea", full: true },
                ]}
              />
            )}
          </>
        }
      />

      {r.s.status === "REQUIRES_LEGAL_REVIEW" && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          <strong>{t("requiresLegalReview")}</strong> — قبل از ادامه، قاعده مالیاتی توسط مسئول مربوط بررسی شود.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="خلاصه تصفیه" className="lg:col-span-2">
          <KV items={[
            ["مشتری", <Link key="customer" href={"/customer-accounts/" + r.customer.id} className="text-emerald-700">{r.customer.name}</Link>],
            ["شماره دوسیه", r.caseNumber ?? "—"],
            ["نوع مالیه", r.tax ?? "—"],
            ["دوره", formatDate(r.s.periodStart, fmt) + " — " + formatDate(r.s.periodEnd, fmt)],
            ["مبلغ مشمول مالیه", <Money key="base" value={r.s.taxableAmount} currency={ctx.org.currency} />],
            ["مصارف قابل مجرا", <Money key="expenses" value={r.s.allowableExpenses} currency={ctx.org.currency} />],
            ["معافیت", <Money key="exemptions" value={r.s.exemptions} currency={ctx.org.currency} />],
            ["کسرات", <Money key="deductions" value={r.s.deductions} currency={ctx.org.currency} />],
            ["مبلغ نهایی مالیه", r.s.taxAmount === null ? "—" : <Money key="tax" value={r.s.taxAmount} currency={ctx.org.currency} />],
            ["پرداخت‌شده", <Money key="paid" value={r.s.paidAmount} currency={ctx.org.currency} />],
            ["باقی‌مانده", r.s.remainingAmount === null ? "—" : <Money key="remaining" value={r.s.remainingAmount} currency={ctx.org.currency} />],
          ]} />

          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950">
            <strong>نتیجه:</strong>{" "}
            {r.s.status === "paid"
              ? "تصفیه مالیه پرداخت و تکمیل شده است."
              : approved
                ? "تصفیه تأیید شده و در صورت باقی‌ماندن مبلغ، پرداخت آن ادامه می‌یابد."
                : r.s.status === "calculated"
                  ? "محاسبه انجام شده و منتظر تأیید است."
                  : "تصفیه برای بررسی بیشتر متوقف است."}
          </div>

          {Boolean(snap.formulaSummary) && (
            <p className="mt-3 text-xs text-slate-500">
              محاسبه توسط قاعده معتبر انجام شده است؛ جزئیات فنی قاعده در ثبت داخلی FINORA نگهداری می‌شود.
            </p>
          )}
        </Card>

        <Card title="اسناد و نتیجه">
          <ul className="space-y-2 text-sm text-slate-700">
            <li>✓ اطلاعات مشتری و دوره ثبت شده</li>
            <li>✓ محاسبه مالیه ثبت شده</li>
            <li>{approved ? "✓" : "○"} تأیید تصفیه</li>
            <li>{r.s.status === "paid" ? "✓" : "○"} پرداخت کامل</li>
            <li>{r.s.status === "paid" ? "✓" : "○"} نتیجه نهایی</li>
          </ul>
          <div className="mt-4 border-t pt-3 text-xs leading-5 text-slate-500">
            قواعد قانونی، نسخه قاعده و محاسبه دقیق در سابقه داخلی ثبت شده‌اند و نیازی به مدیریت روزمره کارمند ندارند.
          </div>
        </Card>

        <Card title="پرداخت‌ها" className="lg:col-span-3">
          <Table
            headers={["تاریخ", "مبلغ", "شماره رسید رسمی", "سند", "ثبت‌کننده", "یادداشت"]}
            empty={t("noData")}
            rows={payments.map(({ p, user, fileName }) => [
              formatDate(p.paymentDate, fmt),
              <Money key="amount" value={p.amount} currency={p.currency} />,
              p.officialReceiptNumber ?? "—",
              p.evidenceAttachmentId ? <a key="file" href={"/api/files/" + p.evidenceAttachmentId} target="_blank" rel="noreferrer" className="text-emerald-700">{fileName ?? t("download")}</a> : "—",
              user ?? "—",
              p.notes ?? "—",
            ])}
          />
        </Card>
      </div>
    </>
  );
}
