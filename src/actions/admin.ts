"use server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { attachments, backups, exchangeRates, organizationMembers, organizations, profiles, publicSites, reports, roles } from "@/db/schema";
import { requireContext } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
import { audit, DEFAULT_APPROVAL, DEFAULT_NUMBERING, FinanceError, getSetting, setSetting } from "@/lib/finance";
import { num, optStr, str } from "@/lib/format";
import { todayIso } from "@/lib/jalali";
import { ROLE_KEYS, type RoleKey } from "@/lib/permissions";
import { seedDemoOrganization, systemRoleId } from "@/lib/seed";
import { act } from "./util";
import { BACKUP_TABLES, exportOrganizationData } from "@/lib/backup";
import { formFile, readLogoUpload } from "@/lib/upload";

/* ---------------- Users & roles ---------------- */
export async function addMember(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("users.manage");
    const email = str(fd.get("email")).toLowerCase();
    const roleKey = str(fd.get("role")) as RoleKey;
    if (!email || !ROLE_KEYS.includes(roleKey)) throw new FinanceError("invalid_input");
    if (roleKey === "admin" && ctx.roleKey !== "admin") throw new FinanceError("forbidden_admin");
    await db.transaction(async (tx) => {
      let [user] = await tx.select().from(profiles).where(eq(profiles.email, email));
      if (!user) {
        const password = str(fd.get("password"));
        const fullName = str(fd.get("fullName"));
        if (password.length < 6 || !fullName) throw new FinanceError("weak_password");
        [user] = await tx.insert(profiles).values({ email, fullName, passwordHash: hashPassword(password), language: "fa", activeOrganizationId: ctx.org.id }).returning();
      }
      const roleId = await systemRoleId(tx, roleKey);
      await tx
        .insert(organizationMembers)
        .values({ organizationId: ctx.org.id, userId: user.id, roleId, status: "active" })
        .onConflictDoUpdate({ target: [organizationMembers.organizationId, organizationMembers.userId], set: { roleId, status: "active" } });
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "PERMISSION_CHANGE", entityType: "organization_member", entityId: user.id, newData: { email, role: roleKey } });
    });
  });
}

export async function changeMemberRole(memberId: string, roleKey: string) {
  return act(async () => {
    const ctx = await requireContext("users.manage");
    if (!ROLE_KEYS.includes(roleKey as RoleKey)) throw new FinanceError("invalid_input");
    await db.transaction(async (tx) => {
      const [m] = await tx.select({ m: organizationMembers, role: roles.key }).from(organizationMembers).innerJoin(roles, eq(organizationMembers.roleId, roles.id)).where(and(eq(organizationMembers.id, memberId), eq(organizationMembers.organizationId, ctx.org.id)));
      if (!m) throw new FinanceError("not_found");
      if ((m.role === "admin" || roleKey === "admin") && ctx.roleKey !== "admin") throw new FinanceError("forbidden_admin");
      if (m.role === "admin" && roleKey !== "admin") await ensureAnotherAdmin(ctx.org.id, memberId);
      await tx.update(organizationMembers).set({ roleId: await systemRoleId(tx, roleKey as RoleKey) }).where(eq(organizationMembers.id, memberId));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "PERMISSION_CHANGE", entityType: "organization_member", entityId: m.m.userId, oldData: { role: m.role }, newData: { role: roleKey } });
    });
  });
}

async function ensureAnotherAdmin(orgId: string, excludeMemberId: string) {
  const admins = await db.select({ id: organizationMembers.id }).from(organizationMembers).innerJoin(roles, eq(organizationMembers.roleId, roles.id)).where(and(eq(organizationMembers.organizationId, orgId), eq(roles.key, "admin"), eq(organizationMembers.status, "active")));
  if (admins.filter((a) => a.id !== excludeMemberId).length === 0) throw new FinanceError("last_admin");
}

export async function setMemberStatus(memberId: string, status: "active" | "suspended") {
  return act(async () => {
    const ctx = await requireContext("users.manage");
    await db.transaction(async (tx) => {
      const [m] = await tx.select({ m: organizationMembers, role: roles.key }).from(organizationMembers).innerJoin(roles, eq(organizationMembers.roleId, roles.id)).where(and(eq(organizationMembers.id, memberId), eq(organizationMembers.organizationId, ctx.org.id)));
      if (!m) throw new FinanceError("not_found");
      if (m.role === "admin" && ctx.roleKey !== "admin") throw new FinanceError("forbidden_admin");
      if (m.role === "admin" && status !== "active") await ensureAnotherAdmin(ctx.org.id, memberId);
      await tx.update(organizationMembers).set({ status }).where(eq(organizationMembers.id, memberId));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "PERMISSION_CHANGE", entityType: "organization_member", entityId: m.m.userId, oldData: { status: m.m.status }, newData: { status } });
    });
  });
}

export async function removeMember(memberId: string) {
  return act(async () => {
    const ctx = await requireContext("users.manage");
    await db.transaction(async (tx) => {
      const [m] = await tx.select({ m: organizationMembers, role: roles.key }).from(organizationMembers).innerJoin(roles, eq(organizationMembers.roleId, roles.id)).where(and(eq(organizationMembers.id, memberId), eq(organizationMembers.organizationId, ctx.org.id)));
      if (!m) throw new FinanceError("not_found");
      if (m.role === "admin") {
        if (ctx.roleKey !== "admin") throw new FinanceError("forbidden_admin");
        await ensureAnotherAdmin(ctx.org.id, memberId);
      }
      await tx.delete(organizationMembers).where(eq(organizationMembers.id, memberId));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "DELETE", entityType: "organization_member", entityId: m.m.userId, oldData: m.m });
    });
  });
}

/* ---------------- Settings ---------------- */
export async function saveOrganizationSettings(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("settings.manage");
    const data = {
      name: str(fd.get("name")),
      legalName: optStr(fd.get("legalName")),
      phone: optStr(fd.get("phone")),
      email: optStr(fd.get("email")),
      address: optStr(fd.get("address")),
      licenseNumber: optStr(fd.get("licenseNumber")),
      taxNumber: optStr(fd.get("taxNumber")),
      logoUrl: optStr(fd.get("logoUrl")),
      fiscalYearStartMonth: Math.min(12, Math.max(1, Math.round(num(fd.get("fiscalYearStartMonth"), 1)))),
      dateFormat: str(fd.get("dateFormat")) === "gregorian" ? "gregorian" : "jalali",
      updatedAt: new Date(),
    };
    if (!data.name) throw new FinanceError("invalid_input");
    const logoFile = formFile(fd.get("logo"));
    const logoBytes = await readLogoUpload(logoFile);
    await db.transaction(async (tx) => {
      const [old] = await tx.select().from(organizations).where(eq(organizations.id, ctx.org.id));
      let logoUrl = old?.logoUrl ?? data.logoUrl;
      if (logoBytes && logoFile) {
        const [attachment] = await tx.insert(attachments).values({
          organizationId: ctx.org.id,
          fileName: logoFile.name || "organization-logo",
          mimeType: logoFile.type,
          fileSize: logoBytes.length,
          content: logoBytes.toString("base64"),
          uploadedBy: ctx.user.id,
        }).returning({ id: attachments.id });
        logoUrl = `/api/organization/logo/${attachment.id}`;
      }
      const nextData = { ...data, logoUrl };
      await tx.update(organizations).set(nextData).where(eq(organizations.id, ctx.org.id));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "SETTINGS_CHANGE", entityType: "organization", entityId: ctx.org.id, oldData: old, newData: { ...nextData, logoUpload: Boolean(logoBytes) } });
    });
  });
}

export async function saveApprovalSettings(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("settings.manage");
    const value = { incomeThreshold: num(fd.get("incomeThreshold"), DEFAULT_APPROVAL.incomeThreshold), expenseThreshold: num(fd.get("expenseThreshold"), DEFAULT_APPROVAL.expenseThreshold), documentApproval: fd.get("documentApproval") === "on" };
    await db.transaction(async (tx) => {
      const old = await getSetting(tx, ctx.org.id, "approval", DEFAULT_APPROVAL);
      await setSetting(tx, ctx.org.id, "approval", value);
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "SETTINGS_CHANGE", entityType: "approval_settings", oldData: old, newData: value });
    });
  });
}

export async function saveNumberingSettings(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("settings.manage");
    const value: Record<string, string> = {};
    for (const k of Object.keys(DEFAULT_NUMBERING)) value[k] = (str(fd.get(k)) || DEFAULT_NUMBERING[k]).toUpperCase().slice(0, 8);
    await db.transaction(async (tx) => {
      const old = await getSetting(tx, ctx.org.id, "numbering", DEFAULT_NUMBERING);
      await setSetting(tx, ctx.org.id, "numbering", value);
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "SETTINGS_CHANGE", entityType: "numbering_settings", oldData: old, newData: value });
    });
  });
}

export async function addExchangeRate(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("settings.manage");
    const currency = str(fd.get("currency")).toUpperCase();
    const rateVal = num(fd.get("rate"));
    if (!/^[A-Z]{3}$/.test(currency) || rateVal <= 0 || currency === ctx.org.currency) throw new FinanceError("invalid_input");
    await db.transaction(async (tx) => {
      // Historical transactions keep their own stored exchange_rate; adding a new rate never rewrites them.
      const [row] = await tx.insert(exchangeRates).values({ organizationId: ctx.org.id, currency, rate: rateVal, effectiveDate: str(fd.get("effectiveDate")) || todayIso(), createdBy: ctx.user.id }).returning();
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "SETTINGS_CHANGE", entityType: "exchange_rate", entityId: row.id, newData: row });
    });
  });
}

/* ---------------- Backup & restore ---------------- */
export async function createBackupAction() {
  return act(async () => {
    const ctx = await requireContext("backup.manage");
    const data = await exportOrganizationData(ctx.org.id);
    const [org] = await db.select().from(organizations).where(eq(organizations.id, ctx.org.id));
    const payload = { finora: 1, organization: org, exportedAt: new Date().toISOString(), tables: data };
    const json = JSON.stringify(payload);
    const counts: Record<string, number> = {};
    for (const t of BACKUP_TABLES) counts[t] = data[t].length;
    const [row] = await db.insert(backups).values({ organizationId: ctx.org.id, fileName: `finora-backup-${todayIso()}-${Date.now()}.json`, sizeBytes: Buffer.byteLength(json), tableCounts: counts, data: payload, createdBy: ctx.user.id }).returning({ id: backups.id });
    await audit(db, { orgId: ctx.org.id, userId: ctx.user.id, action: "BACKUP", entityType: "backup", entityId: row.id, newData: counts });
    return { id: row.id };
  });
}

export async function deleteBackupAction(id: string) {
  return act(async () => {
    const ctx = await requireContext("backup.manage");
    await db.delete(backups).where(and(eq(backups.id, id), eq(backups.organizationId, ctx.org.id)));
    await audit(db, { orgId: ctx.org.id, userId: ctx.user.id, action: "DELETE", entityType: "backup", entityId: id });
  });
}

async function restorePayload(orgId: string, userId: string, payload: unknown, source: string) {
  const p = payload as { finora?: number; tables?: Record<string, Record<string, unknown>[]> };
  if (!p || p.finora !== 1 || !p.tables) throw new FinanceError("invalid_backup");
  const tables = p.tables;
  await db.transaction(async (tx) => {
    for (const t of [...BACKUP_TABLES].reverse()) {
      await tx.execute(sql`delete from ${sql.identifier(t)} where organization_id = ${orgId}`);
    }
    const counts: Record<string, number> = {};
    for (const t of BACKUP_TABLES) {
      const rows = tables[t] ?? [];
      counts[t] = rows.length;
      for (const raw of rows) {
        const row: Record<string, unknown> = { ...raw, organization_id: orgId }; // ownership is forced to the current organization
        const cols = Object.keys(row);
        await tx.execute(
          sql`insert into ${sql.identifier(t)} (${sql.join(cols.map((c) => sql.identifier(c)), sql`, `)}) values (${sql.join(
            cols.map((c) => {
              const v = row[c];
              return v !== null && typeof v === "object" && !(v instanceof Date) ? sql`${JSON.stringify(v)}::jsonb` : sql`${v as string}`;
            }),
            sql`, `,
          )})`,
        );
      }
    }
    await audit(tx, { orgId, userId, action: "RESTORE", entityType: "backup", newData: { source, counts } });
  });
}

export async function restoreBackupAction(id: string) {
  return act(async () => {
    const ctx = await requireContext("backup.manage");
    const [b] = await db.select().from(backups).where(and(eq(backups.id, id), eq(backups.organizationId, ctx.org.id)));
    if (!b) throw new FinanceError("not_found");
    await restorePayload(ctx.org.id, ctx.user.id, b.data, b.fileName);
  });
}

export async function restoreFromFileAction(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("backup.manage");
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) throw new FinanceError("invalid_backup");
    let payload: unknown;
    try {
      payload = JSON.parse(await file.text());
    } catch {
      throw new FinanceError("invalid_backup");
    }
    await restorePayload(ctx.org.id, ctx.user.id, payload, file.name);
  });
}

/* ---------------- Demo data ---------------- */
export async function clearDemoDataAction() {
  return act(async () => {
    const ctx = await requireContext("demo.manage");
    if (!ctx.org.isDemo) throw new FinanceError("not_demo");
    const other = ctx.memberships.find((m) => m.orgId !== ctx.org.id);
    await db.transaction(async (tx) => {
      await audit(tx, { orgId: null, userId: ctx.user.id, action: "DELETE", entityType: "demo_organization", entityId: ctx.org.id, oldData: { name: ctx.org.name } });
      await tx.delete(organizations).where(and(eq(organizations.id, ctx.org.id), eq(organizations.isDemo, true)));
      await tx.update(profiles).set({ activeOrganizationId: other?.orgId ?? null }).where(eq(profiles.id, ctx.user.id));
    });
  });
}

export async function createDemoDataAction() {
  return act(async () => {
    const ctx = await requireContext("demo.manage");
    const org = await db.transaction((tx) => seedDemoOrganization(tx, ctx.user.id));
    await db.update(profiles).set({ activeOrganizationId: org.id }).where(eq(profiles.id, ctx.user.id));
    return { id: org.id };
  });
}

export async function createOrganizationAction(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("users.manage");
    const name = str(fd.get("name"));
    if (!name) throw new FinanceError("invalid_input");
    const { createOrganization } = await import("@/lib/seed");
    const org = await db.transaction((tx) => createOrganization(tx, { name, ownerId: ctx.user.id, currency: str(fd.get("currency")) || "AFN" }));
    await db.update(profiles).set({ activeOrganizationId: org.id }).where(eq(profiles.id, ctx.user.id));
    return { id: org.id };
  });
}

/* ---------------- Report presets ---------------- */
export async function saveReportPreset(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("reports.read");
    const name = str(fd.get("name"));
    const reportType = str(fd.get("reportType"));
    let filters: Record<string, string> = {};
    try {
      filters = JSON.parse(str(fd.get("filters")) || "{}");
    } catch {
      filters = {};
    }
    if (!name || !reportType) throw new FinanceError("invalid_input");
    const [row] = await db.insert(reports).values({ organizationId: ctx.org.id, name, reportType, filters, createdBy: ctx.user.id }).returning();
    return { id: row.id };
  });
}

export async function deleteReportPreset(id: string) {
  return act(async () => {
    const ctx = await requireContext("reports.read");
    await db.delete(reports).where(and(eq(reports.id, id), eq(reports.organizationId, ctx.org.id)));
  });
}
