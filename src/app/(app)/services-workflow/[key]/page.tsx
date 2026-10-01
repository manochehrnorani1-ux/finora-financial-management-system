import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { cases, customers, organizationMembers, profiles, services } from "@/db/schema";
import { pageContext, sp1, type SP } from "@/lib/page";
import { WORKFLOW_KEYS, WORKFLOW_SERVICES, WORKFLOW_STAGES, isWorkflowKey } from "@/lib/case-workflow-definitions";
import { getCaseSnapshot } from "@/lib/case-workflows";
import { saveCase } from "@/actions/master";
import { Badge, Card, Money, PageHeader, Stat, Table } from "@/components/ui";
import { FormDialog, type Field } from "@/components/forms";
import { formatDate } from "@/lib/jalali";

export function generateStaticParams() { return WORKFLOW_KEYS.map((key) => ({ key })); }

export default async function ServiceWorkflowPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: SP }) {
  const { key } = await params;
  if (!isWorkflowKey(key)) notFound();
  const { ctx, t, lang, fmt } = await pageContext("cases.read");
  const def = WORKFLOW_SERVICES[key];
  const q = await searchParams;
  const search = sp1(q.q) ?? "";
  const status = sp1(q.status) ?? "";
  const [svc] = await db.select().from(services).where(and(eq(services.organizationId, ctx.org.id), eq(services.serviceKey, key))).limit(1);
  if (!svc) notFound();
  const where = [eq(cases.organizationId, ctx.org.id), eq(cases.serviceKey, key)];
  if (status) where.push(eq(cases.status, status));
  if (search) where.push(or(ilike(cases.caseNumber, `%${search}%`), ilike(customers.name, `%${search}%`))!);
  const [rows, customerList, members] = await Promise.all([
    db.select({ k: cases, customer: customers.name }).from(cases).innerJoin(customers, eq(cases.customerId, customers.id)).where(and(...where)).orderBy(desc(cases.createdAt)).limit(25),
    db.select({ id: customers.id, name: customers.name, code: customers.customerCode }).from(customers).where(and(eq(customers.organizationId, ctx.org.id), eq(customers.status, "active"))).orderBy(customers.name),
    db.select({ id: profiles.id, name: profiles.fullName }).from(organizationMembers).innerJoin(profiles, eq(organizationMembers.userId, profiles.id)).where(and(eq(organizationMembers.organizationId, ctx.org.id), eq(organizationMembers.status, "active"))),
  ]);
  const snapshots = await Promise.all(rows.map((r) => getCaseSnapshot(db, ctx.org.id, r.k.id)));
  const stateById = new Map(snapshots.map((v) => [v.caseRecord.id, v]));
  const formFields: Field[] = [
    { name: "customerId", label: t("customer"), type: "select", required: true, options: customerList.map((v) => ({ value: v.id, label: `${v.code} — ${v.name}` })) },
    { name: "openedAt", label: t("openingDate"), type: "date", required: true },
    { name: "dueDate", label: t("milestoneDue"), type: "date" },
    { name: "responsibleEmployeeId", label: t("responsibleEmployee"), type: "select", options: members.map((v) => ({ value: v.id, label: v.name })) },
    { name: "priority", label: t("priority"), type: "select", required: true, defaultValue: "normal", options: ["normal", "high", "urgent"].map((s) => ({ value: s, label: t(s) })) },
    { name: "serviceFee", label: `${t("caseFee")} (${ctx.org.currency})`, type: "number", defaultValue: svc.defaultPrice },
    { name: "discountAmount", label: `${t("discount")} (${ctx.org.currency})`, type: "number", defaultValue: 0 },
    { name: "notes", label: t("internalNote"), type: "textarea", full: true },
  ];
  const activeCount = rows.filter((r) => !["closed", "cancelled"].includes(r.k.status)).length;
  const overdue = rows.filter((r) => r.k.dueDate && r.k.dueDate < new Date().toISOString().slice(0, 10) && !["closed", "cancelled"].includes(r.k.status)).length;
  return (
    <>
      <PageHeader title={def.label[lang]} subtitle={def.summary[lang]} actions={<>
        <Link href="/panel/services" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">← {t("services")}</Link>
        {ctx.can("cases.write") && <FormDialog title={`${t("create")} — ${def.label[lang]}`} triggerLabel={`+ ${t("case")}`} action={saveCase} hidden={{ serviceId: svc.id }} fields={formFields} wide successPath="/cases/{id}" />}
      </>} />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("cases")} value={rows.length} tone="blue" />
        <Stat label={t("activeCases")} value={activeCount} tone="amber" />
        <Stat label={t("completedCases")} value={rows.filter((r) => r.k.status === "closed").length} tone="green" />
        <Stat label={t("milestoneOverdue")} value={overdue} tone={overdue > 0 ? "red" : "default"} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t("workflowProcess")} className="lg:col-span-2">
          <ol className="space-y-3">
            {def.stages.map((step, index) => {
              const m = WORKFLOW_STAGES[step];
              return <li key={step} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <div className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-800 text-xs font-bold text-white">{index + 1}</span><div className="min-w-0"><h3 className="font-semibold text-slate-800">{t(m.title)}</h3><dl className="mt-1 grid gap-1 text-xs text-slate-600 sm:grid-cols-3"><div><dt className="font-semibold text-slate-500">{t("workflowInput")}</dt><dd>{t(m.input)}</dd></div><div><dt className="font-semibold text-slate-500">{t("workflowAction")}</dt><dd>{t(m.action)}</dd></div><div><dt className="font-semibold text-slate-500">{t("workflowResult")}</dt><dd>{t(m.result)}</dd></div></dl></div></div>
              </li>;
            })}
          </ol>
        </Card>
        <Card title={t("requirementsChecklist")}>
          <ol className="space-y-2 text-sm">{def.requirements[lang].map((v, i) => <li key={i} className="flex gap-2 rounded-lg bg-slate-50 p-2"><span className="font-mono text-emerald-700">{String(i + 1).padStart(2, "0")}</span><span>{v}</span></li>)}</ol>
          <p className="mt-4 border-t pt-3 text-xs leading-6 text-amber-800">{t("provisionalChecklist")} {t("notGovernment")}</p>
        </Card>
      </div>
      <Card title={t("cases")} className="mt-5" actions={<form method="get" className="flex flex-wrap gap-2"><input name="q" defaultValue={search} placeholder={t("search")} className="input max-w-[160px]" /><select name="status" defaultValue={status} className="input !w-auto"><option value="">{t("all")}</option>{["new", "reviewing", "missing_documents", "in_progress", "awaiting_review", "awaiting_approval", "ready_for_delivery", "delivered", "closed", "cancelled"].map((v) => <option key={v} value={v}>{t(v)}</option>)}</select><button className="rounded-lg bg-slate-800 px-3 py-1 text-sm text-white">{t("filter")}</button></form>}>
        <Table headers={[t("caseNumber"), t("customer"), t("status"), t("requirementsChecklist"), t("debtTotal"), t("nextAction"), t("actions")]} empty={t("noData")}
          rows={rows.map(({ k, customer }) => {
            const state = stateById.get(k.id)!;
            return [
              <Link key="c" href={`/cases/${k.id}`} className="font-mono text-xs font-semibold text-emerald-700">{k.caseNumber}</Link>,
              customer,
              <Badge key="s" status={k.status === "closed" ? "completed" : k.status === "cancelled" ? "rejected" : "under_review"} label={t(k.status)} />,
              `${state.verifiedDocs}/${state.requirements.length}`,
              ctx.can("tax_settlements.read") ? <Money key="d" value={state.totalDebt} currency={ctx.org.currency} colored /> : "—",
              <span key="n" className="text-xs text-amber-800">{t(state.nextActionKey)}</span>,
              <Link key="a" href={`/cases/${k.id}`} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs">{t("openModule")}</Link>,
            ];
          })} />
      </Card>
    </>
  );
}
