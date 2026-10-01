"use client";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { LANGS } from "@/lib/i18n/dictionary";
import { logoutAction, setLanguageAction, switchOrganizationAction } from "@/actions/auth";
import type { NavCounts } from "@/lib/nav-counts";
import { WORKFLOW_KEYS, WORKFLOW_SERVICES } from "@/lib/case-workflow-definitions";
import { Toaster } from "./forms";

interface PrimaryMenuItem {
  key: string;
  href: string;
  icon: string;
  perms: string[];
  badge?: keyof NavCounts;
  /** Child routes represented by this operational center. */
  routes?: string[];
}

/**
 * FINORA workflow-first navigation.
 * Detailed ledgers and tools live inside operational centers instead of crowding the sidebar.
 */
export const PRIMARY_MENU: PrimaryMenuItem[] = [
  { key: "dashboard", href: "/dashboard", icon: "▦", perms: ["dashboard.read"] },
  { key: "cases", href: "/cases", icon: "📁", perms: ["cases.read"], badge: "cases" },
  { key: "customers", href: "/customers", icon: "👥", perms: ["customers.read"] },
  { key: "services", href: "/panel/services", icon: "🗂", perms: ["services.read"], routes: ["/services-workflow"] },
  {
    key: "documentsCenter",
    href: "/documents-center",
    icon: "📄",
    perms: ["documents.read", "official_forms.read", "letters.read", "compliance.read"],
    badge: "documents",
    routes: ["/documents", "/official-forms", "/generated-forms", "/letters", "/compliance"],
  },
  {
    key: "financeCenter",
    href: "/finance-center",
    icon: "💼",
    perms: ["income.read", "expenses.read", "transactions.read", "cash.read", "bank.read", "accounting.read", "contracts.read"],
    badge: "approvals",
    routes: ["/income", "/expenses", "/transactions", "/cash", "/bank", "/customer-accounts", "/accounting", "/contracts", "/receipts"],
  },
  {
    key: "taxSettlementGroup",
    href: "/tax-settlements",
    icon: "⚖",
    perms: ["tax_settlements.read", "tax_rules.read", "taxes.read"],
    badge: "taxReview",
    routes: ["/tax-returns", "/tax-engine", "/taxes"],
  },
  { key: "reports", href: "/reports", icon: "📊", perms: ["reports.read"] },
  {
    key: "adminCenter",
    href: "/admin-center",
    icon: "⚙",
    perms: ["users.read", "audit.read", "backup.manage", "settings.read"],
    routes: ["/users", "/audit", "/backup", "/settings"],
  },
];

export function Shell({
  children,
  user,
  org,
  roleLabel,
  perms,
  memberships,
  navCounts,
}: {
  children: ReactNode;
  user: { fullName: string; email: string };
  org: { id: string; name: string; isDemo: boolean; currency: string };
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
  const [, start] = useTransition();
  const allowed = useMemo(() => new Set(perms), [perms]);
  const searching = query.trim().length > 0;

  const canSee = (item: PrimaryMenuItem) => item.perms.some((p) => allowed.has(p));
  const isActive = (item: PrimaryMenuItem) => {
    if (pathname === item.href || pathname.startsWith(item.href + "/")) return true;
    return item.routes?.some((route) => pathname === route || pathname.startsWith(route + "/")) ?? false;
  };
  const badgeValue = (b?: keyof NavCounts) => (b ? navCounts[b] ?? 0 : 0);
  const visibleItems = PRIMARY_MENU.filter(canSee).filter((item) => !searching || t(item.key).toLowerCase().includes(query.trim().toLowerCase()));

  const renderNav = (onNavigate: () => void) => (
    <nav className="flex-1 overflow-y-auto px-2 py-3">
      {!collapsed && <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{t("finoraWorkflow")}</div>}
      <div className="space-y-1">
        {visibleItems.map((item) => {
          const active = isActive(item);
          const badge = badgeValue(item.badge);
          const isService = item.key === "services" && allowed.has("cases.read");
          return (
            <div key={item.key}>
              <div className="flex items-center gap-1">
                <Link
                  href={item.href}
                  onClick={() => { if (isService) setServicesExpanded(true); onNavigate(); }}
                  title={collapsed ? t(item.key) : undefined}
                  className={`group flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${active ? "border-e-4 border-emerald-400 bg-emerald-600/20 font-semibold text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}
                >
                  <span className="w-5 shrink-0 text-center text-base">{item.icon}</span>
                  {!collapsed && <><span className="flex-1 truncate">{t(item.key)}</span>{badge > 0 && <span className="min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">{badge}</span>}</>}
                </Link>
                {isService && !collapsed && <button type="button" onClick={() => setServicesExpanded((v) => !v)} aria-label={t("servicesWorkflow")} aria-expanded={servicesExpanded || pathname.startsWith("/services-workflow")} className="rounded-lg px-2 py-2 text-xs text-slate-400 hover:bg-white/10 hover:text-white">{servicesExpanded || pathname.startsWith("/services-workflow") ? "▾" : "▸"}</button>}
              </div>
              {isService && !collapsed && (servicesExpanded || pathname.startsWith("/services-workflow")) && (
                <div className="my-1 ms-5 space-y-0.5 border-s border-white/10 ps-2">
                  {WORKFLOW_KEYS.map((key) => <Link key={key} href={`/services-workflow/${key}`} onClick={onNavigate} className={`block rounded-md px-2 py-1.5 text-xs transition ${pathname === `/services-workflow/${key}` ? "bg-emerald-700/40 font-semibold text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>{WORKFLOW_SERVICES[key].label[lang]}</Link>)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!collapsed && visibleItems.length === 0 && <p className="px-3 py-8 text-center text-xs text-slate-500">{t("noData")}</p>}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className={`sticky top-0 hidden h-screen flex-col bg-slate-900 text-white print:hidden lg:flex ${collapsed ? "w-[76px]" : "w-64"} transition-all`}>
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-4">
          {!collapsed && <div className="min-w-0"><div className="text-xl font-black tracking-wide text-emerald-400">{t("appName")}</div><div className="mt-0.5 text-[11px] text-slate-400">{t("slogan")}</div></div>}
          <button onClick={() => setCollapsed((c) => !c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" title={collapsed ? t("expandMenu") : t("collapseMenu")}>{collapsed ? "«" : "»"}</button>
        </div>
        {!collapsed && <div className="px-3 pb-2"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`🔍 ${t("search")}`} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none" /></div>}
        {renderNav(() => {})}
        <div className="border-t border-white/10 px-3 py-3 text-xs text-slate-400">
          {!collapsed ? <><div className="truncate font-medium text-white">{user.fullName}</div><div className="truncate">{roleLabel}</div></> : <div className="text-center font-medium text-white" title={user.fullName}>{user.fullName.slice(0, 1)}</div>}
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col bg-slate-900 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4"><div className="text-lg font-black text-emerald-400">{t("appName")}</div><button onClick={() => setOpen(false)} className="text-2xl text-slate-300">×</button></div>
            <div className="px-3 pb-2"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`🔍 ${t("search")}`} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none" /></div>
            {renderNav(() => setOpen(false))}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white print:hidden">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
            <button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="menu"><span className="mb-1 block h-0.5 w-5 bg-slate-700" /><span className="mb-1 block h-0.5 w-5 bg-slate-700" /><span className="block h-0.5 w-5 bg-slate-700" /></button>
            <div className="font-black text-emerald-700 lg:hidden">{t("appName")}</div>
            {navCounts.total > 0 && <Link href="/dashboard" className="hidden items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 sm:flex"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />{navCounts.total} {t("itemsNeedAttention")}</Link>}
            <div className="flex-1" />
            <select className="input !w-auto max-w-[160px] text-xs sm:max-w-xs sm:text-sm" value={org.id} title={t("switchOrg")} onChange={(e) => start(async () => { await switchOrganizationAction(e.target.value); router.push("/dashboard"); router.refresh(); })}>{memberships.map((m) => <option key={m.orgId} value={m.orgId}>{m.isDemo ? `[${t("demoBadge")}] ` : ""}{m.orgName}</option>)}</select>
            <select className="input !w-auto text-xs sm:text-sm" value={lang} onChange={(e) => start(async () => { await setLanguageAction(e.target.value); router.refresh(); })} title={t("language")}>{LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</select>
            <form action={logoutAction}><button className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50 sm:text-sm" title={user.email}>{t("logout")}</button></form>
          </div>
          {org.isDemo && <div className="border-t border-amber-200 bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900">⚠ {t("demoOrgBanner")}</div>}
        </header>
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-3 sm:p-5 lg:p-6">{children}</main>
        <footer className="px-4 py-3 text-center text-[11px] text-slate-400 print:hidden">{t("appName")} · {org.name} · {org.currency}</footer>
      </div>
      <Toaster />
    </div>
  );
}
