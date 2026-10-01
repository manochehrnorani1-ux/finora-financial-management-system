import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cases, contracts, customers } from "@/db/schema";
import { pageContext } from "@/lib/page";
import { saveContract, deleteContract } from "@/actions/master";
import { Badge, Card, Money, PageHeader, Table } from "@/components/ui";
import { ActionButton, FormDialog, type Field } from "@/components/forms";
import { formatDate } from "@/lib/jalali";
import type { Metadata } from "next";
import { CURRENCIES } from "@/lib/format";

export const metadata: Metadata = {
  title: "مدیریت قراردادها",
};

export default async function ContractsPage() {
  const { ctx, t, fmt } = await pageContext("contracts.read");
  const [rows, custs, caseOptions] = await Promise.all([
    db.select({ c: contracts, customer: customers.name, caseNumber: cases.caseNumber })
      .from(contracts)
      .leftJoin(customers, eq(contracts.customerId, customers.id))
      .leftJoin(cases, eq(contracts.caseId, cases.id))
      .where(eq(contracts.organizationId, ctx.org.id))
      .orderBy(desc(contracts.createdAt)),
    db.select({ id: customers.id, name: customers.name, code: customers.customerCode }).from(customers).where(eq(customers.organizationId, ctx.org.id)).orderBy(customers.name),
    db.select({ id: cases.id, caseNumber: cases.caseNumber, customerName: customers.name }).from(cases).innerJoin(customers, eq(cases.customerId, customers.id)).where(eq(cases.organizationId, ctx.org.id)).orderBy(desc(cases.createdAt)).limit(300),
  ]);
  const statuses = ["draft", "active", "completed", "expired", "cancelled"];
  const fields = (c?: typeof contracts.$inferSelect): Field[] => [
    { name: "title", label: t("title"), required: true, defaultValue: c?.title, full: true },
    { name: "contractNumber", label: t("contractNumber"), defaultValue: c?.contractNumber, placeholder: "AUTO", readOnly: !!c },
    { name: "caseId", label: t("case"), type: "select", defaultValue: c?.caseId, options: caseOptions.map((k) => ({ value: k.id, label: `${k.caseNumber} — ${k.customerName}` })), help: "دوسیه / پرونده مربوط به قرارداد (اختیاری)" },
    { name: "customerId", label: t("customer"), type: "select", defaultValue: c?.customerId, options: custs.map((x) => ({ value: x.id, label: `${x.code} — ${x.name}` })) },
    { name: "startDate", label: t("startDate"), type: "date", required: true, defaultValue: c?.startDate },
    { name: "endDate", label: t("endDate"), type: "date", defaultValue: c?.endDate },
    { name: "amount", label: t("amount"), type: "number", required: true, defaultValue: c?.amount ?? 0 },
    { name: "currency", label: t("currency"), type: "select", required: true, defaultValue: c?.currency ?? ctx.org.currency, options: CURRENCIES.map((x) => ({ value: x, label: x })) },
    { name: "status", label: t("status"), type: "select", required: true, defaultValue: c?.status ?? "draft", options: statuses.map((s) => ({ value: s, label: t(s) })) },
    { name: "description", label: t("description"), type: "textarea", defaultValue: c?.description },
  ];
  const canWrite = ctx.can("contracts.write");
  return (
    <>
      <PageHeader title={t("contracts")} subtitle={`${rows.length} ${t("records")}`} actions={canWrite && <FormDialog title={t("create")} triggerLabel={`+ ${t("create")}`} action={saveContract} fields={fields()} />} />
      <Card>
        <Table
          headers={[t("contractNumber"), t("title"), t("case"), t("customer"), t("startDate"), t("endDate"), t("amount"), t("status"), t("actions")]}
          empty={t("noData")}
          rows={rows.map(({ c, customer, caseNumber }) => [
            <span key="n" className="font-mono text-xs">{c.contractNumber}</span>,
            <span key="t" className="font-medium">{c.title}</span>,
            c.caseId ? <Link key="k" href={`/cases/${c.caseId}`} className="font-mono text-xs text-emerald-800">{caseNumber ?? c.caseId.slice(0, 8)}</Link> : "-",
            customer ?? "-",
            formatDate(c.startDate, fmt),
            formatDate(c.endDate, fmt),
            <Money key="m" value={c.amount} currency={c.currency} />,
            <Badge key="s" status={c.status} label={t(c.status)} />,
            <div key="a" className="flex gap-1">
              {canWrite && <FormDialog title={t("edit")} triggerLabel={t("edit")} triggerVariant="secondary" triggerSize="sm" action={saveContract} fields={fields(c)} hidden={{ id: c.id }} />}
              {ctx.can("contracts.delete") && <ActionButton action={deleteContract} args={[c.id]} label={t("delete")} variant="danger" confirm={t("confirmDelete")} />}
            </div>,
          ])}
        />
      </Card>
    </>
  );
}
