"use client";
import { useState, useTransition } from "react";
import { useI18n } from "@/lib/i18n/client";
import { computeTaxPreviewAction, type TaxEngineRule, type TaxEngineResult } from "@/actions/tax-engine";
import { btnClass, toast } from "@/components/forms";
import { Money } from "@/components/ui";

const MODE_LABELS: Record<string, string> = {
  net_percentage: "فیصدی بر عاید خالص (ماده ۴)",
  gross_percentage: "فیصدی بر عواید ناخالص (BRT / موضوعی)",
  progressive_brackets: "جدول پلکانی (معاشات ماده ۵۸)",
  flat_tier: "طبقه‌بندی مقطوع (کرایه ماده ۵۹)",
  flat_amount: "مبلغ ثابت ربع‌وار (تجارت کوچک ماده ۷۵)",
  exempt_threshold_excess: "معافیت پایه + فیصدی مازاد (اصناف)",
};

export function TaxEngineCalculator({ rules }: { rules: TaxEngineRule[] }) {
  const { t } = useI18n();
  const [ruleId, setRuleId] = useState(rules[0]?.id ?? "");
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10));
  const [taxable, setTaxable] = useState("");
  const [expenses, setExpenses] = useState("0");
  const [exemptions, setExemptions] = useState("0");
  const [deductions, setDeductions] = useState("0");
  const [months, setMonths] = useState("1");
  const [result, setResult] = useState<TaxEngineResult | null>(null);
  const [ruleName, setRuleName] = useState("");
  const [pending, start] = useTransition();

  const selected = rules.find((r) => r.id === ruleId);

  const run = () => {
    const fd = new FormData();
    fd.set("ruleId", ruleId);
    fd.set("periodStart", periodStart);
    fd.set("periodEnd", periodEnd);
    fd.set("taxableAmount", taxable || "0");
    fd.set("allowableExpenses", expenses || "0");
    fd.set("exemptions", exemptions || "0");
    fd.set("deductions", deductions || "0");
    fd.set("monthsCount", months || "1");
    start(async () => {
      const r = await computeTaxPreviewAction(fd);
      if (!r.ok || !r.result) {
        toast("error", t("error"));
        setResult(null);
        return;
      }
      setResult(r.result);
      setRuleName(r.ruleName ?? "");
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* Inputs */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
        <h3 className="mb-3 text-sm font-bold text-slate-700">{t("taxRule") ?? "قاعده مالیاتی"} — وزارت مالیه امارت اسلامی افغانستان</h3>
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">{t("taxRules")}</span>
            <select className="input" value={ruleId} onChange={(e) => setRuleId(e.target.value)}>
              {rules.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.taxTypeCode ? `[${r.taxTypeCode}] ` : ""}{r.ruleName} (v{r.version})
                </option>
              ))}
            </select>
          </label>
          {selected && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-[11px] leading-6 text-emerald-950">
              <div><strong>{t("articleNumber")}:</strong> {selected.articleNumber ?? "-"}</div>
              <div><strong>{t("formulaMode") ?? "نوع فرمول"}:</strong> {MODE_LABELS[selected.formulaMode] ?? selected.formulaMode}</div>
              {selected.exemptThreshold !== null && <div><strong>{t("exemptions")}:</strong> {selected.exemptThreshold.toLocaleString()} AFN</div>}
              {selected.filingFormCode && <div><strong>{t("officialForms")}:</strong> {selected.filingFormCode}</div>}
              {selected.formulaDescription && <div className="mt-1 border-t border-emerald-200 pt-1">{selected.formulaDescription}</div>}
              {selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-emerald-800 underline">{t("sourceUrl")} ↗</a>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm"><span className="mb-1 block text-slate-600">{t("from")}</span><input type="date" className="input" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} /></label>
            <label className="block text-sm"><span className="mb-1 block text-slate-600">{t("to")}</span><input type="date" className="input" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} /></label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">{t("taxableAmount")}</span>
            <input type="number" step="0.01" min="0" dir="ltr" className="input" value={taxable} onChange={(e) => setTaxable(e.target.value)} placeholder="0" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">{t("allowableExpenses")}</span>
            <input type="number" step="0.01" min="0" dir="ltr" className="input" value={expenses} onChange={(e) => setExpenses(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm"><span className="mb-1 block text-slate-600">{t("exemptions")}</span><input type="number" step="0.01" min="0" dir="ltr" className="input" value={exemptions} onChange={(e) => setExemptions(e.target.value)} /></label>
            <label className="block text-sm"><span className="mb-1 block text-slate-600">{t("deductions")}</span><input type="number" step="0.01" min="0" dir="ltr" className="input" value={deductions} onChange={(e) => setDeductions(e.target.value)} /></label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">{t("monthsCount") ?? "تعداد ماه‌های دوره"}</span>
            <input type="number" min="1" dir="ltr" className="input" value={months} onChange={(e) => setMonths(e.target.value)} />
          </label>
          <button type="button" disabled={pending || !ruleId} className={`${btnClass("primary")} w-full`} onClick={run}>
            {pending ? "…" : `⚙ ${t("calculate") ?? "محاسبه"}`}
          </button>
        </div>
      </div>

      {/* Result */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-3">
        <h3 className="mb-3 text-sm font-bold text-slate-700">{t("taxCalculation") ?? "نتیجه محاسبه"}</h3>
        {!result && <p className="py-12 text-center text-sm text-slate-400">{t("noData")}</p>}
        {result && (
          <div className="space-y-4">
            {!result.usable && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <strong>REQUIRES_LEGAL_REVIEW</strong> — {result.formulaSummary}
              </div>
            )}
            {result.usable && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[11px] text-slate-500">{t("taxableBase")}</div>
                    <div className="mt-1"><Money value={result.taxableBase} /></div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[11px] text-slate-500">{t("taxRate")}</div>
                    <div className="mt-1 font-mono font-bold">{result.effectiveRate === null ? "—" : `${result.effectiveRate}%`}</div>
                  </div>
                  <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50 p-3 sm:col-span-2">
                    <div className="text-[11px] text-emerald-700">{t("taxAmount")}</div>
                    <div className="mt-1 text-xl font-bold text-emerald-900"><Money value={result.taxAmount} /></div>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-50 text-xs text-slate-500"><th className="p-2 text-start">گام محاسبه</th><th className="p-2">مبنای مشمول</th><th className="p-2">نرخ</th><th className="p-2">مالیه</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.steps.map((s, i) => (
                        <tr key={i}>
                          <td className="p-2">{s.label}</td>
                          <td className="p-2 text-center"><Money value={s.base} /></td>
                          <td className="p-2 text-center font-mono">{s.rate}%</td>
                          <td className="p-2 text-center"><Money value={s.tax} colored /></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="bg-slate-50 font-bold"><td className="p-2" colSpan={3}>{t("taxAmount")}</td><td className="p-2 text-center"><Money value={result.taxAmount} /></td></tr></tfoot>
                  </table>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs leading-6 text-emerald-950">
                  <strong>{t("formula") ?? "فرمول"}: </strong>{result.formulaSummary}
                </div>
                {ruleName && <p className="text-xs text-slate-500">{t("taxRules")}: {ruleName}</p>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
