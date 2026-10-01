import Link from "next/link";
import type { Metadata } from "next";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, backups, organizationMembers, systemSettings } from "@/db/schema";
import { pageContext } from "@/lib/page";
import { Card, Stat } from "@/components/ui";

export const metadata: Metadata = { title: "مرکز مدیریت سیستم" };

export default async function AdminCenterPage() {
  const { ctx, t } = await pageContext();
  const modules = [
    { key: "usersRoles", href: "/users", icon: "🔐", perm: "users.read", help: "اعضای سازمان، نقش‌ها و ماتریس صلاحیت‌ها" },
    { key: "auditLog", href: "/audit", icon: "🕵", perm: "audit.read", help: "ثبت غیرقابل ویرایش عملیات، چاپ، دانلود و تغییرات" },
    { key: "backupRestore", href: "/backup", icon: "💾", perm: "backup.manage", help: "پشتیبان سازمانی، دانلود، بازیابی و تاریخچه" },
    { key: "settings", href: "/settings", icon: "⚙", perm: "settings.read", help: "مشخصات سازمان، شماره‌گذاری، اسعار، منظوری و امنیت" },
  ].filter((m) => ctx.can(m.perm as never));
  if (modules.length === 0) return <div className="rounded-xl bg-white p-8 text-center text-red-600">{t("forbidden")}</div>;

  const canUsers = ctx.can("users.read");
  const canAudit = ctx.can("audit.read");
  const canBackup = ctx.can("backup.manage");
  const canSettings = ctx.can("settings.read");
  const [members, logs, backupRows, settingsRows] = await Promise.all([
    canUsers ? db.select({ n: sql<number>`count(*)::int`, active: sql<number>`count(*) filter (where ${organizationMembers.status}='active')::int` }).from(organizationMembers).where(eq(organizationMembers.organizationId, ctx.org.id)) : Promise.resolve([{ n: 0, active: 0 }]),
    canAudit ? db.select({ n: sql<number>`count(*)::int` }).from(auditLogs).where(eq(auditLogs.organizationId, ctx.org.id)) : Promise.resolve([{ n: 0 }]),
    canBackup ? db.select({ n: sql<number>`count(*)::int` }).from(backups).where(eq(backups.organizationId, ctx.org.id)) : Promise.resolve([{ n: 0 }]),
    canSettings ? db.select({ n: sql<number>`count(*)::int` }).from(systemSettings).where(eq(systemSettings.organizationId, ctx.org.id)) : Promise.resolve([{ n: 0 }]),
  ]);
  const counts: Record<string, number> = { usersRoles: members[0]?.n ?? 0, auditLog: logs[0]?.n ?? 0, backupRestore: backupRows[0]?.n ?? 0, settings: settingsRows[0]?.n ?? 0 };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">{t("securityAdmin")}</p><h1 className="mt-1 text-2xl font-bold text-slate-900">{t("adminCenter")}</h1><p className="mt-1 text-sm text-slate-500">{t("adminCenterHelp")}</p></div>
        {ctx.can("users.manage") && <Link href="/users" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">+ {t("inviteUser")}</Link>}
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {canUsers && <Stat label={t("members")} value={members[0]?.active ?? 0} tone="blue" sub={`${members[0]?.n ?? 0} ${t("records")}`} />}
        {canAudit && <Stat label={t("auditLog")} value={logs[0]?.n ?? 0} />}
        {canBackup && <Stat label={t("backupHistory")} value={backupRows[0]?.n ?? 0} tone="green" />}
        {canSettings && <Stat label={t("settings")} value={settingsRows[0]?.n ?? 0} />}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {modules.map((m) => (
          <Card key={m.key} className="transition hover:border-emerald-300 hover:shadow-md">
            <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-50 text-2xl">{m.icon}</span><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><h2 className="font-bold text-slate-800">{t(m.key)}</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold">{counts[m.key]}</span></div><p className="mt-1 text-sm leading-6 text-slate-500">{m.help}</p><Link href={m.href} className="mt-3 inline-flex text-sm font-semibold text-emerald-700 hover:underline">{t("openModule")} →</Link></div></div>
          </Card>
        ))}
      </div>
      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">🔐 {t("serverAuthorizationNote")}</div>
    </>
  );
}
