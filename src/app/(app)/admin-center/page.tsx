import Link from "next/link";
import type { Metadata } from "next";
import { eq, sql, desc } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, backups, organizationMembers, organizations, systemSettings } from "@/db/schema";
import { pageContext } from "@/lib/page";
import { canAccessSystemManagement } from "@/lib/permissions";
import { createOrganizationAction } from "@/actions/admin";
import { Card, Stat, FormDialog, PageHeader } from "@/components/ui";
import { FormDialog as ActionFormDialog } from "@/components/forms";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "مدیریت سیستم" };

export default async function AdminCenterPage() {
  const { ctx, t } = await pageContext();
  if (!canAccessSystemManagement(ctx.roleKey, ctx.perms)) redirect("/forbidden");

  const [orgRows, members, logs, backupRows, settingsRows] = await Promise.all([
    db.select({ id: organizations.id, name: organizations.name, currency: organizations.currency, isDemo: organizations.isDemo, createdAt: organizations.createdAt }).from(organizations).orderBy(desc(organizations.createdAt)),
    db.select({ n: sql<number>`count(*)::int`, active: sql<number>`count(*) filter (where ${organizationMembers.status}='active')::int` }).from(organizationMembers).where(eq(organizationMembers.organizationId, ctx.org.id)),
    db.select({ n: sql<number>`count(*)::int` }).from(auditLogs).where(eq(auditLogs.organizationId, ctx.org.id)),
    db.select({ n: sql<number>`count(*)::int` }).from(backups).where(eq(backups.organizationId, ctx.org.id)),
    db.select({ n: sql<number>`count(*)::int` }).from(systemSettings).where(eq(systemSettings.organizationId, ctx.org.id)),
  ]);

  const modules = [
    { key: "systemOrganizations", href: "#organizations", icon: "🏢", perm: "users.manage" },
    { key: "usersRoles", href: "/users#roles", icon: "👤", perm: "users.read" },
    { key: "auditLog", href: "/audit", icon: "🧾", perm: "audit.read" },
    { key: "backupRestore", href: "/backup", icon: "🗄", perm: "backup.manage" },
    { key: "systemOrgSettings", href: "/settings#organization", icon: "🏢", perm: "settings.read" },
    { key: "systemGeneralSettings", href: "/settings#general", icon: "⚙", perm: "settings.read" },
    { key: "systemLanguage", href: "/settings#preferences", icon: "🌐", perm: "settings.read" },
    { key: "systemFiles", href: "/documents-center", icon: "📎", perm: "documents.read" },
    { key: "systemSecurity", href: "/settings#security", icon: "🛡", perm: "settings.manage" },
  ].filter((m) => ctx.can(m.perm as never));

  return (
    <>
      <PageHeader title={t("systemManagement")} subtitle={t("systemManagementHelp")} />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("members")} value={members[0]?.active ?? 0} tone="blue" sub={(members[0]?.n ?? 0) + " " + t("records")} />
        <Stat label={t("auditLog")} value={logs[0]?.n ?? 0} />
        <Stat label={t("backupHistory")} value={backupRows[0]?.n ?? 0} tone="green" />
        <Stat label={t("settings")} value={settingsRows[0]?.n ?? 0} />
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-2">
        {modules.map((m) => (
          <Card key={m.key} className="transition hover:border-emerald-300 hover:shadow-md">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-2xl">{m.icon}</span>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-slate-800">{t(m.key)}</h2>
                <Link href={m.href} className="mt-3 inline-flex text-sm font-semibold text-emerald-700 hover:underline">{t("openModule")} →</Link>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <section id="organizations" className="scroll-mt-20">
        <Card title={t("systemOrganizations")} actions={
          <ActionFormDialog title={t("systemOrganizations")} triggerLabel={"+" + " " + t("create")} action={createOrganizationAction}
            fields={[
              { name: "name", label: t("organizationName"), required: true, full: true },
              { name: "currency", label: t("defaultCurrency"), defaultValue: "AFN" },
            ]} />
        }>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b border-slate-200 text-start text-xs text-slate-500"><th className="p-2 text-start">{t("organizationName")}</th><th className="p-2 text-start">{t("currency")}</th><th className="p-2 text-start">{t("status")}</th></tr></thead>
              <tbody>
                {orgRows.map((o) => <tr key={o.id} className="border-b border-slate-100"><td className="p-2 font-medium">{o.name}{o.id === ctx.org.id && <span className="ms-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700">{t("activeOrganization")}</span>}</td><td className="p-2 font-mono">{o.currency}</td><td className="p-2">{o.isDemo ? t("demoBadge") : t("active")}</td></tr>)}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </>
  );
}
