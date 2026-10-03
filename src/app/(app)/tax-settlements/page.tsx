import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cases, customers, taxSettlements, taxTypes } from "@/db/schema";
import { pageContext, sp1, type SP } from "@/lib/page";
import { createTaxSettlementAction } from "@/actions/tax-settlement";
import { ensureMofTaxCatalog } from "@/lib/tax-engine";
import { FormDialog, type Field } from "@/components/forms";
import { Badge, Card, Money, PageHeader, Table } from "@/components/ui";
import { formatDate } from "@/lib/jalali";

const STATUS: Record<string, string> = {
  calculated: "محاسبه‌شده",
  approved: "تأییدشده",
  part_paid: "قسمتی پرداخت‌شده",
  paid: "پرداخت‌شده",
  REQUIRES_LEGAL_REVIEW: "نیازمند بررسی",
};

export default async function TaxSettlementsPage({ searchParams }: { searchParams: SP }) {
  const { ctx, t, fmt } = await pageContext("tax_settlements.read");
  const q = await searchParams;
  const caseId = sp1(q.caseId);

  await db.transaction((tx) => ensureMofTaxCatalog(tx, ctx.org.id, ctx.user.id));

  const [settlements, customersList, caseList, types] = await Promise.all([
    db.select({ s: taxSettlements, customer: customers.name, code: customers.customerCode })
      .from(taxSettlements)
      .innerJoin(customers, eq(taxSettlements.customerId, customers.id))
      .where(eq(taxSettlements.organizationId, ctx.org.id))
      .orderBy(desc(taxSettlements.createdAt))
      .limit(300),
    db.select({ id: customers.id, name: customers.name, code: customers.customerCode })
      .from(customers).where(eq(customers.organizationId, ctx.org.id)).orderBy(customers.name),
    db.select({ id: cases.id, caseNumber: cases.caseNumber, customerId: cases.customerId })
      .from(cases).where(eq(cases.organizationId, ctx.org.id)).orderBy(desc(cases.createdAt)).limit(300),
    db.select().from(taxTypes).where(eq(taxTypes.organizationId, ctx.org.id)).orderBy(taxTypes.name),
  ]);

  const fields: Field[] = [
    {
      name: "customerId", label: t("customer"), type: "select", required: true,
      defaultValue: caseList.find((v) => v.id === caseId)?.customerId,
      options: customersList.map((x) => ({ value: x.id, label: x.code + " — " + x.name })),
    },
    {
      name: "caseId", label: t("case"), type: "select", defaultValue: caseId,
      options: caseList.map((x) => ({ value: x.id, label: x.caseNumber })),
    },
    {
      name: "taxTypeId", label: t("taxType"), type: "select",
      options: types.map((x) => ({ value: x.id, label: x.name + " (" + x.code + ")" })),
    },
    { name: "periodStart", label: t("from"), type: "date", required: true },
    { name: "periodEnd", label: t("to"), type: "date", required: true },
    { name: "taxableAmount", label: "مبلغ مشمول مالیه", type: "number", required: true },
    { name: "allowableExpenses", label: "مصارف قابل مجرا", type: "number", defaultValue: 0 },
    { name: "exemptions", label: "معافیت", type: "number", defaultValue: 0 },
    { name: "deductions", label: "کسرات / مالیه قبلی", type: "number", defaultValue: 0 },
    { name: "monthsCount", label: "تعداد ماه", type: "number", defaultValue: 1 },
    { name: "notes", label: t("notes"), type: "textarea", full: true },
  ];

  const calculated = settlements.filter(({ s }) => s.status === "calculated").length;
  const awaitingPayment = settlements.filter(({ s }) => ["approved", "part_paid"].includes(s.status) && Number(s.remainingAmount ?? 0) > 0).length;
  const paid = settlements.filter(({ s }) => s.status === "paid").length;

  return (
    <>
      <PageHeader
        title="تصفیه مالیه"
        subtitle="خدمت مالیاتی مشتری؛ از ثبت درخواست تا پرداخت و نتیجه"
        actions={ctx.can("tax_settlements.write") ? (
          <FormDialog title="ثبت تصفیه مالیه" triggerLabel="+ ثبت تصفیه" action={createTaxSettlementAction} fields={fields} wide successPath="/tax-settlements/{id}" />
        ) : undefined}
      />

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <Card title="در انتظار بررسی"><div className="text-2xl font-bold">{calculated}</div></Card>
        <Card title="در انتظار پرداخت"><div className="text-2xl font-bold">{awaitingPayment}</div></Card>
        <Card title="تکمیل‌شده"><div className="text-2xl font-bold">{paid}</div></Card>
      </div>

      <Card title={"تصفیه‌های مشتریان (" + settlements.length + ")"}>
        <Table
          headers={["شماره", "مشتری", "دوره", "مالیه", "پرداخت‌شده", "باقی‌مانده", "وضعیت", "اقدام"]}
          empty={t("noData")}
          rows={settlements.map(({ s, customer, code }) => [
            <Link key="n" href={"/tax-settlements/" + s.id} className="font-mono text-xs font-semibold text-emerald-700">{s.settlementNumber}</Link>,
            code + " · " + customer,
            formatDate(s.periodStart, fmt) + " — " + formatDate(s.periodEnd, fmt),
            s.taxAmount === null ? "—" : <Money key="tax" value={s.taxAmount} currency={ctx.org.currency} />,
            <Money key="paid" value={s.paidAmount} currency={ctx.org.currency} />,
            s.remainingAmount === null ? "—" : <Money key="remaining" value={s.remainingAmount} currency={ctx.org.currency} />,
            <Badge key="status" status={s.status === "paid" || s.status === "approved" ? "approved" : s.status === "REQUIRES_LEGAL_REVIEW" ? "pending_approval" : "draft"} label={STATUS[s.status] ?? s.status} />,
            <Link key="open" href={"/tax-settlements/" + s.id} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs">بازکردن</Link>,
          ])}
        />
      </Card>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
        <strong className="text-slate-800">روند ساده:</strong> مشتری → ثبت تصفیه → محاسبه → تأیید → پرداخت → نتیجه.
        قواعد قانونی و محاسبه در پشت صحنه اجرا می‌شوند و کارمند لازم نیست آن‌ها را در مسیر روزمره مدیریت کند.
      </div>
    </>
  );
}
