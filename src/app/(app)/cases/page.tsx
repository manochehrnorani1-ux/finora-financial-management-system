import Link from "next/link";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { cases, customers, organizationMembers, profiles, services } from "@/db/schema";
import { pageContext, sp1, type SP } from "@/lib/page";
import { saveCase } from "@/actions/master";
import { Badge, Card, Money, PageHeader, Table } from "@/components/ui";
import { FormDialog, type Field } from "@/components/forms";
import { formatDate } from "@/lib/jalali";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "دوسیه‌ها و پرونده‌ها",
};

const STATUSES: Record<string, string> = { new: "newCase", reviewing: "reviewing", missing_documents: "missingDocuments", in_progress: "inProgress", awaiting_review: "awaitingReview", awaiting_approval: "awaitingApproval", ready_for_delivery: "readyForDelivery", delivered: "delivered", closed: "closed", cancelled: "cancelled" };

export default async function CasesPage({ searchParams }: { searchParams: SP }) {
  const { ctx, t, fmt } = await pageContext("cases.read");
  const q = await searchParams;
  const search = sp1(q.q) ?? "";
  const status = sp1(q.status) ?? "";
  const where = [eq(cases.organizationId, ctx.org.id)];
  if (status) where.push(eq(cases.status, status));
  if (search) where.push(or(ilike(cases.caseNumber, `%${search}%`), ilike(customers.name, `%${search}%`), ilike(cases.notes, `%${search}%`))!);
  const [rows, customerList, serviceList, members] = await Promise.all([
    db.select({ c: cases, customer: customers.name, customerCode: customers.customerCode, service: services.name, employee: profiles.fullName })
      .from(cases).innerJoin(customers, eq(cases.customerId, customers.id)).leftJoin(services, eq(cases.serviceId, services.id)).leftJoin(profiles, eq(cases.responsibleEmployeeId, profiles.id)).where(and(...where)).orderBy(desc(cases.createdAt)).limit(300),
    db.select({ id: customers.id, name: customers.name, code: customers.customerCode }).from(customers).where(and(eq(customers.organizationId, ctx.org.id), eq(customers.status, "active"))).orderBy(customers.name),
    db.select({ id: services.id, name: services.name, price: services.defaultPrice }).from(services).where(and(eq(services.organizationId, ctx.org.id), eq(services.status, "active"))).orderBy(services.name),
    db.select({ id: profiles.id, name: profiles.fullName }).from(organizationMembers).innerJoin(profiles, eq(organizationMembers.userId, profiles.id)).where(and(eq(organizationMembers.organizationId, ctx.org.id), eq(organizationMembers.status, "active"))),
  ]);
  const fields: Field[] = [
    { name: "customerId", label: t("customer"), type: "select", required: true, options: customerList.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })) },
    { name: "serviceId", label: t("service"), type: "select", defaultValue: serviceList[0]?.id, options: serviceList.map((s) => ({ value: s.id, label: `${s.name} (${Number(s.price).toLocaleString()} ${ctx.org.currency})` })) },
    { name: "openedAt", label: t("openingDate"), type: "date", required: true },
    { name: "responsibleEmployeeId", label: t("responsibleEmployee"), type: "select", options: members.map((m) => ({ value: m.id, label: m.name })) },
    { name: "priority", label: t("priority"), type: "select", required: true, defaultValue: "normal", options: ["normal", "high", "urgent"].map((x) => ({ value: x, label: t(x) })) },
    { name: "serviceFee", label: `${t("caseFee")} (${ctx.org.currency})`, type: "number", defaultValue: serviceList.length ? Number(serviceList[0].price) : 0 },
    { name: "discountAmount", label: `${t("discount")} (${ctx.org.currency})`, type: "number", defaultValue: 0 },
    { name: "notes", label: t("internalNote"), type: "textarea", full: true },
  ];
  const activeCount = rows.filter((r) => !["closed", "cancelled"].includes(r.c.status)).length;
  return (
    <>
      <PageHeader title={t("cases")} subtitle={`${activeCount} ${t("active")} · ${rows.length} ${t("records")}`} actions={<>
        <form method="get" className="flex flex-wrap gap-2">
          <input name="q" defaultValue={search} placeholder={t("search")} className="input max-w-[180px]" />
          <select name="status" defaultValue={status} className="input !w-auto"><option value="">{t("all")}</option>{Object.entries(STATUSES).map(([s, k]) => <option key={s} value={s}>{t(k)}</option>)}</select>
          <button className="rounded-lg border border-slate-300 bg-white px-3 text-sm">{t("filter")}</button>
        </form>
        {ctx.can("cases.write") && <FormDialog title={t("create")} triggerLabel={`+ ${t("create")} ${t("case")}`} action={saveCase} fields={fields} wide successPath="/cases/{id}" />}
      </>} />
      <Card>
        <Table headers={[t("caseNumber"), t("customer"), t("service"), t("openingDate"), t("responsibleEmployee"), t("priority"), t("caseFee"), t("status"), t("actions")]} empty={t("noData")}
          rows={rows.map(({ c, customer, customerCode, service, employee }) => [
            <Link key="n" href={`/cases/${c.id}`} className="font-mono text-xs font-semibold text-emerald-800">{c.caseNumber}</Link>,
            <span key="cu" className="font-medium">{customerCode} · {customer}</span>,
            service ?? "-",
            formatDate(c.openedAt, fmt),
            employee ?? "-",
            <Badge key="p" status={c.priority === "urgent" ? "rejected" : c.priority === "high" ? "pending_approval" : "draft"} label={t(c.priority)} />,
            <Money key="f" value={Number(c.serviceFee) - Number(c.discountAmount)} currency={c.feeCurrency} />,
            <Badge key="s" status={c.status === "closed" || c.status === "delivered" ? "completed" : c.status === "cancelled" || c.status === "missing_documents" ? "rejected" : "under_review"} label={t(STATUSES[c.status] ?? c.status)} />,
            <Link key="d" href={`/cases/${c.id}`} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs">{t("details")}</Link>,
          ])} />
      </Card>
    </>
  );
}
