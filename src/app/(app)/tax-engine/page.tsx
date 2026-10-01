import Link from "next/link";
import { db } from "@/db";
import { pageContext } from "@/lib/page";
import { ensureMofTaxCatalog, MOF_TAX_RULES_SEED } from "@/lib/tax-engine";
import { getTaxEngineRulesAction } from "@/actions/tax-engine";
import { PageHeader, Card, Stat } from "@/components/ui";
import { TaxEngineCalculator } from "@/components/TaxEngineCalculator";
import type { Metadata } from "next";
import { Badge } from "@/components/ui";
import { TaxNav } from "@/components/TaxNav";

export const metadata: Metadata = {
  title: "موتور محاسبه مالیه",
};

export default async function TaxEnginePage() {
  const { ctx, t } = await pageContext("tax_rules.read");
  // Keep the Ministry of Finance catalog in sync for the active organization
  await db.transaction((tx) => ensureMofTaxCatalog(tx, ctx.org.id, ctx.user.id));
  const rules = await getTaxEngineRulesAction();

  return (
    <>
      <PageHeader
        title={t("taxEngine") ?? "موتور محاسبه مالیه"}
        subtitle="محاسبه مالیاتی بر اساس قوانین، رهنمودها و طرزالعمل‌های جدید وزارت مالیه امارت اسلامی افغانستان (mof.gov.af / ard.gov.af)"
        actions={<Link href="/tax-settlements" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{t("taxSettlement")}</Link>}
      />
      <TaxNav active="engine" t={t} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("taxRules")} value={rules.length} tone="blue" />
        <Stat label="تأییدشده از منبع رسمی" value={rules.filter((r) => r.verificationStatus === "verified").length} tone="green" />
        <Stat label={t("officialForms")} value={MOF_TAX_RULES_SEED.length} />
        <Stat label="امارت اسلامی افغانستان" value="۱۴۰۳ هجري" tone="amber" />
      </div>

      <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-6 text-emerald-950">
        <strong>قوانین و طرزالعمل‌های جاری اعمال‌شده: </strong>
        ۱) قانون مالیات بر عایدات ۱۳۸۷ (بنیاد قانونی جاری) ·
        ۲) طرزالعمل جدید اصناف و کسبه‌کاران (معافیت ۲,۰۰۰,۰۰۰ افغانی + ۰.۳٪ بر مازاد) ·
        ۳) معافیت ۱۰۰٪ جرایم مالیاتی ·
        ۴) طرزالعمل تصفیه ابتدایی مالیات با ۵ سند حمایوی در ۲۱ روز (ماده ۵۹ قانون اداره امور مالیات) ·
        ۵) جدول پلکانی مالیه موضوعی معاشات (ماده ۵۸) ·
        ۶) مالیه موضوعی کرایه (ماده ۵۹) ·
        ۷) مالیه موضوعی قراردادی ۲٪ / ۷٪ (ماده ۷۲) ·
        ۸) مالیه معاملات انتفاعی ۴٪ / ۲٪ / ۵٪ / ۱۰٪ (ماده ۶۴) ·
        ۹) مالیه ثابت واردات ۲٪ / ۳٪ (ماده ۷۰) ·
        ۱۰) مالیه ثابت تجارت‌های کوچک ربع‌وار (ماده ۷۵) ·
        ۱۱) مالیه بر عایدات سالانه شرکت‌ها ۲۰٪ (ماده ۴ و ماده ۱۸)
      </div>

      <Card className="mb-4">
        <TaxEngineCalculator rules={rules} />
      </Card>

      <Card title={`${t("taxRules")} — ${rules.length}`}>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full min-w-[900px] text-sm">
            <thead><tr className="bg-slate-50 text-xs uppercase text-slate-500">
              <th className="px-3 py-2 text-start">{t("taxType")}</th>
              <th className="px-3 py-2 text-start">{t("legalRuleName")}</th>
              <th className="px-3 py-2 text-start">{t("articleNumber")}</th>
              <th className="px-3 py-2 text-start">{t("formulaMode") ?? "نوع فرمول"}</th>
              <th className="px-3 py-2">{t("taxRate")}</th>
              <th className="px-3 py-2">{t("ruleVersion")}</th>
              <th className="px-3 py-2">{t("status")}</th>
              <th className="px-3 py-2">{t("sourceUrl")}</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rules.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2"><span className="font-mono text-xs font-semibold">{r.taxTypeCode ?? "-"}</span></td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-800">{r.ruleName}</div>
                    {r.formulaDescription && <div className="mt-0.5 text-[11px] leading-5 text-slate-500">{r.formulaDescription}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs">{r.articleNumber ?? "-"}</td>
                  <td className="px-3 py-2 text-xs">{r.formulaMode}</td>
                  <td className="px-3 py-2 text-center font-mono">{r.rate === null ? "—" : `${Number(r.rate)}%`}</td>
                  <td className="px-3 py-2 text-center font-mono">v{r.version}</td>
                  <td className="px-3 py-2 text-center"><Badge status="approved" label={t("verified")} /></td>
                  <td className="px-3 py-2 text-center">{r.sourceUrl ? <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="text-emerald-700 underline">↗</a> : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
