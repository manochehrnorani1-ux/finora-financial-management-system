import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  bankAccounts,
  cashAccounts,
  contracts,
  customers,
  documents,
  exchangeRates,
  expenses,
  incomes,
  organizationMembers,
  organizations,
  permissions,
  profiles,
  rolePermissions,
  roles,
  services,
  taxTypes,
} from "@/db/schema";
import { PERMISSIONS, ROLE_KEYS, ROLE_LABELS, ROLE_MATRIX, type RoleKey } from "./permissions";
import { hashPassword } from "./auth";
import { audit, ensureChartOfAccounts, getActiveTaxRate, getExchangeRate, nextNumber, setSetting, DEFAULT_APPROVAL, DEFAULT_NUMBERING, type Tx } from "./finance";
import { finalizeExpense, finalizeIncome, openingBalanceEntry, receiveCustomerPayment, transferFunds, type Actor } from "./workflows";
import { round2 } from "./format";
import { todayIso } from "./jalali";
import { ensurePublicWebsite } from "./website-seed";
import { ensureMofTaxCatalog } from "./tax-engine";

/** Sync system roles + permission matrix into the database (idempotent). */
export async function ensureSystemRoles(tx: Tx | typeof db = db) {
  for (const key of PERMISSIONS) {
    await tx.insert(permissions).values({ key }).onConflictDoNothing();
  }
  const permRows = await tx.select().from(permissions);
  const permId = new Map(permRows.map((p) => [p.key, p.id]));
  for (const key of ROLE_KEYS) {
    let [role] = await tx.select().from(roles).where(and(eq(roles.key, key), isNull(roles.organizationId)));
    if (!role) {
      [role] = await tx.insert(roles).values({ key, name: ROLE_LABELS[key].fa, description: ROLE_LABELS[key].en, isSystem: true }).returning();
    }
    const existing = await tx.select().from(rolePermissions).where(eq(rolePermissions.roleId, role.id));
    const existingIds = new Set(existing.map((r) => r.permissionId));
    const missing = ROLE_MATRIX[key].filter((p) => !existingIds.has(permId.get(p)!));
    if (missing.length) {
      await tx.insert(rolePermissions).values(missing.map((p) => ({ roleId: role.id, permissionId: permId.get(p)! })));
    }
  }
}

export async function systemRoleId(tx: Tx | typeof db, key: RoleKey) {
  const [role] = await tx.select().from(roles).where(and(eq(roles.key, key), isNull(roles.organizationId)));
  if (!role) throw new Error("roles_not_seeded");
  return role.id;
}

export async function createOrganization(tx: Tx, p: { name: string; ownerId: string; currency?: string; isDemo?: boolean; phone?: string | null; email?: string | null; address?: string | null }) {
  const currency = p.currency ?? "AFN";
  const [org] = await tx
    .insert(organizations)
    .values({ name: p.name, currency, isDemo: p.isDemo ?? false, phone: p.phone ?? null, email: p.email ?? null, address: p.address ?? null })
    .returning();
  await tx.insert(organizationMembers).values({ organizationId: org.id, userId: p.ownerId, roleId: await systemRoleId(tx, "admin"), status: "active" });
  await ensureChartOfAccounts(tx, org.id, currency);
  await tx.insert(cashAccounts).values({ organizationId: org.id, name: "صندوق اصلی / Main Cash", currency, openingBalance: 0, currentBalance: 0, isDemo: p.isDemo ?? false });
  await ensureMofTaxCatalog(tx, org.id, p.ownerId);
  await setSetting(tx, org.id, "approval", DEFAULT_APPROVAL);
  await setSetting(tx, org.id, "numbering", DEFAULT_NUMBERING);
  await audit(tx, { orgId: org.id, userId: p.ownerId, action: "CREATE", entityType: "organization", entityId: org.id, newData: { name: p.name, isDemo: p.isDemo ?? false } });
  return org;
}

/** Creates a clearly-marked demo organization with sample data produced through the real financial workflows. */
export async function seedDemoOrganization(tx: Tx, ownerId: string) {
  const org = await createOrganization(tx, { name: "[نمونه] مرکز خدمات اداری کابل — DEMO", ownerId, isDemo: true, phone: "+93 70 000 0000", email: "demo@finora.af", address: "کابل، افغانستان" });
  const orgId = org.id;
  const a: Actor = { orgId, userId: ownerId, baseCurrency: "AFN", canApprove: true };
  const today = todayIso();
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  const [cashAcc] = await tx.select().from(cashAccounts).where(eq(cashAccounts.organizationId, orgId));
  const [bankAcc] = await tx
    .insert(bankAccounts)
    .values({ organizationId: orgId, bankName: "افغانستان بانک / Da Afghanistan Bank", accountName: "حساب جاری اداره", accountNumber: "0012345678", currency: "AFN", openingBalance: 250000, currentBalance: 250000, isDemo: true })
    .returning();
  await tx.update(cashAccounts).set({ openingBalance: 50000, currentBalance: 50000 }).where(eq(cashAccounts.id, cashAcc.id));
  await openingBalanceEntry(tx, a, { kind: "bank", amount: 250000, date: daysAgo(30), description: "بیلانس افتتاحیه بانک (نمونه)", isDemo: true });
  await openingBalanceEntry(tx, a, { kind: "cash", amount: 50000, date: daysAgo(30), description: "بیلانس افتتاحیه صندوق (نمونه)", isDemo: true });
  // Illustrative FX values are confined to the clearly marked demo organization; production orgs start without rates.
  await tx.insert(exchangeRates).values([
    { organizationId: orgId, currency: "USD", rate: 70, effectiveDate: "2020-01-01", createdBy: ownerId },
    { organizationId: orgId, currency: "EUR", rate: 76, effectiveDate: "2020-01-01", createdBy: ownerId },
    { organizationId: orgId, currency: "PKR", rate: 0.25, effectiveDate: "2020-01-01", createdBy: ownerId },
  ]);

  const custData = [
    { name: "احمد ولی احمدی", fatherName: "عبدالولی", phone: "+93 70 111 2233", nationalId: "1400-0101-12345", address: "کارته نو، کابل" },
    { name: "فاطمه رحیمی", fatherName: "محمد رحیم", phone: "+93 78 222 3344", nationalId: "1400-0202-23456", address: "خیرخانه، کابل" },
    { name: "شرکت ساختمانی هرات (نمونه)", fatherName: null, phone: "+93 79 333 4455", nationalId: "L-778899", address: "هرات" },
    { name: "نجیب الله سادات", fatherName: "سید احمد", phone: "+93 77 444 5566", nationalId: "1400-0303-34567", address: "مزار شریف" },
  ];
  const custs = [];
  for (const c of custData) {
    const [row] = await tx.insert(customers).values({ organizationId: orgId, customerCode: await nextNumber(tx, orgId, "customer"), ...c, status: "active", isDemo: true }).returning();
    custs.push(row);
  }

  const [brt] = await tx.select().from(taxTypes).where(and(eq(taxTypes.organizationId, orgId), eq(taxTypes.code, "BRT")));
  const svcData = [
    { name: "تصدیق و تأیید اسناد", category: "تصدیق", defaultPrice: 1500, taxTypeId: brt.id },
    { name: "تنظیم و ترتیب قرارداد", category: "حقوقی", defaultPrice: 5000, taxTypeId: brt.id },
    { name: "ثبت جواز فعالیت", category: "جواز", defaultPrice: 12000, taxTypeId: brt.id },
    { name: "ترجمه رسمی اسناد", category: "ترجمه", defaultPrice: 800, taxTypeId: null },
    { name: "مشاوره مالیاتی", category: "مشاوره", defaultPrice: 3000, taxTypeId: brt.id },
  ];
  const svcs = [];
  for (const s of svcData) {
    const [row] = await tx.insert(services).values({ organizationId: orgId, ...s, status: "active", isDemo: true }).returning();
    svcs.push(row);
  }

  const docData = [
    { title: "مکتوب رسمی به ریاست ثبت اسناد", documentType: "letter", status: "approved", customerId: custs[0].id },
    { title: "درخواست تمدید جواز فعالیت", documentType: "application", status: "submitted", customerId: custs[2].id },
    { title: "تصدیق‌نامه اقامت", documentType: "certificate", status: "draft", customerId: custs[1].id },
    { title: "جواز کار مؤقت", documentType: "license", status: "under_review", customerId: custs[3].id },
    { title: "مکتوب معرفی به وزارت مالیه", documentType: "letter", status: "completed", customerId: custs[0].id },
  ];
  for (const d of docData) {
    await tx.insert(documents).values({
      organizationId: orgId,
      documentNumber: await nextNumber(tx, orgId, "document"),
      documentDate: daysAgo(10),
      createdBy: ownerId,
      approvedBy: d.status === "approved" || d.status === "completed" ? ownerId : null,
      approvedAt: d.status === "approved" || d.status === "completed" ? new Date() : null,
      isDemo: true,
      description: "سند نمونه (Demo)",
      ...d,
    });
  }

  await tx.insert(contracts).values([
    { organizationId: orgId, customerId: custs[2].id, contractNumber: await nextNumber(tx, orgId, "contract"), title: "قرارداد خدمات اداری سالانه", startDate: daysAgo(60), endDate: daysAgo(-305), amount: 120000, currency: "AFN", status: "active", createdBy: ownerId, isDemo: true, description: "قرارداد نمونه" },
    { organizationId: orgId, customerId: custs[0].id, contractNumber: await nextNumber(tx, orgId, "contract"), title: "قرارداد مشاوره مالیاتی", startDate: daysAgo(20), endDate: daysAgo(-160), amount: 1500, currency: "USD", status: "draft", createdBy: ownerId, isDemo: true, description: "قرارداد نمونه" },
  ]);

  const incomeData: { cust: number; svc: number; qty: number; method: "cash" | "bank" | "credit"; day: number; currency?: string }[] = [
    { cust: 0, svc: 0, qty: 2, method: "cash", day: 25 },
    { cust: 1, svc: 3, qty: 5, method: "cash", day: 20 },
    { cust: 2, svc: 2, qty: 1, method: "bank", day: 15 },
    { cust: 3, svc: 1, qty: 1, method: "credit", day: 12 },
    { cust: 0, svc: 4, qty: 1, method: "bank", day: 6, currency: "USD" },
    { cust: 2, svc: 0, qty: 4, method: "credit", day: 3 },
    { cust: 1, svc: 1, qty: 1, method: "cash", day: 1 },
  ];
  for (const i of incomeData) {
    const svc = svcs[i.svc];
    const date = daysAgo(i.day);
    const currency = i.currency ?? "AFN";
    const amount = currency === "USD" ? 50 : Number(svc.defaultPrice) * i.qty;
    const rate = (await getActiveTaxRate(tx, orgId, svc.taxTypeId, date)) ?? 0;
    const taxAmount = round2((amount * rate) / 100);
    const fx = await getExchangeRate(tx, orgId, currency, "AFN", date);
    const [inc] = await tx
      .insert(incomes)
      .values({
        organizationId: orgId,
        incomeNumber: await nextNumber(tx, orgId, "income"),
        customerId: custs[i.cust].id,
        serviceId: svc.id,
        description: `${svc.name} (نمونه)`,
        amount,
        taxTypeId: svc.taxTypeId,
        taxRate: rate,
        taxAmount,
        totalAmount: round2(amount + taxAmount),
        currency,
        exchangeRate: fx,
        baseAmount: round2((amount + taxAmount) * fx),
        baseCurrency: "AFN",
        paymentMethod: i.method,
        cashAccountId: i.method === "cash" ? cashAcc.id : null,
        bankAccountId: i.method === "bank" ? bankAcc.id : null,
        incomeDate: date,
        status: "draft",
        createdBy: ownerId,
        isDemo: true,
      })
      .returning();
    await finalizeIncome(tx, a, inc.id, { skipApprovalCheck: true });
  }

  const expenseData: { category: string; amount: number; method: "cash" | "bank"; day: number; desc: string }[] = [
    { category: "rent", amount: 30000, method: "bank", day: 28, desc: "کرایه دفتر ماه جاری" },
    { category: "salaries", amount: 85000, method: "bank", day: 27, desc: "معاشات کارمندان" },
    { category: "utilities", amount: 4500, method: "cash", day: 18, desc: "بل برق و انترنت" },
    { category: "supplies", amount: 2200, method: "cash", day: 9, desc: "قرطاسیه دفتر" },
    { category: "transport", amount: 1200, method: "cash", day: 2, desc: "کرایه ترانسپورت" },
  ];
  for (const e of expenseData) {
    const date = daysAgo(e.day);
    const [exp] = await tx
      .insert(expenses)
      .values({
        organizationId: orgId,
        expenseNumber: await nextNumber(tx, orgId, "expense"),
        category: e.category,
        description: `${e.desc} (نمونه)`,
        amount: e.amount,
        taxRate: 0,
        taxAmount: 0,
        totalAmount: e.amount,
        currency: "AFN",
        exchangeRate: 1,
        baseAmount: e.amount,
        baseCurrency: "AFN",
        paymentMethod: e.method,
        cashAccountId: e.method === "cash" ? cashAcc.id : null,
        bankAccountId: e.method === "bank" ? bankAcc.id : null,
        expenseDate: date,
        status: "draft",
        createdBy: ownerId,
        isDemo: true,
      })
      .returning();
    await finalizeExpense(tx, a, exp.id, { skipApprovalCheck: true });
  }

  // Draft expense awaiting finalization + a pending-approval one
  await tx.insert(expenses).values({ organizationId: orgId, expenseNumber: await nextNumber(tx, orgId, "expense"), category: "administrative", description: "مصرف اداری در انتظار نهایی‌سازی (نمونه)", amount: 3500, totalAmount: 3500, baseAmount: 3500, paymentMethod: "cash", cashAccountId: cashAcc.id, expenseDate: today, status: "draft", createdBy: ownerId, isDemo: true });
  await tx.insert(incomes).values({ organizationId: orgId, incomeNumber: await nextNumber(tx, orgId, "income"), customerId: custs[2].id, serviceId: svcs[2].id, description: "ثبت جواز — منتظر منظوری (نمونه؛ مالیه تعیین نشده)", amount: 120000, taxTypeId: null, taxRate: 0, taxAmount: 0, totalAmount: 120000, baseAmount: 120000, paymentMethod: "bank", bankAccountId: bankAcc.id, incomeDate: today, status: "pending_approval", createdBy: ownerId, isDemo: true });

  await receiveCustomerPayment(tx, a, { customerId: custs[3].id, amount: 3000, method: "cash", accountId: cashAcc.id, date: daysAgo(5), description: "پرداخت قسط اول (نمونه)", isDemo: true });
  await transferFunds(tx, a, { fromType: "cash", fromId: cashAcc.id, toType: "bank", toId: bankAcc.id, amount: 20000, date: daysAgo(4), description: "انتقال نقد به بانک (نمونه)", isDemo: true });
  return org;
}

export const DEFAULT_ADMIN = { email: "admin@finora.af", password: "Admin@123", name: "مدیر سیستم" };

/** First-run initialization: system roles, default admin, production org and demo org. */
export async function ensureBootstrap() {
  await ensureSystemRoles();
  const [any] = await db.select({ id: profiles.id }).from(profiles).limit(1);
  if (any) {
    const allOrgs = await db.select().from(organizations);
    await db.transaction(async (tx) => {
      for (const o of allOrgs) {
        await ensureMofTaxCatalog(tx, o.id, any.id);
        if (!o.isDemo) await ensurePublicWebsite(tx, o.id, any.id);
      }
    });
    return;
  }
  await db.transaction(async (tx) => {
    const [admin] = await tx.insert(profiles).values({ email: DEFAULT_ADMIN.email, passwordHash: hashPassword(DEFAULT_ADMIN.password), fullName: DEFAULT_ADMIN.name, language: "fa" }).returning();
    const productionOrg = await createOrganization(tx, { name: "FINORA — مرکز خدمات مالی و اداری", ownerId: admin.id, phone: "0744173723", email: "manochehr.mb@gmail.com", address: "مومند مارکیت، منزل دوم، کندز، افغانستان" });
    await ensurePublicWebsite(tx, productionOrg.id, admin.id);
    const demo = await seedDemoOrganization(tx, admin.id);
    await tx.update(profiles).set({ activeOrganizationId: demo.id }).where(eq(profiles.id, admin.id));
    for (const [key, name] of [["manager", "مدیر نمونه"], ["accountant", "محاسب نمونه"], ["operator", "اپراتور نمونه"], ["viewer", "بیننده نمونه"]] as [RoleKey, string][]) {
      const [u] = await tx.insert(profiles).values({ email: `${key}@finora.af`, passwordHash: hashPassword("Demo@123"), fullName: name, language: "fa", activeOrganizationId: demo.id }).returning();
      await tx.insert(organizationMembers).values({ organizationId: demo.id, userId: u.id, roleId: await systemRoleId(tx, key), status: "active" });
    }
  });
}
