import type { Field } from "./forms";
import { CURRENCIES, EXPENSE_CATEGORIES } from "@/lib/format";

export interface FinanceRefs {
  customers: { id: string; name: string; code: string }[];
  services?: { id: string; name: string; price: number; taxTypeId: string | null }[];
  cases?: { id: string; caseNumber: string; label: string }[];
  cashAccounts: { id: string; name: string }[];
  bankAccounts: { id: string; label: string }[];
  taxTypes: { id: string; name: string; code: string }[];
  expenseAccounts?: { id: string; label: string }[];
  baseCurrency: string;
}

export function incomeFields(t: (k: string) => string, r: FinanceRefs, v?: Record<string, unknown>): Field[] {
  return [
    { name: "customerId", label: t("customer"), type: "select", defaultValue: v?.customerId as string, options: r.customers.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })) },
    { name: "caseId", label: t("case"), type: "select", defaultValue: v?.caseId as string, options: (r.cases ?? []).map((k) => ({ value: k.id, label: k.label })), help: "دوسیه / پرونده مربوطه (اختیاری)" },
    { name: "serviceId", label: t("service"), type: "select", defaultValue: v?.serviceId as string, options: (r.services ?? []).map((s) => ({ value: s.id, label: `${s.name} (${s.price})` })) },
    { name: "incomeDate", label: t("incomeDate"), type: "date", required: true, defaultValue: v?.incomeDate as string },
    { name: "amount", label: t("amount"), type: "number", required: true, defaultValue: (v?.amount as number) ?? "" },
    { name: "currency", label: t("currency"), type: "select", required: true, defaultValue: (v?.currency as string) ?? r.baseCurrency, options: CURRENCIES.map((c) => ({ value: c, label: c })) },
    { name: "taxTypeId", label: t("taxType"), type: "select", defaultValue: v?.taxTypeId as string, options: r.taxTypes.map((x) => ({ value: x.id, label: `${x.name} (${x.code})` })), help: t("taxRate") + ": auto" },
    { name: "paymentMethod", label: t("paymentMethod"), type: "select", required: true, defaultValue: (v?.paymentMethod as string) ?? "cash", options: [{ value: "cash", label: t("cash") }, { value: "bank", label: t("bank") }, { value: "credit", label: t("credit") }] },
    { name: "cashAccountId", label: t("cashAccount"), type: "select", required: true, defaultValue: (v?.cashAccountId as string) ?? r.cashAccounts[0]?.id, options: r.cashAccounts.map((c) => ({ value: c.id, label: c.name })), showIf: { field: "paymentMethod", values: ["cash"] } },
    { name: "bankAccountId", label: t("bankAccount"), type: "select", required: true, defaultValue: (v?.bankAccountId as string) ?? r.bankAccounts[0]?.id, options: r.bankAccounts.map((b) => ({ value: b.id, label: b.label })), showIf: { field: "paymentMethod", values: ["bank"] } },
    { name: "description", label: t("description"), type: "textarea", defaultValue: v?.description as string },
  ];
}

export function expenseFields(t: (k: string) => string, r: FinanceRefs, v?: Record<string, unknown>): Field[] {
  return [
    { name: "category", label: t("category"), type: "select", required: true, defaultValue: (v?.category as string) ?? "administrative", options: EXPENSE_CATEGORIES.map((c) => ({ value: c, label: t(c) })) },
    { name: "caseId", label: t("case"), type: "select", defaultValue: v?.caseId as string, options: (r.cases ?? []).map((k) => ({ value: k.id, label: k.label })), help: "دوسیه / پرونده مربوط به مصرف (اختیاری)" },
    { name: "accountId", label: t("expenseAccount"), type: "select", defaultValue: v?.accountId as string, options: (r.expenseAccounts ?? []).map((a) => ({ value: a.id, label: a.label })) },
    { name: "expenseDate", label: t("expenseDate"), type: "date", required: true, defaultValue: v?.expenseDate as string },
    { name: "amount", label: t("amount"), type: "number", required: true, defaultValue: (v?.amount as number) ?? "" },
    { name: "currency", label: t("currency"), type: "select", required: true, defaultValue: (v?.currency as string) ?? r.baseCurrency, options: CURRENCIES.map((c) => ({ value: c, label: c })) },
    { name: "taxTypeId", label: t("taxType"), type: "select", defaultValue: v?.taxTypeId as string, options: r.taxTypes.map((x) => ({ value: x.id, label: `${x.name} (${x.code})` })) },
    { name: "paymentMethod", label: t("paymentMethod"), type: "select", required: true, defaultValue: (v?.paymentMethod as string) ?? "cash", options: [{ value: "cash", label: t("cash") }, { value: "bank", label: t("bank") }, { value: "credit", label: t("credit") }] },
    { name: "cashAccountId", label: t("cashAccount"), type: "select", required: true, defaultValue: (v?.cashAccountId as string) ?? r.cashAccounts[0]?.id, options: r.cashAccounts.map((c) => ({ value: c.id, label: c.name })), showIf: { field: "paymentMethod", values: ["cash"] } },
    { name: "bankAccountId", label: t("bankAccount"), type: "select", required: true, defaultValue: (v?.bankAccountId as string) ?? r.bankAccounts[0]?.id, options: r.bankAccounts.map((b) => ({ value: b.id, label: b.label })), showIf: { field: "paymentMethod", values: ["bank"] } },
    { name: "description", label: t("description"), type: "textarea", defaultValue: v?.description as string },
  ];
}
