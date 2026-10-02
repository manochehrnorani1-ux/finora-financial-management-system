export const ROLE_KEYS = ["admin", "manager", "accountant", "operator", "viewer"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const PERMISSIONS = [
  "dashboard.read",
  "customers.read", "customers.write", "customers.delete",
  "services.read", "services.write", "services.delete",
  "cases.read", "cases.write", "cases.approve", "cases.delete",
  "documents.read", "documents.write", "documents.approve", "documents.delete",
  "official_forms.read", "official_forms.write", "official_forms.verify",
  "tax_rules.read", "tax_rules.write", "tax_rules.verify",
  "tax_settlements.read", "tax_settlements.write", "tax_settlements.approve",
  "letters.read", "letters.write",
  "compliance.read", "compliance.write",
  "public_site.read", "public_site.manage",
  "contracts.read", "contracts.write", "contracts.delete",
  "income.read", "income.write", "income.finalize", "income.approve", "income.delete",
  "expenses.read", "expenses.write", "expenses.finalize", "expenses.approve", "expenses.delete",
  "transactions.read",
  "accounting.read", "accounting.write", "accounting.post", "accounting.reverse",
  "cash.read", "cash.write",
  "bank.read", "bank.write", "bank.transfer",
  "customer_accounts.read", "customer_accounts.write",
  "taxes.read", "taxes.write",
  "reports.read", "reports.export",
  "users.read", "users.manage",
  "audit.read",
  "backup.manage",
  "settings.read", "settings.manage",
  "demo.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL = [...PERMISSIONS] as Permission[];
const READ_ONLY = ALL.filter((p) => p.endsWith(".read"));

export const ROLE_MATRIX: Record<RoleKey, Permission[]> = {
  admin: ALL,
  manager: [
    "dashboard.read",
    "customers.read", "customers.write", "customers.delete",
    "services.read", "services.write", "services.delete",
    "cases.read", "cases.write", "cases.approve", "cases.delete",
    "documents.read", "documents.write", "documents.approve", "documents.delete",
    "official_forms.read", "official_forms.write",
    "tax_rules.read", "tax_rules.write",
    "tax_settlements.read", "tax_settlements.write", "tax_settlements.approve",
    "letters.read", "letters.write",
    "compliance.read", "compliance.write",
    "public_site.read",
    "contracts.read", "contracts.write", "contracts.delete",
    "income.read", "income.write", "income.finalize", "income.approve",
    "expenses.read", "expenses.write", "expenses.finalize", "expenses.approve",
    "transactions.read",
    "accounting.read", "accounting.write",
    "cash.read", "cash.write",
    "bank.read", "bank.write", "bank.transfer",
    "customer_accounts.read", "customer_accounts.write",
    "taxes.read",
    "reports.read", "reports.export",
    "users.read",
    "audit.read",
    "settings.read",
  ],
  accountant: [
    "dashboard.read",
    "customers.read", "services.read", "cases.read", "documents.read", "official_forms.read", "tax_rules.read", "tax_settlements.read", "tax_settlements.write", "letters.read", "compliance.read", "compliance.write", "contracts.read",
    "income.read", "income.write", "income.finalize",
    "expenses.read", "expenses.write", "expenses.finalize",
    "transactions.read",
    "accounting.read", "accounting.write", "accounting.post", "accounting.reverse",
    "cash.read", "cash.write",
    "bank.read", "bank.write", "bank.transfer",
    "customer_accounts.read", "customer_accounts.write",
    "taxes.read", "taxes.write",
    "reports.read", "reports.export",
    "settings.read",
  ],
  operator: [
    "dashboard.read",
    "customers.read", "customers.write",
    "services.read", "services.write",
    "cases.read", "cases.write",
    "documents.read", "documents.write", "official_forms.read", "letters.read", "letters.write",
    "contracts.read", "contracts.write",
    "income.read", "income.write", "income.finalize",
    "expenses.read", "expenses.write",
    "transactions.read",
    "cash.read", "bank.read",
    "customer_accounts.read", "customer_accounts.write",
    "reports.read",
    "settings.read",
  ],
  viewer: READ_ONLY.filter((p) => !["users.read", "audit.read"].includes(p)),
};

export const ROLE_LABELS: Record<RoleKey, { fa: string; ps: string; en: string }> = {
  admin: { fa: "مدیر سیستم", ps: "د سیسټم مدیر", en: "Admin" },
  manager: { fa: "مدیر", ps: "مدیر", en: "Manager" },
  accountant: { fa: "محاسب", ps: "محاسب", en: "Accountant" },
  operator: { fa: "اپراتور", ps: "اپریټر", en: "Operator" },
  viewer: { fa: "بیننده", ps: "لیدونکی", en: "Viewer" },
};


/**
 * System-management access is intentionally derived from the existing permission model.
 * No new database permission is required: the built-in admin role is the system administrator,
 * while a non-admin must hold every existing system-control permission below.
 */
export const SYSTEM_MANAGEMENT_PERMISSIONS: Permission[] = ["users.manage", "audit.read", "backup.manage", "settings.manage"];

export function canAccessSystemManagement(roleKey: RoleKey, permissions: Iterable<string>) {
  if (roleKey === "admin") return true;
  const set = permissions instanceof Set ? permissions : new Set(permissions);
  return SYSTEM_MANAGEMENT_PERMISSIONS.every((p) => set.has(p));
}
