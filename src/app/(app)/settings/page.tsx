import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { exchangeRates, publicSites } from "@/db/schema";
import { pageContext } from "@/lib/page";
import { DEFAULT_APPROVAL, DEFAULT_NUMBERING, getSetting } from "@/lib/finance";
import { saveOrganizationSettings, saveApprovalSettings, saveNumberingSettings, addExchangeRate, clearDemoDataAction, createDemoDataAction } from "@/actions/admin";
import { changePasswordAction } from "@/actions/auth";
import { savePublicWebsiteAction } from "@/actions/public-site";
import { SITE_CONTENT } from "@/lib/website-seed";
import { Card, KV, PageHeader, Table } from "@/components/ui";
import { ActionButton, FormDialog } from "@/components/forms";
import { JALALI_MONTHS, formatDate } from "@/lib/jalali";
import { CURRENCIES } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/permissions";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "تنظیمات سازمان و سیستم",
};

const NUMBERING_LABEL: Record<string, string> = { customer: "customers", income: "income", expense: "expenses", document: "documents", contract: "contracts", journal: "journalEntries", transaction: "transactions", case: "case", receipt: "receipt", letter: "letters", tax_settlement: "taxSettlement", generated_form: "officialForms" };

export default async function SettingsPage() {
  const { ctx, t, lang, fmt } = await pageContext("settings.read");
  const org = ctx.org;
  const [approval, numbering, rates, siteRows] = await Promise.all([
    getSetting(db, org.id, "approval", DEFAULT_APPROVAL),
    getSetting(db, org.id, "numbering", DEFAULT_NUMBERING),
    db.select().from(exchangeRates).where(eq(exchangeRates.organizationId, org.id)).orderBy(desc(exchangeRates.effectiveDate), desc(exchangeRates.createdAt)).limit(50),
    db.select().from(publicSites).where(eq(publicSites.organizationId, org.id)).limit(1),
  ]);
  const site = siteRows[0];
  const siteContent = (site?.content ?? SITE_CONTENT) as typeof SITE_CONTENT;
  const canManage = ctx.can("settings.manage");
  const months = JALALI_MONTHS[lang];
  return (
    <>
      <PageHeader title={t("settings")} subtitle={`${org.name} · ${ROLE_LABELS[ctx.roleKey][lang]}`} />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title={t("orgProfile")} actions={canManage && (
          <FormDialog title={t("orgProfile")} triggerLabel={t("edit")} triggerSize="sm" triggerVariant="secondary" action={saveOrganizationSettings} wide fields={[
            { name: "name", label: t("organizationName"), required: true, defaultValue: org.name },
            { name: "legalName", label: t("legalName"), defaultValue: org.legalName },
            { name: "phone", label: t("phone"), defaultValue: org.phone },
            { name: "email", label: t("email"), type: "email", defaultValue: org.email },
            { name: "licenseNumber", label: t("licenseNumber"), defaultValue: org.licenseNumber },
            { name: "taxNumber", label: t("taxNumber"), defaultValue: org.taxNumber },
            { name: "address", label: t("address"), defaultValue: org.address, full: true },
            { name: "logo", label: t("logoUrl"), type: "file", accept: "image/*", full: true, help: org.logoUrl ? "برای تغییر لوگو، تصویر جدید انتخاب کنید." : "PNG، JPG یا SVG؛ حداکثر ۲ مگابایت." },
            { name: "fiscalYearStartMonth", label: t("fiscalYearStart"), type: "select", required: true, defaultValue: String(org.fiscalYearStartMonth), options: months.map((m, i) => ({ value: String(i + 1), label: m })) },
            { name: "dateFormat", label: t("dateFormat"), type: "select", required: true, defaultValue: org.dateFormat, options: [{ value: "jalali", label: t("jalali") }, { value: "gregorian", label: t("gregorian") }] },
          ]} />
        )}>
          <div className="flex items-start gap-4">
            {org.logoUrl && <img src={org.logoUrl} alt="logo" className="h-16 w-16 rounded-lg object-contain border" />}
            <div className="flex-1">
              <KV items={[
                [t("organizationName"), org.name], [t("legalName"), org.legalName], [t("phone"), org.phone], [t("email"), org.email], [t("address"), org.address],
                [t("licenseNumber"), org.licenseNumber], [t("taxNumber"), org.taxNumber], [t("defaultCurrency"), `${org.currency} (${t("afn")})`],
                [t("fiscalYearStart"), months[org.fiscalYearStartMonth - 1]], [t("dateFormat"), t(org.dateFormat)], [t("language"), lang], ["Timezone", org.timezone],
              ]} />
            </div>
          </div>
        </Card>
        <Card title={t("approvalSettings")} actions={canManage && (
          <FormDialog title={t("approvalSettings")} triggerLabel={t("edit")} triggerSize="sm" triggerVariant="secondary" action={saveApprovalSettings} fields={[
            { name: "incomeThreshold", label: `${t("incomeThreshold")} (${org.currency})`, type: "number", required: true, defaultValue: approval.incomeThreshold },
            { name: "expenseThreshold", label: `${t("expenseThreshold")} (${org.currency})`, type: "number", required: true, defaultValue: approval.expenseThreshold },
            { name: "documentApproval", label: t("documentApprovalRequired"), type: "checkbox", defaultValue: approval.documentApproval },
          ]} />
        )}>
          <KV items={[[t("incomeThreshold"), `${Number(approval.incomeThreshold).toLocaleString()} ${org.currency}`], [t("expenseThreshold"), `${Number(approval.expenseThreshold).toLocaleString()} ${org.currency}`], [t("documentApprovalRequired"), approval.documentApproval ? t("yes") : t("no")]]} />
          <p className="mt-3 text-xs text-slate-500">{t("operator") ?? "Operator"} → {ROLE_LABELS.manager[lang]} → {ROLE_LABELS.accountant[lang]} → {t("auditLog")}</p>
        </Card>
        <Card title={t("numbering")} actions={canManage && (
          <FormDialog title={t("numbering")} triggerLabel={t("edit")} triggerSize="sm" triggerVariant="secondary" action={saveNumberingSettings} fields={Object.keys(DEFAULT_NUMBERING).map((k) => ({ name: k, label: `${t("prefix")}: ${t(NUMBERING_LABEL[k] ?? k)}`, defaultValue: numbering[k], required: true }))} />
        )}>
          <KV items={Object.entries(numbering).map(([k, v]) => [k, <span key={k} className="font-mono" dir="ltr">{v}-1404-00001</span>])} />
        </Card>
        <Card title={t("exchangeRates")} actions={canManage && (
          <FormDialog title={t("exchangeRates")} triggerLabel={`+ ${t("add")}`} triggerSize="sm" action={addExchangeRate} fields={[
            { name: "currency", label: t("currency"), type: "select", required: true, defaultValue: "USD", options: CURRENCIES.filter((c) => c !== org.currency).map((c) => ({ value: c, label: c })) },
            { name: "rate", label: `1 unit = ? ${org.currency}`, type: "number", required: true, step: "0.000001" },
            { name: "effectiveDate", label: t("effectiveFrom"), type: "date", required: true },
          ]} />
        )}>
          <Table headers={[t("currency"), t("exchangeRate"), t("effectiveFrom")]} empty={t("noData")} rows={rates.map((r) => [<span key="c" className="font-mono">{r.currency}</span>, <span key="r" className="font-mono" dir="ltr">{Number(r.rate)} {org.currency}</span>, formatDate(r.effectiveDate, fmt)])} />
          <p className="mt-2 text-xs text-slate-500">Historical transactions keep the rate stored at the time of posting.</p>
        </Card>
        {ctx.can("public_site.manage") && (
          <Card title={t("publicManagement")} actions={<FormDialog title={t("publicManagement")} triggerLabel={t("edit")} triggerSize="sm" triggerVariant="secondary" action={savePublicWebsiteAction} wide fields={[
            { name: "taglineFa", label: `شعار — ${t("dari")}`, required: true, defaultValue: siteContent.fa.tagline },
            { name: "taglinePs", label: "شعار — پښتو", required: true, defaultValue: siteContent.ps.tagline },
            { name: "taglineEn", label: "Tagline — English", required: true, defaultValue: siteContent.en.tagline },
            { name: "phone1", label: `${t("phone")} 1`, required: true, defaultValue: siteContent.fa.phone1 },
            { name: "phone2", label: `${t("phone")} 2`, defaultValue: siteContent.fa.phone2 },
            { name: "phone3", label: `${t("phone")} 3`, defaultValue: siteContent.fa.phone3 },
            { name: "email", label: t("email"), type: "email", required: true, defaultValue: siteContent.fa.email },
            { name: "addressFa", label: `آدرس — ${t("dari")}`, required: true, defaultValue: siteContent.fa.address, full: true },
            { name: "addressPs", label: "پته — پښتو", required: true, defaultValue: siteContent.ps.address, full: true },
            { name: "addressEn", label: "Address — English", required: true, defaultValue: siteContent.en.address, full: true },
            { name: "isPublished", label: t("published"), type: "checkbox", defaultValue: site?.isPublished ?? true },
          ]} />}>
            <KV items={[[t("published"), site?.isPublished ? t("yes") : t("no")], [t("phone"), siteContent.fa.phone1], [t("email"), siteContent.fa.email], [t("address"), siteContent.fa.address]]} />
            <p className="mt-3 text-xs leading-6 text-amber-800">{t("publicRequests")} — {t("no")} · {t("onlinePayments")} — {t("no")}. {t("notGovernment")}</p>
          </Card>
        )}
        <Card title={t("security")}>
          <FormDialog title={t("newPassword")} triggerLabel={t("newPassword")} triggerVariant="secondary" action={changePasswordAction} fields={[{ name: "current", label: t("password"), type: "password", required: true }, { name: "password", label: t("newPassword"), type: "password", required: true }]} />
          <p className="mt-3 text-xs text-slate-500">{t("systemRoles")}: {Object.values(ROLE_LABELS).map((r) => r[lang]).join(" · ")}</p>
        </Card>
        {ctx.can("demo.manage") && (
          <Card title={t("demoData")}>
            <p className="text-sm text-slate-600 mb-3">{org.isDemo ? t("clearDemoHelp") : t("createDemo")}</p>
            <div className="flex gap-2">
              {org.isDemo && <ActionButton action={clearDemoDataAction} label={t("clearDemo")} variant="danger" size="md" confirm={t("clearDemoHelp")} />}
              {!org.isDemo && !ctx.memberships.some((m) => m.isDemo) && <ActionButton action={createDemoDataAction} label={t("createDemo")} variant="secondary" size="md" />}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
