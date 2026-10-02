import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getContext, getSessionUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { ROLE_LABELS } from "@/lib/permissions";
import { Shell } from "@/components/Shell";
import { FormDialog } from "@/components/forms";
import { createOrganizationAction } from "@/actions/admin";
import { logoutAction } from "@/actions/auth";
import { getNavCounts } from "@/lib/nav-counts";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getContext();
  const { lang, t } = await getT();
  if (!ctx) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="rounded-xl bg-white p-6 shadow max-w-md w-full space-y-4 text-center">
          <h1 className="text-lg font-bold">{t("organization")}</h1>
          <p className="text-sm text-slate-500">{t("welcome")}, {user.fullName}</p>
          <FormDialog title={t("organizationName")} triggerLabel={t("create")} action={createOrganizationAction} fields={[{ name: "name", label: t("organizationName"), required: true, full: true }, { name: "currency", label: t("defaultCurrency"), defaultValue: "AFN" }]} />
          <form action={logoutAction}><button className="text-sm text-slate-500 underline">{t("logout")}</button></form>
        </div>
      </div>
    );
  }
  const navCounts = await getNavCounts(ctx.org.id);
  return (
    <Shell
      user={{ fullName: ctx.user.fullName, email: ctx.user.email }}
      org={{ id: ctx.org.id, name: ctx.org.name, isDemo: ctx.org.isDemo, currency: ctx.org.currency }}
      roleKey={ctx.roleKey}
      roleLabel={ROLE_LABELS[ctx.roleKey][lang]}
      perms={[...ctx.perms]}
      memberships={ctx.memberships}
      navCounts={navCounts}
    >
      {children}
    </Shell>
  );
}
