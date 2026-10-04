import Link from "next/link";
import { pageContext, sp1, type SP } from "@/lib/page";
import { dashboardData } from "@/lib/reports";
import { jalaliMonthRange, todayIso, formatDate, formatDateTime } from "@/lib/jalali";
import type { Metadata } from "next";
import { Badge, Card, Money, PageHeader, Stat, Table } from "@/components/ui";
import { db } from "@/db";
import { caseWorkflowSteps, cases, customers, services } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { WORKFLOW_KEYS, WORKFLOW_SERVICES } from "@/lib/case-workflow-definitions";

export const metadata: Metadata = {
  title: "داشبورد مدیریت",
};

export default async function DashboardPage({ searchParams }: { searchParams: SP }) {
  const { ctx, t, fmt, lang } = await pageContext("dashboard.read");
  const q = await searchParams;
  const range = jalaliMonthRange(todayIso());
  const from = sp1(q.from) ?? range.start;
  const to = sp1(q.to) ?? range.end;
  const d = await dashboardData(ctx.org.id, from, to);
  const [serviceCases, customerRows, actionRows] = await Promise.all([
    db.select({ workflowKey: cases.workflowKey, status: cases.status })
      .from(cases)
      .where(eq(cases.organizationId, ctx.org.id))
      .orderBy(desc(cases.createdAt)),
    db.select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.organizationId, ctx.org.id), eq(customers.status, "active"))),
    db.select({ caseId: cases.id, caseNumber: cases.caseNumber, stepId: caseWorkflowSteps.id, stepTitle: caseWorkflowSteps.title, serviceName: services.name })
      .from(caseWorkflowSteps)
      .innerJoin(cases, eq(caseWorkflowSteps.caseId, cases.id))
      .innerJoin(services, eq(cases.serviceId, services.id))
      .where(and(eq(caseWorkflowSteps.organizationId, ctx.org.id), eq(cases.organizationId, ctx.org.id), eq(caseWorkflowSteps.status, "active")))
      .orderBy(caseWorkflowSteps.dueDate, cases.caseNumber)
      .limit(12),
  ]);
  const activeServiceCases = serviceCases.filter((x) => !["closed", "cancelled"].includes(x.status));
  const serviceCounts = new Map(WORKFLOW_KEYS.map((key) => [key, serviceCases.filter((x) => x.workflowKey === key).length]));
  const cur = ctx.org.currency;
  return (
    <>
      {sp1(q.forbidden) && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{t("forbidden")}</div>}
      <PageHeader
        title="مرکز خدمات FINORA"
        subtitle={`ارائه و مدیریت خدمات مشتریان از درخواست تا نتیجه · ${ctx.org.name}`}
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
            { href: "/cases", label: "خدمات مشتریان", icon: "📁", perm: "cases.read", badge: d.activeCases },
            { href: "/customers", label: "مشتریان", icon: "👥", perm: "customers.read" },
            { href: "/panel/services", label: "فهرست خدمات", icon: "🗂", perm: "services.read" },
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
      <Card title="اقدامات مورد نیاز من" className="mb-5">
        {actionRows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-500">در حال حاضر اقدام فعال مرتبط با پرونده‌ها وجود ندارد.</div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {actionRows.map((a) => (
              <Link key={a.stepId} href={"/cases/" + a.caseId} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 hover:border-amber-400">
                <div className="text-xs font-semibold text-amber-800">{a.serviceName} · {a.caseNumber}</div>
                <div className="mt-1 text-sm font-bold text-slate-900">{a.stepTitle}</div>
                <div className="mt-1 text-xs text-emerald-700">باز کردن دوسیه و انجام مرحله →</div>
              </Link>
            ))}
          </div>
        )}
      </Card>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="خدمات در جریان" value={activeServiceCases.length} tone="blue" />
        <Stat label="خدمات تکمیل‌شده" value={d.completedCases} tone="green" />
        <Stat label="خدمات منتظر اسناد" value={d.missingCaseDocs} tone="amber" />
        <Stat label="مشتریان فعال" value={customerRows.length} tone="blue" />
      </div>
      <Card title="خدمات اصلی FINORA" className="mb-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {WORKFLOW_KEYS.map((key) => {
            const def = WORKFLOW_SERVICES[key];
            const count = serviceCounts.get(key) ?? 0;
            return <Link key={key} href={`/cases?serviceKey=${key}`} className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-400 hover:shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="font-bold text-slate-900">{def.label[lang]}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{def.summary[lang]}</p></div>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">{count}</span>
              </div>
              <div className="mt-3 text-xs font-semibold text-emerald-700">مشاهده و اجرای خدمت ←</div>
            </Link>;
          })}
        </div>
      </Card>
      <div className="mb-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label={t("totalIncome")} value={<Money value={d.totalIncome} currency={cur} />} tone="green" />
        <Stat label={t("totalExpenses")} value={<Money value={d.totalExpenses} currency={cur} />} tone="red" />
        <Stat label={t("netProfit")} value={<Money value={d.netProfit} currency={cur} colored />} tone={d.netProfit >= 0 ? "green" : "red"} sub={t("profitLoss")} />
        <Stat label={t("taxesCollected")} value={<Money value={d.taxes} currency={cur} />} tone="amber" />
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
