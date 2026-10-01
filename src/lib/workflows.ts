import "server-only";
import { and, eq } from "drizzle-orm";
import {
  bankAccounts,
  cashAccounts,
  customers,
  expenses,
  incomes,
  journalEntries,
  journalEntryLines,
  taxRecords,
} from "@/db/schema";
import {
  audit,
  bankMove,
  cashMove,
  createJournal,
  DEFAULT_APPROVAL,
  EXPENSE_CATEGORY_KEYS,
  FinanceError,
  getSetting,
  ledgerEntry,
  recordTransaction,
  systemAccount,
  toDate,
  type Tx,
  assertBalanced,
} from "./finance";
import { round2 } from "./format";

export interface Actor {
  orgId: string;
  userId: string;
  baseCurrency: string;
  canApprove: boolean;
}

/** Finalize an income: journal entry + cash/bank + customer ledger + tax record + transaction register. */
export async function finalizeIncome(tx: Tx, a: Actor, incomeId: string, opts?: { skipApprovalCheck?: boolean }) {
  const [inc] = await tx
    .select()
    .from(incomes)
    .where(and(eq(incomes.id, incomeId), eq(incomes.organizationId, a.orgId)))
    .for("update");
  if (!inc) throw new FinanceError("not_found");
  if (inc.status === "finalized") throw new FinanceError("already_finalized");
  if (Number(inc.totalAmount) <= 0) throw new FinanceError("invalid_amount");

  if (!opts?.skipApprovalCheck) {
    const approval = await getSetting(tx, a.orgId, "approval", DEFAULT_APPROVAL);
    if (Number(inc.baseAmount) > Number(approval.incomeThreshold) && !a.canApprove) {
      await tx.update(incomes).set({ status: "pending_approval" }).where(eq(incomes.id, inc.id));
      await audit(tx, { orgId: a.orgId, userId: a.userId, action: "SUBMIT", entityType: "income", entityId: inc.id, oldData: { status: inc.status }, newData: { status: "pending_approval" } });
      return { status: "pending_approval" as const };
    }
  }

  const rate = Number(inc.exchangeRate) || 1;
  const baseAmount = round2(Number(inc.amount) * rate);
  const baseTax = round2(Number(inc.taxAmount) * rate);
  const baseTotal = round2(baseAmount + baseTax);
  const date = toDate(inc.incomeDate);
  const desc = `${inc.incomeNumber} ${inc.description ?? ""}`.trim();

  let debitAccount: string;
  let cashAccountId: string | null = null;
  let bankAccountId: string | null = null;
  if (inc.paymentMethod === "cash") {
    if (!inc.cashAccountId) throw new FinanceError("cash_account_required");
    const r = await cashMove(tx, { orgId: a.orgId, userId: a.userId, cashAccountId: inc.cashAccountId, direction: "in", amount: baseTotal, type: "income", referenceType: "income", referenceId: inc.id, description: desc, date });
    cashAccountId = r.row.cashAccountId;
    debitAccount = await systemAccount(tx, a.orgId, "cash");
  } else if (inc.paymentMethod === "bank") {
    if (!inc.bankAccountId) throw new FinanceError("bank_account_required");
    const r = await bankMove(tx, { orgId: a.orgId, userId: a.userId, bankAccountId: inc.bankAccountId, direction: "in", amount: baseTotal, type: "income", referenceType: "income", referenceId: inc.id, description: desc, date });
    bankAccountId = r.row.bankAccountId;
    debitAccount = await systemAccount(tx, a.orgId, "bank");
  } else {
    if (!inc.customerId) throw new FinanceError("customer_required");
    debitAccount = await systemAccount(tx, a.orgId, "ar");
  }

  const lines = [
    { accountId: debitAccount, debit: baseTotal, credit: 0, description: desc },
    { accountId: await systemAccount(tx, a.orgId, "service_income"), debit: 0, credit: baseAmount, description: desc },
  ];
  if (baseTax > 0) lines.push({ accountId: await systemAccount(tx, a.orgId, "tax_payable"), debit: 0, credit: baseTax, description: `Tax ${inc.incomeNumber}` });
  const je = await createJournal(tx, { orgId: a.orgId, userId: a.userId, entryDate: inc.incomeDate, referenceType: "income", referenceId: inc.id, description: desc, lines, post: true, currency: a.baseCurrency, isDemo: inc.isDemo });

  if (inc.customerId) {
    await ledgerEntry(tx, { orgId: a.orgId, userId: a.userId, customerId: inc.customerId, debit: baseTotal, credit: 0, currency: a.baseCurrency, referenceType: "income", referenceId: inc.id, description: desc, date });
    if (inc.paymentMethod !== "credit") {
      await ledgerEntry(tx, { orgId: a.orgId, userId: a.userId, customerId: inc.customerId, debit: 0, credit: baseTotal, currency: a.baseCurrency, referenceType: "income_payment", referenceId: inc.id, description: `Payment ${inc.incomeNumber}`, date });
    }
  }

  if (Number(inc.taxAmount) > 0) {
    await tx.insert(taxRecords).values({
      organizationId: a.orgId,
      referenceType: "income",
      referenceId: inc.id,
      taxTypeId: inc.taxTypeId,
      taxableAmount: Number(inc.amount),
      taxRate: Number(inc.taxRate),
      taxAmount: Number(inc.taxAmount),
      currency: inc.currency,
      baseTaxAmount: baseTax,
      recordDate: inc.incomeDate,
    });
  }

  const trx = await recordTransaction(tx, { orgId: a.orgId, userId: a.userId, type: "income", direction: "in", amount: Number(inc.totalAmount), currency: inc.currency, exchangeRate: rate, baseCurrency: a.baseCurrency, referenceType: "income", referenceId: inc.id, customerId: inc.customerId, cashAccountId, bankAccountId, journalEntryId: je.id, paymentMethod: inc.paymentMethod, description: desc, date, isDemo: inc.isDemo });

  await tx.update(incomes).set({ status: "finalized", journalEntryId: je.id, baseAmount: baseTotal, approvedBy: a.canApprove ? a.userId : inc.approvedBy }).where(eq(incomes.id, inc.id));
  await audit(tx, { orgId: a.orgId, userId: a.userId, action: "POST", entityType: "income", entityId: inc.id, oldData: { status: inc.status }, newData: { status: "finalized", journalEntryId: je.id, transactionId: trx.id } });
  return { status: "finalized" as const };
}

export async function finalizeExpense(tx: Tx, a: Actor, expenseId: string, opts?: { skipApprovalCheck?: boolean }) {
  const [exp] = await tx
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.organizationId, a.orgId)))
    .for("update");
  if (!exp) throw new FinanceError("not_found");
  if (exp.status === "finalized") throw new FinanceError("already_finalized");
  if (Number(exp.totalAmount) <= 0) throw new FinanceError("invalid_amount");

  if (!opts?.skipApprovalCheck) {
    const approval = await getSetting(tx, a.orgId, "approval", DEFAULT_APPROVAL);
    if (Number(exp.baseAmount) > Number(approval.expenseThreshold) && !a.canApprove) {
      await tx.update(expenses).set({ status: "pending_approval" }).where(eq(expenses.id, exp.id));
      await audit(tx, { orgId: a.orgId, userId: a.userId, action: "SUBMIT", entityType: "expense", entityId: exp.id, oldData: { status: exp.status }, newData: { status: "pending_approval" } });
      return { status: "pending_approval" as const };
    }
  }

  const rate = Number(exp.exchangeRate) || 1;
  const baseAmount = round2(Number(exp.amount) * rate);
  const baseTax = round2(Number(exp.taxAmount) * rate);
  const baseTotal = round2(baseAmount + baseTax);
  const date = toDate(exp.expenseDate);
  const desc = `${exp.expenseNumber} ${exp.description ?? ""}`.trim();

  let creditAccount: string;
  let cashAccountId: string | null = null;
  let bankAccountId: string | null = null;
  if (exp.paymentMethod === "bank") {
    if (!exp.bankAccountId) throw new FinanceError("bank_account_required");
    const r = await bankMove(tx, { orgId: a.orgId, userId: a.userId, bankAccountId: exp.bankAccountId, direction: "out", amount: baseTotal, type: "expense", referenceType: "expense", referenceId: exp.id, description: desc, date });
    bankAccountId = r.row.bankAccountId;
    creditAccount = await systemAccount(tx, a.orgId, "bank");
  } else if (exp.paymentMethod === "credit") {
    creditAccount = await systemAccount(tx, a.orgId, "ap");
  } else {
    if (!exp.cashAccountId) throw new FinanceError("cash_account_required");
    const r = await cashMove(tx, { orgId: a.orgId, userId: a.userId, cashAccountId: exp.cashAccountId, direction: "out", amount: baseTotal, type: "expense", referenceType: "expense", referenceId: exp.id, description: desc, date });
    cashAccountId = r.row.cashAccountId;
    creditAccount = await systemAccount(tx, a.orgId, "cash");
  }

  const expenseAccount = exp.accountId ?? (await systemAccount(tx, a.orgId, EXPENSE_CATEGORY_KEYS[exp.category] ?? "exp_other"));
  const lines = [
    { accountId: expenseAccount, debit: baseTotal, credit: 0, description: desc },
    { accountId: creditAccount, debit: 0, credit: baseTotal, description: desc },
  ];
  const je = await createJournal(tx, { orgId: a.orgId, userId: a.userId, entryDate: exp.expenseDate, referenceType: "expense", referenceId: exp.id, description: desc, lines, post: true, currency: a.baseCurrency, isDemo: exp.isDemo });

  if (Number(exp.taxAmount) > 0) {
    await tx.insert(taxRecords).values({
      organizationId: a.orgId,
      referenceType: "expense",
      referenceId: exp.id,
      taxTypeId: exp.taxTypeId,
      taxableAmount: Number(exp.amount),
      taxRate: Number(exp.taxRate),
      taxAmount: Number(exp.taxAmount),
      currency: exp.currency,
      baseTaxAmount: baseTax,
      recordDate: exp.expenseDate,
    });
  }

  const trx = await recordTransaction(tx, { orgId: a.orgId, userId: a.userId, type: "expense", direction: "out", amount: Number(exp.totalAmount), currency: exp.currency, exchangeRate: rate, baseCurrency: a.baseCurrency, referenceType: "expense", referenceId: exp.id, cashAccountId, bankAccountId, journalEntryId: je.id, paymentMethod: exp.paymentMethod, description: desc, date, isDemo: exp.isDemo });

  await tx.update(expenses).set({ status: "finalized", journalEntryId: je.id, baseAmount: baseTotal, approvedBy: a.canApprove ? a.userId : exp.approvedBy }).where(eq(expenses.id, exp.id));
  await audit(tx, { orgId: a.orgId, userId: a.userId, action: "POST", entityType: "expense", entityId: exp.id, oldData: { status: exp.status }, newData: { status: "finalized", journalEntryId: je.id, transactionId: trx.id } });
  return { status: "finalized" as const };
}

/** Customer pays part/all of their receivable balance. */
export async function receiveCustomerPayment(
  tx: Tx,
  a: Actor,
  p: { customerId: string; amount: number; method: "cash" | "bank"; accountId: string; date: string; description?: string | null; isDemo?: boolean },
) {
  const amount = round2(p.amount);
  if (amount <= 0) throw new FinanceError("invalid_amount");
  const [cust] = await tx.select().from(customers).where(and(eq(customers.id, p.customerId), eq(customers.organizationId, a.orgId)));
  if (!cust) throw new FinanceError("customer_not_found");
  const date = toDate(p.date);
  const desc = p.description || `Payment from ${cust.name}`;
  let debitAccount: string;
  let cashAccountId: string | null = null;
  let bankAccountId: string | null = null;
  if (p.method === "cash") {
    await cashMove(tx, { orgId: a.orgId, userId: a.userId, cashAccountId: p.accountId, direction: "in", amount, type: "customer_payment", referenceType: "customer", referenceId: cust.id, description: desc, date });
    debitAccount = await systemAccount(tx, a.orgId, "cash");
    cashAccountId = p.accountId;
  } else {
    await bankMove(tx, { orgId: a.orgId, userId: a.userId, bankAccountId: p.accountId, direction: "in", amount, type: "customer_payment", referenceType: "customer", referenceId: cust.id, description: desc, date });
    debitAccount = await systemAccount(tx, a.orgId, "bank");
    bankAccountId = p.accountId;
  }
  const je = await createJournal(tx, {
    orgId: a.orgId, userId: a.userId, entryDate: p.date, referenceType: "customer_payment", referenceId: cust.id, description: desc, post: true, currency: a.baseCurrency, isDemo: p.isDemo,
    lines: [
      { accountId: debitAccount, debit: amount, credit: 0, description: desc },
      { accountId: await systemAccount(tx, a.orgId, "ar"), debit: 0, credit: amount, description: desc },
    ],
  });
  const ledger = await ledgerEntry(tx, { orgId: a.orgId, userId: a.userId, customerId: cust.id, debit: 0, credit: amount, currency: a.baseCurrency, referenceType: "payment", referenceId: je.id, description: desc, date });
  const trx = await recordTransaction(tx, { orgId: a.orgId, userId: a.userId, type: "customer_payment", direction: "in", amount, currency: a.baseCurrency, exchangeRate: 1, baseCurrency: a.baseCurrency, referenceType: "customer_ledger", referenceId: ledger.id, customerId: cust.id, cashAccountId, bankAccountId, journalEntryId: je.id, paymentMethod: p.method, description: desc, date, isDemo: p.isDemo });
  await audit(tx, { orgId: a.orgId, userId: a.userId, action: "CREATE", entityType: "customer_payment", entityId: trx.id, newData: { customerId: cust.id, amount, method: p.method } });
  return trx;
}

/** Manual cash deposit (capital in) or withdrawal (drawings). */
export async function cashOperation(tx: Tx, a: Actor, p: { cashAccountId: string; direction: "in" | "out"; amount: number; date: string; description?: string | null; isDemo?: boolean }) {
  const amount = round2(p.amount);
  const date = toDate(p.date);
  const desc = p.description || (p.direction === "in" ? "Cash deposit" : "Cash withdrawal");
  await cashMove(tx, { orgId: a.orgId, userId: a.userId, cashAccountId: p.cashAccountId, direction: p.direction, amount, type: p.direction === "in" ? "deposit" : "withdrawal", referenceType: "manual", description: desc, date });
  const cashAcc = await systemAccount(tx, a.orgId, "cash");
  const equityAcc = await systemAccount(tx, a.orgId, p.direction === "in" ? "capital" : "drawings");
  const je = await createJournal(tx, {
    orgId: a.orgId, userId: a.userId, entryDate: p.date, referenceType: "cash", description: desc, post: true, currency: a.baseCurrency, isDemo: p.isDemo,
    lines: p.direction === "in"
      ? [{ accountId: cashAcc, debit: amount, credit: 0 }, { accountId: equityAcc, debit: 0, credit: amount }]
      : [{ accountId: equityAcc, debit: amount, credit: 0 }, { accountId: cashAcc, debit: 0, credit: amount }],
  });
  const trx = await recordTransaction(tx, { orgId: a.orgId, userId: a.userId, type: p.direction === "in" ? "cash_deposit" : "cash_withdrawal", direction: p.direction, amount, currency: a.baseCurrency, exchangeRate: 1, baseCurrency: a.baseCurrency, cashAccountId: p.cashAccountId, journalEntryId: je.id, paymentMethod: "cash", description: desc, date, isDemo: p.isDemo });
  await audit(tx, { orgId: a.orgId, userId: a.userId, action: "CREATE", entityType: "cash_transaction", entityId: trx.id, newData: p });
  return trx;
}

export async function bankOperation(tx: Tx, a: Actor, p: { bankAccountId: string; kind: "deposit" | "withdrawal" | "bank_fee"; amount: number; date: string; description?: string | null; isDemo?: boolean }) {
  const amount = round2(p.amount);
  const date = toDate(p.date);
  const desc = p.description || p.kind;
  const direction = p.kind === "deposit" ? "in" : "out";
  await bankMove(tx, { orgId: a.orgId, userId: a.userId, bankAccountId: p.bankAccountId, direction, amount, type: p.kind, referenceType: "manual", description: desc, date });
  const bankAcc = await systemAccount(tx, a.orgId, "bank");
  const otherAcc = await systemAccount(tx, a.orgId, p.kind === "deposit" ? "capital" : p.kind === "withdrawal" ? "drawings" : "bank_fees");
  const je = await createJournal(tx, {
    orgId: a.orgId, userId: a.userId, entryDate: p.date, referenceType: "bank", description: desc, post: true, currency: a.baseCurrency, isDemo: p.isDemo,
    lines: direction === "in"
      ? [{ accountId: bankAcc, debit: amount, credit: 0 }, { accountId: otherAcc, debit: 0, credit: amount }]
      : [{ accountId: otherAcc, debit: amount, credit: 0 }, { accountId: bankAcc, debit: 0, credit: amount }],
  });
  const trx = await recordTransaction(tx, { orgId: a.orgId, userId: a.userId, type: `bank_${p.kind}`, direction, amount, currency: a.baseCurrency, exchangeRate: 1, baseCurrency: a.baseCurrency, bankAccountId: p.bankAccountId, journalEntryId: je.id, paymentMethod: "bank", description: desc, date, isDemo: p.isDemo });
  await audit(tx, { orgId: a.orgId, userId: a.userId, action: "CREATE", entityType: "bank_transaction", entityId: trx.id, newData: p });
  return trx;
}

/** Transfer between cash and bank accounts (any combination). Both sides succeed or neither. */
export async function transferFunds(
  tx: Tx,
  a: Actor,
  p: { fromType: "cash" | "bank"; fromId: string; toType: "cash" | "bank"; toId: string; amount: number; date: string; description?: string | null; isDemo?: boolean },
) {
  const amount = round2(p.amount);
  if (amount <= 0) throw new FinanceError("invalid_amount");
  if (p.fromType === p.toType && p.fromId === p.toId) throw new FinanceError("same_account");
  const date = toDate(p.date);
  const desc = p.description || "Transfer";
  if (p.fromType === "cash") await cashMove(tx, { orgId: a.orgId, userId: a.userId, cashAccountId: p.fromId, direction: "out", amount, type: "transfer", referenceType: "transfer", description: desc, date });
  else await bankMove(tx, { orgId: a.orgId, userId: a.userId, bankAccountId: p.fromId, direction: "out", amount, type: "transfer", referenceType: "transfer", description: desc, date });
  if (p.toType === "cash") await cashMove(tx, { orgId: a.orgId, userId: a.userId, cashAccountId: p.toId, direction: "in", amount, type: "transfer", referenceType: "transfer", description: desc, date });
  else await bankMove(tx, { orgId: a.orgId, userId: a.userId, bankAccountId: p.toId, direction: "in", amount, type: "transfer", referenceType: "transfer", description: desc, date });
  const fromAcc = await systemAccount(tx, a.orgId, p.fromType);
  const toAcc = await systemAccount(tx, a.orgId, p.toType);
  const je = await createJournal(tx, {
    orgId: a.orgId, userId: a.userId, entryDate: p.date, referenceType: "transfer", description: desc, post: true, currency: a.baseCurrency, isDemo: p.isDemo,
    lines: fromAcc === toAcc
      ? [{ accountId: toAcc, debit: amount, credit: 0, description: `${desc} (in)` }, { accountId: fromAcc, debit: 0, credit: amount, description: `${desc} (out)` }]
      : [{ accountId: toAcc, debit: amount, credit: 0 }, { accountId: fromAcc, debit: 0, credit: amount }],
  });
  const trx = await recordTransaction(tx, { orgId: a.orgId, userId: a.userId, type: "transfer", direction: "transfer", amount, currency: a.baseCurrency, exchangeRate: 1, baseCurrency: a.baseCurrency, cashAccountId: p.fromType === "cash" ? p.fromId : p.toType === "cash" ? p.toId : null, bankAccountId: p.fromType === "bank" ? p.fromId : p.toType === "bank" ? p.toId : null, journalEntryId: je.id, paymentMethod: "transfer", description: `${desc} (${p.fromType} → ${p.toType})`, date, isDemo: p.isDemo });
  await audit(tx, { orgId: a.orgId, userId: a.userId, action: "CREATE", entityType: "transfer", entityId: trx.id, newData: p });
  return trx;
}

/** Opening balances are booked through the general ledger so the balance sheet always reconciles. */
export async function openingBalanceEntry(tx: Tx, a: Actor, p: { kind: "cash" | "bank" | "ar"; amount: number; date: string; description: string; isDemo?: boolean }) {
  const amount = round2(p.amount);
  if (amount === 0) return null;
  const asset = await systemAccount(tx, a.orgId, p.kind);
  const capital = await systemAccount(tx, a.orgId, "capital");
  return createJournal(tx, {
    orgId: a.orgId, userId: a.userId, entryDate: p.date, referenceType: "opening_balance", description: p.description, post: true, currency: a.baseCurrency, isDemo: p.isDemo,
    lines: amount > 0
      ? [{ accountId: asset, debit: amount, credit: 0 }, { accountId: capital, debit: 0, credit: amount }]
      : [{ accountId: capital, debit: -amount, credit: 0 }, { accountId: asset, debit: 0, credit: -amount }],
  });
}

export async function postJournalEntry(tx: Tx, a: Actor, entryId: string) {
  const [entry] = await tx.select().from(journalEntries).where(and(eq(journalEntries.id, entryId), eq(journalEntries.organizationId, a.orgId))).for("update");
  if (!entry) throw new FinanceError("not_found");
  if (entry.status !== "draft") throw new FinanceError("already_posted");
  const lines = await tx.select().from(journalEntryLines).where(eq(journalEntryLines.journalEntryId, entry.id));
  assertBalanced(lines.map((l) => ({ accountId: l.accountId, debit: Number(l.debit), credit: Number(l.credit) })));
  await tx.update(journalEntries).set({ status: "posted", postedBy: a.userId, postedAt: new Date() }).where(eq(journalEntries.id, entry.id));
  await audit(tx, { orgId: a.orgId, userId: a.userId, action: "POST", entityType: "journal_entry", entityId: entry.id, oldData: { status: "draft" }, newData: { status: "posted" } });
}

export async function reverseJournalEntry(tx: Tx, a: Actor, entryId: string, reason: string | null, isoDate: string) {
  const [entry] = await tx.select().from(journalEntries).where(and(eq(journalEntries.id, entryId), eq(journalEntries.organizationId, a.orgId))).for("update");
  if (!entry) throw new FinanceError("not_found");
  if (entry.status !== "posted") throw new FinanceError("not_posted");
  const lines = await tx.select().from(journalEntryLines).where(eq(journalEntryLines.journalEntryId, entry.id));
  const rev = await createJournal(tx, {
    orgId: a.orgId, userId: a.userId, entryDate: isoDate, referenceType: "reversal", referenceId: entry.id,
    description: `Reversal of ${entry.entryNumber}${reason ? " - " + reason : ""}`, post: true, currency: a.baseCurrency, isDemo: entry.isDemo, reversedEntryId: entry.id,
    lines: lines.map((l) => ({ accountId: l.accountId, debit: Number(l.credit), credit: Number(l.debit), description: l.description })),
  });
  await tx.update(journalEntries).set({ status: "reversed" }).where(eq(journalEntries.id, entry.id));
  await audit(tx, { orgId: a.orgId, userId: a.userId, action: "REVERSE", entityType: "journal_entry", entityId: entry.id, oldData: { status: "posted" }, newData: { status: "reversed", reversalEntryId: rev.id, reason } });
  return rev;
}

export async function getAccountBalances(tx: Tx | typeof import("@/db").db, orgId: string) {
  const cash = await tx.select().from(cashAccounts).where(eq(cashAccounts.organizationId, orgId));
  const bank = await tx.select().from(bankAccounts).where(eq(bankAccounts.organizationId, orgId));
  return { cash, bank };
}
