import "server-only";
import { and, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  auditLogs,
  cases,
  caseNotes,
  complianceEvents,
  serviceFeeReceipts,
  taxSettlements,
  bankAccounts,
  bankTransactions,
  cashAccounts,
  cashTransactions,
  customerAccounts,
  customerLedger,
  customers,
  documents,
  expenses,
  incomes,
  journalEntryLines,
  journalEntries,
  profiles,
  taxRecords,
  taxTypes,
  transactions,
  services,
} from "@/db/schema";
import { round2 } from "./format";

export interface ReportFilters {
  from?: string;
  to?: string;
  customerId?: string;
  caseId?: string;
  serviceId?: string;
  paymentMethod?: string;
  currency?: string;
  status?: string;
  userId?: string;
  accountId?: string;
}

const between = (col: Parameters<typeof gte>[0], f: ReportFilters) => {
  const parts: SQL[] = [];
  if (f.from) parts.push(gte(col, f.from));
  if (f.to) parts.push(lte(col, f.to));
  return parts;
};

export async function incomeReport(orgId: string, f: ReportFilters) {
  const where = [eq(incomes.organizationId, orgId), ...between(incomes.incomeDate, f)];
  if (f.customerId) where.push(eq(incomes.customerId, f.customerId));
  if (f.caseId) where.push(eq(incomes.caseId, f.caseId));
  if (f.serviceId) where.push(eq(incomes.serviceId, f.serviceId));
  if (f.paymentMethod) where.push(eq(incomes.paymentMethod, f.paymentMethod));
  if (f.currency) where.push(eq(incomes.currency, f.currency));
  if (f.status) where.push(eq(incomes.status, f.status));
  else where.push(eq(incomes.status, "finalized"));
  if (f.userId) where.push(eq(incomes.createdBy, f.userId));
  const rows = await db
    .select({ inc: incomes, customer: customers.name, service: services.name })
    .from(incomes)
    .leftJoin(customers, eq(incomes.customerId, customers.id))
    .leftJoin(services, eq(incomes.serviceId, services.id))
    .where(and(...where))
    .orderBy(desc(incomes.incomeDate), desc(incomes.createdAt));
  const total = round2(rows.reduce((s, r) => s + Number(r.inc.baseAmount), 0));
  const tax = round2(rows.reduce((s, r) => s + Number(r.inc.taxAmount) * Number(r.inc.exchangeRate), 0));
  return { rows, total, tax };
}

export async function expenseReport(orgId: string, f: ReportFilters) {
  const where = [eq(expenses.organizationId, orgId), ...between(expenses.expenseDate, f)];
  if (f.caseId) where.push(eq(expenses.caseId, f.caseId));
  if (f.paymentMethod) where.push(eq(expenses.paymentMethod, f.paymentMethod));
  if (f.currency) where.push(eq(expenses.currency, f.currency));
  if (f.status) where.push(eq(expenses.status, f.status));
  else where.push(eq(expenses.status, "finalized"));
  if (f.userId) where.push(eq(expenses.createdBy, f.userId));
  if (f.accountId) where.push(eq(expenses.accountId, f.accountId));
  const rows = await db.select().from(expenses).where(and(...where)).orderBy(desc(expenses.expenseDate), desc(expenses.createdAt));
  const total = round2(rows.reduce((s, r) => s + Number(r.baseAmount), 0));
  const byCategory: Record<string, number> = {};
  for (const r of rows) byCategory[r.category] = round2((byCategory[r.category] ?? 0) + Number(r.baseAmount));
  return { rows, total, byCategory };
}

/** Profit & loss computed from posted journal entries (income/expense accounts). */
export async function profitLoss(orgId: string, f: ReportFilters) {
  const where = [eq(journalEntries.organizationId, orgId), eq(journalEntries.status, "posted"), ...between(journalEntries.entryDate, f)];
  const rows = await db
    .select({
      accountId: accounts.id,
      code: accounts.accountCode,
      name: accounts.accountName,
      type: accounts.accountType,
      debit: sql<number>`coalesce(sum(${journalEntryLines.debit}),0)::numeric`,
      credit: sql<number>`coalesce(sum(${journalEntryLines.credit}),0)::numeric`,
    })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .innerJoin(accounts, eq(journalEntryLines.accountId, accounts.id))
    .where(and(...where))
    .groupBy(accounts.id, accounts.accountCode, accounts.accountName, accounts.accountType)
    .orderBy(accounts.accountCode);
  const income = rows.filter((r) => r.type === "income").map((r) => ({ ...r, amount: round2(Number(r.credit) - Number(r.debit)) }));
  const expense = rows.filter((r) => r.type === "expense").map((r) => ({ ...r, amount: round2(Number(r.debit) - Number(r.credit)) }));
  const totalIncome = round2(income.reduce((s, r) => s + r.amount, 0));
  const totalExpense = round2(expense.reduce((s, r) => s + r.amount, 0));
  return { income, expense, totalIncome, totalExpense, net: round2(totalIncome - totalExpense) };
}

/** Balance sheet / trial balance from posted entries up to a date. */
export async function trialBalance(orgId: string, to?: string) {
  const where = [eq(journalEntries.organizationId, orgId), eq(journalEntries.status, "posted")];
  if (to) where.push(lte(journalEntries.entryDate, to));
  const rows = await db
    .select({
      id: accounts.id,
      code: accounts.accountCode,
      name: accounts.accountName,
      type: accounts.accountType,
      debit: sql<number>`coalesce(sum(${journalEntryLines.debit}),0)::numeric`,
      credit: sql<number>`coalesce(sum(${journalEntryLines.credit}),0)::numeric`,
    })
    .from(accounts)
    .leftJoin(journalEntryLines, eq(journalEntryLines.accountId, accounts.id))
    .leftJoin(journalEntries, and(eq(journalEntryLines.journalEntryId, journalEntries.id), ...where.slice(1)))
    .where(eq(accounts.organizationId, orgId))
    .groupBy(accounts.id, accounts.accountCode, accounts.accountName, accounts.accountType)
    .orderBy(accounts.accountCode);
  const list = rows.map((r) => {
    const d = Number(r.debit), c = Number(r.credit);
    const natural = r.type === "asset" || r.type === "expense" ? d - c : c - d;
    return { ...r, debit: d, credit: c, balance: round2(natural) };
  });
  const sum = (t: string) => round2(list.filter((r) => r.type === t).reduce((s, r) => s + r.balance, 0));
  const totalIncome = sum("income"), totalExpense = sum("expense");
  const retained = round2(totalIncome - totalExpense);
  const totalAssets = sum("asset"), totalLiabilities = sum("liability"), totalEquity = round2(sum("equity") + retained);
  return { list, totalAssets, totalLiabilities, totalEquity, retained, totalDebit: round2(list.reduce((s, r) => s + r.debit, 0)), totalCredit: round2(list.reduce((s, r) => s + r.credit, 0)) };
}

export async function cashReport(orgId: string, f: ReportFilters) {
  const accountsList = await db.select().from(cashAccounts).where(eq(cashAccounts.organizationId, orgId));
  const where = [eq(cashTransactions.organizationId, orgId)];
  if (f.from) where.push(gte(cashTransactions.transactionDate, new Date(f.from + "T00:00:00")));
  if (f.to) where.push(lte(cashTransactions.transactionDate, new Date(f.to + "T23:59:59")));
  if (f.accountId) where.push(eq(cashTransactions.cashAccountId, f.accountId));
  const rows = await db.select({ tx: cashTransactions, account: cashAccounts.name }).from(cashTransactions).innerJoin(cashAccounts, eq(cashTransactions.cashAccountId, cashAccounts.id)).where(and(...where)).orderBy(desc(cashTransactions.transactionDate), desc(cashTransactions.createdAt));
  const totalIn = round2(rows.filter((r) => r.tx.direction === "in").reduce((s, r) => s + Number(r.tx.amount), 0));
  const totalOut = round2(rows.filter((r) => r.tx.direction === "out").reduce((s, r) => s + Number(r.tx.amount), 0));
  return { accounts: accountsList, rows, totalIn, totalOut, balance: round2(accountsList.reduce((s, a) => s + Number(a.currentBalance), 0)) };
}

export async function bankReport(orgId: string, f: ReportFilters) {
  const accountsList = await db.select().from(bankAccounts).where(eq(bankAccounts.organizationId, orgId));
  const where = [eq(bankTransactions.organizationId, orgId)];
  if (f.from) where.push(gte(bankTransactions.transactionDate, new Date(f.from + "T00:00:00")));
  if (f.to) where.push(lte(bankTransactions.transactionDate, new Date(f.to + "T23:59:59")));
  if (f.accountId) where.push(eq(bankTransactions.bankAccountId, f.accountId));
  const rows = await db.select({ tx: bankTransactions, account: bankAccounts.bankName, accountName: bankAccounts.accountName }).from(bankTransactions).innerJoin(bankAccounts, eq(bankTransactions.bankAccountId, bankAccounts.id)).where(and(...where)).orderBy(desc(bankTransactions.transactionDate), desc(bankTransactions.createdAt));
  const totalIn = round2(rows.filter((r) => r.tx.direction === "in").reduce((s, r) => s + Number(r.tx.amount), 0));
  const totalOut = round2(rows.filter((r) => r.tx.direction === "out").reduce((s, r) => s + Number(r.tx.amount), 0));
  return { accounts: accountsList, rows, totalIn, totalOut, balance: round2(accountsList.reduce((s, a) => s + Number(a.currentBalance), 0)) };
}

export async function customerLedgerReport(orgId: string, f: ReportFilters) {
  const where = [eq(customerLedger.organizationId, orgId)];
  if (f.customerId) where.push(eq(customerLedger.customerId, f.customerId));
  if (f.from) where.push(gte(customerLedger.transactionDate, new Date(f.from + "T00:00:00")));
  if (f.to) where.push(lte(customerLedger.transactionDate, new Date(f.to + "T23:59:59")));
  const rows = await db.select({ l: customerLedger, customer: customers.name, code: customers.customerCode }).from(customerLedger).innerJoin(customers, eq(customerLedger.customerId, customers.id)).where(and(...where)).orderBy(desc(customerLedger.transactionDate), desc(customerLedger.createdAt));
  const totalDebit = round2(rows.reduce((s, r) => s + Number(r.l.debit), 0));
  const totalCredit = round2(rows.reduce((s, r) => s + Number(r.l.credit), 0));
  return { rows, totalDebit, totalCredit };
}

/** Balances per customer: opening + sum(debit - credit). */
export async function customerBalances(orgId: string) {
  const rows = await db
    .select({
      id: customers.id,
      code: customers.customerCode,
      name: customers.name,
      phone: customers.phone,
      opening: sql<number>`coalesce(max(${customerAccounts.openingBalance}),0)::numeric`,
      debit: sql<number>`coalesce(sum(${customerLedger.debit}),0)::numeric`,
      credit: sql<number>`coalesce(sum(${customerLedger.credit}),0)::numeric`,
    })
    .from(customers)
    .leftJoin(customerAccounts, eq(customerAccounts.customerId, customers.id))
    .leftJoin(customerLedger, eq(customerLedger.customerId, customers.id))
    .where(eq(customers.organizationId, orgId))
    .groupBy(customers.id)
    .orderBy(customers.name);
  return rows.map((r) => ({ ...r, balance: round2(Number(r.opening) + Number(r.debit) - Number(r.credit)) }));
}

export async function taxReport(orgId: string, f: ReportFilters) {
  const where = [eq(taxRecords.organizationId, orgId), ...between(taxRecords.recordDate, f)];
  const rows = await db.select({ r: taxRecords, taxType: taxTypes.name, code: taxTypes.code }).from(taxRecords).leftJoin(taxTypes, eq(taxRecords.taxTypeId, taxTypes.id)).where(and(...where)).orderBy(desc(taxRecords.recordDate));
  const total = round2(rows.reduce((s, r) => s + Number(r.r.baseTaxAmount), 0));
  const byType: Record<string, number> = {};
  for (const r of rows) byType[r.taxType ?? "-"] = round2((byType[r.taxType ?? "-"] ?? 0) + Number(r.r.baseTaxAmount));
  return { rows, total, byType };
}

export async function transactionReport(orgId: string, f: ReportFilters) {
  const where = [eq(transactions.organizationId, orgId)];
  if (f.from) where.push(gte(transactions.transactionDate, new Date(f.from + "T00:00:00")));
  if (f.to) where.push(lte(transactions.transactionDate, new Date(f.to + "T23:59:59")));
  if (f.customerId) where.push(eq(transactions.customerId, f.customerId));
  if (f.paymentMethod) where.push(eq(transactions.paymentMethod, f.paymentMethod));
  if (f.currency) where.push(eq(transactions.currency, f.currency));
  if (f.status) where.push(eq(transactions.transactionType, f.status));
  if (f.userId) where.push(eq(transactions.createdBy, f.userId));
  const rows = await db.select({ t: transactions, customer: customers.name, user: profiles.fullName }).from(transactions).leftJoin(customers, eq(transactions.customerId, customers.id)).leftJoin(profiles, eq(transactions.createdBy, profiles.id)).where(and(...where)).orderBy(desc(transactions.transactionDate), desc(transactions.createdAt)).limit(500);
  const totalIn = round2(rows.filter((r) => r.t.direction === "in").reduce((s, r) => s + Number(r.t.baseAmount), 0));
  const totalOut = round2(rows.filter((r) => r.t.direction === "out").reduce((s, r) => s + Number(r.t.baseAmount), 0));
  return { rows, totalIn, totalOut };
}

export async function caseReport(orgId: string, f: ReportFilters) {
  const where = [eq(cases.organizationId, orgId)];
  if (f.from) where.push(gte(cases.openedAt, f.from));
  if (f.to) where.push(lte(cases.openedAt, f.to));
  if (f.customerId) where.push(eq(cases.customerId, f.customerId));
  if (f.serviceId) where.push(eq(cases.serviceId, f.serviceId));
  if (f.status) where.push(eq(cases.status, f.status));
  if (f.userId) where.push(eq(cases.responsibleEmployeeId, f.userId));
  const rows = await db.select({ c: cases, customer: customers.name, code: customers.customerCode, service: services.name, employee: profiles.fullName })
    .from(cases).innerJoin(customers, eq(cases.customerId, customers.id)).leftJoin(services, eq(cases.serviceId, services.id)).leftJoin(profiles, eq(cases.responsibleEmployeeId, profiles.id))
    .where(and(...where)).orderBy(desc(cases.openedAt), desc(cases.createdAt));
  const fees = round2(rows.reduce((s, r) => s + Number(r.c.serviceFee) - Number(r.c.discountAmount), 0));
  return { rows, fees };
}

export async function serviceFeeReport(orgId: string, f: ReportFilters) {
  const where = [eq(serviceFeeReceipts.organizationId, orgId)];
  if (f.from) where.push(gte(serviceFeeReceipts.createdAt, new Date(f.from + "T00:00:00")));
  if (f.to) where.push(lte(serviceFeeReceipts.createdAt, new Date(f.to + "T23:59:59")));
  if (f.customerId) where.push(eq(serviceFeeReceipts.customerId, f.customerId));
  if (f.userId) where.push(eq(serviceFeeReceipts.issuedBy, f.userId));
  if (f.paymentMethod) where.push(eq(serviceFeeReceipts.paymentMethod, f.paymentMethod));
  const rows = await db.select({ receipt: serviceFeeReceipts, customer: customers.name, code: customers.customerCode, caseNumber: cases.caseNumber, user: profiles.fullName })
    .from(serviceFeeReceipts).innerJoin(customers, eq(serviceFeeReceipts.customerId, customers.id)).innerJoin(cases, eq(serviceFeeReceipts.caseId, cases.id)).leftJoin(profiles, eq(serviceFeeReceipts.issuedBy, profiles.id))
    .where(and(...where)).orderBy(desc(serviceFeeReceipts.createdAt));
  const paid = round2(rows.reduce((s, r) => s + Number(r.receipt.paidAmount), 0));
  return { rows, paid };
}

export async function taxSettlementReport(orgId: string, f: ReportFilters) {
  const where = [eq(taxSettlements.organizationId, orgId)];
  if (f.from) where.push(gte(taxSettlements.periodStart, f.from));
  if (f.to) where.push(lte(taxSettlements.periodEnd, f.to));
  if (f.customerId) where.push(eq(taxSettlements.customerId, f.customerId));
  if (f.status) where.push(eq(taxSettlements.status, f.status));
  if (f.userId) where.push(eq(taxSettlements.createdBy, f.userId));
  const rows = await db.select({ s: taxSettlements, customer: customers.name, code: customers.customerCode, type: taxTypes.name, caseNumber: cases.caseNumber })
    .from(taxSettlements).innerJoin(customers, eq(taxSettlements.customerId, customers.id)).leftJoin(taxTypes, eq(taxSettlements.taxTypeId, taxTypes.id)).leftJoin(cases, eq(taxSettlements.caseId, cases.id))
    .where(and(...where)).orderBy(desc(taxSettlements.periodStart), desc(taxSettlements.createdAt));
  const assessed = round2(rows.reduce((s, r) => s + Number(r.s.taxAmount ?? 0), 0));
  const paid = round2(rows.reduce((s, r) => s + Number(r.s.paidAmount ?? 0), 0));
  return { rows, assessed, paid, remaining: round2(assessed - paid), needsReview: rows.filter((r) => r.s.status === "REQUIRES_LEGAL_REVIEW").length };
}

export async function complianceReport(orgId: string, f: ReportFilters) {
  const where = [eq(complianceEvents.organizationId, orgId)];
  if (f.from) where.push(gte(complianceEvents.occurredAt, new Date(f.from + "T00:00:00")));
  if (f.to) where.push(lte(complianceEvents.occurredAt, new Date(f.to + "T23:59:59")));
  if (f.customerId) where.push(eq(complianceEvents.customerId, f.customerId));
  if (f.userId) where.push(eq(complianceEvents.createdBy, f.userId));
  if (f.status) where.push(eq(complianceEvents.result, f.status));
  const rows = await db.select({ e: complianceEvents, customer: customers.name, code: customers.customerCode, caseNumber: cases.caseNumber, user: profiles.fullName })
    .from(complianceEvents).leftJoin(customers, eq(complianceEvents.customerId, customers.id)).leftJoin(cases, eq(complianceEvents.caseId, cases.id)).leftJoin(profiles, eq(complianceEvents.createdBy, profiles.id))
    .where(and(...where)).orderBy(desc(complianceEvents.occurredAt));
  return rows;
}

export async function auditReport(orgId: string, f: ReportFilters) {
  const where = [eq(auditLogs.organizationId, orgId)];
  if (f.from) where.push(gte(auditLogs.createdAt, new Date(f.from + "T00:00:00")));
  if (f.to) where.push(lte(auditLogs.createdAt, new Date(f.to + "T23:59:59")));
  if (f.userId) where.push(eq(auditLogs.userId, f.userId));
  if (f.status) where.push(eq(auditLogs.action, f.status));
  return db.select({ a: auditLogs, user: profiles.fullName }).from(auditLogs).leftJoin(profiles, eq(auditLogs.userId, profiles.id)).where(and(...where)).orderBy(desc(auditLogs.createdAt)).limit(500);
}

export async function dashboardData(orgId: string, from: string, to: string) {
  const [inc, exp, pl, cash, bank, custBal, tax, docs, pendingInc, pendingExp, recentTx, recentDocs, caseRows, receiptTotal, taxReviewRows] = await Promise.all([
    incomeReport(orgId, { from, to }),
    expenseReport(orgId, { from, to }),
    profitLoss(orgId, { from, to }),
    db.select().from(cashAccounts).where(eq(cashAccounts.organizationId, orgId)),
    db.select().from(bankAccounts).where(eq(bankAccounts.organizationId, orgId)),
    customerBalances(orgId),
    taxReport(orgId, { from, to }),
    db.select({ status: documents.status, n: sql<number>`count(*)::int` }).from(documents).where(eq(documents.organizationId, orgId)).groupBy(documents.status),
    db.select({ n: sql<number>`count(*)::int` }).from(incomes).where(and(eq(incomes.organizationId, orgId), eq(incomes.status, "pending_approval"))),
    db.select({ n: sql<number>`count(*)::int` }).from(expenses).where(and(eq(expenses.organizationId, orgId), eq(expenses.status, "pending_approval"))),
    db.select().from(transactions).where(eq(transactions.organizationId, orgId)).orderBy(desc(transactions.transactionDate), desc(transactions.createdAt)).limit(8),
    db.select({ d: documents, customer: customers.name }).from(documents).leftJoin(customers, eq(documents.customerId, customers.id)).where(eq(documents.organizationId, orgId)).orderBy(desc(documents.createdAt)).limit(6),
    db.select({ status: cases.status, serviceFee: cases.serviceFee, discountAmount: cases.discountAmount }).from(cases).where(eq(cases.organizationId, orgId)),
    db.select({ paid: sql<number>`coalesce(sum(${serviceFeeReceipts.paidAmount}),0)::numeric` }).from(serviceFeeReceipts).where(eq(serviceFeeReceipts.organizationId, orgId)),
    db.select({ n: sql<number>`count(*)::int` }).from(taxSettlements).where(and(eq(taxSettlements.organizationId, orgId), eq(taxSettlements.status, "REQUIRES_LEGAL_REVIEW"))),
  ]);
  const pendingDocs = docs.filter((d) => ["submitted", "under_review"].includes(d.status)).reduce((s, d) => s + d.n, 0);
  const activeCases = caseRows.filter((c) => !["closed", "cancelled"].includes(c.status)).length;
  const completedCases = caseRows.filter((c) => c.status === "closed" || c.status === "delivered").length;
  const missingCaseDocs = caseRows.filter((c) => c.status === "missing_documents").length;
  const feeTotal = round2(caseRows.filter((c) => c.status !== "cancelled").reduce((s, c) => s + Number(c.serviceFee) - Number(c.discountAmount), 0));
  const feePaid = Number(receiptTotal[0]?.paid ?? 0);
  return {
    totalIncome: inc.total,
    totalExpenses: exp.total,
    netProfit: pl.net,
    cashBalance: round2(cash.reduce((s, a) => s + Number(a.currentBalance), 0)),
    bankBalance: round2(bank.reduce((s, a) => s + Number(a.currentBalance), 0)),
    receivables: round2(custBal.filter((c) => c.balance > 0).reduce((s, c) => s + c.balance, 0)),
    taxes: tax.total,
    pendingDocs,
    pendingApprovals: pendingInc[0].n + pendingExp[0].n + docs.filter((d) => d.status === "under_review").reduce((s, d) => s + d.n, 0) + caseRows.filter((c) => c.status === "awaiting_approval").length,
    activeCases,
    completedCases,
    missingCaseDocs,
    serviceFeeTotal: feeTotal,
    serviceFeePaid: round2(feePaid),
    serviceFeeRemaining: round2(Math.max(0, feeTotal - feePaid)),
    taxNeedsReview: taxReviewRows[0]?.n ?? 0,
    recentTx,
    recentDocs,
    byCategory: exp.byCategory,
  };
}
