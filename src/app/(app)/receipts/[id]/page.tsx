import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { cases, customers, organizations, profiles, serviceFeeReceipts, transactions } from "@/db/schema";
import { pageContext } from "@/lib/page";
import { PageHeader, KV, Money, Card } from "@/components/ui";
import { PrintButton } from "@/components/forms";
import { formatDateTime } from "@/lib/jalali";
import { CustomerLogo, FinoraLogo } from "@/components/BrandLogos";

export default async function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, t, fmt } = await pageContext("cases.read");
  const [row] = await db.select({ receipt: serviceFeeReceipts, customer: customers, caseRecord: cases, txn: transactions, issuedBy: profiles.fullName, org: organizations })
    .from(serviceFeeReceipts)
    .innerJoin(customers, eq(serviceFeeReceipts.customerId, customers.id))
    .innerJoin(cases, eq(serviceFeeReceipts.caseId, cases.id))
    .innerJoin(transactions, eq(serviceFeeReceipts.transactionId, transactions.id))
    .innerJoin(organizations, eq(serviceFeeReceipts.organizationId, organizations.id))
    .leftJoin(profiles, eq(serviceFeeReceipts.issuedBy, profiles.id))
    .where(and(eq(serviceFeeReceipts.id, id), eq(serviceFeeReceipts.organizationId, ctx.org.id)));
  if (!row) notFound();
  const total = Number(row.receipt.feeTotalSnapshot);
  const paid = Number(row.receipt.paidAmount);
  return (
    <>
      <PageHeader title={t("receipt")} subtitle={row.receipt.receiptNumber} actions={<>
        <Link href={`/cases/${row.caseRecord.id}`} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm print:hidden">← {t("back")}</Link>
        <PrintButton label={t("printReceipt")} audit={{ entityType: "service_fee_receipt", entityId: id }} />
      </>} />
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-300 bg-white p-6 sm:p-10 shadow-sm print:shadow-none print:border-0">
        <div className="flex flex-wrap justify-between items-start gap-4 border-b-2 border-emerald-800 pb-5">
          <div className="flex items-center gap-4">
            <FinoraLogo height={56} />
            <div><div className="text-sm text-slate-500">{t("slogan")}</div><div className="mt-1 text-xs text-slate-500">{row.org.address ?? t("addressShort")}</div></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-end"><div className="text-xl font-bold">{t("receipt")}</div><div className="font-mono text-sm mt-1" dir="ltr">{row.receipt.receiptNumber}</div><div className="text-xs mt-1 text-slate-500">{formatDateTime(row.receipt.createdAt, fmt)}</div></div>
            <CustomerLogo attachmentId={row.customer.logoAttachmentId} name={row.customer.name} height={56} />
          </div>
        </div>
        <h1 className="my-6 text-center text-xl font-bold">{t("serviceFee")}</h1>
        <KV items={[
          [t("customer"), row.customer.name],
          [t("customerCode"), row.customer.customerCode],
          [t("caseNumber"), <Link key="c" href={`/cases/${row.caseRecord.id}`} className="text-emerald-700">{row.caseRecord.caseNumber}</Link>],
          [t("service"), row.caseRecord.serviceId ? row.caseRecord.serviceId.slice(0, 8) : t("services")],
          [t("feeTotal"), <Money key="f" value={total} currency={row.receipt.currency} />],
          [t("paidAmount"), <Money key="p" value={paid} currency={row.receipt.currency} />],
          [t("remainingAmount"), <Money key="r" value={Math.max(0, total - paid)} currency={row.receipt.currency} />],
          [t("paymentMethod"), t(row.receipt.paymentMethod)],
          [t("transactionType"), row.txn.transactionNumber],
          [t("createdBy"), row.issuedBy ?? "-"],
          [t("description"), row.receipt.description],
        ]} />
        <div className="mt-8 grid grid-cols-2 gap-8 text-center text-xs text-slate-500">
          <div className="border-t border-slate-300 pt-2">{t("preparedBy")}</div>
          <div className="border-t border-slate-300 pt-2">{t("customer")}</div>
        </div>
        <p className="mt-8 text-center text-xs text-slate-400">{t("printAudit")}</p>
      </div>
    </>
  );
}
