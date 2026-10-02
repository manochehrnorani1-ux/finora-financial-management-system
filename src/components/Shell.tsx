"use client";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { LANGS } from "@/lib/i18n/dictionary";
import { logoutAction, setLanguageAction, switchOrganizationAction } from "@/actions/auth";
import type { NavCounts } from "@/lib/nav-counts";
import { WORKFLOW_KEYS, WORKFLOW_SERVICES } from "@/lib/case-workflow-definitions";
import { canAccessSystemManagement, type RoleKey } from "@/lib/permissions";
import { Toaster } from "./forms";

interface MenuItem {
  key: string;
  href: string;
  icon: string;
  perms: string[];
  badge?: keyof NavCounts;
  routes?: string[];
}

export const PRIMARY_MENU: MenuItem[] = [
  { key: "dashboard", href: "/dashboard", icon: "▦", perms: ["dashboard.read"] },
  { key: "cases", href: "/cases", icon: "📁", perms: ["cases.read"], badge: "cases" },
  { key: "customers", href: "/customers", icon: "👥", perms: ["customers.read"] },
  { key: "services", href: "/panel/services", icon: "🗂", perms: ["services.read"], routes: ["/services-workflow"] },
  { key: "documentsCenter", href: "/documents-center", icon: "📄", perms: ["documents.read", "official_forms.read", "letters.read", "compliance.read"], badge: "documents", routes: ["/documents", "/official-forms", "/generated-forms", "/letters", "/compliance"] },
  { key: "financeCenter", href: "/finance-center", icon: "💼", perms: ["income.read", "expenses.read", "transactions.read", "cash.read", "bank.read", "accounting.read", "contracts.read"], badge: "approvals", routes: ["/income", "/expenses", "/transactions", "/cash", "/bank", "/customer-accounts", "/accounting", "/contracts", "/receipts"] },
  { key: "taxSettlementGroup", href: "/tax-settlements", icon: "⚖", perms: ["tax_settlements.read", "tax_rules.read", "taxes.read"], badge: "taxReview", routes: ["/tax-returns", "/tax-engine", "/taxes"] },
  { key: "reports", href: "/reports", icon: "📊", perms: ["reports.read"] },
];

export const SYSTEM_MENU: MenuItem[] = [
  { key: "systemOrganizations", href: "/admin-center#organizations", icon: "🏢", perms: ["users.manage"] },
  { key: "usersRoles", href: "/users#roles", icon: "👤", perms: ["users.read"] },
  { key: "systemOrgSettings", href: "/settings#organization", icon: "🏢", perms: ["settings.read"] },
  { key: "systemGeneralSettings", href: "/settings#general", icon: "⚙", perms: ["settings.read"] },
  { key: "systemLanguage", href: "/settings#preferences", icon: "🌐", perms: ["settings.read"] },
  { key: "systemFiles", href: "/documents-center", icon: "📎", perms: ["documents.read"] },
  { key: "auditLog", href: "/audit", icon: "🧾", perms: ["audit.read"] },
  { key: "backupRestore", href: "/backup", icon: "🗄", perms: ["backup.manage"] },
  { key: "systemSecurity", href: "/settings#security", icon: "🛡", perms: ["settings.manage"] },
];

export function Shell({
  children, user, org, roleKey, roleLabel, perms, memberships, navCounts,
}: {
  children: ReactNode;
  user: { fullName: string; email: string };
  org: { id: string; name: string; isDemo: boolean; currency: string };
  roleKey: RoleKey;
  roleLabel: string;
  perms: string[];
  memberships: { orgId: string; orgName: string; isDemo: boolean }[];
  navCounts: NavCounts;
}) {
  const { t, lang } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [servicesExpanded, setServicesExpanded] = useState(pathname.startsWith("/services-workflow"));
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [, start] = useTransition();
  const allowed = useMemo(() => new Set(perms), [perms]);
  const searching = query.trim().length > 0;
  const canSee = (item: MenuItem) => item.perms.some((p) => allowed.has(p));
  const visibleItems = PRIMARY_MENU.filter(canSee).filter((item) => !searching || t(item.key).toLowerCase().includes(query.trim().toLowerCase()));
  const visibleSystemItems = SYSTEM_MENU.filter(canSee).filter((item) => !searching || t(item.key).toLowerCase().includes(query.trim().toLowerCase()));
  const canManageSystem = canAccessSystemManagement(roleKey, perms);
  const badgeValue = (b?: keyof NavCounts) => (b ? navCounts[b] ?? 0 : 0);
  const isActive = (item: MenuItem) => {
    const base = item.href.split("#")[0];
    if (item.href.includes("#")) return base === "/admin-center" && pathname === base;
    return pathname === base || pathname.startsWith(base + "/") || Boolean(item.routes?.some((r) => pathname === r || pathname.startsWith(r + "/")));
  };
  const navigate = () => setOpen(false);

  const renderItem = (item: MenuItem) => {
    const active = isActive(item);
    const badge = badgeValue(item.badge);
    const isService = item.key === "services";
    return (
      <div key={item.key}>
        <div className="flex items-center gap-1">
          <Link href={item.href} onClick={() => { if (isService) setServicesExpanded(true); navigate(); }} title={collapsed ? t(item.key) : undefined}
            className={"group flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition " + (active ? "border-e-4 border-emerald-400 bg-emerald-600/20 font-semibold text-white" : "text-slate-300 hover:bg-white/5 hover:text-white")}>
            <span className="w-5 shrink-0 text-center text-base">{item.icon}</span>
            {!collapsed && <><span className="flex-1 truncate">{t(item.key)}</span>{badge > 0 && <span className="min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">{badge}</span>}</>}
          </Link>
          {isService && !collapsed && <button type="button" onClick={() => setServicesExpanded((v) => !v)} aria-expanded={servicesExpanded} className="rounded-lg px-2 py-2 text-xs text-slate-400 hover:bg-white/10 hover:text-white">{servicesExpanded ? "▾" : "▸"}</button>}
        </div>
        {isService && !collapsed && servicesExpanded && (
          <div className="my-1 ms-5 space-y-0.5 border-s border-white/10 ps-2">
            {WORKFLOW_KEYS.map((key) => {
              const href = "/services-workflow/" + key;
              const active = pathname === href;
              return <Link key={key} href={href} onClick={navigate} className={"block rounded-md px-2 py-1.5 text-xs transition " + (active ? "bg-emerald-700/40 font-semibold text-white" : "text-slate-400 hover:bg-white/5 hover:text-white")}>{WORKFLOW_SERVICES[key].label[lang]}</Link>;
            })}
          </div>
        )}
      </div>
    );
  };

  const nav = (mobile = false) => (
    <nav className="flex-1 overflow-y-auto px-2 py-3">
      {!collapsed && <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{t("finoraWorkflow")}</div>}
      <div className="space-y-1">{visibleItems.map(renderItem)}</div>
      {canManageSystem && visibleSystemItems.length > 0 && (
        <div className="mt-4 border-t border-white/10 pt-3">
          {!collapsed && <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300">{t("systemManagement")}</div>}
          <div className="space-y-1">
            {visibleSystemItems.map((item) => {
              const active = isActive(item);
              return <Link key={item.key} href={item.href} onClick={navigate} title={collapsed ? t(item.key) : undefined}
                className={"group flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition " + (active ? "border-e-4 border-amber-400 bg-amber-500/15 font-semibold text-white" : "text-slate-300 hover:bg-white/5 hover:text-white")}>
                <span className="w-5 shrink-0 text-center text-base">{item.icon}</span>{!collapsed && <span className="flex-1 truncate">{t(item.key)}</span>}
              </Link>;
            })}
          </div>
        </div>
      )}
      {!searching && visibleItems.length === 0 && <p className="px-3 py-8 text-center text-xs text-slate-500">{t("noData")}</p>}
    </nav>
  );

  const breadcrumbItem = [...PRIMARY_MENU, ...(canManageSystem ? SYSTEM_MENU : [])].find((m) => isActive(m));
  const workflowKey = WORKFLOW_KEYS.find((key) => pathname === "/services-workflow/" + key);

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className={"sticky top-0 hidden h-screen flex-col bg-slate-900 text-white print:hidden lg:flex " + (collapsed ? "w-[76px]" : "w-64") + " transition-all"}>
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-4">
          {!collapsed && <div className="min-w-0"><div className="text-xl font-black tracking-wide text-emerald-400">{t("appName")}</div><div className="mt-0.5 text-[11px] text-slate-400">{t("slogan")}</div></div>}
          <button onClick={() => setCollapsed((v) => !v)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" title={collapsed ? t("expandMenu") : t("collapseMenu")}>{collapsed ? "«" : "»"}</button>
        </div>
        {!collapsed && <div className="px-3 pb-2"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={"🔍 " + t("search")} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none" /></div>}
        {nav()}
        <div className="border-t border-white/10 px-3 py-3 text-xs text-slate-400">
          {!collapsed ? <><div className="truncate font-medium text-white">{user.fullName}</div><div className="truncate">{roleLabel}</div><div className="truncate text-[10px] text-slate-500">{org.name}</div></> : <div className="text-center font-medium text-white" title={user.fullName}>{user.fullName.slice(0, 1)}</div>}
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col bg-slate-900 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4"><div className="text-lg font-black text-emerald-400">{t("appName")}</div><button onClick={() => setOpen(false)} className="text-2xl text-slate-300">×</button></div>
            <div className="px-3 pb-2"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={"🔍 " + t("search")} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none" /></div>
            {nav(true)}
            <div className="border-t border-white/10 p-3 text-xs"><div className="font-semibold text-white">{user.fullName}</div><div className="text-slate-400">{roleLabel}</div><div className="mt-1 text-slate-500">{org.name}</div></div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white print:hidden">
          <div className="flex min-h-14 items-center gap-2 px-3 py-2 sm:px-4">
            <button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label={t("openMenu")}><span className="mb-1 block h-0.5 w-5 bg-slate-700" /><span className="mb-1 block h-0.5 w-5 bg-slate-700" /><span className="block h-0.5 w-5 bg-slate-700" /></button>
            <div className="font-black text-emerald-700 lg:hidden">{t("appName")}</div>
            <div className="flex-1" />
            {memberships.length > 1 ? (
              <select className="input !w-auto max-w-[170px] text-xs sm:max-w-xs sm:text-sm" value={org.id} title={t("switchOrg")} onChange={(e) => start(async () => { await switchOrganizationAction(e.target.value); router.push("/dashboard"); router.refresh(); })}>
                {memberships.map((m) => <option key={m.orgId} value={m.orgId}>{m.isDemo ? "[" + t("demoBadge") + "] " : ""}{m.orgName}</option>)}
              </select>
            ) : <div className="hidden max-w-[210px] truncate text-xs font-medium text-slate-600 sm:block" title={org.name}>{org.name}</div>}
            <select className="input !w-auto text-xs sm:text-sm" value={lang} onChange={(e) => start(async () => { await setLanguageAction(e.target.value); router.refresh(); })} title={t("language")}>{LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</select>
            <div className="relative">
              <button type="button" onClick={() => setUserMenuOpen((v) => !v)} className="flex max-w-[220px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs hover:bg-slate-50" aria-expanded={userMenuOpen}>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-800">{user.fullName.slice(0, 1)}</span>
                <span className="hidden min-w-0 text-start sm:block"><span className="block truncate font-semibold text-slate-800">{user.fullName}</span><span className="block truncate text-[10px] text-slate-500">{roleLabel} · {org.name}</span></span>
                <span className="text-slate-400">⌄</span>
              </button>
              {userMenuOpen && <div className="absolute end-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <div className="border-b border-slate-100 px-3 py-2"><div className="font-semibold text-slate-800">{user.fullName}</div><div className="text-xs text-slate-500">{roleLabel}</div><div className="mt-1 truncate text-xs text-slate-500">{org.name}</div></div>
                <Link href="/settings" onClick={() => setUserMenuOpen(false)} className="mt-1 block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">{t("accountSettings")}</Link>
                <form action={logoutAction}><button className="w-full rounded-lg px-3 py-2 text-start text-sm text-red-700 hover:bg-red-50">{t("logout")}</button></form>
              </div>}
            </div>
          </div>
          {navCounts.total > 0 && <div className="border-t border-slate-100 px-4 py-1.5 text-center text-xs text-red-700">{navCounts.total} {t("itemsNeedAttention")}</div>}
          {org.isDemo && <div className="border-t border-amber-200 bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900">⚠ {t("demoOrgBanner")}</div>}
        </header>

        <div className="border-b border-slate-100 bg-white px-3 py-2 text-xs text-slate-500 print:hidden sm:px-5 lg:px-6">
          <div className="mx-auto flex max-w-[1600px] items-center gap-1 overflow-x-auto whitespace-nowrap">
            <Link href="/dashboard" className="hover:text-emerald-700">{t("dashboard")}</Link>
            {breadcrumbItem && breadcrumbItem.key !== "dashboard" && <><span>/</span><span className="font-medium text-slate-700">{t(breadcrumbItem.key)}</span></>}
            {workflowKey && <><span>/</span><span className="font-medium text-slate-700">{WORKFLOW_SERVICES[workflowKey].label[lang]}</span></>}
          </div>
        </div>
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-3 sm:p-5 lg:p-6">{children}</main>
        <footer className="px-4 py-3 text-center text-[11px] text-slate-400 print:hidden">{t("appName")} · {org.name} · {org.currency}</footer>
      </div>
      <Toaster />
    </div>
  );
}
