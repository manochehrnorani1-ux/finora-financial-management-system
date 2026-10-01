import Link from "next/link";
import { pageContext, sp1, type SP } from "@/lib/page";
import { dashboardData } from "@/lib/reports";
import { jalaliMonthRange, todayIso, formatDate, formatDateTime } from "@/lib/jalali";
import type { Metadata } from "next";
import { Badge, Card, Money, PageHeader, Stat, Table } from "@/components/ui";

export const metadata: Metadata = {
  title: "داشبورد مدیریت",
};

export default async function DashboardPage({ searchParams }: { searchParams: SP }) {
  const { ctx, t, fmt } = await pageContext("dashboard.read");
  const q = await searchParams;
  const range = jalaliMonthRange(todayIso());
  const from = sp1(q.from) ?? range.start;
  const to = sp1(q.to) ?? range.end;
  const d = await dashboardData(ctx.org.id, from, to);
  const cur = ctx.org.currency;
  return (
    <>
      {sp1(q.forbidden) && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{t("forbidden")}</div>}
      <PageHeader
        title={t("dashboard")}
        subtitle={`${t("overview")} — ${ctx.org.name} · ${formatDate(from, fmt)} → ${formatDate(to, fmt)}`}
        actions={
          <form method="get" className="flex items-center gap-2 text-xs">
            <input type="date" name="from" defaultValue={from} className="input !w-auto" />
            <input type="date" name="to" defaultValue={to} className="input !w-auto" />
            <button className="rounded-lg bg-slate-800 text-white px-3 py-2">{t("apply")}</button>
          </form>
        }
      />
      <div className="mb-5 print:hidden">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          <span className="text-emerald-700">⚡</span>{t("quickNav")}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { href: "/cases", label: t("cases"), icon: "📁", perm: "cases.read", badge: d.activeCases },
            { href: "/customers", label: t("customers"), icon: "👥", perm: "customers.read" },
            { href: "/documents-center", label: t("documentsCenter"), icon: "📄", perm: "documents.read", badge: d.pendingDocs },
            { href: "/finance-center", label: t("financeCenter"), icon: "💼", perm: "income.read" },
            { href: "/tax-settlements", label: t("taxSettlementGroup"), icon: "⚖", perm: "tax_settlements.read", badge: d.taxNeedsReview },
            { href: "/reports", label: t("reports"), icon: "📊", perm: "reports.read" },
          ].filter((a) => ctx.perms.has(a.perm as never)).map((a) => (
            <Link key={a.href} href={a.href} className="group flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm transition hover:border-emerald-300 hover:shadow-md">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-lg text-emerald-800 group-hover:bg-emerald-100">{a.icon}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{a.label}</span>
              {a.badge ? <span className="min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">{a.badge}</span> : null}
            </Link>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Stat label={t("totalIncome")} value={<Money value={d.totalIncome} currency={cur} />} tone="green" />
        <Stat label={t("totalExpenses")} value={<Money value={d.totalExpenses} currency={cur} />} tone="red" />
        <Stat label={t("netProfit")} value={<Money value={d.netProfit} currency={cur} colored />} tone={d.netProfit >= 0 ? "green" : "red"} sub={t("profitLoss")} />
        <Stat label={t("taxesCollected")} value={<Money value={d.taxes} currency={cur} />} tone="amber" />
        <Stat label={t("cashBalance")} value={<Money value={d.cashBalance} currency={cur} />} tone="blue" />
        <Stat label={t("bankBalance")} value={<Money value={d.bankBalance} currency={cur} />} tone="blue" />
        <Stat label={t("receivables")} value={<Money value={d.receivables} currency={cur} />} />
        <Stat label={t("pendingApprovals")} value={d.pendingApprovals} sub={`${t("pendingDocuments")}: ${d.pendingDocs}`} tone="amber" />
        <Stat label={t("activeCases")} value={d.activeCases} tone="blue" />
        <Stat label={t("completedCases")} value={d.completedCases} tone="green" />
        <Stat label={t("missingDocuments")} value={d.missingCaseDocs} tone="amber" />
        <Stat label={t("feeTotal")} value={<Money value={d.serviceFeeTotal} currency={cur} />} />
        <Stat label={t("remainingAmount")} value={<Money value={d.serviceFeeRemaining} currency={cur} />} tone="amber" />
        <Stat label={t("requiresLegalReview")} value={d.taxNeedsReview} tone="amber" />
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card title={t("recentTransactions")} className="lg:col-span-2" actions={<Link href="/transactions" className="text-sm text-emerald-700">{t("all")} →</Link>}>
          <Table
            headers={[t("number"), t("date"), t("transactionType"), t("description"), t("amount")]}
            empty={t("noData")}
            rows={d.recentTx.map((x) => [
              <span key="n" className="font-mono text-xs">{x.transactionNumber}</span>,
              formatDateTime(x.transactionDate, fmt),
              <Badge key="b" status={x.direction} label={t(x.transactionType === "income" ? "income" : x.transactionType === "expense" ? "expenses" : x.transactionType === "transfer" ? "transfer" : x.transactionType === "customer_payment" ? "receivePayment" : x.transactionType)} />,
              <span key="d" className="text-slate-600 line-clamp-1">{x.description}</span>,
              <Money key="m" value={x.direction === "out" ? -Number(x.baseAmount) : Number(x.baseAmount)} currency={x.baseCurrency} colored />,
            ])}
          />
        </Card>
        <Card title={t("recentDocuments")} actions={<Link href="/documents" className="text-sm text-emerald-700">{t("all")} →</Link>}>
          <ul className="divide-y divide-slate-100 text-sm">
            {d.recentDocs.length === 0 && <li className="py-6 text-center text-slate-400">{t("noData")}</li>}
            {d.recentDocs.map((x) => (
              <li key={x.d.id} className="py-2 flex items-center justify-between gap-2">
                <Link href={`/documents/${x.d.id}`} className="min-w-0">
                  <div className="truncate font-medium text-slate-800">{x.d.title}</div>
                  <div className="text-xs text-slate-400">{x.d.documentNumber} · {x.customer ?? "-"}</div>
                </Link>
                <Badge status={x.d.status} label={t(x.d.status)} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
      {Object.keys(d.byCategory).length > 0 && (
        <Card title={t("expenseReport")} className="mt-4">
          <div className="space-y-2">
            {Object.entries(d.byCategory).map(([k, v]) => (
              <div key={k} className="flex items-center gap-3 text-sm">
                <span className="w-32 text-slate-600">{t(k)}</span>
                <div className="flex-1 h-3 rounded bg-slate-100 overflow-hidden"><div className="h-full bg-red-400" style={{ width: `${Math.min(100, (v / Math.max(d.totalExpenses, 1)) * 100)}%` }} /></div>
                <Money value={v} currency={cur} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
