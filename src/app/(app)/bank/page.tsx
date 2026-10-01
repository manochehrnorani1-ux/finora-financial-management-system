import { pageContext, sp1, type SP } from "@/lib/page";
import { bankReport, cashReport } from "@/lib/reports";
import { saveBankAccount, bankOperationAction, transferAction } from "@/actions/finance";
import { Badge, Card, Money, PageHeader, Stat, Table } from "@/components/ui";
import { FormDialog, type Field } from "@/components/forms";
import type { Metadata } from "next";
import { formatDateTime } from "@/lib/jalali";

export const metadata: Metadata = {
  title: "مدیریت حساب‌های بانکی",
};

export default async function BankPage({ searchParams }: { searchParams: SP }) {
  const { ctx, t, fmt } = await pageContext("bank.read");
  const q = await searchParams;
  const f = { from: sp1(q.from), to: sp1(q.to), accountId: sp1(q.account) };
  const [r, c] = await Promise.all([bankReport(ctx.org.id, f), cashReport(ctx.org.id, {})]);
  const canWrite = ctx.can("bank.write");
  const cur = ctx.org.currency;
  const accountOpts = r.accounts.filter((a) => a.isActive).map((a) => ({ value: a.id, label: `${a.bankName} — ${a.accountNumber}` }));
  const targets = [...r.accounts.filter((a) => a.isActive).map((a) => ({ value: `bank:${a.id}`, label: `${t("bank")}: ${a.bankName} ${a.accountNumber}` })), ...c.accounts.filter((a) => a.isActive).map((a) => ({ value: `cash:${a.id}`, label: `${t("cash")}: ${a.name}` }))];
  const opFields = (kind: string): Field[] => [
    { name: "bankAccountId", label: t("bankAccount"), type: "select", required: true, defaultValue: accountOpts[0]?.value, options: accountOpts },
    { name: "kind", label: t("transactionType"), type: "select", required: true, defaultValue: kind, options: [{ value: "deposit", label: t("deposit") }, { value: "withdrawal", label: t("withdrawal") }, { value: "bank_fee", label: t("bankFee") }] },
    { name: "amount", label: `${t("amount")} (${cur})`, type: "number", required: true },
    { name: "date", label: t("date"), type: "date", required: true },
    { name: "description", label: t("description"), type: "textarea" },
  ];
  const acctFields = (a?: (typeof r.accounts)[number]): Field[] => [
    { name: "bankName", label: t("bankName"), required: true, defaultValue: a?.bankName },
    { name: "accountName", label: t("accountName"), required: true, defaultValue: a?.accountName },
    { name: "accountNumber", label: t("accountNumber"), required: true, defaultValue: a?.accountNumber },
    ...(a ? [{ name: "isActive", label: t("status"), type: "select", required: true, defaultValue: String(a.isActive), options: [{ value: "true", label: t("active") }, { value: "false", label: t("inactive") }] } as Field] : [{ name: "openingBalance", label: `${t("openingBalance")} (${cur})`, type: "number", defaultValue: 0 } as Field]),
  ];
  const typeLabel = (x: string) => ({ income: t("income"), expense: t("expenses"), customer_payment: t("receivePayment"), deposit: t("deposit"), withdrawal: t("withdrawal"), bank_fee: t("bankFee"), transfer: t("transfer") })[x] ?? x;
  return (
    <>
      <PageHeader title={t("bank")} subtitle={t("bankReport")} actions={canWrite && <>
        <FormDialog title={t("deposit")} triggerLabel={`+ ${t("deposit")}`} action={bankOperationAction} fields={opFields("deposit")} />
        <FormDialog title={t("withdrawal")} triggerLabel={`− ${t("withdrawal")}`} triggerVariant="danger" action={bankOperationAction} fields={opFields("withdrawal")} />
        <FormDialog title={t("bankFee")} triggerLabel={t("bankFee")} triggerVariant="secondary" action={bankOperationAction} fields={opFields("bank_fee")} />
        {ctx.can("bank.transfer") && <FormDialog title={t("transfer")} triggerLabel={t("transfer")} triggerVariant="warning" action={transferAction} fields={[
          { name: "from", label: t("fromAccount"), type: "select", required: true, defaultValue: targets[0]?.value, options: targets },
          { name: "to", label: t("toAccount"), type: "select", required: true, defaultValue: targets[1]?.value, options: targets },
          { name: "amount", label: `${t("amount")} (${cur})`, type: "number", required: true },
          { name: "date", label: t("date"), type: "date", required: true },
          { name: "description", label: t("description"), type: "textarea" },
        ]} />}
        <FormDialog title={t("bankAccount")} triggerLabel={`+ ${t("bankAccount")}`} triggerVariant="secondary" action={saveBankAccount} fields={acctFields()} />
      </>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label={t("bankBalance")} value={<Money value={r.balance} currency={cur} />} tone="blue" />
        <Stat label={t("in")} value={<Money value={r.totalIn} currency={cur} />} tone="green" />
        <Stat label={t("out")} value={<Money value={r.totalOut} currency={cur} />} tone="red" />
        <Stat label={t("bankAccount")} value={r.accounts.length} />
      </div>
      <div className="grid lg:grid-cols-4 gap-4">
        <Card title={t("bankAccount")}>
          <ul className="divide-y divide-slate-100 text-sm">
            {r.accounts.length === 0 && <li className="py-6 text-center text-slate-400">{t("noData")}</li>}
            {r.accounts.map((a) => (
              <li key={a.id} className="py-2">
                <div className="flex items-center justify-between gap-2">
                  <a href={`/bank?account=${a.id}`} className="font-medium text-emerald-700">{a.bankName}</a>
                  <Badge status={a.isActive ? "active" : "inactive"} label={t(a.isActive ? "active" : "inactive")} />
                </div>
                <div className="text-xs text-slate-500">{a.accountName} · <span dir="ltr">{a.accountNumber}</span></div>
                <div className="flex justify-between text-xs text-slate-500 mt-1"><span>{t("openingBalance")}</span><Money value={a.openingBalance} /></div>
                <div className="flex justify-between font-semibold"><span>{t("currentBalance")}</span><Money value={a.currentBalance} currency={a.currency} colored /></div>
                {canWrite && <div className="mt-1"><FormDialog title={t("edit")} triggerLabel={t("edit")} triggerVariant="ghost" triggerSize="sm" action={saveBankAccount} hidden={{ id: a.id }} fields={acctFields(a)} /></div>}
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t("bankReport")} className="lg:col-span-3" actions={
          <form method="get" className="flex flex-wrap gap-2 text-sm">
            {f.accountId && <input type="hidden" name="account" value={f.accountId} />}
            <input type="date" name="from" defaultValue={f.from} className="input !w-auto" />
            <input type="date" name="to" defaultValue={f.to} className="input !w-auto" />
            <button className="rounded-lg bg-slate-800 text-white px-3 py-1.5">{t("apply")}</button>
            <a href={`/api/reports/export?type=bank&format=csv`} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5">{t("exportCsv")}</a>
          </form>
        }>
          <Table headers={[t("date"), t("bankAccount"), t("transactionType"), t("description"), t("in"), t("out"), t("balanceAfter")]} empty={t("noData")}
            rows={r.rows.map(({ tx, account }) => [
              formatDateTime(tx.transactionDate, fmt),
              account,
              <Badge key="t" status={tx.direction} label={typeLabel(tx.transactionType)} />,
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
