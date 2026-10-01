import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cases, customerAccounts, customerLedger, customers, services } from "@/db/schema";
import { pageContext } from "@/lib/page";
import { loadFinanceRefs } from "@/lib/refs";
import { receivePaymentAction, setCustomerOpeningBalance } from "@/actions/finance";
import { Badge, Card, KV, Money, PageHeader, Stat, Table } from "@/components/ui";
import { FormDialog, PrintButton } from "@/components/forms";
import { formatDate, formatDateTime } from "@/lib/jalali";
import { CustomerLogo } from "@/components/BrandLogos";
import { round2 } from "@/lib/format";

export default async function CustomerLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, t, fmt } = await pageContext("customer_accounts.read");
  const [c] = await db.select().from(customers).where(and(eq(customers.id, id), eq(customers.organizationId, ctx.org.id)));
  if (!c) notFound();
  const [[acct], rows, refs, customerCases] = await Promise.all([
    db.select().from(customerAccounts).where(and(eq(customerAccounts.customerId, id), eq(customerAccounts.organizationId, ctx.org.id))),
    db.select().from(customerLedger).where(eq(customerLedger.customerId, id)).orderBy(asc(customerLedger.transactionDate), asc(customerLedger.createdAt)),
    loadFinanceRefs(ctx.org.id, ctx.org.currency),
    db.select({ c: cases, serviceName: services.name }).from(cases).leftJoin(services, eq(cases.serviceId, services.id)).where(and(eq(cases.customerId, id), eq(cases.organizationId, ctx.org.id))).orderBy(desc(cases.createdAt)),
  ]);
  const opening = Number(acct?.openingBalance ?? 0);
  const debit = round2(rows.reduce((s, r) => s + Number(r.debit), 0));
  const credit = round2(rows.reduce((s, r) => s + Number(r.credit), 0));
  const balance = round2(opening + debit - credit);
  const targets = [...refs.cashAccounts.map((a) => ({ value: `cash:${a.id}`, label: `${t("cash")}: ${a.name}` })), ...refs.bankAccounts.map((b) => ({ value: `bank:${b.id}`, label: `${t("bank")}: ${b.label}` }))];
  const canWrite = ctx.can("customer_accounts.write");
  let running = opening;
  return (
    <>
      <PageHeader title={`${t("ledger")} — ${c.name}`} subtitle={`${c.customerCode} · ${c.phone ?? ""}`} actions={<>
        <Link href="/customer-accounts" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">← {t("back")}</Link>
        <PrintButton label={t("print")} audit={{ entityType: "report" }} />
        <a href={`/api/reports/export?type=customer_ledger&format=csv&customerId=${id}`} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">{t("exportCsv")}</a>
        {canWrite && <FormDialog title={t("openingBalance")} triggerLabel={t("openingBalance")} triggerVariant="secondary" action={setCustomerOpeningBalance} hidden={{ customerId: id }} fields={[{ name: "openingBalance", label: `${t("openingBalance")} (${ctx.org.currency})`, type: "number", required: true, defaultValue: opening, full: true }]} />}
        {canWrite && <FormDialog title={t("receivePayment")} triggerLabel={`+ ${t("receivePayment")}`} action={receivePaymentAction} hidden={{ customerId: id }} fields={[
          { name: "amount", label: `${t("amount")} (${ctx.org.currency})`, type: "number", required: true, defaultValue: balance > 0 ? balance : "" },
          { name: "account", label: t("toAccount"), type: "select", required: true, defaultValue: targets[0]?.value, options: targets },
          { name: "date", label: t("date"), type: "date", required: true },
          { name: "description", label: t("description"), type: "textarea" },
        ]} />}
      </>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label={t("openingBalance")} value={<Money value={opening} currency={ctx.org.currency} />} />
        <Stat label={t("debit")} value={<Money value={debit} currency={ctx.org.currency} />} tone="red" />
        <Stat label={t("creditCol")} value={<Money value={credit} currency={ctx.org.currency} />} tone="green" />
        <Stat label={t("balance")} value={<Money value={balance} currency={ctx.org.currency} colored />} tone={balance > 0 ? "amber" : "blue"} sub={balance > 0 ? t("receivable") : ""} />
      </div>
      <div className="grid lg:grid-cols-4 gap-4">
        <Card title={t("customer")}>
          <div className="mb-3 flex items-center gap-3">
            <CustomerLogo attachmentId={c.logoAttachmentId} name={c.name} height={56} />
            <div className="min-w-0"><div className="font-semibold text-slate-800">{c.name}</div><div className="text-xs text-slate-500">{c.customerCode}</div></div>
          </div>
          <KV items={[[t("customerCode"), c.customerCode], [t("fatherName"), c.fatherName], [t("nationalId"), c.nationalId], [t("tin"), c.tin], [t("licenseNumber"), c.licenseNumber], [t("phone"), c.phone], [t("province"), c.province], [t("address"), c.address]]} />
        </Card>
        <Card title={t("ledger")} className="lg:col-span-3">
          <Table headers={[t("date"), t("reference"), t("description"), t("debit"), t("creditCol"), t("balance")]} empty={t("noData")}
            rows={rows.map((r) => {
              running = round2(running + Number(r.debit) - Number(r.credit));
              return [formatDateTime(r.transactionDate, fmt), <span key="r" className="text-xs text-slate-500">{r.referenceType}</span>, r.description, <Money key="d" value={r.debit} />, <Money key="c" value={r.credit} />, <Money key="b" value={running} colored />];
            })}
            footer={[t("total"), "", "", <Money key="d" value={debit} />, <Money key="c" value={credit} />, <Money key="b" value={balance} colored />]} />
        </Card>
        {customerCases.length > 0 && (
          <Card title={`${t("cases")} (${customerCases.length})`} className="lg:col-span-4" actions={<Link href={`/cases?q=${c.customerCode}`} className="text-xs text-emerald-700">{t("all")} →</Link>}>
            <Table
              headers={[t("caseNumber"), t("service"), t("openingDate"), t("priority"), t("caseFee"), t("status"), ""]}
              empty={t("noData")}
              rows={customerCases.map(({ c: k, serviceName }) => [
                <Link key="n" href={`/cases/${k.id}`} className="font-mono text-xs font-semibold text-emerald-700">{k.caseNumber}</Link>,
                serviceName ?? "-",
                formatDate(k.openedAt, fmt),
                <Badge key="p" status={k.priority === "urgent" ? "rejected" : "draft"} label={t(k.priority)} />,
                <Money key="f" value={Number(k.serviceFee) - Number(k.discountAmount)} currency={k.feeCurrency} />,
                <Badge key="s" status={k.status === "closed" || k.status === "delivered" ? "completed" : "under_review"} label={t(k.status)} />,
                <Link key="v" href={`/cases/${k.id}`} className="rounded-lg border border-slate-300 px-2 py-1 text-xs">{t("details")}</Link>,
              ])}
            />
          </Card>
        )}
      </div>
    </>
  );
}
