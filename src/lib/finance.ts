import "server-only";
import { and, desc, eq, isNull, lte, or, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  auditLogs,
  bankAccounts,
  bankTransactions,
  cashAccounts,
  cashTransactions,
  counters,
  customerAccounts,
  customerLedger,
  exchangeRates,
  journalEntries,
  journalEntryLines,
  systemSettings,
  taxRules,
  transactions,
} from "@/db/schema";
import { requestMeta } from "./auth";
import { round2 } from "./format";
import { todayJalali } from "./jalali";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbOrTx = Tx | typeof db;

export class FinanceError extends Error {
  constructor(public code: string, msg?: string) {
    super(msg ?? code);
  }
}

/* ---------------- Audit ---------------- */
export async function audit(
  tx: DbOrTx,
  p: {
    orgId: string | null;
    userId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    oldData?: unknown;
    newData?: unknown;
  },
) {
  const meta = await requestMeta();
  await tx.insert(auditLogs).values({
    organizationId: p.orgId,
    userId: p.userId,
    action: p.action,
    entityType: p.entityType,
    entityId: p.entityId ?? null,
    oldData: p.oldData ?? null,
    newData: p.newData ?? null,
    ipAddress: meta.ip,
    userAgent: meta.ua,
  });
}

/* ---------------- Settings ---------------- */
export const DEFAULT_NUMBERING: Record<string, string> = {
  customer: "CUS",
  income: "INC",
  expense: "EXP",
  document: "DOC",
  contract: "CON",
  journal: "JE",
  transaction: "TRX",
  case: "CASE",
  receipt: "RCT",
  letter: "FIN-LTR",
  tax_settlement: "TAX",
  generated_form: "FORM",
};
export const DEFAULT_APPROVAL = { incomeThreshold: 100000, expenseThreshold: 50000, documentApproval: true };

export async function getSetting<T>(tx: DbOrTx, orgId: string, key: string, fallback: T): Promise<T> {
  const [row] = await tx
    .select()
    .from(systemSettings)
    .where(and(eq(systemSettings.organizationId, orgId), eq(systemSettings.key, key)));
  return row ? ({ ...fallback, ...(row.value as object) } as T) : fallback;
}

export async function setSetting(tx: DbOrTx, orgId: string, key: string, value: unknown) {
  await tx
    .insert(systemSettings)
    .values({ organizationId: orgId, key, value: value as object })
    .onConflictDoUpdate({
      target: [systemSettings.organizationId, systemSettings.key],
      set: { value: value as object, updatedAt: new Date() },
    });
}

/* ---------------- Numbering ---------------- */
export async function nextNumber(tx: DbOrTx, orgId: string, key: string) {
  const numbering = await getSetting(tx, orgId, "numbering", DEFAULT_NUMBERING);
  const jy = todayJalali().jy;
  const counterKey = `${key}-${jy}`;
  const [row] = await tx
    .insert(counters)
    .values({ organizationId: orgId, key: counterKey, value: 1 })
    .onConflictDoUpdate({
      target: [counters.organizationId, counters.key],
      set: { value: sql`${counters.value} + 1` },
    })
    .returning({ value: counters.value });
  return `${numbering[key] ?? key.toUpperCase()}-${jy}-${String(row.value).padStart(5, "0")}`;
}

/* ---------------- Exchange rates ---------------- */
export async function getExchangeRate(tx: DbOrTx, orgId: string, currency: string, baseCurrency: string, isoDate: string) {
  if (currency === baseCurrency) return 1;
  const [row] = await tx
    .select()
    .from(exchangeRates)
    .where(and(eq(exchangeRates.organizationId, orgId), eq(exchangeRates.currency, currency), lte(exchangeRates.effectiveDate, isoDate)))
    .orderBy(desc(exchangeRates.effectiveDate), desc(exchangeRates.createdAt))
    .limit(1);
  if (!row) {
    const [latest] = await tx
      .select()
      .from(exchangeRates)
      .where(and(eq(exchangeRates.organizationId, orgId), eq(exchangeRates.currency, currency)))
      .orderBy(desc(exchangeRates.effectiveDate))
      .limit(1);
    if (!latest) throw new FinanceError("no_exchange_rate", `No exchange rate configured for ${currency}`);
    return Number(latest.rate);
  }
  return Number(row.rate);
}

/* ---------------- Tax ---------------- */
export async function getActiveTaxRate(tx: DbOrTx, orgId: string, taxTypeId: string | null, isoDate: string) {
  if (!taxTypeId) return 0;
  // Legacy tax_rates are historical/configuration-only. Financial tax calculations require an Admin-verified legal rule.
  const [row] = await tx
    .select()
    .from(taxRules)
    .where(
      and(
        eq(taxRules.organizationId, orgId),
        eq(taxRules.taxTypeId, taxTypeId),
        eq(taxRules.verificationStatus, "verified"),
        lte(taxRules.effectiveFrom, isoDate),
        or(isNull(taxRules.effectiveTo), gte(taxRules.effectiveTo, isoDate)),
      ),
    )
    .orderBy(desc(taxRules.effectiveFrom), desc(taxRules.version))
    .limit(1);
  const pctTypes = ["percentage", "gross_percentage", "net_percentage"];
  return row?.rate !== null && row?.rate !== undefined && pctTypes.includes(row.calculationType) ? Number(row.rate) : null;
}

/* ---------------- Chart of accounts ---------------- */
export const DEFAULT_ACCOUNTS: { code: string; name: string; type: string; parent?: string; key?: string }[] = [
  { code: "1000", name: "دارایی‌ها / Assets", type: "asset" },
  { code: "1100", name: "صندوق (نقد) / Cash", type: "asset", parent: "1000", key: "cash" },
  { code: "1200", name: "بانک / Bank", type: "asset", parent: "1000", key: "bank" },
  { code: "1300", name: "طلبات از مشتریان / Accounts Receivable", type: "asset", parent: "1000", key: "ar" },
  { code: "2000", name: "بدهی‌ها / Liabilities", type: "liability" },
  { code: "2100", name: "مالیه قابل پرداخت / Tax Payable", type: "liability", parent: "2000", key: "tax_payable" },
  { code: "2200", name: "قرضه‌داری‌ها / Accounts Payable", type: "liability", parent: "2000", key: "ap" },
  { code: "3000", name: "سرمایه / Equity", type: "equity" },
  { code: "3100", name: "سرمایه مالک / Owner Capital", type: "equity", parent: "3000", key: "capital" },
  { code: "3200", name: "برداشت مالک / Owner Drawings", type: "equity", parent: "3000", key: "drawings" },
  { code: "4000", name: "عواید / Income", type: "income" },
  { code: "4100", name: "عواید خدمات / Service Income", type: "income", parent: "4000", key: "service_income" },
  { code: "4200", name: "سایر عواید / Other Income", type: "income", parent: "4000", key: "other_income" },
  { code: "5000", name: "مصارف / Expenses", type: "expense" },
  { code: "5100", name: "مصارف اداری / Administrative Expenses", type: "expense", parent: "5000", key: "exp_administrative" },
  { code: "5200", name: "کرایه / Rent", type: "expense", parent: "5000", key: "exp_rent" },
  { code: "5300", name: "معاشات / Salaries", type: "expense", parent: "5000", key: "exp_salaries" },
  { code: "5400", name: "برق، آب و انترنت / Utilities", type: "expense", parent: "5000", key: "exp_utilities" },
  { code: "5500", name: "ترانسپورت / Transport", type: "expense", parent: "5000", key: "exp_transport" },
  { code: "5600", name: "قرطاسیه و لوازم / Supplies", type: "expense", parent: "5000", key: "exp_supplies" },
  { code: "5700", name: "فیس بانکی / Bank Fees", type: "expense", parent: "5000", key: "bank_fees" },
  { code: "5800", name: "سایر مصارف / Other Expenses", type: "expense", parent: "5000", key: "exp_other" },
];

export async function ensureChartOfAccounts(tx: DbOrTx, orgId: string, currency: string) {
  const existing = await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.organizationId, orgId)).limit(1);
  if (existing.length) return;
  const idByCode: Record<string, string> = {};
  for (const a of DEFAULT_ACCOUNTS) {
    const [row] = await tx
      .insert(accounts)
      .values({
        organizationId: orgId,
        accountCode: a.code,
        accountName: a.name,
        accountType: a.type,
        parentId: a.parent ? idByCode[a.parent] : null,
        systemKey: a.key ?? null,
        currency,
      })
      .returning({ id: accounts.id });
    idByCode[a.code] = row.id;
  }
}

export async function systemAccount(tx: DbOrTx, orgId: string, key: string) {
  const [row] = await tx
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.organizationId, orgId), eq(accounts.systemKey, key)));
  if (!row) throw new FinanceError("missing_account", `System account '${key}' missing`);
  return row.id;
}

export const EXPENSE_CATEGORY_KEYS: Record<string, string> = {
  administrative: "exp_administrative",
  rent: "exp_rent",
  salaries: "exp_salaries",
  utilities: "exp_utilities",
  transport: "exp_transport",
  supplies: "exp_supplies",
  other: "exp_other",
};

/* ---------------- Journal ---------------- */
export interface JournalLine {
  accountId: string;
  debit: number;
  credit: number;
  description?: string | null;
}

export function assertBalanced(lines: JournalLine[]) {
  const d = round2(lines.reduce((s, l) => s + Number(l.debit || 0), 0));
  const c = round2(lines.reduce((s, l) => s + Number(l.credit || 0), 0));
  if (lines.length < 2 || d !== c || d <= 0) throw new FinanceError("unbalanced");
  for (const l of lines) {
    if ((l.debit > 0 && l.credit > 0) || l.debit < 0 || l.credit < 0) throw new FinanceError("unbalanced");
  }
}

export async function createJournal(
  tx: Tx,
  p: {
    orgId: string;
    userId: string;
    entryDate: string;
    referenceType?: string | null;
    referenceId?: string | null;
    description?: string | null;
    lines: JournalLine[];
    post: boolean;
    currency: string;
    isDemo?: boolean;
    reversedEntryId?: string | null;
  },
) {
  const lines = p.lines.filter((l) => Number(l.debit) > 0 || Number(l.credit) > 0);
  if (p.post) assertBalanced(lines);
  else if (lines.length === 0) throw new FinanceError("unbalanced");
  const entryNumber = await nextNumber(tx, p.orgId, "journal");
  const [entry] = await tx
    .insert(journalEntries)
    .values({
      organizationId: p.orgId,
      entryNumber,
      entryDate: p.entryDate,
      referenceType: p.referenceType ?? null,
      referenceId: p.referenceId ?? null,
      description: p.description ?? null,
      status: p.post ? "posted" : "draft",
      createdBy: p.userId,
      postedBy: p.post ? p.userId : null,
      postedAt: p.post ? new Date() : null,
      isDemo: p.isDemo ?? false,
      reversedEntryId: p.reversedEntryId ?? null,
    })
    .returning();
  await tx.insert(journalEntryLines).values(
    lines.map((l) => ({
      organizationId: p.orgId,
      journalEntryId: entry.id,
      accountId: l.accountId,
      debit: round2(Number(l.debit || 0)),
      credit: round2(Number(l.credit || 0)),
      description: l.description ?? null,
      currency: p.currency,
    })),
  );
  return entry;
}

/* ---------------- Cash / Bank movements (balance always derived from transactions) ---------------- */
export async function cashMove(
  tx: Tx,
  p: {
    orgId: string;
    userId: string;
    cashAccountId: string;
    direction: "in" | "out";
    amount: number;
    type: string;
    referenceType?: string | null;
    referenceId?: string | null;
    description?: string | null;
    date?: Date;
  },
) {
  const amount = round2(p.amount);
  if (amount <= 0) throw new FinanceError("invalid_amount");
  const [acc] = await tx
    .select()
    .from(cashAccounts)
    .where(and(eq(cashAccounts.id, p.cashAccountId), eq(cashAccounts.organizationId, p.orgId)))
    .for("update");
  if (!acc || !acc.isActive) throw new FinanceError("cash_account_not_found");
  const [{ sum }] = await tx
    .select({
      sum: sql<number>`coalesce(sum(case when ${cashTransactions.direction} = 'in' then ${cashTransactions.amount} else -${cashTransactions.amount} end), 0)::numeric`,
    })
    .from(cashTransactions)
    .where(eq(cashTransactions.cashAccountId, acc.id));
  const before = round2(Number(acc.openingBalance) + Number(sum));
  const after = round2(p.direction === "in" ? before + amount : before - amount);
  if (after < 0) throw new FinanceError("insufficient_funds");
  const [row] = await tx
    .insert(cashTransactions)
    .values({
      organizationId: p.orgId,
      cashAccountId: acc.id,
      transactionType: p.type,
      referenceType: p.referenceType ?? null,
      referenceId: p.referenceId ?? null,
      direction: p.direction,
      amount,
      balanceAfter: after,
      description: p.description ?? null,
      transactionDate: p.date ?? new Date(),
      createdBy: p.userId,
    })
    .returning();
  await tx.update(cashAccounts).set({ currentBalance: after }).where(eq(cashAccounts.id, acc.id));
  return { row, currency: acc.currency, after };
}

export async function bankMove(
  tx: Tx,
  p: {
    orgId: string;
    userId: string;
    bankAccountId: string;
    direction: "in" | "out";
    amount: number;
    type: string;
    referenceType?: string | null;
    referenceId?: string | null;
    description?: string | null;
    date?: Date;
  },
) {
  const amount = round2(p.amount);
  if (amount <= 0) throw new FinanceError("invalid_amount");
  const [acc] = await tx
    .select()
    .from(bankAccounts)
    .where(and(eq(bankAccounts.id, p.bankAccountId), eq(bankAccounts.organizationId, p.orgId)))
    .for("update");
  if (!acc || !acc.isActive) throw new FinanceError("bank_account_not_found");
  const [{ sum }] = await tx
    .select({
      sum: sql<number>`coalesce(sum(case when ${bankTransactions.direction} = 'in' then ${bankTransactions.amount} else -${bankTransactions.amount} end), 0)::numeric`,
    })
    .from(bankTransactions)
    .where(eq(bankTransactions.bankAccountId, acc.id));
  const before = round2(Number(acc.openingBalance) + Number(sum));
  const after = round2(p.direction === "in" ? before + amount : before - amount);
  if (after < 0) throw new FinanceError("insufficient_funds");
  const [row] = await tx
    .insert(bankTransactions)
    .values({
      organizationId: p.orgId,
      bankAccountId: acc.id,
      transactionType: p.type,
      referenceType: p.referenceType ?? null,
      referenceId: p.referenceId ?? null,
      direction: p.direction,
      amount,
      balanceAfter: after,
      description: p.description ?? null,
      transactionDate: p.date ?? new Date(),
      createdBy: p.userId,
    })
    .returning();
  await tx.update(bankAccounts).set({ currentBalance: after }).where(eq(bankAccounts.id, acc.id));
  return { row, currency: acc.currency, after };
}

/* ---------------- Customer ledger ---------------- */
export async function ledgerEntry(
  tx: Tx,
  p: {
    orgId: string;
    userId: string;
    customerId: string;
    debit: number;
    credit: number;
    currency: string;
    referenceType: string;
    referenceId: string | null;
    description?: string | null;
    date?: Date;
  },
) {
  let [acct] = await tx
    .select()
    .from(customerAccounts)
    .where(and(eq(customerAccounts.organizationId, p.orgId), eq(customerAccounts.customerId, p.customerId)))
    .for("update");
  if (!acct) {
    [acct] = await tx
      .insert(customerAccounts)
      .values({ organizationId: p.orgId, customerId: p.customerId, currency: p.currency, openingBalance: 0 })
      .returning();
  }
  const [{ sum }] = await tx
    .select({ sum: sql<number>`coalesce(sum(${customerLedger.debit} - ${customerLedger.credit}), 0)::numeric` })
    .from(customerLedger)
    .where(eq(customerLedger.customerId, p.customerId));
  const balance = round2(Number(acct.openingBalance) + Number(sum) + round2(p.debit) - round2(p.credit));
  const [row] = await tx
    .insert(customerLedger)
    .values({
      organizationId: p.orgId,
      customerId: p.customerId,
      referenceType: p.referenceType,
      referenceId: p.referenceId,
      description: p.description ?? null,
      debit: round2(p.debit),
      credit: round2(p.credit),
      balance,
      currency: p.currency,
      transactionDate: p.date ?? new Date(),
      createdBy: p.userId,
    })
    .returning();
  return row;
}

/* ---------------- Unified transaction register ---------------- */
export async function recordTransaction(
  tx: Tx,
  p: {
    orgId: string;
    userId: string;
    type: string;
    direction: "in" | "out" | "transfer";
    amount: number;
    currency: string;
    exchangeRate: number;
    baseCurrency: string;
    referenceType?: string | null;
    referenceId?: string | null;
    customerId?: string | null;
    cashAccountId?: string | null;
    bankAccountId?: string | null;
    journalEntryId?: string | null;
    paymentMethod?: string | null;
    description?: string | null;
    date?: Date;
    isDemo?: boolean;
  },
) {
  const transactionNumber = await nextNumber(tx, p.orgId, "transaction");
  const [row] = await tx
    .insert(transactions)
    .values({
      organizationId: p.orgId,
      transactionNumber,
      transactionType: p.type,
      referenceType: p.referenceType ?? null,
      referenceId: p.referenceId ?? null,
      customerId: p.customerId ?? null,
      cashAccountId: p.cashAccountId ?? null,
      bankAccountId: p.bankAccountId ?? null,
      journalEntryId: p.journalEntryId ?? null,
      paymentMethod: p.paymentMethod ?? null,
      direction: p.direction,
      amount: round2(p.amount),
      currency: p.currency,
      exchangeRate: p.exchangeRate,
      baseAmount: round2(p.amount * p.exchangeRate),
      baseCurrency: p.baseCurrency,
      description: p.description ?? null,
      transactionDate: p.date ?? new Date(),
      createdBy: p.userId,
      isDemo: p.isDemo ?? false,
    })
    .returning();
  return row;
}

export function toDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return isNaN(d.getTime()) ? new Date() : d;
}
