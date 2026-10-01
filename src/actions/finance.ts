"use server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, bankAccounts, cashAccounts, cases, customerAccounts, expenses, incomes, journalEntries, journalEntryLines, serviceFeeReceipts, taxRates, taxTypes } from "@/db/schema";
import { requireContext, type AppContext } from "@/lib/auth";
import { audit, createJournal, FinanceError, getActiveTaxRate, getExchangeRate, nextNumber, type Tx } from "@/lib/finance";
import { num, optStr, round2, str } from "@/lib/format";
import { bankOperation, cashOperation, finalizeExpense, finalizeIncome, openingBalanceEntry, postJournalEntry, receiveCustomerPayment, reverseJournalEntry, transferFunds, type Actor } from "@/lib/workflows";
import { todayIso } from "@/lib/jalali";
import { act } from "./util";

const actor = (ctx: AppContext, approvePerm: "income.approve" | "expenses.approve"): Actor => ({
  orgId: ctx.org.id,
  userId: ctx.user.id,
  baseCurrency: ctx.org.currency,
  canApprove: ctx.can(approvePerm),
});

async function computeAmounts(tx: Tx, ctx: AppContext, fd: FormData, dateField: string) {
  const amount = round2(num(fd.get("amount")));
  const currency = str(fd.get("currency")) || ctx.org.currency;
  const date = str(fd.get(dateField)) || todayIso();
  const taxTypeId = optStr(fd.get("taxTypeId"));
  if (amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new FinanceError("invalid_amount");
  // Tax rate is always resolved from active configuration valid on the transaction date, never hard-coded.
  const verifiedRate = await getActiveTaxRate(tx, ctx.org.id, taxTypeId, date);
  if (taxTypeId && verifiedRate === null) throw new FinanceError("legal_review_required");
  const taxRate = verifiedRate ?? 0;
  const taxAmount = round2((amount * taxRate) / 100);
  const totalAmount = round2(amount + taxAmount);
  const exchangeRate = await getExchangeRate(tx, ctx.org.id, currency, ctx.org.currency, date);
  return { amount, currency, date, taxTypeId, taxRate, taxAmount, totalAmount, exchangeRate, baseAmount: round2(totalAmount * exchangeRate), baseCurrency: ctx.org.currency };
}

/* ---------------- Income ---------------- */
export async function saveIncome(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("income.write");
    const id = optStr(fd.get("id"));
    const paymentMethod = str(fd.get("paymentMethod")) || "cash";
    let customerId = optStr(fd.get("customerId"));
    const caseId = optStr(fd.get("caseId"));
    return db.transaction(async (tx) => {
      if (caseId) {
        const [k] = await tx.select({ customerId: cases.customerId }).from(cases).where(and(eq(cases.id, caseId), eq(cases.organizationId, ctx.org.id)));
        if (k && !customerId) customerId = k.customerId;
      }
      if (paymentMethod === "credit" && !customerId) throw new FinanceError("customer_required");
      const c = await computeAmounts(tx, ctx, fd, "incomeDate");
      const data = {
        customerId,
        serviceId: optStr(fd.get("serviceId")),
        caseId,
        description: optStr(fd.get("description")),
        amount: c.amount, taxTypeId: c.taxTypeId, taxRate: c.taxRate, taxAmount: c.taxAmount, totalAmount: c.totalAmount,
        currency: c.currency, exchangeRate: c.exchangeRate, baseAmount: c.baseAmount, baseCurrency: c.baseCurrency,
        paymentMethod,
        cashAccountId: paymentMethod === "cash" ? optStr(fd.get("cashAccountId")) : null,
        bankAccountId: paymentMethod === "bank" ? optStr(fd.get("bankAccountId")) : null,
        incomeDate: c.date,
      };
      if (paymentMethod === "cash" && !data.cashAccountId) throw new FinanceError("cash_account_required");
      if (paymentMethod === "bank" && !data.bankAccountId) throw new FinanceError("bank_account_required");
      let incomeId = id;
      if (id) {
        const [old] = await tx.select().from(incomes).where(and(eq(incomes.id, id), eq(incomes.organizationId, ctx.org.id)));
        if (!old) throw new FinanceError("not_found");
        if (old.status === "finalized") throw new FinanceError("cannot_edit_final");
        await tx.update(incomes).set({ ...data, status: "draft" }).where(eq(incomes.id, id));
        await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "UPDATE", entityType: "income", entityId: id, oldData: old, newData: data });
      } else {
        const [row] = await tx.insert(incomes).values({ ...data, organizationId: ctx.org.id, incomeNumber: await nextNumber(tx, ctx.org.id, "income"), status: "draft", createdBy: ctx.user.id, isDemo: ctx.org.isDemo }).returning();
        incomeId = row.id;
        await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "income", entityId: row.id, newData: row });
      }
      if (fd.get("finalize") === "1") {
        if (!ctx.can("income.finalize")) throw new FinanceError("forbidden_finalize");
        await finalizeIncome(tx, actor(ctx, "income.approve"), incomeId!);
      }
      return { id: incomeId! };
    });
  });
}

export async function finalizeIncomeAction(id: string) {
  return act(async () => {
    const ctx = await requireContext("income.finalize");
    const r = await db.transaction((tx) => finalizeIncome(tx, actor(ctx, "income.approve"), id));
    return { ok: true, message: r.status };
  });
}

export async function approveIncomeAction(id: string) {
  return act(async () => {
    const ctx = await requireContext("income.approve");
    await db.transaction(async (tx) => {
      const [inc] = await tx.select().from(incomes).where(and(eq(incomes.id, id), eq(incomes.organizationId, ctx.org.id)));
      if (!inc || inc.status !== "pending_approval") throw new FinanceError("invalid_transition");
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "APPROVE", entityType: "income", entityId: id, oldData: { status: inc.status }, newData: { status: "approved" } });
      await finalizeIncome(tx, actor(ctx, "income.approve"), id, { skipApprovalCheck: true });
    });
  });
}

export async function rejectIncomeAction(id: string, reason?: string | null) {
  return act(async () => {
    const ctx = await requireContext("income.approve");
    await db.transaction(async (tx) => {
      const [inc] = await tx.select().from(incomes).where(and(eq(incomes.id, id), eq(incomes.organizationId, ctx.org.id)));
      if (!inc || inc.status !== "pending_approval") throw new FinanceError("invalid_transition");
      await tx.update(incomes).set({ status: "rejected" }).where(eq(incomes.id, id));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "REJECT", entityType: "income", entityId: id, oldData: { status: inc.status }, newData: { status: "rejected", reason } });
    });
  });
}

export async function deleteIncome(id: string) {
  return act(async () => {
    const ctx = await requireContext("income.delete");
    await db.transaction(async (tx) => {
      const [inc] = await tx.select().from(incomes).where(and(eq(incomes.id, id), eq(incomes.organizationId, ctx.org.id)));
      if (!inc) throw new FinanceError("not_found");
      if (inc.status === "finalized") throw new FinanceError("cannot_edit_final");
      await tx.delete(incomes).where(eq(incomes.id, id));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "DELETE", entityType: "income", entityId: id, oldData: inc });
    });
  });
}

/* ---------------- Expenses ---------------- */
export async function saveExpense(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("expenses.write");
    const id = optStr(fd.get("id"));
    const paymentMethod = str(fd.get("paymentMethod")) || "cash";
    return db.transaction(async (tx) => {
      const c = await computeAmounts(tx, ctx, fd, "expenseDate");
      const accountId = optStr(fd.get("accountId"));
      if (accountId) {
        const [acc] = await tx.select().from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.organizationId, ctx.org.id), eq(accounts.accountType, "expense")));
        if (!acc) throw new FinanceError("invalid_input");
      }
      const caseId = optStr(fd.get("caseId"));
      const data = {
        category: str(fd.get("category")) || "administrative",
        accountId,
        caseId,
        description: optStr(fd.get("description")),
        amount: c.amount, taxTypeId: c.taxTypeId, taxRate: c.taxRate, taxAmount: c.taxAmount, totalAmount: c.totalAmount,
        currency: c.currency, exchangeRate: c.exchangeRate, baseAmount: c.baseAmount, baseCurrency: c.baseCurrency,
        paymentMethod,
        cashAccountId: paymentMethod === "cash" ? optStr(fd.get("cashAccountId")) : null,
        bankAccountId: paymentMethod === "bank" ? optStr(fd.get("bankAccountId")) : null,
        expenseDate: c.date,
      };
      if (paymentMethod === "cash" && !data.cashAccountId) throw new FinanceError("cash_account_required");
      if (paymentMethod === "bank" && !data.bankAccountId) throw new FinanceError("bank_account_required");
      let expenseId = id;
      if (id) {
        const [old] = await tx.select().from(expenses).where(and(eq(expenses.id, id), eq(expenses.organizationId, ctx.org.id)));
        if (!old) throw new FinanceError("not_found");
        if (old.status === "finalized") throw new FinanceError("cannot_edit_final");
        await tx.update(expenses).set({ ...data, status: "draft" }).where(eq(expenses.id, id));
        await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "UPDATE", entityType: "expense", entityId: id, oldData: old, newData: data });
      } else {
        const [row] = await tx.insert(expenses).values({ ...data, organizationId: ctx.org.id, expenseNumber: await nextNumber(tx, ctx.org.id, "expense"), status: "draft", createdBy: ctx.user.id, isDemo: ctx.org.isDemo }).returning();
        expenseId = row.id;
        await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "expense", entityId: row.id, newData: row });
      }
      if (fd.get("finalize") === "1") {
        if (!ctx.can("expenses.finalize")) throw new FinanceError("forbidden_finalize");
        await finalizeExpense(tx, actor(ctx, "expenses.approve"), expenseId!);
      }
      return { id: expenseId! };
    });
  });
}

export async function finalizeExpenseAction(id: string) {
  return act(async () => {
    const ctx = await requireContext("expenses.finalize");
    const r = await db.transaction((tx) => finalizeExpense(tx, actor(ctx, "expenses.approve"), id));
    return { ok: true, message: r.status };
  });
}

export async function approveExpenseAction(id: string) {
  return act(async () => {
    const ctx = await requireContext("expenses.approve");
    await db.transaction(async (tx) => {
      const [exp] = await tx.select().from(expenses).where(and(eq(expenses.id, id), eq(expenses.organizationId, ctx.org.id)));
      if (!exp || exp.status !== "pending_approval") throw new FinanceError("invalid_transition");
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "APPROVE", entityType: "expense", entityId: id, oldData: { status: exp.status }, newData: { status: "approved" } });
      await finalizeExpense(tx, actor(ctx, "expenses.approve"), id, { skipApprovalCheck: true });
    });
  });
}

export async function rejectExpenseAction(id: string, reason?: string | null) {
  return act(async () => {
    const ctx = await requireContext("expenses.approve");
    await db.transaction(async (tx) => {
      const [exp] = await tx.select().from(expenses).where(and(eq(expenses.id, id), eq(expenses.organizationId, ctx.org.id)));
      if (!exp || exp.status !== "pending_approval") throw new FinanceError("invalid_transition");
      await tx.update(expenses).set({ status: "rejected" }).where(eq(expenses.id, id));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "REJECT", entityType: "expense", entityId: id, oldData: { status: exp.status }, newData: { status: "rejected", reason } });
    });
  });
}

export async function deleteExpense(id: string) {
  return act(async () => {
    const ctx = await requireContext("expenses.delete");
    await db.transaction(async (tx) => {
      const [exp] = await tx.select().from(expenses).where(and(eq(expenses.id, id), eq(expenses.organizationId, ctx.org.id)));
      if (!exp) throw new FinanceError("not_found");
      if (exp.status === "finalized") throw new FinanceError("cannot_edit_final");
      await tx.delete(expenses).where(eq(expenses.id, id));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "DELETE", entityType: "expense", entityId: id, oldData: exp });
    });
  });
}

/* ---------------- Cash ---------------- */
export async function saveCashAccount(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("cash.write");
    const id = optStr(fd.get("id"));
    const name = str(fd.get("name"));
    if (!name) throw new FinanceError("invalid_input");
    return db.transaction(async (tx) => {
      if (id) {
        const [old] = await tx.select().from(cashAccounts).where(and(eq(cashAccounts.id, id), eq(cashAccounts.organizationId, ctx.org.id)));
        if (!old) throw new FinanceError("not_found");
        // opening/current balance are never editable here – balances derive from transactions only.
        await tx.update(cashAccounts).set({ name, isActive: fd.get("isActive") !== "false" }).where(eq(cashAccounts.id, id));
        await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "UPDATE", entityType: "cash_account", entityId: id, oldData: old, newData: { name } });
        return { id };
      }
      const opening = round2(num(fd.get("openingBalance")));
      if (opening < 0) throw new FinanceError("invalid_amount");
      const [row] = await tx.insert(cashAccounts).values({ organizationId: ctx.org.id, name, currency: ctx.org.currency, openingBalance: opening, currentBalance: opening, isDemo: ctx.org.isDemo }).returning();
      await openingBalanceEntry(tx, actor(ctx, "income.approve"), { kind: "cash", amount: opening, date: todayIso(), description: `Opening balance: ${name}`, isDemo: ctx.org.isDemo });
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "cash_account", entityId: row.id, newData: row });
      return { id: row.id };
    });
  });
}

export async function cashOperationAction(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("cash.write");
    const direction = str(fd.get("direction")) === "out" ? "out" : "in";
    const r = await db.transaction((tx) =>
      cashOperation(tx, actor(ctx, "income.approve"), { cashAccountId: str(fd.get("cashAccountId")), direction, amount: num(fd.get("amount")), date: str(fd.get("date")) || todayIso(), description: optStr(fd.get("description")), isDemo: ctx.org.isDemo }),
    );
    return { id: r.id };
  });
}

/* ---------------- Bank ---------------- */
export async function saveBankAccount(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("bank.write");
    const id = optStr(fd.get("id"));
    const data = { bankName: str(fd.get("bankName")), accountName: str(fd.get("accountName")), accountNumber: str(fd.get("accountNumber")) };
    if (!data.bankName || !data.accountName || !data.accountNumber) throw new FinanceError("invalid_input");
    return db.transaction(async (tx) => {
      if (id) {
        const [old] = await tx.select().from(bankAccounts).where(and(eq(bankAccounts.id, id), eq(bankAccounts.organizationId, ctx.org.id)));
        if (!old) throw new FinanceError("not_found");
        await tx.update(bankAccounts).set({ ...data, isActive: fd.get("isActive") !== "false" }).where(eq(bankAccounts.id, id));
        await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "UPDATE", entityType: "bank_account", entityId: id, oldData: old, newData: data });
        return { id };
      }
      const opening = round2(num(fd.get("openingBalance")));
      if (opening < 0) throw new FinanceError("invalid_amount");
      const [row] = await tx.insert(bankAccounts).values({ ...data, organizationId: ctx.org.id, currency: ctx.org.currency, openingBalance: opening, currentBalance: opening, isDemo: ctx.org.isDemo }).returning();
      await openingBalanceEntry(tx, actor(ctx, "income.approve"), { kind: "bank", amount: opening, date: todayIso(), description: `Opening balance: ${data.bankName} ${data.accountNumber}`, isDemo: ctx.org.isDemo });
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "bank_account", entityId: row.id, newData: row });
      return { id: row.id };
    });
  });
}

export async function bankOperationAction(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("bank.write");
    const kind = str(fd.get("kind"));
    if (!["deposit", "withdrawal", "bank_fee"].includes(kind)) throw new FinanceError("invalid_input");
    const r = await db.transaction((tx) =>
      bankOperation(tx, actor(ctx, "income.approve"), { bankAccountId: str(fd.get("bankAccountId")), kind: kind as "deposit", amount: num(fd.get("amount")), date: str(fd.get("date")) || todayIso(), description: optStr(fd.get("description")), isDemo: ctx.org.isDemo }),
    );
    return { id: r.id };
  });
}

export async function transferAction(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("bank.transfer");
    const [fromType, fromId] = str(fd.get("from")).split(":");
    const [toType, toId] = str(fd.get("to")).split(":");
    if (!["cash", "bank"].includes(fromType) || !["cash", "bank"].includes(toType) || !fromId || !toId) throw new FinanceError("invalid_input");
    const r = await db.transaction((tx) =>
      transferFunds(tx, actor(ctx, "income.approve"), { fromType: fromType as "cash", fromId, toType: toType as "cash", toId, amount: num(fd.get("amount")), date: str(fd.get("date")) || todayIso(), description: optStr(fd.get("description")), isDemo: ctx.org.isDemo }),
    );
    return { id: r.id };
  });
}

/* ---------------- Customer payments / accounts ---------------- */
export async function receivePaymentAction(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("customer_accounts.write");
    const [method, accountId] = str(fd.get("account")).split(":");
    if (!["cash", "bank"].includes(method) || !accountId) throw new FinanceError("invalid_input");
    const r = await db.transaction((tx) =>
      receiveCustomerPayment(tx, actor(ctx, "income.approve"), { customerId: str(fd.get("customerId")), amount: num(fd.get("amount")), method: method as "cash", accountId, date: str(fd.get("date")) || todayIso(), description: optStr(fd.get("description")), isDemo: ctx.org.isDemo }),
    );
    return { id: r.id };
  });
}

export async function receiveCaseFee(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("cases.write");
    if (!ctx.can("customer_accounts.write")) throw new FinanceError("forbidden");
    const caseId = str(fd.get("caseId"));
    const amount = round2(num(fd.get("amount")));
    const [method, accountId] = str(fd.get("account")).split(":");
    const date = str(fd.get("date")) || todayIso();
    if (amount <= 0 || !["cash", "bank"].includes(method) || !accountId) throw new FinanceError("invalid_input");
    return db.transaction(async (tx) => {
      const [c] = await tx.select().from(cases).where(and(eq(cases.id, caseId), eq(cases.organizationId, ctx.org.id))).for("update");
      if (!c) throw new FinanceError("not_found");
      const feeTotal = round2(Number(c.serviceFee) - Number(c.discountAmount));
      if (feeTotal <= 0) throw new FinanceError("invalid_amount");
      const [{ paid }] = await tx.select({ paid: sql<number>`coalesce(sum(${serviceFeeReceipts.paidAmount}),0)::numeric` }).from(serviceFeeReceipts).where(and(eq(serviceFeeReceipts.organizationId, ctx.org.id), eq(serviceFeeReceipts.caseId, caseId)));
      const outstanding = round2(feeTotal - Number(paid));
      if (amount > outstanding) throw new FinanceError("amount_exceeds_due");

      if (c.feeStatus === "unbilled") {
        const [invoice] = await tx.insert(incomes).values({
          organizationId: ctx.org.id,
          incomeNumber: await nextNumber(tx, ctx.org.id, "income"),
          customerId: c.customerId,
          serviceId: c.serviceId,
          caseId: c.id,
          description: `Service fee ${c.caseNumber}`,
          amount: feeTotal,
          taxTypeId: null,
          taxRate: 0,
          taxAmount: 0,
          totalAmount: feeTotal,
          currency: c.feeCurrency,
          exchangeRate: 1,
          baseAmount: feeTotal,
          baseCurrency: ctx.org.currency,
          paymentMethod: "credit",
          incomeDate: date,
          status: "draft",
          createdBy: ctx.user.id,
          isDemo: c.isDemo,
        }).returning();
        const finalized = await finalizeIncome(tx, actor(ctx, "income.approve"), invoice.id);
        if (finalized.status !== "finalized") throw new FinanceError("approval_required");
        await tx.update(cases).set({ feeStatus: "issued", updatedAt: new Date() }).where(eq(cases.id, caseId));
      }

      const trx = await receiveCustomerPayment(tx, actor(ctx, "income.approve"), {
        customerId: c.customerId,
        amount,
        method: method as "cash" | "bank",
        accountId,
        date,
        description: optStr(fd.get("description")) ?? `Service fee payment for ${c.caseNumber}`,
        isDemo: c.isDemo,
      });
      const receiptNumber = await nextNumber(tx, ctx.org.id, "receipt");
      const [receipt] = await tx.insert(serviceFeeReceipts).values({
        organizationId: ctx.org.id,
        receiptNumber,
        caseId: c.id,
        customerId: c.customerId,
        transactionId: trx.id,
        feeTotalSnapshot: feeTotal,
        paidAmount: amount,
        currency: c.feeCurrency,
        paymentMethod: method,
        description: optStr(fd.get("description")) ?? null,
        issuedBy: ctx.user.id,
        isDemo: c.isDemo,
      }).returning();
      const newPaid = round2(Number(paid) + amount);
      await tx.update(cases).set({ feeStatus: newPaid >= feeTotal ? "paid" : "part_paid", updatedAt: new Date() }).where(eq(cases.id, caseId));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "service_fee_receipt", entityId: receipt.id, newData: { receiptNumber, caseId, amount, feeTotal, newPaid, outstanding: round2(feeTotal - newPaid) } });
      return { id: receipt.id };
    });
  });
}

export async function setCustomerOpeningBalance(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("customer_accounts.write");
    const customerId = str(fd.get("customerId"));
    const opening = round2(num(fd.get("openingBalance")));
    await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(customerAccounts).where(and(eq(customerAccounts.organizationId, ctx.org.id), eq(customerAccounts.customerId, customerId)));
      const delta = round2(opening - Number(existing?.openingBalance ?? 0));
      if (existing) await tx.update(customerAccounts).set({ openingBalance: opening }).where(eq(customerAccounts.id, existing.id));
      else await tx.insert(customerAccounts).values({ organizationId: ctx.org.id, customerId, currency: ctx.org.currency, openingBalance: opening });
      await openingBalanceEntry(tx, actor(ctx, "income.approve"), { kind: "ar", amount: delta, date: todayIso(), description: `Customer opening balance adjustment`, isDemo: ctx.org.isDemo });
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "UPDATE", entityType: "customer_account", entityId: customerId, oldData: existing ?? null, newData: { openingBalance: opening } });
    });
  });
}

/* ---------------- Chart of accounts ---------------- */
export async function saveAccount(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("accounting.write");
    const id = optStr(fd.get("id"));
    const data = {
      accountCode: str(fd.get("accountCode")),
      accountName: str(fd.get("accountName")),
      accountType: str(fd.get("accountType")),
      parentId: optStr(fd.get("parentId")),
      isActive: fd.get("isActive") !== "false",
    };
    if (!data.accountCode || !data.accountName || !["asset", "liability", "equity", "income", "expense"].includes(data.accountType)) throw new FinanceError("invalid_input");
    return db.transaction(async (tx) => {
      if (id) {
        const [old] = await tx.select().from(accounts).where(and(eq(accounts.id, id), eq(accounts.organizationId, ctx.org.id)));
        if (!old) throw new FinanceError("not_found");
        await tx.update(accounts).set(data).where(eq(accounts.id, id));
        await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "UPDATE", entityType: "account", entityId: id, oldData: old, newData: data });
        return { id };
      }
      const [row] = await tx.insert(accounts).values({ ...data, organizationId: ctx.org.id, currency: ctx.org.currency }).returning();
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "account", entityId: row.id, newData: row });
      return { id: row.id };
    });
  });
}

/* ---------------- Journal entries ---------------- */
export async function saveJournalEntry(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("accounting.write");
    const lines: { accountId: string; debit: number; credit: number; description: string | null }[] = [];
    const accountIds = fd.getAll("line_account");
    const debits = fd.getAll("line_debit");
    const credits = fd.getAll("line_credit");
    const descs = fd.getAll("line_desc");
    for (let i = 0; i < accountIds.length; i++) {
      const accountId = str(accountIds[i]);
      if (!accountId) continue;
      lines.push({ accountId, debit: round2(num(debits[i])), credit: round2(num(credits[i])), description: optStr(descs[i]) });
    }
    const entryDate = str(fd.get("entryDate")) || todayIso();
    const description = optStr(fd.get("description"));
    const post = fd.get("post") === "1";
    if (post && !ctx.can("accounting.post")) throw new FinanceError("forbidden_post");
    const id = optStr(fd.get("id"));
    return db.transaction(async (tx) => {
      for (const l of lines) {
        const [acc] = await tx.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.id, l.accountId), eq(accounts.organizationId, ctx.org.id)));
        if (!acc) throw new FinanceError("invalid_input");
      }
      if (id) {
        const [old] = await tx.select().from(journalEntries).where(and(eq(journalEntries.id, id), eq(journalEntries.organizationId, ctx.org.id))).for("update");
        if (!old) throw new FinanceError("not_found");
        if (old.status !== "draft") throw new FinanceError("cannot_edit_posted");
        await tx.delete(journalEntryLines).where(eq(journalEntryLines.journalEntryId, id));
        await tx.insert(journalEntryLines).values(lines.map((l) => ({ ...l, organizationId: ctx.org.id, journalEntryId: id, currency: ctx.org.currency })));
        await tx.update(journalEntries).set({ entryDate, description }).where(eq(journalEntries.id, id));
        await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "UPDATE", entityType: "journal_entry", entityId: id, oldData: old, newData: { entryDate, description, lines } });
        if (post) await postJournalEntry(tx, actor(ctx, "income.approve"), id);
        return { id };
      }
      const entry = await createJournal(tx, { orgId: ctx.org.id, userId: ctx.user.id, entryDate, referenceType: "manual", description, lines, post, currency: ctx.org.currency, isDemo: ctx.org.isDemo });
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: post ? "POST" : "CREATE", entityType: "journal_entry", entityId: entry.id, newData: { entryDate, description, lines, status: entry.status } });
      return { id: entry.id };
    });
  });
}

export async function postJournalAction(id: string) {
  return act(async () => {
    const ctx = await requireContext("accounting.post");
    await db.transaction((tx) => postJournalEntry(tx, actor(ctx, "income.approve"), id));
  });
}

export async function reverseJournalAction(id: string, reason?: string | null) {
  return act(async () => {
    const ctx = await requireContext("accounting.reverse");
    await db.transaction((tx) => reverseJournalEntry(tx, actor(ctx, "income.approve"), id, reason ?? null, todayIso()));
  });
}

export async function deleteJournalAction(id: string) {
  return act(async () => {
    const ctx = await requireContext("accounting.write");
    await db.transaction(async (tx) => {
      const [old] = await tx.select().from(journalEntries).where(and(eq(journalEntries.id, id), eq(journalEntries.organizationId, ctx.org.id)));
      if (!old) throw new FinanceError("not_found");
      if (old.status !== "draft") throw new FinanceError("cannot_edit_posted");
      await tx.delete(journalEntries).where(eq(journalEntries.id, id));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "DELETE", entityType: "journal_entry", entityId: id, oldData: old });
    });
  });
}

/* ---------------- Taxes ---------------- */
export async function saveTaxType(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("taxes.write");
    const id = optStr(fd.get("id"));
    const data = { name: str(fd.get("name")), code: str(fd.get("code")).toUpperCase(), description: optStr(fd.get("description")) };
    if (!data.name || !data.code) throw new FinanceError("invalid_input");
    return db.transaction(async (tx) => {
      if (id) {
        const [old] = await tx.select().from(taxTypes).where(and(eq(taxTypes.id, id), eq(taxTypes.organizationId, ctx.org.id)));
        if (!old) throw new FinanceError("not_found");
        await tx.update(taxTypes).set(data).where(eq(taxTypes.id, id));
        await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "UPDATE", entityType: "tax_type", entityId: id, oldData: old, newData: data });
        return { id };
      }
      const [row] = await tx.insert(taxTypes).values({ ...data, organizationId: ctx.org.id }).returning();
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "tax_type", entityId: row.id, newData: row });
      return { id: row.id };
    });
  });
}

export async function saveTaxRate(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("taxes.write");
    const taxTypeId = str(fd.get("taxTypeId"));
    const rateVal = num(fd.get("rate"));
    const effectiveFrom = str(fd.get("effectiveFrom")) || todayIso();
    if (rateVal < 0 || rateVal > 100 || !taxTypeId) throw new FinanceError("invalid_input");
    return db.transaction(async (tx) => {
      const [tt] = await tx.select().from(taxTypes).where(and(eq(taxTypes.id, taxTypeId), eq(taxTypes.organizationId, ctx.org.id)));
      if (!tt) throw new FinanceError("not_found");
      // Close previous open-ended rates so history is preserved and only the new rate applies going forward.
      const prevDay = new Date(effectiveFrom + "T12:00:00");
      prevDay.setDate(prevDay.getDate() - 1);
      const prevIso = prevDay.toISOString().slice(0, 10);
      const open = await tx.select().from(taxRates).where(and(eq(taxRates.taxTypeId, taxTypeId), eq(taxRates.isActive, true)));
      for (const o of open) {
        if (!o.effectiveTo || o.effectiveTo >= effectiveFrom) {
          if (o.effectiveFrom >= effectiveFrom) await tx.update(taxRates).set({ isActive: false }).where(eq(taxRates.id, o.id));
          else await tx.update(taxRates).set({ effectiveTo: prevIso }).where(eq(taxRates.id, o.id));
        }
      }
      const [row] = await tx.insert(taxRates).values({ organizationId: ctx.org.id, taxTypeId, rate: rateVal, effectiveFrom, effectiveTo: optStr(fd.get("effectiveTo")), isActive: true }).returning();
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "tax_rate", entityId: row.id, newData: row });
      return { id: row.id };
    });
  });
}

export async function deleteTaxType(id: string) {
  return act(async () => {
    const ctx = await requireContext("taxes.write");
    await db.transaction(async (tx) => {
      const [old] = await tx.select().from(taxTypes).where(and(eq(taxTypes.id, id), eq(taxTypes.organizationId, ctx.org.id)));
      if (!old) throw new FinanceError("not_found");
      await tx.delete(taxTypes).where(eq(taxTypes.id, id));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "DELETE", entityType: "tax_type", entityId: id, oldData: old });
    });
  });
}
