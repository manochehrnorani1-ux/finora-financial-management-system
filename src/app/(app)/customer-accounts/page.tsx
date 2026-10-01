import Link from "next/link";
import { pageContext } from "@/lib/page";
import { customerBalances } from "@/lib/reports";
import { Card, Money, PageHeader, Stat, Table } from "@/components/ui";
import type { Metadata } from "next";
import { round2 } from "@/lib/format";

export const metadata: Metadata = {
  title: "دفتر حساب و مطالبات مشتریان",
};

export default async function CustomerAccountsPage() {
  const { ctx, t } = await pageContext("customer_accounts.read");
  const rows = await customerBalances(ctx.org.id);
  const receivable = round2(rows.filter((r) => r.balance > 0).reduce((s, r) => s + r.balance, 0));
  const payable = round2(rows.filter((r) => r.balance < 0).reduce((s, r) => s - r.balance, 0));
  return (
    <>
      <PageHeader title={t("customerAccounts")} subtitle={`${rows.length} ${t("records")}`} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <Stat label={t("receivables")} value={<Money value={receivable} currency={ctx.org.currency} />} tone="amber" />
        <Stat label={t("liabilities")} value={<Money value={payable} currency={ctx.org.currency} />} tone="blue" />
        <Stat label={t("customers")} value={rows.length} />
      </div>
      <Card>
        <Table headers={[t("customerCode"), t("name"), t("phone"), t("openingBalance"), t("debit"), t("creditCol"), t("balance"), ""]} empty={t("noData")}
          rows={rows.map((r) => [
            <span key="c" className="font-mono text-xs">{r.code}</span>,
            <Link key="n" href={`/customer-accounts/${r.id}`} className="font-medium text-emerald-700">{r.name}</Link>,
            <span key="p" dir="ltr">{r.phone ?? "-"}</span>,
            <Money key="o" value={r.opening} />,
            <Money key="d" value={r.debit} />,
            <Money key="cr" value={r.credit} />,
            <Money key="b" value={r.balance} currency={ctx.org.currency} colored />,
            <Link key="l" href={`/customer-accounts/${r.id}`} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs">{t("ledger")}</Link>,
          ])}
          footer={[t("total"), "", "", "", "", "", <Money key="t" value={receivable - payable} currency={ctx.org.currency} colored />, ""]} />
      </Card>
    </>
  );
}
