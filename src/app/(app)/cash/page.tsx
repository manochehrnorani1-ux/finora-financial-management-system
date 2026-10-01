import { pageContext, sp1, type SP } from "@/lib/page";
import { cashReport, bankReport } from "@/lib/reports";
import { saveCashAccount, cashOperationAction, transferAction } from "@/actions/finance";
import { Badge, Card, Money, PageHeader, Stat, Table } from "@/components/ui";
import { FormDialog, type Field } from "@/components/forms";
import type { Metadata } from "next";
import { formatDateTime } from "@/lib/jalali";

export const metadata: Metadata = {
  title: "مدیریت حساب‌های صندوق",
};

export default async function CashPage({ searchParams }: { searchParams: SP }) {
  const { ctx, t, fmt } = await pageContext("cash.read");
  const q = await searchParams;
  const f = { from: sp1(q.from), to: sp1(q.to), accountId: sp1(q.account) };
  const [r, b] = await Promise.all([cashReport(ctx.org.id, f), bankReport(ctx.org.id, {})]);
  const canWrite = ctx.can("cash.write");
  const cur = ctx.org.currency;
  const accountOpts = r.accounts.filter((a) => a.isActive).map((a) => ({ value: a.id, label: a.name }));
  const targets = [...r.accounts.filter((a) => a.isActive).map((a) => ({ value: `cash:${a.id}`, label: `${t("cash")}: ${a.name}` })), ...b.accounts.filter((a) => a.isActive).map((a) => ({ value: `bank:${a.id}`, label: `${t("bank")}: ${a.bankName} ${a.accountNumber}` }))];
  const opFields = (direction: "in" | "out"): Field[] => [
    { name: "cashAccountId", label: t("cashAccount"), type: "select", required: true, defaultValue: accountOpts[0]?.value, options: accountOpts },
    { name: "amount", label: `${t("amount")} (${cur})`, type: "number", required: true },
    { name: "date", label: t("date"), type: "date", required: true },
    { name: "direction", label: t("direction"), type: "select", required: true, defaultValue: direction, options: [{ value: "in", label: t("cashIn") }, { value: "out", label: t("cashOut") }] },
    { name: "description", label: t("description"), type: "textarea" },
  ];
  return (
    <>
      <PageHeader title={t("cash")} subtitle={t("cashReport")} actions={canWrite && <>
        <FormDialog title={t("cashIn")} triggerLabel={`+ ${t("cashIn")}`} action={cashOperationAction} fields={opFields("in")} />
        <FormDialog title={t("cashOut")} triggerLabel={`− ${t("cashOut")}`} triggerVariant="danger" action={cashOperationAction} fields={opFields("out")} />
        {ctx.can("bank.transfer") && <FormDialog title={t("transfer")} triggerLabel={t("transfer")} triggerVariant="warning" action={transferAction} fields={[
          { name: "from", label: t("fromAccount"), type: "select", required: true, defaultValue: targets[0]?.value, options: targets },
          { name: "to", label: t("toAccount"), type: "select", required: true, defaultValue: targets[1]?.value, options: targets },
          { name: "amount", label: `${t("amount")} (${cur})`, type: "number", required: true },
          { name: "date", label: t("date"), type: "date", required: true },
          { name: "description", label: t("description"), type: "textarea" },
        ]} />}
        <FormDialog title={t("cashAccount")} triggerLabel={`+ ${t("cashAccount")}`} triggerVariant="secondary" action={saveCashAccount} fields={[{ name: "name", label: t("name"), required: true, full: true }, { name: "openingBalance", label: `${t("openingBalance")} (${cur})`, type: "number", defaultValue: 0 }]} />
      </>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label={t("cashBalance")} value={<Money value={r.balance} currency={cur} />} tone="blue" />
        <Stat label={t("in")} value={<Money value={r.totalIn} currency={cur} />} tone="green" />
        <Stat label={t("out")} value={<Money value={r.totalOut} currency={cur} />} tone="red" />
        <Stat label={t("cashAccount")} value={r.accounts.length} />
      </div>
      <div className="grid lg:grid-cols-4 gap-4">
        <Card title={t("cashAccount")} className="lg:col-span-1">
          <ul className="divide-y divide-slate-100 text-sm">
            {r.accounts.map((a) => (
              <li key={a.id} className="py-2">
                <div className="flex items-center justify-between gap-2">
                  <a href={`/cash?account=${a.id}`} className="font-medium text-emerald-700">{a.name}</a>
                  <Badge status={a.isActive ? "active" : "inactive"} label={t(a.isActive ? "active" : "inactive")} />
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-1"><span>{t("openingBalance")}</span><Money value={a.openingBalance} /></div>
                <div className="flex justify-between font-semibold"><span>{t("currentBalance")}</span><Money value={a.currentBalance} currency={a.currency} colored /></div>
                {canWrite && <div className="mt-1"><FormDialog title={t("edit")} triggerLabel={t("edit")} triggerVariant="ghost" triggerSize="sm" action={saveCashAccount} hidden={{ id: a.id }} fields={[{ name: "name", label: t("name"), required: true, defaultValue: a.name, full: true }, { name: "isActive", label: t("status"), type: "select", required: true, defaultValue: String(a.isActive), options: [{ value: "true", label: t("active") }, { value: "false", label: t("inactive") }] }]} /></div>}
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t("cashReport")} className="lg:col-span-3" actions={
          <form method="get" className="flex flex-wrap gap-2 text-sm">
            {f.accountId && <input type="hidden" name="account" value={f.accountId} />}
            <input type="date" name="from" defaultValue={f.from} className="input !w-auto" />
            <input type="date" name="to" defaultValue={f.to} className="input !w-auto" />
            <button className="rounded-lg bg-slate-800 text-white px-3 py-1.5">{t("apply")}</button>
            <a href={`/api/reports/export?type=cash&format=csv`} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5">{t("exportCsv")}</a>
          </form>
        }>
          <Table headers={[t("date"), t("cashAccount"), t("transactionType"), t("description"), t("in"), t("out"), t("balanceAfter")]} empty={t("noData")}
            rows={r.rows.map(({ tx, account }) => [
              formatDateTime(tx.transactionDate, fmt),
              account,
              <Badge key="t" status={tx.direction} label={t(tx.transactionType === "income" ? "income" : tx.transactionType === "expense" ? "expenses" : tx.transactionType === "customer_payment" ? "receivePayment" : tx.transactionType)} />,
              <span key="d" className="line-clamp-1 max-w-xs">{tx.description}</span>,
              tx.direction === "in" ? <Money key="i" value={tx.amount} /> : "",
              tx.direction === "out" ? <Money key="o" value={tx.amount} /> : "",
              <Money key="b" value={tx.balanceAfter} />,
            ])} />
        </Card>
      </div>
    </>
  );
}
