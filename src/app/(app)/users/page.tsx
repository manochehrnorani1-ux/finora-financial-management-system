import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizationMembers, profiles, roles } from "@/db/schema";
import { pageContext } from "@/lib/page";
import { PERMISSIONS, ROLE_KEYS, ROLE_LABELS, ROLE_MATRIX } from "@/lib/permissions";
import { addMember, changeMemberRole, setMemberStatus, removeMember } from "@/actions/admin";
import { Badge, Card, PageHeader, Table } from "@/components/ui";
import { ActionButton, FormDialog } from "@/components/forms";
import type { Metadata } from "next";
import { formatDate } from "@/lib/jalali";

export const metadata: Metadata = {
  title: "کاربران و صلاحیت‌ها",
};

export default async function UsersPage() {
  const { ctx, t, lang, fmt } = await pageContext("users.read");
  const members = await db
    .select({ m: organizationMembers, user: profiles, role: roles.key })
    .from(organizationMembers)
    .innerJoin(profiles, eq(organizationMembers.userId, profiles.id))
    .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
    .where(eq(organizationMembers.organizationId, ctx.org.id))
    .orderBy(profiles.fullName);
  const canManage = ctx.can("users.manage");
  const roleOpts = ROLE_KEYS.filter((k) => ctx.roleKey === "admin" || k !== "admin").map((k) => ({ value: k, label: ROLE_LABELS[k][lang] }));
  const groups = [...new Set(PERMISSIONS.map((p) => p.split(".")[0]))];
  return (
    <>
      <PageHeader title={t("usersRoles")} subtitle={`${members.length} ${t("members")}`} actions={canManage && (
        <FormDialog title={t("inviteUser")} triggerLabel={`+ ${t("inviteUser")}`} action={addMember} fields={[
          { name: "email", label: t("email"), type: "email", required: true },
          { name: "role", label: t("role"), type: "select", required: true, defaultValue: "operator", options: roleOpts },
          { name: "fullName", label: t("fullName"), help: "(new users)" },
          { name: "password", label: t("password"), type: "password", help: "(new users, min 6)" },
        ]} />
      )} />
      <Card title={t("members")} className="mb-4">
        <Table headers={[t("fullName"), t("email"), t("role"), t("status"), t("memberSince"), t("actions")]} empty={t("noData")}
          rows={members.map(({ m, user, role }) => [
            <span key="n" className="font-medium">{user.fullName}{user.id === ctx.user.id && <span className="ms-1 text-xs text-slate-400">(you)</span>}</span>,
            <span key="e" dir="ltr">{user.email}</span>,
            <Badge key="r" status={role === "admin" ? "approved" : role === "viewer" ? "draft" : "submitted"} label={ROLE_LABELS[role as keyof typeof ROLE_LABELS][lang]} />,
            <Badge key="s" status={m.status === "active" ? "active" : "inactive"} label={t(m.status === "active" ? "active" : "suspend")} />,
            formatDate(m.createdAt, fmt),
            <div key="a" className="flex flex-wrap gap-1">
              {canManage && roleOpts.map((r) => r.value !== role && (ctx.roleKey === "admin" || role !== "admin") && <ActionButton key={r.value} action={changeMemberRole} args={[m.id, r.value]} label={`→ ${r.label}`} variant="ghost" />)}
              {canManage && (ctx.roleKey === "admin" || role !== "admin") && (m.status === "active"
                ? <ActionButton action={setMemberStatus} args={[m.id, "suspended"]} label={t("suspend")} variant="warning" confirm={t("confirm") + "?"} />
                : <ActionButton action={setMemberStatus} args={[m.id, "active"]} label={t("activate")} variant="primary" />)}
              {canManage && (ctx.roleKey === "admin" || role !== "admin") && user.id !== ctx.user.id && <ActionButton action={removeMember} args={[m.id]} label={t("delete")} variant="danger" confirm={t("confirmDelete")} />}
            </div>,
          ])} />
      </Card>
      <Card title={t("permissionsMatrix")}>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-xs min-w-[700px]">
            <thead><tr className="bg-slate-50"><th className="p-2 text-start">{t("permissionsMatrix")}</th>{ROLE_KEYS.map((r) => <th key={r} className="p-2">{ROLE_LABELS[r][lang]}</th>)}</tr></thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g} className="border-t border-slate-100">
                  <td className="p-2 font-medium">{g}<div className="text-[10px] text-slate-400 font-normal">{PERMISSIONS.filter((p) => p.startsWith(g + ".")).map((p) => p.split(".")[1]).join(", ")}</div></td>
                  {ROLE_KEYS.map((r) => {
                    const has = PERMISSIONS.filter((p) => p.startsWith(g + ".")).filter((p) => ROLE_MATRIX[r].includes(p));
                    return <td key={r} className="p-2 text-center">{has.length === 0 ? <span className="text-slate-300">—</span> : <span className="text-emerald-700" title={has.join(", ")}>{has.map((p) => p.split(".")[1]).join(" · ")}</span>}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
