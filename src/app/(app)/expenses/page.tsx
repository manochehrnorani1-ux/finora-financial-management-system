import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cases, expenses } from "@/db/schema";
import { pageContext, sp1, type SP } from "@/lib/page";
import { loadFinanceRefs } from "@/lib/refs";
import { saveExpense, finalizeExpenseAction, approveExpenseAction, rejectExpenseAction, deleteExpense } from "@/actions/finance";
import { Badge, Card, Money, PageHeader, Stat, Table } from "@/components/ui";
import { ActionButton, FormDialog } from "@/components/forms";
import { expenseFields } from "@/components/finance-forms";
import { formatDate } from "@/lib/jalali";
import type { Metadata } from "next";
import { round2 } from "@/lib/format";

export const metadata: Metadata = {
  title: "مدیریت مصارف",
};

export default async function ExpensesPage({ searchParams }: { searchParams: SP }) {
  const { ctx, t, fmt } = await pageContext("expenses.read");
  const q = await searchParams;
  const status = sp1(q.status) ?? "";
  const caseId = sp1(q.caseId) ?? "";
  const where = [eq(expenses.organizationId, ctx.org.id)];
  if (status) where.push(eq(expenses.status, status));
  if (caseId) where.push(eq(expenses.caseId, caseId));
  const [rows, refs] = await Promise.all([
    db.select({ e: expenses, caseNumber: cases.caseNumber })
      .from(expenses)
      .leftJoin(cases, eq(expenses.caseId, cases.id))
      .where(and(...where))
      .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt))
      .limit(300),
    loadFinanceRefs(ctx.org.id, ctx.org.currency),
  ]);
  const canWrite = ctx.can("expenses.write");
  const canFinalize = ctx.can("expenses.finalize");
  const canApprove = ctx.can("expenses.approve");
  const totalFinal = round2(rows.filter((r) => r.e.status === "finalized").reduce((s, r) => s + Number(r.e.baseAmount), 0));
  const statuses = ["draft", "pending_approval", "finalized", "rejected"];
  return (
    <>
      <PageHeader title={t("expenses")} subtitle={`${rows.length} ${t("records")}`} actions={<>
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
        {canWrite && <FormDialog title={`${t("add")} — ${t("expenses")}`} triggerLabel={`+ ${t("add")}`} action={saveExpense} fields={expenseFields(t, refs, caseId ? { caseId } : undefined)} wide secondarySubmit={canFinalize ? { label: t("finalize"), name: "finalize", value: "1" } : undefined} />}
      </>} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <Stat label={`${t("finalized")} (${t("total")})`} value={<Money value={totalFinal} currency={ctx.org.currency} />} tone="red" />
        <Stat label={t("draft")} value={rows.filter((r) => r.e.status === "draft").length} />
        <Stat label={t("pending_approval")} value={rows.filter((r) => r.e.status === "pending_approval").length} tone="amber" />
      </div>
      <Card>
        <Table
          headers={[t("expenseNumber"), t("date"), t("category"), t("case"), t("description"), t("amount"), t("taxAmount"), t("totalAmount"), t("baseAmount"), t("paymentMethod"), t("status"), t("actions")]}
          empty={t("noData")}
          rows={rows.map(({ e, caseNumber }) => [
            <span key="n" className="font-mono text-xs">{e.expenseNumber}</span>,
            formatDate(e.expenseDate, fmt),
            t(e.category),
            e.caseId ? <Link key="k" href={`/cases/${e.caseId}`} className="font-mono text-xs text-emerald-800">{caseNumber ?? e.caseId.slice(0, 8)}</Link> : "-",
            <span key="d" className="line-clamp-1">{e.description ?? "-"}</span>,
            <Money key="a" value={e.amount} currency={e.currency} />,
            <Money key="t" value={e.taxAmount} />,
            <Money key="tt" value={e.totalAmount} currency={e.currency} />,
            <span key="b" className="text-xs"><Money value={e.baseAmount} currency={e.baseCurrency} />{e.currency !== e.baseCurrency && <span className="text-slate-400"> @{Number(e.exchangeRate)}</span>}</span>,
            t(e.paymentMethod === "credit" ? "credit" : e.paymentMethod),
            <Badge key="s" status={e.status} label={t(e.status)} />,
            <div key="x" className="flex flex-wrap gap-1">
              {e.status !== "finalized" && canWrite && <FormDialog title={t("edit")} triggerLabel={t("edit")} triggerVariant="secondary" triggerSize="sm" action={saveExpense} fields={expenseFields(t, refs, e as unknown as Record<string, unknown>)} hidden={{ id: e.id }} wide />}
              {(e.status === "draft" || e.status === "rejected") && canFinalize && <ActionButton action={finalizeExpenseAction} args={[e.id]} label={t("finalize")} variant="primary" confirm={t("confirm") + "?"} />}
              {e.status === "pending_approval" && canApprove && <ActionButton action={approveExpenseAction} args={[e.id]} label={t("approve")} variant="primary" confirm={t("confirm") + "?"} />}
              {e.status === "pending_approval" && canApprove && <ActionButton action={rejectExpenseAction} args={[e.id]} label={t("reject")} variant="danger" prompt={t("reason")} />}
              {e.status !== "finalized" && ctx.can("expenses.delete") && <ActionButton action={deleteExpense} args={[e.id]} label={t("delete")} variant="danger" confirm={t("confirmDelete")} />}
              {e.journalEntryId && <Link href={`/accounting?entry=${e.journalEntryId}`} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs">JE</Link>}
            </div>,
          ])}
        />
      </Card>
    </>
  );
}
