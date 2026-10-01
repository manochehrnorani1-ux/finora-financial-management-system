import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cases, customers, incomes, services } from "@/db/schema";
import { pageContext, sp1, type SP } from "@/lib/page";
import { loadFinanceRefs } from "@/lib/refs";
import { saveIncome, finalizeIncomeAction, approveIncomeAction, rejectIncomeAction, deleteIncome } from "@/actions/finance";
import { Badge, Card, Money, PageHeader, Stat, Table } from "@/components/ui";
import { ActionButton, FormDialog } from "@/components/forms";
import { incomeFields } from "@/components/finance-forms";
import { formatDate } from "@/lib/jalali";
import type { Metadata } from "next";
import { round2 } from "@/lib/format";

export const metadata: Metadata = {
  title: "مدیریت عواید",
};

export default async function IncomePage({ searchParams }: { searchParams: SP }) {
  const { ctx, t, fmt } = await pageContext("income.read");
  const q = await searchParams;
  const status = sp1(q.status) ?? "";
  const caseId = sp1(q.caseId) ?? "";
  const where = [eq(incomes.organizationId, ctx.org.id)];
  if (status) where.push(eq(incomes.status, status));
  if (caseId) where.push(eq(incomes.caseId, caseId));
  const [rows, refs] = await Promise.all([
    db.select({ i: incomes, customer: customers.name, service: services.name, caseNumber: cases.caseNumber })
      .from(incomes)
      .leftJoin(customers, eq(incomes.customerId, customers.id))
      .leftJoin(services, eq(incomes.serviceId, services.id))
      .leftJoin(cases, eq(incomes.caseId, cases.id))
      .where(and(...where))
      .orderBy(desc(incomes.incomeDate), desc(incomes.createdAt))
      .limit(300),
    loadFinanceRefs(ctx.org.id, ctx.org.currency),
  ]);
  const canWrite = ctx.can("income.write");
  const canFinalize = ctx.can("income.finalize");
  const canApprove = ctx.can("income.approve");
  const totalFinal = round2(rows.filter((r) => r.i.status === "finalized").reduce((s, r) => s + Number(r.i.baseAmount), 0));
  const statuses = ["draft", "pending_approval", "finalized", "rejected"];
  return (
    <>
      <PageHeader title={t("income")} subtitle={`${rows.length} ${t("records")}`} actions={<>
        <form method="get" className="flex flex-wrap gap-2">
          {refs.cases && refs.cases.length > 0 && (
            <select name="caseId" defaultValue={caseId} className="input !w-auto">
              <option value="">{t("case")}: {t("all")}</option>
              {refs.cases.map((k) => <option key={k.id} value={k.id}>{k.caseNumber}</option>)}
            </select>
          )}
          <select name="status" defaultValue={status} className="input !w-auto"><option value="">{t("all")}</option>{statuses.map((s) => <option key={s} value={s}>{t(s)}</option>)}</select>
          <button className="rounded-lg border border-slate-300 px-3 text-sm bg-white">{t("filter")}</button>
        </form>
        {canWrite && (
          <FormDialog title={`${t("add")} — ${t("income")}`} triggerLabel={`+ ${t("add")}`} action={saveIncome} fields={incomeFields(t, refs, caseId ? { caseId } : undefined)} wide
            secondarySubmit={canFinalize ? { label: t("finalize"), name: "finalize", value: "1" } : undefined} />
        )}
      </>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label={`${t("finalized")} (${t("total")})`} value={<Money value={totalFinal} currency={ctx.org.currency} />} tone="green" />
        <Stat label={t("draft")} value={rows.filter((r) => r.i.status === "draft").length} />
        <Stat label={t("pending_approval")} value={rows.filter((r) => r.i.status === "pending_approval").length} tone="amber" />
        <Stat label={t("taxAmount")} value={<Money value={round2(rows.filter((r) => r.i.status === "finalized").reduce((s, r) => s + Number(r.i.taxAmount) * Number(r.i.exchangeRate), 0))} currency={ctx.org.currency} />} />
      </div>
      <Card>
        <Table
          headers={[t("incomeNumber"), t("date"), t("customer"), t("case"), t("service"), t("amount"), t("taxAmount"), t("totalAmount"), t("baseAmount"), t("paymentMethod"), t("status"), t("actions")]}
          empty={t("noData")}
          rows={rows.map(({ i, customer, service, caseNumber }) => [
            <span key="n" className="font-mono text-xs">{i.incomeNumber}</span>,
            formatDate(i.incomeDate, fmt),
            i.customerId ? <Link key="c" href={`/customer-accounts/${i.customerId}`} className="text-emerald-700">{customer}</Link> : "-",
            i.caseId ? <Link key="k" href={`/cases/${i.caseId}`} className="font-mono text-xs text-emerald-800">{caseNumber ?? i.caseId.slice(0, 8)}</Link> : "-",
            service ?? i.description ?? "-",
            <Money key="a" value={i.amount} currency={i.currency} />,
            <span key="t" className="text-xs"><Money value={i.taxAmount} /> <span className="text-slate-400">({Number(i.taxRate)}%)</span></span>,
            <Money key="tt" value={i.totalAmount} currency={i.currency} />,
            <span key="b" className="text-xs"><Money value={i.baseAmount} currency={i.baseCurrency} />{i.currency !== i.baseCurrency && <span className="text-slate-400"> @{Number(i.exchangeRate)}</span>}</span>,
            t(i.paymentMethod === "credit" ? "credit" : i.paymentMethod),
            <Badge key="s" status={i.status} label={t(i.status)} />,
            <div key="x" className="flex flex-wrap gap-1">
              {i.status !== "finalized" && canWrite && <FormDialog title={t("edit")} triggerLabel={t("edit")} triggerVariant="secondary" triggerSize="sm" action={saveIncome} fields={incomeFields(t, refs, i as unknown as Record<string, unknown>)} hidden={{ id: i.id }} wide />}
              {(i.status === "draft" || i.status === "rejected") && canFinalize && <ActionButton action={finalizeIncomeAction} args={[i.id]} label={t("finalize")} variant="primary" confirm={t("confirm") + "?"} />}
              {i.status === "pending_approval" && canApprove && <ActionButton action={approveIncomeAction} args={[i.id]} label={t("approve")} variant="primary" confirm={t("confirm") + "?"} />}
              {i.status === "pending_approval" && canApprove && <ActionButton action={rejectIncomeAction} args={[i.id]} label={t("reject")} variant="danger" prompt={t("reason")} />}
              {i.status !== "finalized" && ctx.can("income.delete") && <ActionButton action={deleteIncome} args={[i.id]} label={t("delete")} variant="danger" confirm={t("confirmDelete")} />}
              {i.journalEntryId && <Link href={`/accounting?entry=${i.journalEntryId}`} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs">JE</Link>}
            </div>,
          ])}
        />
      </Card>
    </>
  );
}
