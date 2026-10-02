import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { pageContext, sp1, type SP } from "@/lib/page";
import {
  auditReport,
  bankReport,
  cashReport,
  caseReport,
  complianceReport,
  customerLedgerReport,
  dashboardData,
  expenseReport,
  incomeReport,
  profitLoss,
  serviceFeeReport,
  taxReport,
  taxSettlementReport,
  transactionReport,
  trialBalance,
  type ReportFilters,
} from "@/lib/reports";
import { formatDate, formatDateTime, jalaliMonthRange, jalaliQuarterRange, jalaliYearRange, todayIso, todayJalali } from "@/lib/jalali";
import { PrintLayout, PrintMoney, PrintTable } from "@/components/PrintLayout";

export const dynamic = "force-dynamic";

const TYPES = new Set([
  "daily","monthly","quarterly","annual","income","expense","pl","balance","cash","bank",
  "customer_ledger","tax","tax_settlements","service_fees","cases","transactions","compliance","audit",
]);

const TITLES: Record<string, string> = {
  daily: "گزارش روزانه مالی",
  monthly: "گزارش ماهانه مالی",
  quarterly: "گزارش ربع‌وار مالی",
  annual: "گزارش سالانه مالی",
  income: "گزارش درآمدها",
  expense: "گزارش مصارف",
  pl: "صورت سود و زیان",
  balance: "ترازنامه / تراز آزمایشی",
  cash: "گزارش نقدینه",
  bank: "گزارش حساب‌های بانکی",
  customer_ledger: "صورت‌حساب مشتری",
  tax: "گزارش مالیاتی",
  tax_settlements: "گزارش تصفیه مالیاتی",
  service_fees: "گزارش عواید خدمات",
  cases: "گزارش دوسیه‌ها",
  transactions: "گزارش تاریخچه معاملات",
  compliance: "گزارش انطباق",
  audit: "گزارش حسابرسی و رویدادها",
};

const money = (v: unknown, currency: string) => <PrintMoney value={Number(v ?? 0)} currency={currency} />;
const text = (v: unknown) => String(v ?? "—");

export default async function ReportPrintPage({ searchParams }: { searchParams: SP }) {
  const { ctx, lang, fmt } = await pageContext("reports.read");
  const q = await searchParams;
  const type = sp1(q.type) ?? "monthly";
  if (!TYPES.has(type)) notFound();

  const tj = todayJalali();
  const today = todayIso();
  let from = sp1(q.from);
  let to = sp1(q.to);
  if (type === "daily") { from ??= today; to ??= from; }
  if (type === "monthly") { const r = jalaliMonthRange(from ?? today); from ??= r.start; to ??= r.end; }
  if (type === "quarterly") { const r = jalaliQuarterRange(Number(sp1(q.year) ?? tj.jy), Number(sp1(q.quarter) ?? Math.ceil(tj.jm / 3))); from = r.start; to = r.end; }
  if (type === "annual") { const r = jalaliYearRange(Number(sp1(q.year) ?? tj.jy)); from = r.start; to = r.end; }

  const f: ReportFilters = {
    from, to,
    customerId: sp1(q.customerId),
    caseId: sp1(q.caseId),
    serviceId: sp1(q.serviceId),
    paymentMethod: sp1(q.paymentMethod),
    currency: sp1(q.currency),
    status: sp1(q.status),
    userId: sp1(q.userId),
    accountId: sp1(q.accountId),
  };
  const cur = ctx.org.currency;
  const reportNumber = sp1(q.reportNo) || `FINORA-${type.toUpperCase()}-${new Date().toISOString().slice(0, 10)}`;
  const period = from && to ? `${formatDate(from, fmt)} — ${formatDate(to, fmt)}` : "—";

  let summary: ReactNode = null;
  let body: ReactNode;

  if (["daily","monthly","quarterly","annual"].includes(type)) {
    const [d, pl, inc, exp] = await Promise.all([
      dashboardData(ctx.org.id, from!, to!),
      profitLoss(ctx.org.id, f),
      incomeReport(ctx.org.id, f),
      expenseReport(ctx.org.id, f),
    ]);
    summary = <div className="finora-summary-grid">
      <div><span>مجموع درآمد</span><strong>{money(inc.total, cur)}</strong></div>
      <div><span>مجموع مصارف</span><strong>{money(exp.total, cur)}</strong></div>
      <div><span>سود / زیان خالص</span><strong>{money(pl.net, cur)}</strong></div>
      <div><span>نقدینه</span><strong>{money(d.cashBalance, cur)}</strong></div>
      <div><span>بانک</span><strong>{money(d.bankBalance, cur)}</strong></div>
      <div><span>مالیات</span><strong>{money(d.taxes, cur)}</strong></div>
    </div>;
    body = <>
      <h2 className="finora-print-section-title">درآمدها</h2>
      <PrintTable headers={["حساب","مبلغ"]} rows={pl.income.map(x => [`${x.code} — ${x.name}`, money(x.amount, cur)])} footer={["مجموع درآمد", money(pl.totalIncome, cur)]} />
      <h2 className="finora-print-section-title">مصارف</h2>
      <PrintTable headers={["حساب","مبلغ"]} rows={pl.expense.map(x => [`${x.code} — ${x.name}`, money(x.amount, cur)])} footer={["مجموع مصارف", money(pl.totalExpense, cur)]} />
    </>;
  } else if (type === "income") {
    const r = await incomeReport(ctx.org.id, f);
    summary = <div className="finora-summary-grid"><div><span>تعداد</span><strong>{r.rows.length}</strong></div><div><span>مجموع</span><strong>{money(r.total, cur)}</strong></div><div><span>مالیات</span><strong>{money(r.tax, cur)}</strong></div></div>;
    body = <PrintTable headers={["شماره","تاریخ","مشتری","خدمت","روش پرداخت","مبلغ","مالیات","مجموع","وضعیت"]} rows={r.rows.map(({inc,customer,service}) => [inc.incomeNumber,formatDate(inc.incomeDate,fmt),customer??"—",service??inc.description??"—",inc.paymentMethod,money(inc.amount,inc.currency),money(inc.taxAmount,inc.currency),money(inc.totalAmount,inc.currency),inc.status])} footer={["مجموع","","","","","",money(r.tax,cur),money(r.total,cur),""]} />;
  } else if (type === "expense") {
    const r = await expenseReport(ctx.org.id, f);
    summary = <div className="finora-summary-grid"><div><span>تعداد</span><strong>{r.rows.length}</strong></div><div><span>مجموع مصارف</span><strong>{money(r.total, cur)}</strong></div></div>;
    body = <PrintTable headers={["شماره","تاریخ","دسته‌بندی","شرح","روش پرداخت","مبلغ","مبلغ مبنا","وضعیت"]} rows={r.rows.map(e => [e.expenseNumber,formatDate(e.expenseDate,fmt),e.category,e.description??"—",e.paymentMethod,money(e.totalAmount,e.currency),money(e.baseAmount,cur),e.status])} footer={["مجموع","","","","","",money(r.total,cur),""]} />;
  } else if (type === "pl") {
    const r = await profitLoss(ctx.org.id, f);
    summary = <div className="finora-summary-grid"><div><span>مجموع درآمد</span><strong>{money(r.totalIncome,cur)}</strong></div><div><span>مجموع هزینه</span><strong>{money(r.totalExpense,cur)}</strong></div><div><span>سود / زیان خالص</span><strong>{money(r.net,cur)}</strong></div></div>;
    body = <><h2 className="finora-print-section-title">درآمدها</h2><PrintTable headers={["کد","حساب","مبلغ"]} rows={r.income.map(x=>[x.code,x.name,money(x.amount,cur)])} footer={["","مجموع درآمد",money(r.totalIncome,cur)]}/><h2 className="finora-print-section-title">هزینه‌ها</h2><PrintTable headers={["کد","حساب","مبلغ"]} rows={r.expense.map(x=>[x.code,x.name,money(x.amount,cur)])} footer={["","مجموع هزینه",money(r.totalExpense,cur)]}/></>;
  } else if (type === "balance") {
    const r = await trialBalance(ctx.org.id, to);
    const balanced = Math.abs(r.totalAssets - r.totalLiabilities - r.totalEquity) < 0.01;
    summary = <div className="finora-summary-grid"><div><span>دارایی‌ها</span><strong>{money(r.totalAssets,cur)}</strong></div><div><span>بدهی‌ها</span><strong>{money(r.totalLiabilities,cur)}</strong></div><div><span>سرمایه</span><strong>{money(r.totalEquity,cur)}</strong></div><div><span>کنترل تراز</span><strong>{balanced ? "متوازن" : "نامتوازن"}</strong></div></div>;
    body = <PrintTable headers={["کد","حساب","نوع","بدهکار","بستانکار","مانده"]} rows={r.list.filter(x=>x.balance!==0).map(x=>[x.code,x.name,x.type,money(x.debit,cur),money(x.credit,cur),money(x.balance,cur)])} footer={["","","جمع",money(r.totalDebit,cur),money(r.totalCredit,cur),""]}/>;
  } else if (type === "cash") {
    const r = await cashReport(ctx.org.id, f);
    summary = <div className="finora-summary-grid"><div><span>ورودی</span><strong>{money(r.totalIn,cur)}</strong></div><div><span>خروجی</span><strong>{money(r.totalOut,cur)}</strong></div><div><span>مانده</span><strong>{money(r.balance,cur)}</strong></div></div>;
    body = <PrintTable headers={["تاریخ","حساب نقدی","نوع","شرح","ورودی","خروجی","مانده"]} rows={r.rows.map(({tx,account})=>[formatDateTime(tx.transactionDate,fmt),account,tx.transactionType,tx.description??"—",tx.direction==="in"?money(tx.amount,cur):"—",tx.direction==="out"?money(tx.amount,cur):"—",money(tx.balanceAfter,cur)])}/>;
  } else if (type === "bank") {
    const r = await bankReport(ctx.org.id, f);
    summary = <div className="finora-summary-grid"><div><span>ورودی</span><strong>{money(r.totalIn,cur)}</strong></div><div><span>خروجی</span><strong>{money(r.totalOut,cur)}</strong></div><div><span>مانده بانک</span><strong>{money(r.balance,cur)}</strong></div></div>;
    body = <PrintTable headers={["تاریخ","بانک / حساب","نوع","شرح","ورودی","خروجی","مانده"]} rows={r.rows.map(({tx,account})=>[formatDateTime(tx.transactionDate,fmt),account,tx.transactionType,tx.description??"—",tx.direction==="in"?money(tx.amount,cur):"—",tx.direction==="out"?money(tx.amount,cur):"—",money(tx.balanceAfter,cur)])}/>;
  } else if (type === "customer_ledger") {
    const r = await customerLedgerReport(ctx.org.id, f);
    summary = <div className="finora-summary-grid"><div><span>مجموع بدهکار</span><strong>{money(r.totalDebit,cur)}</strong></div><div><span>مجموع بستانکار</span><strong>{money(r.totalCredit,cur)}</strong></div><div><span>مانده</span><strong>{money(r.totalDebit-r.totalCredit,cur)}</strong></div></div>;
    body = <PrintTable headers={["تاریخ","مشتری","مرجع","شرح","بدهکار","بستانکار","مانده"]} rows={r.rows.map(({l,customer,code})=>[formatDateTime(l.transactionDate,fmt),`${code} — ${customer}`,l.referenceType,l.description??"—",money(l.debit,cur),money(l.credit,cur),money(l.balance,cur)])} footer={["مجموع","","", "",money(r.totalDebit,cur),money(r.totalCredit,cur),money(r.totalDebit-r.totalCredit,cur)]}/>;
  } else if (type === "tax") {
    const r = await taxReport(ctx.org.id, f);
    summary = <div className="finora-summary-grid"><div><span>تعداد</span><strong>{r.rows.length}</strong></div><div><span>مجموع مالیات</span><strong>{money(r.total,cur)}</strong></div></div>;
    body = <PrintTable headers={["تاریخ","مرجع","نوع مالیات","مبلغ مشمول","نرخ","مالیات","مالیات مبنا"]} rows={r.rows.map(({r:x,taxType})=>[formatDate(x.recordDate,fmt),x.referenceType,taxType??"—",money(x.taxableAmount,x.currency),`${Number(x.taxRate??0)}%`,money(x.taxAmount,x.currency),money(x.baseTaxAmount,cur)])} footer={["","","","","","مجموع",money(r.total,cur)]}/>;
  } else if (type === "tax_settlements") {
    const r = await taxSettlementReport(ctx.org.id, f);
    summary = <div className="finora-summary-grid"><div><span>ارزیابی مالیات</span><strong>{money(r.assessed,cur)}</strong></div><div><span>پرداخت‌شده</span><strong>{money(r.paid,cur)}</strong></div><div><span>باقی‌مانده</span><strong>{money(r.remaining,cur)}</strong></div><div><span>نیازمند بررسی حقوقی</span><strong>{r.needsReview}</strong></div></div>;
    body = <PrintTable headers={["شماره","مشتری","دوسیه","نوع مالیات","دوره","مبلغ مشمول","نرخ","مالیات","پرداخت","باقی‌مانده","وضعیت"]} rows={r.rows.map(({s,customer,code,type:taxType,caseNumber})=>[s.settlementNumber,`${code} — ${customer}`,caseNumber??"—",taxType??"—",`${formatDate(s.periodStart,fmt)} — ${formatDate(s.periodEnd,fmt)}`,money(s.taxableAmount,cur),s.taxRate===null?"—":`${Number(s.taxRate)}%`,money(s.taxAmount,cur),money(s.paidAmount,cur),money(s.remainingAmount,cur),s.status])}/>;
  } else if (type === "service_fees") {
    const r = await serviceFeeReport(ctx.org.id, f);
    summary = <div className="finora-summary-grid"><div><span>تعداد رسید</span><strong>{r.rows.length}</strong></div><div><span>مجموع پرداخت</span><strong>{money(r.paid,cur)}</strong></div></div>;
    body = <PrintTable headers={["رسید","تاریخ","دوسیه","مشتری","مبلغ فیس","پرداخت‌شده","روش پرداخت","کاربر"]} rows={r.rows.map(({receipt,customer,code,caseNumber,user})=>[receipt.receiptNumber,formatDateTime(receipt.createdAt,fmt),caseNumber??"—",`${code} — ${customer}`,money(receipt.feeTotalSnapshot,receipt.currency),money(receipt.paidAmount,receipt.currency),receipt.paymentMethod,user??"—"])} footer={["","","","","",money(r.paid,cur),"",""]}/>;
  } else if (type === "cases") {
    const r = await caseReport(ctx.org.id, f);
    summary = <div className="finora-summary-grid"><div><span>تعداد دوسیه</span><strong>{r.rows.length}</strong></div><div><span>مجموع فیس</span><strong>{money(r.fees,cur)}</strong></div></div>;
    body = <PrintTable headers={["شماره دوسیه","مشتری","خدمت","تاریخ افتتاح","مسئول","اولویت","فیس","وضعیت"]} rows={r.rows.map(({c,customer,code,service,employee})=>[c.caseNumber,`${code} — ${customer}`,service??"—",formatDate(c.openedAt,fmt),employee??"—",c.priority,money(Number(c.serviceFee)-Number(c.discountAmount),c.feeCurrency),c.status])} footer={["مجموع","","","","","",money(r.fees,cur),""]}/>;
  } else if (type === "transactions") {
    const r = await transactionReport(ctx.org.id, f);
    summary = <div className="finora-summary-grid"><div><span>تعداد معاملات</span><strong>{r.rows.length}</strong></div><div><span>ورودی</span><strong>{money(r.totalIn,cur)}</strong></div><div><span>خروجی</span><strong>{money(r.totalOut,cur)}</strong></div><div><span>خالص</span><strong>{money(r.totalIn-r.totalOut,cur)}</strong></div></div>;
    body = <PrintTable headers={["ردیف","تاریخ","شماره معامله","نوع","مشتری","ارز","مبلغ","نرخ","معادل AFN","کمیشن","وضعیت","کاربر"]} rows={r.rows.map(({t:x,customer,user},i)=>[i+1,formatDateTime(x.transactionDate,fmt),x.transactionNumber,x.transactionType,customer??"—",x.currency,money(x.amount,x.currency),text(x.exchangeRate),money(x.baseAmount,cur),"—",x.status,user??"—"])}/>;
  } else if (type === "compliance") {
    if (!ctx.can("compliance.read")) notFound();
    const rows = await complianceReport(ctx.org.id, f);
    summary = <div className="finora-summary-grid"><div><span>تعداد رویدادها</span><strong>{rows.length}</strong></div></div>;
    body = <PrintTable headers={["تاریخ","نوع رویداد","مشتری","دوسیه","طرف معامله","مبلغ","مرجع","نتیجه","کاربر"]} rows={rows.map(({e,customer,code,caseNumber,user})=>[formatDateTime(e.occurredAt,fmt),e.eventType,customer?`${code} — ${customer}`:"—",caseNumber??"—",e.counterparty??"—",e.amount===null?"—":money(e.amount,e.currency??cur),e.referenceNumber??"—",e.result,user??"—"])}/>;
  } else {
    if (!ctx.can("audit.read")) notFound();
    const rows = await auditReport(ctx.org.id, f);
    summary = <div className="finora-summary-grid"><div><span>رویدادهای حسابرسی</span><strong>{rows.length}</strong></div></div>;
    body = <PrintTable headers={["تاریخ","کاربر","عملیات","موجودیت","IP"]} rows={rows.map(({a,user})=>[formatDateTime(a.createdAt,fmt),user??"—",a.action,a.entityType,a.ipAddress??"—"])}/>;
  }

  return <PrintLayout org={ctx.org} title={TITLES[type]} reportNumber={reportNumber} period={period} language={lang} landscape={type==="transactions" || type==="tax_settlements" || type==="compliance"}>
    {summary}
    {body}
  </PrintLayout>;
}
