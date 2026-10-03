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
    .leftJoin(
      customerAccounts,
      and(
        eq(customerAccounts.customerId, customers.id),
        eq(customerAccounts.organizationId, orgId),
      ),
    )
    .leftJoin(
      customerLedger,
      and(
        eq(customerLedger.customerId, customers.id),
        eq(customerLedger.organizationId, orgId),
      ),
    )
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
  // Hot path: use set-based CTE aggregates so PostgreSQL scans each source once
  // instead of executing correlated subqueries for every customer.
  const metricsResult = await db.execute(sql`
    with
      income_total as (
        select coalesce(sum(i.base_amount), 0)::numeric as value
        from incomes i
        where i.organization_id = ${orgId}
          and i.income_date >= ${from}
          and i.income_date <= ${to}
          and i.status = 'finalized'
      ),
      expense_total as (
        select coalesce(sum(e.base_amount), 0)::numeric as value
        from expenses e
        where e.organization_id = ${orgId}
          and e.expense_date >= ${from}
          and e.expense_date <= ${to}
          and e.status = 'finalized'
      ),
      profit_total as (
        select coalesce(sum(
          case
            when a.account_type = 'income' then jel.credit - jel.debit
            when a.account_type = 'expense' then jel.debit - jel.credit
            else 0
          end
        ), 0)::numeric as value
        from journal_entry_lines jel
        inner join journal_entries je on je.id = jel.journal_entry_id
        inner join accounts a on a.id = jel.account_id
        where je.organization_id = ${orgId}
          and je.status = 'posted'
          and je.entry_date >= ${from}
          and je.entry_date <= ${to}
          and a.account_type in ('income', 'expense')
      ),
      cash_total as (
        select coalesce(sum(ca.current_balance), 0)::numeric as value
        from cash_accounts ca
        where ca.organization_id = ${orgId}
      ),
      bank_total as (
        select coalesce(sum(ba.current_balance), 0)::numeric as value
        from bank_accounts ba
        where ba.organization_id = ${orgId}
      ),
      customer_balances as (
        select
          c.id,
          greatest(
            coalesce(max(ca.opening_balance), 0)
            + coalesce(sum(cl.debit), 0)
            - coalesce(sum(cl.credit), 0),
            0
          ) as balance
        from customers c
        left join customer_accounts ca on ca.customer_id = c.id
        left join customer_ledger cl
          on cl.customer_id = c.id
         and cl.organization_id = ${orgId}
        where c.organization_id = ${orgId}
        group by c.id
      ),
      receivables_total as (
        select coalesce(sum(balance), 0)::numeric as value
        from customer_balances
      ),
      tax_total as (
        select coalesce(sum(tr.base_tax_amount), 0)::numeric as value
        from tax_records tr
        where tr.organization_id = ${orgId}
          and tr.record_date >= ${from}
          and tr.record_date <= ${to}
      ),
      pending as (
        select
          (select count(*) from documents d where d.organization_id = ${orgId} and d.status in ('submitted', 'under_review'))::int as pending_docs,
          (select count(*) from incomes i where i.organization_id = ${orgId} and i.status = 'pending_approval')::int as pending_income,
          (select count(*) from expenses e where e.organization_id = ${orgId} and e.status = 'pending_approval')::int as pending_expenses,
          (select count(*) from cases c where c.organization_id = ${orgId} and c.status = 'awaiting_approval')::int as pending_case_approvals,
          (select count(*) from documents d where d.organization_id = ${orgId} and d.status = 'under_review')::int as under_review_docs,
          (select count(*) from cases c where c.organization_id = ${orgId} and c.status not in ('closed', 'cancelled'))::int as active_cases,
          (select count(*) from cases c where c.organization_id = ${orgId} and c.status in ('closed', 'delivered'))::int as completed_cases,
          (select count(*) from cases c where c.organization_id = ${orgId} and c.status = 'missing_documents')::int as missing_case_docs,
          (select count(*) from tax_settlements ts where ts.organization_id = ${orgId} and ts.status = 'REQUIRES_LEGAL_REVIEW')::int as tax_needs_review
      ),
      service_fees as (
        select
          (select coalesce(sum(c.service_fee - c.discount_amount), 0)::numeric
             from cases c
            where c.organization_id = ${orgId}
              and c.status <> 'cancelled') as total,
          (select coalesce(sum(sfr.paid_amount), 0)::numeric
             from service_fee_receipts sfr
            where sfr.organization_id = ${orgId}) as paid
      ),
      category_totals as (
        select coalesce(jsonb_object_agg(e.category, e.total), '{}'::jsonb) as value
        from (
          select e.category, coalesce(sum(e.base_amount), 0)::numeric as total
          from expenses e
          where e.organization_id = ${orgId}
            and e.expense_date >= ${from}
            and e.expense_date <= ${to}
            and e.status = 'finalized'
          group by e.category
        ) e
      )
    select
      (select value from income_total) as total_income,
      (select value from expense_total) as total_expenses,
      (select value from profit_total) as net_profit,
      (select value from cash_total) as cash_balance,
      (select value from bank_total) as bank_balance,
      (select value from receivables_total) as receivables,
      (select value from tax_total) as taxes,
      p.*,
      sf.total as service_fee_total,
      sf.paid as service_fee_paid,
      ct.value as by_category
    from pending p
    cross join service_fees sf
    cross join category_totals ct
  `);

  const recentTxResult = await db
    .select()
    .from(transactions)
    .where(eq(transactions.organizationId, orgId))
    .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
    .limit(8);

  const recentDocs = await db
    .select({ d: documents, customer: customers.name })
    .from(documents)
    .leftJoin(customers, eq(documents.customerId, customers.id))
    .where(eq(documents.organizationId, orgId))
    .orderBy(desc(documents.createdAt))
    .limit(6);

  const row = metricsResult.rows[0] as {
    total_income?: number | string;
    total_expenses?: number | string;
    net_profit?: number | string;
    cash_balance?: number | string;
    bank_balance?: number | string;
    receivables?: number | string;
    taxes?: number | string;
    pending_docs?: number;
    pending_income?: number;
    pending_expenses?: number;
    pending_case_approvals?: number;
    under_review_docs?: number;
    active_cases?: number;
    completed_cases?: number;
    missing_case_docs?: number;
    service_fee_total?: number | string;
    service_fee_paid?: number | string;
    tax_needs_review?: number;
    by_category?: Record<string, string | number>;
  } | undefined;

  const feeTotal = Number(row?.service_fee_total ?? 0);
  const feePaid = Number(row?.service_fee_paid ?? 0);

  return {
    totalIncome: round2(Number(row?.total_income ?? 0)),
    totalExpenses: round2(Number(row?.total_expenses ?? 0)),
    netProfit: round2(Number(row?.net_profit ?? 0)),
    cashBalance: round2(Number(row?.cash_balance ?? 0)),
    bankBalance: round2(Number(row?.bank_balance ?? 0)),
    receivables: round2(Number(row?.receivables ?? 0)),
    taxes: round2(Number(row?.taxes ?? 0)),
    pendingDocs: Number(row?.pending_docs ?? 0),
    pendingApprovals:
      Number(row?.pending_income ?? 0) +
      Number(row?.pending_expenses ?? 0) +
      Number(row?.under_review_docs ?? 0) +
      Number(row?.pending_case_approvals ?? 0),
    activeCases: Number(row?.active_cases ?? 0),
    completedCases: Number(row?.completed_cases ?? 0),
    missingCaseDocs: Number(row?.missing_case_docs ?? 0),
    serviceFeeTotal: round2(feeTotal),
    serviceFeePaid: round2(feePaid),
    serviceFeeRemaining: round2(Math.max(0, feeTotal - feePaid)),
    taxNeedsReview: Number(row?.tax_needs_review ?? 0),
    recentTx: recentTxResult,
    recentDocs,
    byCategory: Object.fromEntries(
      Object.entries(row?.by_category ?? {}).map(([key, value]) => [key, round2(Number(value))]),
    ),
  };
}
