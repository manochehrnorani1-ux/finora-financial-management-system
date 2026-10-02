import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizationMembers, profiles } from "@/db/schema";
import { pageContext, sp1, type SP } from "@/lib/page";
import { auditReport } from "@/lib/reports";
import { Card, PageHeader, Table } from "@/components/ui";
import type { Metadata } from "next";
import { formatDateTime } from "@/lib/jalali";
import { canAccessSystemManagement } from "@/lib/permissions";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "ثبت وقایع و فعالیت‌ها",
};

const ACTIONS = ["CREATE", "UPDATE", "DELETE", "AMEND", "SUBMIT", "REVIEW", "APPROVE", "REJECT", "COMPLETE", "ARCHIVE", "CANCEL", "POST", "REVERSE", "LOGIN", "LOGIN_FAILED", "LOGOUT", "PERMISSION_CHANGE", "SETTINGS_CHANGE", "BACKUP", "RESTORE", "EXPORT"];

export default async function AuditPage({ searchParams }: { searchParams: SP }) {
  const { ctx, t, fmt } = await pageContext("audit.read");
  if (!canAccessSystemManagement(ctx.roleKey, ctx.perms)) redirect("/forbidden");
  const q = await searchParams;
  const f = { from: sp1(q.from), to: sp1(q.to), userId: sp1(q.userId), status: sp1(q.action) };
  const [rows, users] = await Promise.all([
    auditReport(ctx.org.id, f),
    db.select({ id: profiles.id, name: profiles.fullName }).from(organizationMembers).innerJoin(profiles, eq(organizationMembers.userId, profiles.id)).where(eq(organizationMembers.organizationId, ctx.org.id)),
  ]);
  return (
    <>
      <PageHeader title={t("auditLog")} subtitle={`${rows.length} ${t("records")} · read-only`} actions={
        <form method="get" className="flex flex-wrap gap-2 text-sm">
          <input type="date" name="from" defaultValue={f.from} className="input !w-auto" />
          <input type="date" name="to" defaultValue={f.to} className="input !w-auto" />
          <select name="userId" defaultValue={f.userId ?? ""} className="input !w-auto"><option value="">{t("user")}: {t("all")}</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
          <select name="action" defaultValue={f.status ?? ""} className="input !w-auto"><option value="">{t("action")}: {t("all")}</option>{ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}</select>
          <button className="rounded-lg bg-slate-800 text-white px-3 py-2">{t("apply")}</button>
          <a href={`/api/reports/export?type=audit&format=csv`} className="rounded-lg border border-slate-300 bg-white px-3 py-2">{t("exportCsv")}</a>
        </form>
      } />
      <Card>
        <Table headers={[t("date"), t("user"), t("action"), t("entity"), t("details"), t("ipAddress")]} empty={t("noData")}
          rows={rows.map(({ a, user }) => [
            <span key="d" className="whitespace-nowrap">{formatDateTime(a.createdAt, fmt)}</span>,
            user ?? "-",
            <span key="a" className={`font-mono text-[11px] rounded px-1.5 py-0.5 ${["DELETE", "REJECT", "REVERSE", "LOGIN_FAILED"].includes(a.action) ? "bg-red-100 text-red-700" : ["APPROVE", "POST", "CREATE"].includes(a.action) ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>{a.action}</span>,
            <span key="e" className="text-xs">{a.entityType}<br /><span className="font-mono text-slate-400">{a.entityId?.slice(0, 8)}</span></span>,
            <details key="j" className="text-xs max-w-md"><summary className="cursor-pointer text-slate-500">{t("view")}</summary><pre className="mt-1 bg-slate-50 rounded p-2 overflow-x-auto max-h-48" dir="ltr">{JSON.stringify({ old: a.oldData, new: a.newData }, null, 1)}</pre></details>,
            <span key="ip" dir="ltr" className="text-xs">{a.ipAddress ?? "-"}</span>,
          ])} />
      </Card>
    </>
  );
}
