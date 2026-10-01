import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, bankAccounts, cases, cashAccounts, customers, services, taxTypes } from "@/db/schema";
import type { FinanceRefs } from "@/components/finance-forms";

/** Reference data for finance forms, always scoped to the active organization. */
export async function loadFinanceRefs(orgId: string, baseCurrency: string): Promise<FinanceRefs> {
  const [c, s, ca, ba, tt, ea, kases] = await Promise.all([
    db.select({ id: customers.id, name: customers.name, code: customers.customerCode }).from(customers).where(and(eq(customers.organizationId, orgId), eq(customers.status, "active"))).orderBy(customers.name),
    db.select({ id: services.id, name: services.name, price: services.defaultPrice, taxTypeId: services.taxTypeId }).from(services).where(and(eq(services.organizationId, orgId), eq(services.status, "active"))).orderBy(services.name),
    db.select({ id: cashAccounts.id, name: cashAccounts.name }).from(cashAccounts).where(and(eq(cashAccounts.organizationId, orgId), eq(cashAccounts.isActive, true))),
    db.select({ id: bankAccounts.id, bankName: bankAccounts.bankName, accountNumber: bankAccounts.accountNumber }).from(bankAccounts).where(and(eq(bankAccounts.organizationId, orgId), eq(bankAccounts.isActive, true))),
    db.select({ id: taxTypes.id, name: taxTypes.name, code: taxTypes.code }).from(taxTypes).where(eq(taxTypes.organizationId, orgId)),
    db.select({ id: accounts.id, code: accounts.accountCode, name: accounts.accountName }).from(accounts).where(and(eq(accounts.organizationId, orgId), eq(accounts.accountType, "expense"), eq(accounts.isActive, true))).orderBy(accounts.accountCode),
    db.select({ id: cases.id, caseNumber: cases.caseNumber, customerId: cases.customerId, customerName: customers.name }).from(cases).innerJoin(customers, eq(cases.customerId, customers.id)).where(eq(cases.organizationId, orgId)).orderBy(desc(cases.createdAt)).limit(300),
  ]);
  return {
    customers: c,
    services: s.map((x) => ({ ...x, price: Number(x.price) })),
    cases: kases.map((k) => ({ id: k.id, caseNumber: k.caseNumber, label: `${k.caseNumber} — ${k.customerName}` })),
    cashAccounts: ca,
    bankAccounts: ba.map((b) => ({ id: b.id, label: `${b.bankName} — ${b.accountNumber}` })),
    taxTypes: tt,
    expenseAccounts: ea.filter((a) => a.code !== "5000").map((a) => ({ id: a.id, label: `${a.code} ${a.name}` })),
    baseCurrency,
  };
}
