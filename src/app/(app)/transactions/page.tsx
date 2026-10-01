import Link from "next/link";
import { pageContext, sp1, type SP } from "@/lib/page";
import { transactionReport } from "@/lib/reports";
import { Badge, Card, Money, PageHeader, Stat, Table } from "@/components/ui";
import { formatDateTime } from "@/lib/jalali";
import type { Metadata } from "next";
import { CURRENCIES } from "@/lib/format";

export const metadata: Metadata = {
  title: "معاملات و دفتر روزنامچه",
};

const TYPES = ["income", "expense", "transfer", "customer_payment", "cash_deposit", "cash_withdrawal", "bank_deposit", "bank_withdrawal", "bank_bank_fee"];
const typeLabel = (t: (k: string) => string, x: string) =>
  ({ income: t("income"), expense: t("expenses"), transfer: t("transfer"), customer_payment: t("receivePayment"), cash_deposit: t("cashIn"), cash_withdrawal: t("cashOut"), bank_deposit: t("deposit"), bank_withdrawal: t("withdrawal"), bank_bank_fee: t("bankFee") })[x] ?? x;

export default async function TransactionsPage({ searchParams }: { searchParams: SP }) {
  const { ctx, t, fmt } = await pageContext("transactions.read");
  const q = await searchParams;
  const f = { from: sp1(q.from), to: sp1(q.to), status: sp1(q.type), paymentMethod: sp1(q.method), currency: sp1(q.currency) };
  const r = await transactionReport(ctx.org.id, f);
  return (
    <>
      <PageHeader title={t("transactions")} subtitle={`${r.rows.length} ${t("records")}`} actions={
        <form method="get" className="flex flex-wrap gap-2 text-sm">
          <input type="date" name="from" defaultValue={f.from} className="input !w-auto" />
          <input type="date" name="to" defaultValue={f.to} className="input !w-auto" />
          <select name="type" defaultValue={f.status ?? ""} className="input !w-auto"><option value="">{t("transactionType")}: {t("all")}</option>{TYPES.map((x) => <option key={x} value={x}>{typeLabel(t, x)}</option>)}</select>
          <select name="method" defaultValue={f.paymentMethod ?? ""} className="input !w-auto"><option value="">{t("paymentMethod")}: {t("all")}</option><option value="cash">{t("cash")}</option><option value="bank">{t("bank")}</option><option value="credit">{t("credit")}</option><option value="transfer">{t("transfer")}</option></select>
          <select name="currency" defaultValue={f.currency ?? ""} className="input !w-auto"><option value="">{t("currency")}: {t("all")}</option>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          <button className="rounded-lg bg-slate-800 text-white px-3 py-2">{t("apply")}</button>
          <a href={`/api/reports/export?type=transactions&format=csv&${new URLSearchParams(Object.fromEntries(Object.entries(f).filter(([, v]) => v)) as Record<string, string>)}`} className="rounded-lg border border-slate-300 bg-white px-3 py-2">{t("exportCsv")}</a>
        </form>
      } />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <Stat label={t("in")} value={<Money value={r.totalIn} currency={ctx.org.currency} />} tone="green" />
        <Stat label={t("out")} value={<Money value={r.totalOut} currency={ctx.org.currency} />} tone="red" />
        <Stat label={t("balance")} value={<Money value={r.totalIn - r.totalOut} currency={ctx.org.currency} colored />} />
      </div>
      <Card>
        <Table
          headers={[t("number"), t("date"), t("transactionType"), t("description"), t("customer"), t("paymentMethod"), t("amount"), t("exchangeRate"), t("baseAmount"), t("user"), ""]}
          empty={t("noData")}
          rows={r.rows.map(({ t: x, customer, user }) => [
            <span key="n" className="font-mono text-xs">{x.transactionNumber}</span>,
            formatDateTime(x.transactionDate, fmt),
            <Badge key="b" status={x.direction} label={typeLabel(t, x.transactionType)} />,
            <span key="d" className="line-clamp-1 max-w-xs">{x.description}</span>,
            customer ?? "-",
            x.paymentMethod ? t(x.paymentMethod === "credit" ? "credit" : x.paymentMethod) : "-",
            <Money key="a" value={x.amount} currency={x.currency} />,
            <span key="r" className="font-mono text-xs" dir="ltr">{Number(x.exchangeRate)}</span>,
            <Money key="ba" value={x.direction === "out" ? -Number(x.baseAmount) : Number(x.baseAmount)} currency={x.baseCurrency} colored />,
            user ?? "-",
            x.journalEntryId ? <Link key="je" href={`/accounting?entry=${x.journalEntryId}`} className="text-xs text-emerald-700">JE</Link> : null,
          ])}
        />
      </Card>
    </>
  );
}
