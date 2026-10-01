import Link from "next/link";
import type { Metadata } from "next";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { bankAccounts, cashAccounts, contracts, expenses, incomes, journalEntries, transactions } from "@/db/schema";
import { pageContext } from "@/lib/page";
import { customerBalances } from "@/lib/reports";
import { round2 } from "@/lib/format";
import { Card, Money, Stat } from "@/components/ui";

export const metadata: Metadata = { title: "مرکز مالی و حسابداری" };

export default async function FinanceCenterPage() {
  const { ctx, t } = await pageContext();
  const modules = [
    { key: "income", href: "/income", icon: "📈", perm: "income.read", helpKey: "incomeModuleHelp" },
    { key: "expenses", href: "/expenses", icon: "📉", perm: "expenses.read", helpKey: "expenseModuleHelp" },
    { key: "cash", href: "/cash", icon: "💵", perm: "cash.read", helpKey: "cashModuleHelp" },
    { key: "bank", href: "/bank", icon: "🏦", perm: "bank.read", helpKey: "bankModuleHelp" },
    { key: "customerAccounts", href: "/customer-accounts", icon: "🧾", perm: "customer_accounts.read", helpKey: "customerLedgerModuleHelp" },
    { key: "transactions", href: "/transactions", icon: "🔁", perm: "transactions.read", helpKey: "transactionModuleHelp" },
    { key: "contracts", href: "/contracts", icon: "📝", perm: "contracts.read", helpKey: "contractModuleHelp" },
    { key: "accounting", href: "/accounting", icon: "📚", perm: "accounting.read", helpKey: "accountingModuleHelp" },
  ].filter((m) => ctx.can(m.perm as never));
  if (modules.length === 0) return <div className="rounded-xl bg-white p-8 text-center text-red-600">{t("forbidden")}</div>;

  const canIncome = ctx.can("income.read");
  const canExpenses = ctx.can("expenses.read");
  const canCash = ctx.can("cash.read");
  const canBank = ctx.can("bank.read");
  const canTransactions = ctx.can("transactions.read");
  const canContracts = ctx.can("contracts.read");
  const canAccounting = ctx.can("accounting.read");
  const canCustomerAccounts = ctx.can("customer_accounts.read");
  const [inc, exp, cash, bank, txs, contractsCount, journal, balances] = await Promise.all([
    canIncome ? db.select({ total: sql<number>`coalesce(sum(${incomes.baseAmount}) filter (where ${incomes.status}='finalized'),0)::numeric`, pending: sql<number>`count(*) filter (where ${incomes.status}='pending_approval')::int` }).from(incomes).where(eq(incomes.organizationId, ctx.org.id)) : Promise.resolve([{ total: 0, pending: 0 }]),
    canExpenses ? db.select({ total: sql<number>`coalesce(sum(${expenses.baseAmount}) filter (where ${expenses.status}='finalized'),0)::numeric`, pending: sql<number>`count(*) filter (where ${expenses.status}='pending_approval')::int` }).from(expenses).where(eq(expenses.organizationId, ctx.org.id)) : Promise.resolve([{ total: 0, pending: 0 }]),
    canCash ? db.select({ total: sql<number>`coalesce(sum(${cashAccounts.currentBalance}),0)::numeric`, n: sql<number>`count(*)::int` }).from(cashAccounts).where(eq(cashAccounts.organizationId, ctx.org.id)) : Promise.resolve([{ total: 0, n: 0 }]),
    canBank ? db.select({ total: sql<number>`coalesce(sum(${bankAccounts.currentBalance}),0)::numeric`, n: sql<number>`count(*)::int` }).from(bankAccounts).where(eq(bankAccounts.organizationId, ctx.org.id)) : Promise.resolve([{ total: 0, n: 0 }]),
    canTransactions ? db.select({ n: sql<number>`count(*)::int` }).from(transactions).where(eq(transactions.organizationId, ctx.org.id)) : Promise.resolve([{ n: 0 }]),
    canContracts ? db.select({ n: sql<number>`count(*)::int` }).from(contracts).where(eq(contracts.organizationId, ctx.org.id)) : Promise.resolve([{ n: 0 }]),
    canAccounting ? db.select({ total: sql<number>`count(*)::int`, draft: sql<number>`count(*) filter (where ${journalEntries.status}='draft')::int` }).from(journalEntries).where(eq(journalEntries.organizationId, ctx.org.id)) : Promise.resolve([{ total: 0, draft: 0 }]),
    canCustomerAccounts ? customerBalances(ctx.org.id) : Promise.resolve([]),
  ]);
  const cur = ctx.org.currency;
  const income = Number(inc[0]?.total ?? 0);
  const expense = Number(exp[0]?.total ?? 0);
  const receivable = round2(balances.filter((b) => b.balance > 0).reduce((s, b) => s + b.balance, 0));
  const counts: Record<string, number> = { income: Number(inc[0]?.pending ?? 0), expenses: Number(exp[0]?.pending ?? 0), cash: cash[0]?.n ?? 0, bank: bank[0]?.n ?? 0, customerAccounts: balances.length, transactions: txs[0]?.n ?? 0, contracts: contractsCount[0]?.n ?? 0, accounting: journal[0]?.total ?? 0 };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">{t("operationalCenter")}</p><h1 className="mt-1 text-2xl font-bold text-slate-900">{t("financeCenter")}</h1><p className="mt-1 text-sm text-slate-500">{t("financeCenterHelp")}</p></div>
        <div className="flex gap-2">{ctx.can("income.write") && <Link href="/income" className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">+ {t("income")}</Link>}{ctx.can("expenses.write") && <Link href="/expenses" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">+ {t("expenses")}</Link>}</div>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        {canIncome && <Stat label={t("totalIncome")} value={<Money value={income} currency={cur} />} tone="green" />}
        {canExpenses && <Stat label={t("totalExpenses")} value={<Money value={expense} currency={cur} />} tone="red" />}
        {canIncome && canExpenses && <Stat label={t("netProfit")} value={<Money value={income - expense} currency={cur} colored />} tone={income >= expense ? "green" : "red"} />}
        {canCash && <Stat label={t("cashBalance")} value={<Money value={cash[0]?.total ?? 0} currency={cur} />} tone="blue" />}
        {canBank && <Stat label={t("bankBalance")} value={<Money value={bank[0]?.total ?? 0} currency={cur} />} tone="blue" />}
        {canCustomerAccounts && <Stat label={t("receivables")} value={<Money value={receivable} currency={cur} />} tone="amber" />}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {modules.map((m) => (
          <Card key={m.key} className="transition hover:border-emerald-300 hover:shadow-md">
            <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-xl">{m.icon}</span><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><h2 className="font-bold text-slate-800">{t(m.key)}</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold">{counts[m.key]}</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{t(m.helpKey)}</p><Link href={m.href} className="mt-3 inline-flex text-sm font-semibold text-emerald-700 hover:underline">{t("openModule")} →</Link></div></div>
          </Card>
        ))}
      </div>
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-500"><strong className="text-slate-700">{t("accountingRule")}</strong><br />{t("case")} / {t("customer")} → {t("income")} / {t("expenses")} → {t("transactions")} → {t("journalEntries")} → {t("reports")}</div>
    </>
  );
}
