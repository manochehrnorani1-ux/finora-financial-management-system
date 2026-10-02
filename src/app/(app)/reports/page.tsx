import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cases, customers, profiles, organizationMembers, reports as reportsTable, services, accounts } from "@/db/schema";
import { pageContext, sp1, type SP } from "@/lib/page";
import { auditReport, bankReport, cashReport, caseReport, complianceReport, customerLedgerReport, dashboardData, expenseReport, incomeReport, profitLoss, serviceFeeReport, taxReport, taxSettlementReport, transactionReport, trialBalance, type ReportFilters } from "@/lib/reports";
import { saveReportPreset, deleteReportPreset } from "@/actions/admin";
import { Badge, Card, Money, PageHeader, Stat, Table } from "@/components/ui";
import { ActionButton, FormDialog } from "@/components/forms";
import { formatDate, formatDateTime, jalaliMonthRange, jalaliQuarterRange, jalaliYearRange, todayIso, todayJalali } from "@/lib/jalali";
import type { Metadata } from "next";
import { CURRENCIES } from "@/lib/format";

export const metadata: Metadata = {
  title: "گزارش‌های مالی و اداری",
};

const TYPES = ["daily", "monthly", "quarterly", "annual", "income", "expense", "pl", "balance", "cash", "bank", "customer_ledger", "tax", "tax_settlements", "service_fees", "cases", "transactions", "compliance", "audit"];
const LABEL: Record<string, string> = { daily: "dailyReport", monthly: "monthlyReport", quarterly: "quarterlyReport", annual: "annualReport", income: "incomeReport", expense: "expenseReport", pl: "profitLoss", balance: "balanceSheet", cash: "cashReport", bank: "bankReport", customer_ledger: "customerLedgerReport", tax: "taxReport", tax_settlements: "taxSettlement", service_fees: "caseFee", cases: "cases", transactions: "transactionReport", compliance: "compliance", audit: "auditReport" };

export default async function ReportsPage({ searchParams }: { searchParams: SP }) {
  const { ctx, t, fmt } = await pageContext("reports.read");
  const q = await searchParams;
  const type = TYPES.includes(sp1(q.type) ?? "") ? sp1(q.type)! : "monthly";
  const tj = todayJalali();
  const today = todayIso();
  let from = sp1(q.from), to = sp1(q.to);
  if (type === "daily") { from = from ?? today; to = to ?? from; }
  if (type === "monthly") { const r = jalaliMonthRange(from ?? today); from = from ?? r.start; to = to ?? r.end; }
  if (type === "quarterly") { const qn = Number(sp1(q.quarter) ?? Math.ceil(tj.jm / 3)); const r = jalaliQuarterRange(Number(sp1(q.year) ?? tj.jy), qn); from = r.start; to = r.end; }
  if (type === "annual") { const r = jalaliYearRange(Number(sp1(q.year) ?? tj.jy)); from = r.start; to = r.end; }
  const f: ReportFilters = { from, to, customerId: sp1(q.customerId), caseId: sp1(q.caseId), serviceId: sp1(q.serviceId), paymentMethod: sp1(q.paymentMethod), currency: sp1(q.currency), status: sp1(q.status), userId: sp1(q.userId), accountId: sp1(q.accountId) };
  const filterQS = new URLSearchParams(Object.fromEntries(Object.entries({ ...f, type }).filter(([, v]) => v)) as Record<string, string>).toString();
  const [custs, svcs, users, presets, accts, caseList] = await Promise.all([
    db.select({ id: customers.id, name: customers.name }).from(customers).where(eq(customers.organizationId, ctx.org.id)).orderBy(customers.name),
    db.select({ id: services.id, name: services.name }).from(services).where(eq(services.organizationId, ctx.org.id)),
    db.select({ id: profiles.id, name: profiles.fullName }).from(organizationMembers).innerJoin(profiles, eq(organizationMembers.userId, profiles.id)).where(eq(organizationMembers.organizationId, ctx.org.id)),
    db.select().from(reportsTable).where(eq(reportsTable.organizationId, ctx.org.id)).orderBy(desc(reportsTable.createdAt)),
    db.select({ id: accounts.id, code: accounts.accountCode, name: accounts.accountName }).from(accounts).where(eq(accounts.organizationId, ctx.org.id)).orderBy(accounts.accountCode),
    db.select({ id: cases.id, caseNumber: cases.caseNumber }).from(cases).where(eq(cases.organizationId, ctx.org.id)).orderBy(desc(cases.createdAt)).limit(300),
  ]);
  const cur = ctx.org.currency;
  const canExport = ctx.can("reports.export");

  let body;
  if (["daily", "monthly", "quarterly", "annual"].includes(type)) {
    const [d, pl, inc, exp] = await Promise.all([dashboardData(ctx.org.id, from!, to!), profitLoss(ctx.org.id, f), incomeReport(ctx.org.id, f), expenseReport(ctx.org.id, f)]);
    body = (
      <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Stat label={t("totalIncome")} value={<Money value={inc.total} currency={cur} />} tone="green" sub={`${inc.rows.length} ${t("records")}`} />
          <Stat label={t("totalExpenses")} value={<Money value={exp.total} currency={cur} />} tone="red" sub={`${exp.rows.length} ${t("records")}`} />
          <Stat label={t("netProfit")} value={<Money value={pl.net} currency={cur} colored />} />
          <Stat label={t("taxesCollected")} value={<Money value={d.taxes} currency={cur} />} tone="amber" />
          <Stat label={t("cashBalance")} value={<Money value={d.cashBalance} currency={cur} />} tone="blue" />
          <Stat label={t("bankBalance")} value={<Money value={d.bankBalance} currency={cur} />} tone="blue" />
          <Stat label={t("receivables")} value={<Money value={d.receivables} currency={cur} />} />
          <Stat label={t("pendingApprovals")} value={d.pendingApprovals} />
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title={t("incomeReport")}><Table headers={[t("account"), t("amount")]} empty={t("noData")} rows={pl.income.map((r) => [`${r.code} ${r.name}`, <Money key="a" value={r.amount} currency={cur} />])} footer={[t("total"), <Money key="t" value={pl.totalIncome} currency={cur} />]} /></Card>
          <Card title={t("expenseReport")}><Table headers={[t("account"), t("amount")]} empty={t("noData")} rows={pl.expense.map((r) => [`${r.code} ${r.name}`, <Money key="a" value={r.amount} currency={cur} />])} footer={[t("total"), <Money key="t" value={pl.totalExpense} currency={cur} />]} /></Card>
        </div>
      </>
    );
  } else if (type === "income") {
    const r = await incomeReport(ctx.org.id, f);
    body = <Card title={t("incomeReport")}><Table headers={[t("incomeNumber"), t("date"), t("customer"), t("service"), t("paymentMethod"), t("amount"), t("taxAmount"), t("baseAmount"), t("status")]} empty={t("noData")}
      rows={r.rows.map(({ inc, customer, service }) => [inc.incomeNumber, formatDate(inc.incomeDate, fmt), customer ?? "-", service ?? inc.description ?? "-", t(inc.paymentMethod), <Money key="a" value={inc.amount} currency={inc.currency} />, <Money key="t" value={inc.taxAmount} currency={inc.currency} />, <Money key="b" value={inc.baseAmount} currency={cur} />, <Badge key="s" status={inc.status} label={t(inc.status)} />])}
      footer={[t("total"), "", "", "", "", "", <Money key="t" value={r.tax} currency={cur} />, <Money key="b" value={r.total} currency={cur} />, ""]} /></Card>;
  } else if (type === "expense") {
    const r = await expenseReport(ctx.org.id, f);
    body = <Card title={t("expenseReport")}><Table headers={[t("expenseNumber"), t("date"), t("category"), t("description"), t("paymentMethod"), t("amount"), t("baseAmount"), t("status")]} empty={t("noData")}
      rows={r.rows.map((e) => [e.expenseNumber, formatDate(e.expenseDate, fmt), t(e.category), e.description ?? "-", t(e.paymentMethod), <Money key="a" value={e.totalAmount} currency={e.currency} />, <Money key="b" value={e.baseAmount} currency={cur} />, <Badge key="s" status={e.status} label={t(e.status)} />])}
      footer={[t("total"), "", "", "", "", "", <Money key="b" value={r.total} currency={cur} />, ""]} /></Card>;
  } else if (type === "pl") {
    const r = await profitLoss(ctx.org.id, f);
    body = (
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title={t("income")}><Table headers={[t("account"), t("amount")]} empty={t("noData")} rows={r.income.map((x) => [`${x.code} ${x.name}`, <Money key="a" value={x.amount} currency={cur} />])} footer={[t("totalIncome"), <Money key="t" value={r.totalIncome} currency={cur} />]} /></Card>
        <Card title={t("expenses")}><Table headers={[t("account"), t("amount")]} empty={t("noData")} rows={r.expense.map((x) => [`${x.code} ${x.name}`, <Money key="a" value={x.amount} currency={cur} />])} footer={[t("totalExpenses"), <Money key="t" value={r.totalExpense} currency={cur} />]} /></Card>
        <div className="lg:col-span-2"><Stat label={t("netProfit")} value={<Money value={r.net} currency={cur} colored />} tone={r.net >= 0 ? "green" : "red"} /></div>
      </div>
    );
  } else if (type === "balance") {
    const r = await trialBalance(ctx.org.id, to);
    const sec = (tt: string, title: string) => <Card title={title}><Table headers={[t("account"), t("balance")]} empty={t("noData")} rows={r.list.filter((x) => x.type === tt && x.balance !== 0).map((x) => [`${x.code} ${x.name}`, <Money key="a" value={x.balance} currency={cur} />])} /></Card>;
    body = (
      <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Stat label={t("assets")} value={<Money value={r.totalAssets} currency={cur} />} tone="blue" />
          <Stat label={t("liabilities")} value={<Money value={r.totalLiabilities} currency={cur} />} tone="red" />
          <Stat label={t("equity")} value={<Money value={r.totalEquity} currency={cur} />} tone="green" sub={`${t("netProfit")}: ${r.retained.toLocaleString()}`} />
          <Stat label={`${t("liabilities")} + ${t("equity")}`} value={<Money value={r.totalLiabilities + r.totalEquity} currency={cur} />} sub={Math.abs(r.totalAssets - r.totalLiabilities - r.totalEquity) < 0.01 ? "✓ balanced" : "✗"} />
        </div>
        <div className="grid lg:grid-cols-3 gap-4">{sec("asset", t("assets"))}{sec("liability", t("liabilities"))}{sec("equity", t("equity"))}</div>
      </>
    );
  } else if (type === "cash") {
    const r = await cashReport(ctx.org.id, f);
    body = <Card title={t("cashReport")}><div className="grid grid-cols-3 gap-3 mb-3"><Stat label={t("in")} value={<Money value={r.totalIn} currency={cur} />} tone="green" /><Stat label={t("out")} value={<Money value={r.totalOut} currency={cur} />} tone="red" /><Stat label={t("cashBalance")} value={<Money value={r.balance} currency={cur} />} tone="blue" /></div>
      <Table headers={[t("date"), t("cashAccount"), t("transactionType"), t("description"), t("in"), t("out"), t("balanceAfter")]} empty={t("noData")} rows={r.rows.map(({ tx, account }) => [formatDateTime(tx.transactionDate, fmt), account, tx.transactionType, tx.description, tx.direction === "in" ? <Money key="i" value={tx.amount} /> : "", tx.direction === "out" ? <Money key="o" value={tx.amount} /> : "", <Money key="b" value={tx.balanceAfter} />])} /></Card>;
  } else if (type === "bank") {
    const r = await bankReport(ctx.org.id, f);
    body = <Card title={t("bankReport")}><div className="grid grid-cols-3 gap-3 mb-3"><Stat label={t("in")} value={<Money value={r.totalIn} currency={cur} />} tone="green" /><Stat label={t("out")} value={<Money value={r.totalOut} currency={cur} />} tone="red" /><Stat label={t("bankBalance")} value={<Money value={r.balance} currency={cur} />} tone="blue" /></div>
      <Table headers={[t("date"), t("bankAccount"), t("transactionType"), t("description"), t("in"), t("out"), t("balanceAfter")]} empty={t("noData")} rows={r.rows.map(({ tx, account }) => [formatDateTime(tx.transactionDate, fmt), account, tx.transactionType, tx.description, tx.direction === "in" ? <Money key="i" value={tx.amount} /> : "", tx.direction === "out" ? <Money key="o" value={tx.amount} /> : "", <Money key="b" value={tx.balanceAfter} />])} /></Card>;
  } else if (type === "customer_ledger") {
    const r = await customerLedgerReport(ctx.org.id, f);
    body = <Card title={t("customerLedgerReport")}><Table headers={[t("date"), t("customer"), t("reference"), t("description"), t("debit"), t("creditCol"), t("balance")]} empty={t("noData")} rows={r.rows.map(({ l, customer, code }) => [formatDateTime(l.transactionDate, fmt), `${code} ${customer}`, l.referenceType, l.description, <Money key="d" value={l.debit} />, <Money key="c" value={l.credit} />, <Money key="b" value={l.balance} colored />])} footer={[t("total"), "", "", "", <Money key="d" value={r.totalDebit} />, <Money key="c" value={r.totalCredit} />, <Money key="b" value={r.totalDebit - r.totalCredit} colored />]} /></Card>;
  } else if (type === "tax") {
    const r = await taxReport(ctx.org.id, f);
    body = <Card title={t("taxReport")}><Table headers={[t("date"), t("reference"), t("taxType"), t("taxableAmount"), `${t("taxRate")} %`, t("taxAmount"), `${t("taxAmount")} (${cur})`]} empty={t("noData")} rows={r.rows.map(({ r: x, taxType }) => [formatDate(x.recordDate, fmt), t(x.referenceType === "income" ? "income" : "expenses"), taxType ?? "-", <Money key="a" value={x.taxableAmount} currency={x.currency} />, `${Number(x.taxRate)}%`, <Money key="t" value={x.taxAmount} currency={x.currency} />, <Money key="b" value={x.baseTaxAmount} />])} footer={[t("total"), "", "", "", "", "", <Money key="t" value={r.total} currency={cur} />]} /></Card>;
  } else if (type === "cases") {
    const r = await caseReport(ctx.org.id, f);
    body = <Card title={t("cases")}><Table headers={[t("caseNumber"), t("customer"), t("service"), t("openingDate"), t("responsibleEmployee"), t("priority"), t("feeTotal"), t("status")]} empty={t("noData")} rows={r.rows.map(({ c, customer, code, service, employee }) => [<Link key="n" href={`/cases/${c.id}`} className="text-emerald-700 font-mono text-xs">{c.caseNumber}</Link>, `${code} · ${customer}`, service ?? "-", formatDate(c.openedAt, fmt), employee ?? "-", t(c.priority), <Money key="f" value={Number(c.serviceFee) - Number(c.discountAmount)} currency={c.feeCurrency} />, <Badge key="s" status="under_review" label={t(c.status)} />])} footer={[t("total"), "", "", "", "", "", <Money key="f" value={r.fees} currency={cur} />, ""]} /></Card>;
  } else if (type === "service_fees") {
    const r = await serviceFeeReport(ctx.org.id, f);
    body = <Card title={t("caseFee")}><Table headers={[t("receiptNumber"), t("date"), t("caseNumber"), t("customer"), t("feeTotal"), t("paidAmount"), t("paymentMethod"), t("user")]} empty={t("noData")} rows={r.rows.map(({ receipt, customer, code, caseNumber, user }) => [receipt.receiptNumber, formatDateTime(receipt.createdAt, fmt), caseNumber, `${code} · ${customer}`, <Money key="f" value={receipt.feeTotalSnapshot} currency={receipt.currency} />, <Money key="p" value={receipt.paidAmount} currency={receipt.currency} />, t(receipt.paymentMethod), user ?? "-"])} footer={[t("total"), "", "", "", "", <Money key="p" value={r.paid} currency={cur} />, "", ""]} /></Card>;
  } else if (type === "tax_settlements") {
    const r = await taxSettlementReport(ctx.org.id, f);
    body = <><div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"><Stat label={t("taxAmount")} value={<Money value={r.assessed} currency={cur} />} tone="amber" /><Stat label={t("paidAmount")} value={<Money value={r.paid} currency={cur} />} tone="green" /><Stat label={t("remainingAmount")} value={<Money value={r.remaining} currency={cur} />} tone="red" /><Stat label={t("requiresLegalReview")} value={r.needsReview} /></div><Card title={t("taxSettlement")}><Table headers={[t("settlementNumber"), t("customer"), t("caseNumber"), t("taxType"), t("taxPeriod"), t("taxableAmount"), t("taxRate"), t("taxAmount"), t("paidAmount"), t("remainingAmount"), t("status")]} empty={t("noData")} rows={r.rows.map(({ s, customer, code, type: taxType, caseNumber }) => [<Link key="n" href={`/tax-settlements/${s.id}`} className="font-mono text-emerald-700">{s.settlementNumber}</Link>, `${code} · ${customer}`, caseNumber ?? "-", taxType ?? "-", `${formatDate(s.periodStart, fmt)} — ${formatDate(s.periodEnd, fmt)}`, <Money key="a" value={s.taxableAmount} currency={cur} />, s.taxRate === null ? "—" : `${Number(s.taxRate)}%`, s.taxAmount === null ? "—" : <Money key="t" value={s.taxAmount} currency={cur} />, <Money key="p" value={s.paidAmount} currency={cur} />, s.remainingAmount === null ? "—" : <Money key="r" value={s.remainingAmount} currency={cur} />, <Badge key="s" status={s.status === "paid" || s.status === "approved" ? "approved" : "pending_approval"} label={t(s.status === "REQUIRES_LEGAL_REVIEW" ? "requiresLegalReview" : s.status)} />])} /></Card></>;
  } else if (type === "compliance") {
    if (!ctx.can("compliance.read")) body = <Card><p className="text-center text-red-600 py-6">{t("forbidden")}</p></Card>;
    else { const rows = await complianceReport(ctx.org.id, f); body = <Card title={t("internalReport")}><Table headers={[t("date"), t("eventType"), t("customer"), t("caseNumber"), t("counterparty"), t("amount"), t("reference"), t("status"), t("user")]} empty={t("noData")} rows={rows.map(({ e, customer, code, caseNumber, user }) => [formatDateTime(e.occurredAt, fmt), t(e.eventType), customer ? `${code} · ${customer}` : "-", caseNumber ?? "-", e.counterparty ?? "-", e.amount === null ? "-" : `${Number(e.amount).toLocaleString()} ${e.currency ?? ""}`, e.referenceNumber ?? "-", <Badge key="s" status="pending_approval" label={t(e.result)} />, user ?? "-"])} /></Card>; }
  } else if (type === "transactions") {
    const r = await transactionReport(ctx.org.id, f);
    body = <Card title={t("transactionReport")}><Table headers={[t("number"), t("date"), t("transactionType"), t("description"), t("customer"), t("amount"), t("baseAmount"), t("user")]} empty={t("noData")} rows={r.rows.map(({ t: x, customer, user }) => [x.transactionNumber, formatDateTime(x.transactionDate, fmt), <Badge key="b" status={x.direction} label={x.transactionType} />, x.description, customer ?? "-", <Money key="a" value={x.amount} currency={x.currency} />, <Money key="ba" value={x.direction === "out" ? -Number(x.baseAmount) : Number(x.baseAmount)} currency={cur} colored />, user ?? "-"])} footer={[t("total"), "", "", "", "", "", <Money key="n" value={r.totalIn - r.totalOut} currency={cur} colored />, ""]} /></Card>;
  } else {
    if (!ctx.can("audit.read")) body = <Card><p className="text-center text-red-600 py-6">{t("forbidden")}</p></Card>;
    else {
      const rows = await auditReport(ctx.org.id, f);
      body = <Card title={t("auditReport")}><Table headers={[t("date"), t("user"), t("action"), t("entity"), t("ipAddress")]} empty={t("noData")} rows={rows.map(({ a, user }) => [formatDateTime(a.createdAt, fmt), user ?? "-", <span key="a" className="font-mono text-xs">{a.action}</span>, `${a.entityType}${a.entityId ? " · " + a.entityId.slice(0, 8) : ""}`, <span key="ip" dir="ltr">{a.ipAddress ?? "-"}</span>])} /></Card>;
    }
  }

  return (
    <>
      <PageHeader title={t("reports")} subtitle={`${t(LABEL[type])} · ${from ? formatDate(from, fmt) : ""} → ${to ? formatDate(to, fmt) : ""}`} actions={<>
        <a href={`/print/reports?${filterQS}`} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">{t("print")} / PDF</a>
        {canExport && <a href={`/api/reports/export?format=csv&${filterQS}`} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">{t("exportCsv")}</a>}
        {canExport && <a href={`/api/reports/export?format=xls&${filterQS}`} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">{t("exportExcel")}</a>}
        <FormDialog title={t("savePreset")} triggerLabel={t("savePreset")} triggerVariant="secondary" action={saveReportPreset} hidden={{ reportType: type, filters: JSON.stringify(f) }} fields={[{ name: "name", label: t("name"), required: true, full: true }]} />
      </>} />
      <Card className="mb-4 print:hidden">
        <form method="get" className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2 text-sm">
          <label className="block"><span className="text-xs text-slate-500">{t("reportType")}</span><select name="type" defaultValue={type} className="input">{TYPES.map((x) => <option key={x} value={x}>{t(LABEL[x])}</option>)}</select></label>
          {(type === "quarterly" || type === "annual") && <label className="block"><span className="text-xs text-slate-500">{t("year")}</span><input name="year" type="number" defaultValue={sp1(q.year) ?? tj.jy} className="input" dir="ltr" /></label>}
          {type === "quarterly" && <label className="block"><span className="text-xs text-slate-500">{t("quarter")}</span><select name="quarter" defaultValue={sp1(q.quarter) ?? Math.ceil(tj.jm / 3)} className="input">{[1, 2, 3, 4].map((x) => <option key={x} value={x}>{x}</option>)}</select></label>}
          {!(type === "quarterly" || type === "annual") && <>
            <label className="block"><span className="text-xs text-slate-500">{t("from")}</span><input type="date" name="from" defaultValue={from} className="input" /></label>
            <label className="block"><span className="text-xs text-slate-500">{t("to")}</span><input type="date" name="to" defaultValue={to} className="input" /></label>
          </>}
          <label className="block"><span className="text-xs text-slate-500">{t("customer")}</span><select name="customerId" defaultValue={f.customerId ?? ""} className="input"><option value="">{t("all")}</option>{custs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="block"><span className="text-xs text-slate-500">{t("case")}</span><select name="caseId" defaultValue={f.caseId ?? ""} className="input"><option value="">{t("all")}</option>{caseList.map((k) => <option key={k.id} value={k.id}>{k.caseNumber}</option>)}</select></label>
          <label className="block"><span className="text-xs text-slate-500">{t("service")}</span><select name="serviceId" defaultValue={f.serviceId ?? ""} className="input"><option value="">{t("all")}</option>{svcs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="block"><span className="text-xs text-slate-500">{t("paymentMethod")}</span><select name="paymentMethod" defaultValue={f.paymentMethod ?? ""} className="input"><option value="">{t("all")}</option><option value="cash">{t("cash")}</option><option value="bank">{t("bank")}</option><option value="credit">{t("credit")}</option></select></label>
          <label className="block"><span className="text-xs text-slate-500">{t("currency")}</span><select name="currency" defaultValue={f.currency ?? ""} className="input"><option value="">{t("all")}</option>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
          <label className="block"><span className="text-xs text-slate-500">{t("status")}</span><select name="status" defaultValue={f.status ?? ""} className="input"><option value="">{t("all")}</option>{["draft", "pending_approval", "finalized", "rejected"].map((s) => <option key={s} value={s}>{t(s)}</option>)}</select></label>
          <label className="block"><span className="text-xs text-slate-500">{t("user")}</span><select name="userId" defaultValue={f.userId ?? ""} className="input"><option value="">{t("all")}</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
          <label className="block"><span className="text-xs text-slate-500">{t("account")}</span><select name="accountId" defaultValue={f.accountId ?? ""} className="input"><option value="">{t("all")}</option>{accts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}</select></label>
          <div className="flex items-end"><button className="rounded-lg bg-emerald-700 text-white px-4 py-2 w-full">{t("apply")}</button></div>
        </form>
        {presets.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500">{t("savedReports")}:</span>
            {presets.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                <a href={`/reports?${new URLSearchParams({ type: p.reportType, ...Object.fromEntries(Object.entries(p.filters as Record<string, string>).filter(([, v]) => v)) }).toString()}`} className="text-emerald-700">{p.name}</a>
                <ActionButton action={deleteReportPreset} args={[p.id]} label="×" variant="ghost" />
              </span>
            ))}
          </div>
        )}
      </Card>
      <div className="hidden print:block mb-4"><h1 className="text-xl font-bold">{ctx.org.name}</h1><p className="text-sm">{t(LABEL[type])} · {from && formatDate(from, fmt)} → {to && formatDate(to, fmt)}</p></div>
      {body}
    </>
  );
}
