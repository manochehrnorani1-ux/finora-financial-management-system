import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { getContext } from "@/lib/auth";
import { auditReport, bankReport, cashReport, caseReport, complianceReport, customerLedgerReport, expenseReport, incomeReport, profitLoss, serviceFeeReport, taxReport, taxSettlementReport, transactionReport, trialBalance } from "@/lib/reports";
import { audit } from "@/lib/finance";
import { db } from "@/db";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

function toCsv(rows: Row[]) {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const value = String(v ?? "");
    const safe = /^[\\s]*[=+@]/.test(value) || /^[\\s]*-[0-9]/.test(value) ? `'${value}` : value;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return "\uFEFF" + [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

function toXls(rows: Row[], title: string) {
  const cols = rows.length ? Object.keys(rows[0]) : [];
  const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
  return `<html><head><meta charset="utf-8"></head><body><h3>${esc(title)}</h3><table border="1"><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>${rows.map((r) => `<tr>${cols.map((c) => `<td>${esc(r[c])}</td>`).join("")}</tr>`).join("")}</table></body></html>`;
}

async function toXlsx(rows: Row[], title: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FINORA";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("FINORA");
  const cols = rows.length ? Object.keys(rows[0]) : [];
  sheet.addRow([title]);
  sheet.mergeCells(1, 1, 1, Math.max(1, cols.length));
  sheet.getRow(1).font = { bold: true, size: 14 };
  if (cols.length) {
    const header = sheet.addRow(cols);
    header.font = { bold: true };
    header.eachCell((cell) => { cell.alignment = { horizontal: "center", vertical: "middle" }; });
    for (const row of rows) sheet.addRow(cols.map((col) => row[col] ?? ""));
  }
  sheet.views = [{ state: "frozen", ySplit: cols.length ? 2 : 1 }];
  sheet.columns.forEach((column) => {
    let width = 12;
    column.eachCell({ includeEmpty: false }, (cell) => { width = Math.max(width, Math.min(40, String(cell.value ?? "").length + 2)); });
    column.width = width;
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
export async function GET(req: NextRequest) {
  const ctx = await getContext();
  if (!ctx || !ctx.can("reports.export")) return new Response("Forbidden", { status: 403 });
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") ?? "transactions";
  const requestedFormat = sp.get("format");
  const format = requestedFormat === "xlsx" || requestedFormat === "xls" ? requestedFormat : "csv";
  const f = { from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined, customerId: sp.get("customerId") ?? undefined, caseId: sp.get("caseId") ?? undefined, serviceId: sp.get("serviceId") ?? undefined, paymentMethod: sp.get("paymentMethod") ?? undefined, currency: sp.get("currency") ?? undefined, status: sp.get("status") ?? undefined, userId: sp.get("userId") ?? undefined, accountId: sp.get("accountId") ?? undefined };
  const orgId = ctx.org.id;
  let rows: Row[] = [];
  switch (type) {
    case "income": rows = (await incomeReport(orgId, f)).rows.map(({ inc, customer, service }) => ({ number: inc.incomeNumber, date: inc.incomeDate, customer, service, description: inc.description, amount: inc.amount, tax_rate: inc.taxRate, tax_amount: inc.taxAmount, total: inc.totalAmount, currency: inc.currency, exchange_rate: inc.exchangeRate, base_amount: inc.baseAmount, payment_method: inc.paymentMethod, status: inc.status })); break;
    case "expense": rows = (await expenseReport(orgId, f)).rows.map((e) => ({ number: e.expenseNumber, date: e.expenseDate, category: e.category, description: e.description, amount: e.amount, tax_amount: e.taxAmount, total: e.totalAmount, currency: e.currency, exchange_rate: e.exchangeRate, base_amount: e.baseAmount, payment_method: e.paymentMethod, status: e.status })); break;
    case "pl": { const r = await profitLoss(orgId, f); rows = [...r.income.map((x) => ({ section: "income", code: x.code, account: x.name, amount: x.amount })), ...r.expense.map((x) => ({ section: "expense", code: x.code, account: x.name, amount: x.amount })), { section: "net", code: "", account: "Net profit", amount: r.net }]; break; }
    case "balance": rows = (await trialBalance(orgId, f.to)).list.map((x) => ({ code: x.code, account: x.name, type: x.type, debit: x.debit, credit: x.credit, balance: x.balance })); break;
    case "cash": rows = (await cashReport(orgId, f)).rows.map(({ tx, account }) => ({ date: tx.transactionDate.toISOString(), account, type: tx.transactionType, direction: tx.direction, amount: tx.amount, balance_after: tx.balanceAfter, description: tx.description })); break;
    case "bank": rows = (await bankReport(orgId, f)).rows.map(({ tx, account }) => ({ date: tx.transactionDate.toISOString(), account, type: tx.transactionType, direction: tx.direction, amount: tx.amount, balance_after: tx.balanceAfter, description: tx.description })); break;
    case "customer_ledger": rows = (await customerLedgerReport(orgId, f)).rows.map(({ l, customer, code }) => ({ date: l.transactionDate.toISOString(), customer_code: code, customer, reference: l.referenceType, description: l.description, debit: l.debit, credit: l.credit, balance: l.balance })); break;
    case "tax": rows = (await taxReport(orgId, f)).rows.map(({ r, taxType }) => ({ date: r.recordDate, reference: r.referenceType, tax_type: taxType, taxable_amount: r.taxableAmount, rate: r.taxRate, tax_amount: r.taxAmount, currency: r.currency, base_tax_amount: r.baseTaxAmount })); break;
    case "cases": rows = (await caseReport(orgId, f)).rows.map(({ c, customer, code, service, employee }) => ({ case_number: c.caseNumber, customer_code: code, customer, service, opened_at: c.openedAt, status: c.status, priority: c.priority, responsible_employee: employee, service_fee: c.serviceFee, discount: c.discountAmount, fee_currency: c.feeCurrency })); break;
    case "service_fees": rows = (await serviceFeeReport(orgId, f)).rows.map(({ receipt, customer, code, caseNumber, user }) => ({ receipt_number: receipt.receiptNumber, date: receipt.createdAt.toISOString(), case_number: caseNumber, customer_code: code, customer, total_fee_snapshot: receipt.feeTotalSnapshot, paid_amount: receipt.paidAmount, currency: receipt.currency, payment_method: receipt.paymentMethod, issued_by: user })); break;
    case "tax_settlements": rows = (await taxSettlementReport(orgId, f)).rows.map(({ s, customer, code, type, caseNumber }) => ({ settlement_number: s.settlementNumber, customer_code: code, customer, case_number: caseNumber, tax_type: type, period_start: s.periodStart, period_end: s.periodEnd, taxable_amount: s.taxableAmount, rate: s.taxRate, tax_amount: s.taxAmount, paid_amount: s.paidAmount, remaining_amount: s.remainingAmount, rule_version: s.ruleVersion, source: s.legalSource, status: s.status })); break;
    case "compliance": if (!ctx.can("compliance.read")) return new Response("Forbidden", { status: 403 }); rows = (await complianceReport(orgId, f)).map(({ e, customer, code, caseNumber, user }) => ({ date: e.occurredAt.toISOString(), report_type: "FINORA_INTERNAL_REPORT", event_type: e.eventType, customer_code: code, customer, case_number: caseNumber, counterparty: e.counterparty, amount: e.amount, currency: e.currency, reference: e.referenceNumber, result: e.result, created_by: user })); break;
    case "audit": if (!ctx.can("audit.read")) return new Response("Forbidden", { status: 403 }); rows = (await auditReport(orgId, f)).map(({ a, user }) => ({ date: a.createdAt.toISOString(), user, action: a.action, entity: a.entityType, entity_id: a.entityId, ip: a.ipAddress })); break;
    default: rows = (await transactionReport(orgId, f)).rows.map(({ t, customer, user }) => ({ number: t.transactionNumber, date: t.transactionDate.toISOString(), type: t.transactionType, direction: t.direction, description: t.description, customer, payment_method: t.paymentMethod, amount: t.amount, currency: t.currency, exchange_rate: t.exchangeRate, base_amount: t.baseAmount, user }));
  }
  await audit(db, { orgId, userId: ctx.user.id, action: "EXPORT", entityType: "report", newData: { type, format, filters: f } });
  const name = `finora-${type}-${new Date().toISOString().slice(0, 10)}.${format}`;
  const body = format === "xlsx" ? await toXlsx(rows, `${ctx.org.name} — ${type}`) : format === "xls" ? toXls(rows, `${ctx.org.name} — ${type}`) : toCsv(rows);
  return new Response(body, { headers: { "Content-Type": format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : format === "xls" ? "application/vnd.ms-excel; charset=utf-8" : "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` } });
}
