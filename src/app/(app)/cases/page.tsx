import Link from "next/link";
import type { Metadata } from "next";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { caseWorkflowSteps, cases, customers, organizationMembers, profiles, services } from "@/db/schema";
import { pageContext, sp1, type SP } from "@/lib/page";
import { WORKFLOW_KEYS, WORKFLOW_SERVICES, WORKFLOW_STAGES, isWorkflowKey } from "@/lib/case-workflow-definitions";
import { saveCase } from "@/actions/master";
import { Badge, Card, Money, PageHeader, Stat, Table } from "@/components/ui";
import { FormDialog, type Field } from "@/components/forms";
import { formatDate, todayIso } from "@/lib/jalali";

export const metadata: Metadata = { title: "دوسیه‌های خدمات FINORA" };
const STATUSES = ["new", "reviewing", "missing_documents", "in_progress", "awaiting_review", "awaiting_approval", "ready_for_delivery", "delivered", "closed", "cancelled"];

export default async function CasesPage({ searchParams }: { searchParams: SP }) {
  const { ctx, t, lang, fmt } = await pageContext("cases.read");
  const q = await searchParams;
  const search = sp1(q.q) ?? "";
  const status = sp1(q.status) ?? "";
  const serviceKey = sp1(q.serviceKey) ?? "";
  const serviceId = sp1(q.serviceId) ?? "";
  const parentCaseId = sp1(q.parentCaseId) ?? "";
  const where = [eq(cases.organizationId, ctx.org.id)];
  if (status) where.push(eq(cases.status, status));
  if (serviceKey && isWorkflowKey(serviceKey)) where.push(eq(cases.workflowKey, serviceKey));
  if (serviceId && /^[0-9a-f-]{36}$/i.test(serviceId)) where.push(eq(cases.serviceId, serviceId));
  if (search) where.push(or(ilike(cases.caseNumber, `%${search}%`), ilike(customers.name, `%${search}%`), ilike(cases.notes, `%${search}%`))!);
  const [rows, customerList, serviceList, members] = await Promise.all([
    db.select({ c: cases, customer: customers.name, customerCode: customers.customerCode, service: services.name, employee: profiles.fullName })
      .from(cases).innerJoin(customers, eq(cases.customerId, customers.id)).leftJoin(services, eq(cases.serviceId, services.id))
      .leftJoin(profiles, eq(cases.responsibleEmployeeId, profiles.id)).where(and(...where)).orderBy(desc(cases.createdAt)).limit(100),
    db.select({ id: customers.id, name: customers.name, code: customers.customerCode }).from(customers).where(and(eq(customers.organizationId, ctx.org.id), eq(customers.status, "active"))).orderBy(customers.name),
    db.select({ id: services.id, name: services.name, serviceKey: services.workflowKey, price: services.defaultPrice }).from(services).where(and(eq(services.organizationId, ctx.org.id), eq(services.status, "active"))).orderBy(services.publicOrder, services.name),
    db.select({ id: profiles.id, name: profiles.fullName }).from(organizationMembers).innerJoin(profiles, eq(organizationMembers.userId, profiles.id)).where(and(eq(organizationMembers.organizationId, ctx.org.id), eq(organizationMembers.status, "active"))),
  ]);
  const ids = rows.map((v) => v.c.id);
  const allSteps = ids.length
    ? await db.select({
        caseId: caseWorkflowSteps.caseId,
        stepNo: caseWorkflowSteps.stepNo,
        title: caseWorkflowSteps.title,
        status: caseWorkflowSteps.status,
        dueDate: caseWorkflowSteps.dueDate,
      }).from(caseWorkflowSteps)
        .where(and(eq(caseWorkflowSteps.organizationId, ctx.org.id), inArray(caseWorkflowSteps.caseId, ids)))
        .orderBy(caseWorkflowSteps.stepNo)
    : [];
  const formFields: Field[] = [
    { name: "customerId", label: t("customer"), type: "select", required: true, options: customerList.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })) },
    { name: "serviceId", label: t("service"), type: "select", required: true, defaultValue: serviceList.find((s) => s.id === serviceId)?.id ?? serviceList.find((s) => s.serviceKey === serviceKey)?.id ?? serviceList.find((s) => s.serviceKey === "tax-settlement")?.id, options: serviceList.map((s) => ({ value: s.id, label: `${s.name} (${Number(s.price).toLocaleString()} ${ctx.org.currency})` })) },
    { name: "openedAt", label: t("openingDate"), type: "date", required: true },
    { name: "responsibleEmployeeId", label: t("responsibleEmployee"), type: "select", options: members.map((m) => ({ value: m.id, label: m.name })) },
    { name: "priority", label: t("priority"), type: "select", required: true, defaultValue: "normal", options: ["normal", "high", "urgent"].map((v) => ({ value: v, label: t(v) })) },
    { name: "serviceFee", label: `${t("caseFee")} (${ctx.org.currency})`, type: "number", help: t("feeOnReview") },
    { name: "discountAmount", label: `${t("discount")} (${ctx.org.currency})`, type: "number", defaultValue: 0 },
    { name: "notes", label: t("internalNote"), type: "textarea", full: true },
  ];
  const activeCount = rows.filter((r) => !["closed", "cancelled"].includes(r.c.status)).length;
  const overdue = allSteps.filter((s) => s.dueDate && s.dueDate < todayIso() && s.status === "active").length;
  return (
    <>
      <PageHeader title={t("cases")} subtitle={`${activeCount} ${t("active")} · ${rows.length} ${t("records")}`} actions={<>
        <form method="get" className="flex flex-wrap gap-2">
          <input name="q" defaultValue={search} placeholder={t("search")} className="input max-w-[180px]" />
          <select name="serviceKey" defaultValue={serviceKey} className="input !w-auto"><option value="">{t("service")}: {t("all")}</option>{WORKFLOW_KEYS.map((key) => <option key={key} value={key}>{WORKFLOW_SERVICES[key].label[lang]}</option>)}</select>
          <select name="status" defaultValue={status} className="input !w-auto"><option value="">{t("all")}</option>{STATUSES.map((s) => <option key={s} value={s}>{t(s)}</option>)}</select>
          <button className="rounded-lg border border-slate-300 bg-white px-3 text-sm">{t("filter")}</button>
        </form>
        {ctx.can("cases.write") && <FormDialog title={`${t("create")} — ${t("case")}`} triggerLabel={`+ ${t("create")}`} action={saveCase} fields={formFields} wide successPath="/cases/{id}" />}
      </>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label={t("activeCases")} value={activeCount} tone="blue" /><Stat label={t("completedCases")} value={rows.filter((r) => r.c.status === "closed").length} tone="green" /><Stat label={t("missingDocuments")} value={rows.filter((r) => r.c.status === "missing_documents").length} tone="amber" /><Stat label={t("milestoneOverdue")} value={overdue} tone={overdue ? "red" : "default"} /></div>
      <Card>
        <Table headers={[t("caseNumber"), t("customer"), t("service"), t("workflowProcess"), t("responsibleEmployee"), t("milestoneDue"), t("status"), t("actions")]} empty={t("noData")}
          rows={rows.map(({ c, customer, customerCode, service, employee }) => {
            const currentStep = allSteps.find((v) => v.caseId === c.id && v.status === "active") ?? allSteps.find((v) => v.caseId === c.id && v.status !== "completed");
            const currentStage = currentStep?.title ?? (!isWorkflowKey(c.workflowKey) ? t("workflowNoService") : c.status === "closed" ? t("caseClosed") : t("readyToApprove"));
            return [
              <Link key="n" href={`/cases/${c.id}`} className="font-mono text-xs font-semibold text-emerald-800">{c.caseNumber}</Link>,
              <span key="cu" className="font-medium">{customerCode} · {customer}</span>,
              isWorkflowKey(c.serviceKey) ? <Link key="s" href={`/services-workflow/${c.serviceKey}`} className="text-emerald-700">{WORKFLOW_SERVICES[c.serviceKey].label[lang]}</Link> : service ?? "—",
              <span key="w" className="text-xs text-slate-700">{currentStage}</span>,
              employee ?? "—",
              currentStep?.dueDate ? <span key="d" className={currentStep.dueDate < todayIso() && activeCount ? "text-red-700" : ""}>{formatDate(currentStep.dueDate, fmt)}</span> : "—",
              <Badge key="st" status={c.status === "closed" ? "completed" : c.status === "cancelled" || c.status === "missing_documents" ? "rejected" : "under_review"} label={t(c.status)} />,
              <Link key="a" href={`/cases/${c.id}`} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs">{t("nextAction")} →</Link>,
            ];
          })} />
      </Card>
    </>
  );
}
