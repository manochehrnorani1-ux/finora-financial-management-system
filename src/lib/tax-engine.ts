import "server-only";
import { and, eq } from "drizzle-orm";
import { taxRules, taxTypes } from "@/db/schema";
import { round2 } from "./format";
import type { DbOrTx } from "./finance";

export interface TaxBracket {
  upTo: number | null; // null means infinity
  rate: number; // percentage
  baseTax?: number;
  threshold?: number;
}

export interface TaxTier {
  min: number;
  max: number | null;
  rate: number; // flat percentage on full base when monthly base falls in tier
  amount?: number; // fixed AFN amount per period (used by flat_amount mode — Article 75)
}

export interface TaxRuleConditions {
  formulaMode?: "net_percentage" | "gross_percentage" | "progressive_brackets" | "flat_tier" | "flat_amount" | "exempt_threshold_excess";
  exemptThreshold?: number;
  minApplicableGross?: number;
  brackets?: TaxBracket[];
  tiers?: TaxTier[];
  periodUnit?: "monthly" | "quarterly" | "annual" | "contract";
  allowExpenseDeduction?: boolean;
  creditableAgainstIncomeTax?: boolean;
  penaltyAmnestyApplied?: boolean;
  filingFormCode?: string;
  formulaDescriptionFa?: string;
  formulaDescriptionPs?: string;
  formulaDescriptionEn?: string;
}

export interface TaxComputationInput {
  taxableAmount: number;
  allowableExpenses: number;
  exemptions: number;
  deductions: number;
  monthsCount?: number;
}

export interface TaxComputationStep {
  label: string;
  base: number;
  rate: number;
  tax: number;
}

export interface TaxComputationResult {
  usable: boolean;
  status: "calculated" | "REQUIRES_LEGAL_REVIEW";
  formulaMode: string;
  taxableBase: number;
  effectiveRate: number | null;
  taxAmount: number | null;
  steps: TaxComputationStep[];
  formulaSummary: string;
}

/**
 * Executes the Ministry of Finance tax calculation strictly from the database rule's
 * `calculationType`, `rate`, and `conditions` JSONB. Never guesses a rate if rule is unverified.
 */
export function evaluateTaxRule(
  rule: typeof taxRules.$inferSelect | undefined,
  periodStart: string,
  periodEnd: string,
  input: TaxComputationInput,
): TaxComputationResult {
  if (!rule || rule.verificationStatus !== "verified") {
    return {
      usable: false,
      status: "REQUIRES_LEGAL_REVIEW",
      formulaMode: "unverified",
      taxableBase: 0,
      effectiveRate: null,
      taxAmount: null,
      steps: [],
      formulaSummary: "برای محاسبه نهایی، معلومات رسمی و معتبر مورد نیاز است.",
    };
  }

  if (rule.effectiveFrom > periodStart || (rule.effectiveTo && rule.effectiveTo < periodEnd)) {
    return {
      usable: false,
      status: "REQUIRES_LEGAL_REVIEW",
      formulaMode: "out_of_period",
      taxableBase: 0,
      effectiveRate: null,
      taxAmount: null,
      steps: [],
      formulaSummary: "دوره مالیاتی انتخاب‌شده خارج از تاریخ اعتبار این قاعده است.",
    };
  }

  const cond = (rule.conditions ?? {}) as TaxRuleConditions;
  const mode = cond.formulaMode ?? (rule.calculationType as TaxRuleConditions["formulaMode"]) ?? "net_percentage";
  const months = Math.max(1, Math.round(input.monthsCount ?? 1));

  // 1. Progressive Brackets (ماده ۴ و ۵۸ — مالیه موضوعی معاشات)
  if (mode === "progressive_brackets" && Array.isArray(cond.brackets) && cond.brackets.length > 0) {
    const grossAfterExempt = Math.max(0, round2(input.taxableAmount - input.exemptions));
    const monthlyBase = round2(grossAfterExempt / months);
    let monthlyTax = 0;
    const steps: TaxComputationStep[] = [];
    let prevLimit = 0;

    for (const b of cond.brackets) {
      if (monthlyBase <= prevLimit) break;
      const upper = b.upTo === null ? monthlyBase : Math.min(monthlyBase, b.upTo);
      const slice = Math.max(0, round2(upper - prevLimit));
      if (slice > 0 || prevLimit === 0) {
        const sliceTax = round2((slice * b.rate) / 100);
        monthlyTax = round2(monthlyTax + sliceTax);
        steps.push({
          label: b.upTo === null ? `مازاد ماهوار بر ${prevLimit.toLocaleString()} افغانی (${b.rate}%)` : `پله ماهوار از ${prevLimit.toLocaleString()} تا ${b.upTo.toLocaleString()} افغانی (${b.rate}%)`,
          base: slice,
          rate: b.rate,
          tax: sliceTax,
        });
      }
      if (b.upTo === null) break;
      prevLimit = b.upTo;
    }

    const totalBeforeCredit = round2(monthlyTax * months);
    const credit = Math.max(0, round2(input.deductions));
    const totalTax = Math.max(0, round2(totalBeforeCredit - credit));
    if (months > 1) {
      steps.push({
        label: `مجموع مالیه ${months} ماه (${monthlyTax.toLocaleString()} × ${months})`,
        base: grossAfterExempt,
        rate: grossAfterExempt > 0 ? round2((totalBeforeCredit / grossAfterExempt) * 100) : 0,
        tax: totalBeforeCredit,
      });
    }
    if (credit > 0) {
      steps.push({ label: "کسر مالیه موضوعی قبلاً وضع‌شده", base: credit, rate: 100, tax: -credit });
    }
    const effRate = grossAfterExempt > 0 ? round2((totalTax / grossAfterExempt) * 100) : 0;
    return {
      usable: true,
      status: "calculated",
      formulaMode: mode,
      taxableBase: grossAfterExempt,
      effectiveRate: effRate,
      taxAmount: totalTax,
      steps,
      formulaSummary: `محاسبه پلکانی معاشات طبق ماده ۵۸ (${months} ماه، معاش ماهوار ${monthlyBase.toLocaleString()} افغانی): مالیه ماهوار ${monthlyTax.toLocaleString()} × ${months} = ${totalBeforeCredit.toLocaleString()} افغانی${credit > 0 ? ` − کسرات ${credit.toLocaleString()} = ${totalTax.toLocaleString()} افغانی` : ""}`,
    };
  }

  // 2. Flat Tier on Full Amount (ماده ۵۹ — مالیه موضوعی کرایه عقارات)
  if (mode === "flat_tier" && Array.isArray(cond.tiers) && cond.tiers.length > 0) {
    const grossRent = Math.max(0, round2(input.taxableAmount - input.exemptions));
    const monthlyRent = round2(grossRent / months);
    // Continuous boundary evaluation so fractional AFN values never fall between tiers
    let matched: TaxTier | undefined;
    for (let i = 0; i < cond.tiers.length; i++) {
      const t = cond.tiers[i];
      const isLast = i === cond.tiers.length - 1;
      if (monthlyRent >= t.min && (t.max === null || monthlyRent <= t.max || (!isLast && monthlyRent < cond.tiers[i + 1].min))) {
        matched = t;
        break;
      }
    }
    if (!matched) matched = cond.tiers[cond.tiers.length - 1];

    const grossTax = round2((grossRent * matched.rate) / 100);
    const credit = Math.max(0, round2(input.deductions));
    const taxAmount = Math.max(0, round2(grossTax - credit));
    const steps: TaxComputationStep[] = [
      {
        label: matched.max === null ? `کرایه ماهوار بیش از ${(matched.min - 0.01).toLocaleString()} افغانی (نرخ مقطوع ${matched.rate}% بر کل کرایه)` : matched.rate === 0 ? `کرایه ماهوار کمتر از ۱۰,۰۰۰ افغانی (معاف ۰%)` : `کرایه ماهوار از ${matched.min.toLocaleString()} تا ${matched.max.toLocaleString()} افغانی (نرخ مقطوع ${matched.rate}% بر کل کرایه)`,
        base: grossRent,
        rate: matched.rate,
        tax: grossTax,
      },
    ];
    if (credit > 0) {
      steps.push({ label: "کسر مالیه کرایه قبلاً تحویل‌شده", base: credit, rate: 100, tax: -credit });
    }
    return {
      usable: true,
      status: "calculated",
      formulaMode: mode,
      taxableBase: grossRent,
      effectiveRate: matched.rate,
      taxAmount,
      steps,
      formulaSummary: `کرایه ماهوار ${monthlyRent.toLocaleString()} افغانی (${months} ماه، مجموع ${grossRent.toLocaleString()}) ← نرخ مقطوع ماده ۵۹ (${matched.rate}%) = ${grossTax.toLocaleString()} افغانی${credit > 0 ? ` − پیش‌پرداخت ${credit.toLocaleString()} = ${taxAmount.toLocaleString()} افغانی` : ""}`,
    };
  }

  // 2b. Flat Amount per Period (ماده ۷۵ — مالیه ثابت ربع‌وار تجارت‌های کوچک)
  if (mode === "flat_amount" && Array.isArray(cond.tiers) && cond.tiers.length > 0) {
    const annualIncome = Math.max(0, round2(input.taxableAmount - input.exemptions));
    const matched = cond.tiers.find((t) => annualIncome >= t.min && (t.max === null || annualIncome <= t.max));
    if (!matched) {
      return { usable: false, status: "REQUIRES_LEGAL_REVIEW", formulaMode: mode, taxableBase: annualIncome, effectiveRate: null, taxAmount: null, steps: [], formulaSummary: "طبقه منطبق برای این عواید سالانه یافت نشد." };
    }
    const quarters = Math.max(1, Math.round(input.monthsCount ?? 4) / 3);
    // Article 75: lower tiers are a fixed AFN amount per quarter; the 500,000–3,000,000 tier is 3% of annual gross
    const isPercentageTier = (matched.amount ?? 0) === 0 && matched.rate > 0;
    const grossTax = isPercentageTier ? round2((annualIncome * matched.rate) / 100) : round2((matched.amount ?? 0) * quarters);
    const credit = Math.max(0, round2(input.deductions));
    const taxAmount = Math.max(0, round2(grossTax - credit));
    const steps: TaxComputationStep[] = [
      isPercentageTier
        ? {
            label: `عواید سالانه از ${matched.min.toLocaleString()} تا ${(matched.max ?? "∞").toLocaleString()} افغانی — ${matched.rate}% از عواید ناخالص سالانه (یا ارائه اظهارنامه)`,
            base: annualIncome,
            rate: matched.rate,
            tax: grossTax,
          }
        : {
            label: matched.max === null ? `عواید سالانه بیش از ${matched.min.toLocaleString()} افغانی — مالیه ثابت ${(matched.amount ?? 0).toLocaleString()} افغانی در هر ربع` : `عواید سالانه از ${matched.min.toLocaleString()} تا ${matched.max.toLocaleString()} افغانی — مالیه ثابت ${(matched.amount ?? 0).toLocaleString()} افغانی در هر ربع × ${quarters} ربع`,
            base: annualIncome,
            rate: annualIncome > 0 ? round2((grossTax / annualIncome) * 100) : 0,
            tax: grossTax,
          },
    ];
    if (credit > 0) steps.push({ label: "کسر پیش‌پرداخت ثبت‌شده", base: credit, rate: 100, tax: -credit });
    return {
      usable: true,
      status: "calculated",
      formulaMode: mode,
      taxableBase: annualIncome,
      effectiveRate: annualIncome > 0 ? round2((taxAmount / annualIncome) * 100) : 0,
      taxAmount,
      steps,
      formulaSummary: `عواید سالانه ${annualIncome.toLocaleString()} افغانی ← طبقه ماده ۷۵: ${isPercentageTier ? `${matched.rate}% عواید ناخالص` : `مالیه ثابت ${(matched.amount ?? 0).toLocaleString()} افغانی × ${quarters} ربع`} = ${grossTax.toLocaleString()} افغانی${credit > 0 ? ` − پیش‌پرداخت ${credit.toLocaleString()} = ${taxAmount.toLocaleString()} افغانی` : ""}`,
    };
  }

  // 3. Exempt Threshold + Percentage on Excess (طرزالعمل جدید اصناف و کسبه‌کاران وزارت مالیه)
  if (mode === "exempt_threshold_excess") {
    if (rule.rate === null) {
      return { usable: false, status: "REQUIRES_LEGAL_REVIEW", formulaMode: mode, taxableBase: 0, effectiveRate: null, taxAmount: null, steps: [], formulaSummary: "نرخ قاعده مشخص نیست." };
    }
    const threshold = Number(cond.exemptThreshold ?? 2000000);
    const netSales = Math.max(0, round2(input.taxableAmount - input.exemptions));
    const exemptPortion = Math.min(netSales, threshold);
    const excessBase = Math.max(0, round2(netSales - threshold));
    const rateNum = Number(rule.rate);
    const grossTax = round2((excessBase * rateNum) / 100);
    const credit = Math.max(0, round2(input.deductions));
    const taxAmount = Math.max(0, round2(grossTax - credit));
    const steps: TaxComputationStep[] = [
      { label: `سقف معافیت قانونی فروش سالانه اصناف تا ${threshold.toLocaleString()} افغانی`, base: exemptPortion, rate: 0, tax: 0 },
      { label: `مازاد فروش بر سقف معافیت (${rateNum}%)`, base: excessBase, rate: rateNum, tax: grossTax },
    ];
    if (credit > 0) {
      steps.push({ label: "کسر پیش‌پرداخت ثبت‌شده", base: credit, rate: 100, tax: -credit });
    }
    return {
      usable: true,
      status: "calculated",
      formulaMode: mode,
      taxableBase: excessBase,
      effectiveRate: rateNum,
      taxAmount,
      steps,
      formulaSummary: `فروش سالانه ${netSales.toLocaleString()} − معافیت اصناف ${threshold.toLocaleString()} = مازاد مشمول مالیه ${excessBase.toLocaleString()} × ${rateNum}% = ${grossTax.toLocaleString()} افغانی${credit > 0 ? ` − کسرات ${credit.toLocaleString()} = ${taxAmount.toLocaleString()} افغانی` : ""}`,
    };
  }

  // 4. Gross Percentage (ماده ۶۴ معاملات انتفاعی BRT، ماده ۷۲ قراردادی ۲٪ و ۷٪، ماده ۷۰ واردات، ماده ۴۶ سهام ۲۰٪)
  if (mode === "gross_percentage") {
    if (rule.rate === null) {
      return { usable: false, status: "REQUIRES_LEGAL_REVIEW", formulaMode: mode, taxableBase: 0, effectiveRate: null, taxAmount: null, steps: [], formulaSummary: "نرخ قاعده مشخص نیست." };
    }
    const grossBase = Math.max(0, round2(input.taxableAmount - input.exemptions));
    const rateNum = Number(rule.rate);
    const grossTax = round2((grossBase * rateNum) / 100);
    const credit = Math.max(0, round2(input.deductions));
    const taxAmount = Math.max(0, round2(grossTax - credit));
    const thresholdNote = cond.minApplicableGross
      ? grossBase >= cond.minApplicableGross
        ? ` (مبلغ بالای حد نصاب ${cond.minApplicableGross.toLocaleString()} افغانی ماده ۷۲)`
        : ` (توجه: مبلغ یک‌باره کمتر از حد نصاب سالانه ${cond.minApplicableGross.toLocaleString()} افغانی ماده ۷۲ است؛ در صورت عبور مجموع سالانه از ۵۰۰,۰۰۰ افغانی تابع وضع مالیه می‌باشد)`
      : "";
    const steps: TaxComputationStep[] = [
      { label: `عواید / تادیات ناخالص مشمول (${rateNum}%)${thresholdNote}`, base: grossBase, rate: rateNum, tax: grossTax },
    ];
    if (credit > 0) {
      steps.push({ label: "کسر مالیه قبلاً تحویل‌شده در دوره", base: credit, rate: 100, tax: -credit });
    }
    return {
      usable: true,
      status: "calculated",
      formulaMode: mode,
      taxableBase: grossBase,
      effectiveRate: rateNum,
      taxAmount,
      steps,
      formulaSummary: `مبلغ ناخالص مشمول ${grossBase.toLocaleString()} × ${rateNum}% = ${grossTax.toLocaleString()} افغانی${credit > 0 ? ` − پیش‌پرداخت ${credit.toLocaleString()} = ${taxAmount.toLocaleString()} افغانی` : ""}${thresholdNote}`,
    };
  }

  // 5. Net Income Percentage (ماده ۴ و ماده ۱۸ — اظهارنامه مالیه بر عایدات خالص سالانه ۲۰٪)
  if (rule.rate === null) {
    return { usable: false, status: "REQUIRES_LEGAL_REVIEW", formulaMode: mode, taxableBase: 0, effectiveRate: null, taxAmount: null, steps: [], formulaSummary: "نرخ قاعده مشخص نیست." };
  }
  const netBase = Math.max(0, round2(input.taxableAmount - input.allowableExpenses - input.exemptions));
  const rateNum = Number(rule.rate);
  const assessedIncomeTax = round2((netBase * rateNum) / 100);
  const taxCredits = Math.max(0, round2(input.deductions));
  const finalTaxPayable = Math.max(0, round2(assessedIncomeTax - taxCredits));
  const steps: TaxComputationStep[] = [
    { label: "عواید ناخالص دوره مالیاتی", base: input.taxableAmount, rate: 0, tax: 0 },
    { label: "کسر مصارف قابل مجرایی (ماده ۱۸ به شمول مالیه انتفاعی) و معافیت‌ها", base: round2(input.allowableExpenses + input.exemptions), rate: 0, tax: 0 },
    { label: `مفاد خالص مشمول مالیه × ${rateNum}% (سطر ۱۳۰ اظهارنامه)`, base: netBase, rate: rateNum, tax: assessedIncomeTax },
  ];
  if (taxCredits > 0) {
    steps.push({
      label: "کسر کریدیت مالیات موضوعی و پیش‌پرداخت‌های قابل مجرایی (۲٪ قراردادی ماده ۷۲ / ۲٪ واردات ماده ۷۰)",
      base: taxCredits,
      rate: 100,
      tax: -taxCredits,
    });
  }
  return {
    usable: true,
    status: "calculated",
    formulaMode: "net_percentage",
    taxableBase: netBase,
    effectiveRate: rateNum,
    taxAmount: finalTaxPayable,
    steps,
    formulaSummary: `(عواید ناخالص ${input.taxableAmount.toLocaleString()} − مصارف قابل مجرایی ${input.allowableExpenses.toLocaleString()} − معافیت‌ها ${input.exemptions.toLocaleString()}) = مفاد خالص ${netBase.toLocaleString()} × ${rateNum}% = مالیه سنجش‌شده ${assessedIncomeTax.toLocaleString()} افغانی${taxCredits > 0 ? ` − کریدیت مالیات موضوعی پیش‌پرداخت‌شده ${taxCredits.toLocaleString()} = خالص قابل تادیه ${finalTaxPayable.toLocaleString()} افغانی` : ""}`,
  };
}

/**
 * Official Ministry of Finance of Afghanistan (mof.gov.af / ard.gov.af) tax types and rules catalog.
 */
export const MOF_TAX_TYPES_SEED = [
  { code: "BRT", name: "مالیه معاملات انتفاعی (BRT — ماده ۶۴)", description: "مالیه بر عواید ناخالص فروش اجناس و عرضه خدمات مطابق فصل دهم قانون مالیات بر عایدات و رهنمود شماره ۳ وزارت مالیه." },
  { code: "WHT-CTR-LIC", name: "مالیه موضوعی قراردادی دارای جواز (۲٪ — ماده ۷۲)", description: "وضع ۲٪ از تادیات ناخالص به قراردادی‌های دارای جواز فعالیت معتبر (قابل مجرایی در سنجش مالیه سالانه)." },
  { code: "WHT-CTR-UNLIC", name: "مالیه موضوعی قراردادی بدون جواز (۷٪ — ماده ۷۲)", description: "وضع ۷٪ مالیه مقطوع به عوض مالیه بر عایدات از قراردادی‌های فاقد جواز معتبر." },
  { code: "WHT-WAGE", name: "مالیه موضوعی معاشات (جدول پلکانی — ماده ۵۸)", description: "مالیه موضوعی ماهوار معاشات و دستمزد کارمندان مطابق ماده ۴ و ۵۸ و رهنمود شماره ۵ وزارت مالیه." },
  { code: "WHT-RENT", name: "مالیه موضوعی کرایه عقارات (ماده ۵۹)", description: "مالیه موضوعی کرایه منازل و تعمیرات تجارتی/کرایه‌شده به اشخاص حکمی و حقیقی مطابق ماده ۵۹ و رهنمود شماره ۱ وزارت مالیه." },
  { code: "CIT-ANNUAL", name: "مالیه بر عایدات خالص سالانه (۲۰٪ — ماده ۴)", description: "مالیه ۲۰٪ بر مفاد خالص مشمول مالیه (عواید منهای مصارف قابل مجرایی) با کسر کریدیت مالیات موضوعی طبق رهنمود شماره ۸ وزارت مالیه." },
  { code: "FIXED-GUILD", name: "مالیه ثابت اصناف و کسبه‌کاران (طرزالعمل جدید وزارت مالیه)", description: "معافیت فروش سالانه اصناف تا ۲,۰۰۰,۰۰۰ افغانی و سنجش ۰.۳٪ بر مازاد آن طبق فرمان و طرزالعمل جدید وزارت مالیه." },
  { code: "FIXED-SMALL-TRADE", name: "مالیه ثابت تجارت‌های کوچک ربع‌وار (ماده ۷۵)", description: "مالیه ثابت ربع‌وار اشخاص حقیقی بر اساس عواید سالانه طبق ماده ۷۵ قانون مالیات بر عایدات." },
  { code: "FIXED-IMPORT", name: "مالیه ثابت اموال وارده (۲٪ با جواز / ۳٪ بدون جواز — ماده ۷۰)", description: "مالیه ثابت بر ارزش تمام‌شد گمرکی اموال وارده طبق ماده ۷۰ و رهنمود شماره ۱۹ وزارت مالیه." },
  { code: "WHT-DIV", name: "مالیه موضوعی مفاد سهام، تکتانه و حق‌الامتیاز (۲۰٪ — ماده ۴۶)", description: "وضع ۲۰٪ مالیه موضوعی از تادیات مفاد سهام و حق‌الامتیاز طبق ماده ۴۶ و ۶۰ قانون مالیات بر عایدات." },
] as const;

export const MOF_TAX_RULES_SEED: {
  ruleKey: string;
  taxTypeCode: string;
  ruleName: string;
  legalName: string;
  articleNumber: string;
  calculationType: string;
  rate: number | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  version: number;
  sourceName: string;
  sourceUrl: string;
  verificationStatus: "verified" | "requires_legal_review";
  conditions: TaxRuleConditions;
}[] = [
  {
    ruleKey: "mof-wage-wht-art58",
    taxTypeCode: "WHT-WAGE",
    ruleName: "جدول پلکانی مالیه موضوعی معاشات (۰٪ تا ۵,۰۰۰ | ۲٪ تا ۱۲,۵۰۰ | ۱۰٪ تا ۱۰۰,۰۰۰ | ۲۰٪ مازاد)",
    legalName: "قانون مالیات بر عایدات و رهنمود شماره ۵ ریاست عمومی عواید وزارت مالیه",
    articleNumber: "ماده ۴ و ماده ۵۸",
    calculationType: "progressive_brackets",
    rate: 0,
    effectiveFrom: "2009-03-21",
    version: 1,
    sourceName: "وزارت مالیه — رهنمود شماره ۵ مالیه موضوعی معاشات",
    sourceUrl: "https://mof.gov.af/sites/default/files/2019-03/Guide%2005%20-%20Wage%20Withholding%20Tax(2)(1)-min.pdf",
    verificationStatus: "verified",
    conditions: {
      formulaMode: "progressive_brackets",
      periodUnit: "monthly",
      filingFormCode: "فورم راپور ماهوار مالیه موضوعی معاشات و تحویلی بانک",
      brackets: [
        { upTo: 5000, rate: 0 },
        { upTo: 12500, rate: 2 },
        { upTo: 100000, rate: 10, baseTax: 150 },
        { upTo: null, rate: 20, baseTax: 8900 },
      ],
      formulaDescriptionFa: "تا ۵,۰۰۰ افغانی معاف (۰٪)؛ از ۵,۰۰۱ تا ۱۲,۵۰۰ افغانی ۲٪ مازاد؛ از ۱۲,۵۰۱ تا ۱۰۰,۰۰۰ افغانی ۱۵۰ افغانی + ۱۰٪ مازاد بر ۱۲,۵۰۰؛ بالای ۱۰۰,۰۰۰ افغانی ۸,۹۰۰ افغانی + ۲۰٪ مازاد بر ۱۰۰,۰۰۰ افغانی.",
      formulaDescriptionPs: "تر ۵,۰۰۰ افغانیو معاف (۰٪)؛ له ۵,۰۰۱ تر ۱۲,۵۰۰ پورې ۲٪؛ له ۱۲,۵۰۱ تر ۱۰۰,۰۰۰ پورې ۱۵۰ افغانۍ + ۱۰٪؛ له ۱۰۰,۰۰۰ پورته ۸,۹۰۰ افغانۍ + ۲۰٪.",
      formulaDescriptionEn: "0–5,000 AFN: 0%; 5,001–12,500 AFN: 2% of excess; 12,501–100,000 AFN: 150 AFN + 10% over 12,500; >100,000 AFN: 8,900 AFN + 20% over 100,000.",
    },
  },
  {
    ruleKey: "mof-rent-wht-art59",
    taxTypeCode: "WHT-RENT",
    ruleName: "مالیه موضوعی کرایه عقارات (زیر ۱۰,۰۰۰ معاف | ۱۰,۰۰۰ تا ۱۰۰,۰۰۰ نرخ ۱۰٪ | بالای ۱۰۰,۰۰۰ نرخ ۱۵٪)",
    legalName: "قانون مالیات بر عایدات و رهنمود شماره ۱ مالیات موضوعی بر کرایه",
    articleNumber: "ماده ۵۹",
    calculationType: "flat_tier",
    rate: 10,
    effectiveFrom: "2009-03-21",
    version: 1,
    sourceName: "وزارت مالیه — رهنمود شماره ۱ مالیه موضوعی کرایه",
    sourceUrl: "https://www.mof.gov.af/en/guides",
    verificationStatus: "verified",
    conditions: {
      formulaMode: "flat_tier",
      periodUnit: "monthly",
      filingFormCode: "فورم سنجش و تحویلی مالیه موضوعی کرایه",
      tiers: [
        { min: 0, max: 9999.99, rate: 0 },
        { min: 10000, max: 100000, rate: 10 },
        { min: 100000.01, max: null, rate: 15 },
      ],
      formulaDescriptionFa: "کرایه ماهوار کمتر از ۱۰,۰۰۰ افغانی معاف؛ از ۱۰,۰۰۰ الی ۱۰۰,۰۰۰ افغانی ۱۰٪ مقطوع بر کل کرایه؛ بیشتر از ۱۰۰,۰۰۰ افغانی ۱۵٪ مقطوع بر کل کرایه.",
      formulaDescriptionPs: "تر ۱۰,۰۰۰ افغانیو کمه میاشتنۍ کرایه معاف؛ له ۱۰,۰۰۰ تر ۱۰۰,۰۰۰ پورې ۱۰٪؛ له ۱۰۰,۰۰۰ پورته ۱۵٪ پر ټولې کرایې.",
      formulaDescriptionEn: "Monthly rent <10,000 AFN: 0%; 10,000–100,000 AFN: 10% flat on total rent; >100,000 AFN: 15% flat on total rent.",
    },
  },
  {
    ruleKey: "mof-contractor-licensed-art72",
    taxTypeCode: "WHT-CTR-LIC",
    ruleName: "مالیه موضوعی قراردادی دارای جواز فعالیت معتبر (۲٪ ناخالص)",
    legalName: "قانون مالیات بر عایدات و رهنمود شماره ۲۱ مالیه موضوعی قراردادی‌ها",
    articleNumber: "ماده ۷۲ فقره (۲)",
    calculationType: "gross_percentage",
    rate: 2,
    effectiveFrom: "2009-03-21",
    version: 1,
    sourceName: "وزارت مالیه — رهنمود شماره ۲۱ مالیه موضوعی خدمات قراردادی",
    sourceUrl: "https://mof.gov.af/sites/default/files/2019-03/Guide%2021%20-%20Withholding%20Tax%20on%20Contractor%20Services-min.pdf",
    verificationStatus: "verified",
    conditions: {
      formulaMode: "gross_percentage",
      minApplicableGross: 500000,
      creditableAgainstIncomeTax: true,
      filingFormCode: "فورم مالیه موضوعی قراردادی (م-۱۶ / تحویلی بانک)",
      formulaDescriptionFa: "۲٪ از مبلغ ناخالص تادیه‌شده به قراردادی دارای جواز معتبر (در قراردادها/تادیات سالانه ۵۰۰,۰۰۰ افغانی و بالاتر؛ قابل مجرایی در اظهارنامه سالانه).",
      formulaDescriptionPs: "د معتبر جواز لرونکي قراردادي له ناخالصې تادیې څخه ۲٪ موضوعي مالیه.",
      formulaDescriptionEn: "2% of gross payment to a contractor holding a valid business license (creditable against annual income tax).",
    },
  },
  {
    ruleKey: "mof-contractor-unlicensed-art72",
    taxTypeCode: "WHT-CTR-UNLIC",
    ruleName: "مالیه موضوعی مقطوع قراردادی فاقد جواز معتبر (۷٪ ناخالص)",
    legalName: "قانون مالیات بر عایدات و رهنمود شماره ۲۱ مالیه موضوعی قراردادی‌ها",
    articleNumber: "ماده ۷۲ فقره (۱)",
    calculationType: "gross_percentage",
    rate: 7,
    effectiveFrom: "2009-03-21",
    version: 1,
    sourceName: "وزارت مالیه — رهنمود شماره ۲۱ مالیه موضوعی خدمات قراردادی",
    sourceUrl: "https://mof.gov.af/sites/default/files/2019-03/Guide%2021%20-%20Withholding%20Tax%20on%20Contractor%20Services-min.pdf",
    verificationStatus: "verified",
    conditions: {
      formulaMode: "gross_percentage",
      minApplicableGross: 500000,
      creditableAgainstIncomeTax: false,
      filingFormCode: "فورم مالیه موضوعی قراردادی بدون جواز",
      formulaDescriptionFa: "۷٪ مالیه ثابت (مقطوع) به عوض مالیه بر عایدات از مبلغ ناخالص قابل تادیه به قراردادی بدون جواز فعالیت.",
      formulaDescriptionPs: "بې جوازه قراردادي ته له ناخالصې تادیې څخه ۷٪ مقطوع مالیه.",
      formulaDescriptionEn: "7% final fixed withholding tax in lieu of income tax on gross payments to unlicensed contractors.",
    },
  },
  {
    ruleKey: "mof-brt-general-art64",
    taxTypeCode: "BRT",
    ruleName: "مالیه معاملات انتفاعی ربع‌وار — خدمات و فعالیت‌های تجارتی عمومی (۴٪ عواید ناخالص)",
    legalName: "قانون مالیات بر عایدات و طرزالعمل اظهارنامه ربع‌وار مالیه انتفاعی",
    articleNumber: "ماده ۶۴ و ماده ۶۵",
    calculationType: "gross_percentage",
    rate: 4,
    effectiveFrom: "2015-03-21",
    version: 2,
    sourceName: "وزارت مالیه — ریاست عمومی عواید (رهنمود مالیات انتفاعی)",
    sourceUrl: "https://ard.gov.af/497/497",
    verificationStatus: "verified",
    conditions: {
      formulaMode: "gross_percentage",
      periodUnit: "quarterly",
      allowExpenseDeduction: false,
      filingFormCode: "فورم اظهارنامه ربع‌وار مالیات انتفاعی (۴٪)",
      formulaDescriptionFa: "۴٪ بر سرجمع عواید ناخالص ربع‌وار (قبل از وضع مصارف عملیاتی؛ مالیه انتفاعی پرداخت‌شده در اظهارنامه سالانه به عنوان مصرف قابل مجرایی کسر می‌شود).",
      formulaDescriptionPs: "د ربعې پر ناخالصو عوایدو ۴٪ انتفاعي مالیه.",
      formulaDescriptionEn: "4% Business Receipts Tax on total quarterly gross receipts (deductible as an expense on the annual income tax return).",
    },
  },
  {
    ruleKey: "mof-brt-5pct-hospitality",
    taxTypeCode: "BRT",
    ruleName: "مالیه معاملات انتفاعی ۵٪ — هوتل‌ها، رستورانت‌ها و مهمان‌خانه‌ها (عواید ماهوار ≥ ۷۵۰,۰۰۰ افغانی)",
    legalName: "قانون مالیات بر عایدات و رهنمود شماره ۳ مالیات انتفاعی وزارت مالیه",
    articleNumber: "ماده ۶۴ فقره (۲)",
    calculationType: "gross_percentage",
    rate: 5,
    effectiveFrom: "2009-03-21",
    version: 1,
    sourceName: "وزارت مالیه — رهنمود شماره ۳ مالیات انتفاعی",
    sourceUrl: "https://www.mof.gov.af/en/guides",
    verificationStatus: "verified",
    conditions: {
      formulaMode: "gross_percentage",
      periodUnit: "quarterly",
      minApplicableGross: 750000,
      filingFormCode: "فورم اظهارنامه ربع‌وار مالیات انتفاعی (۵٪)",
      formulaDescriptionFa: "۵٪ بر عواید ناخالص خدمات کلپ‌ها، صالون‌ها، رستورانت‌ها، هوتل‌ها و مهمان‌خانه‌هایی که عواید ماهوارشان ۷۵۰,۰۰۰ افغانی یا بیشتر باشد.",
      formulaDescriptionPs: "پر هغو هوټلونو او رسټورانټونو ۵٪ انتفاعي مالیه چې میاشتني عواید یې ۷۵۰,۰۰۰ افغانۍ یا زیات وي.",
      formulaDescriptionEn: "5% BRT on gross receipts of hotels, restaurants, and guest houses with monthly revenue of 750,000 AFN or more.",
    },
  },
  {
    ruleKey: "mof-brt-10pct-telecom-air-luxury",
    taxTypeCode: "BRT",
    ruleName: "مالیه معاملات انتفاعی ۱۰٪ — مخابرات، خطوط هوایی و هوتل‌ها/صالون‌های درجه اول",
    legalName: "قانون مالیات بر عایدات و رهنمود شماره ۳ و ۸ وزارت مالیه",
    articleNumber: "ماده ۶۴ فقره (۳)",
    calculationType: "gross_percentage",
    rate: 10,
    effectiveFrom: "2009-03-21",
    version: 1,
    sourceName: "وزارت مالیه — رهنمود شماره ۸ اظهارنامه شرکت‌ها",
    sourceUrl: "https://mof.gov.af/sites/default/files/2019-03/%D8%B1%D9%87%D9%86%D9%85%D9%88%D8%AF%20%D8%B4%D9%85%D8%A7%D8%B1%D9%87%208-min(1).pdf",
    verificationStatus: "verified",
    conditions: {
      formulaMode: "gross_percentage",
      periodUnit: "quarterly",
      filingFormCode: "فورم اظهارنامه ربع‌وار مالیات انتفاعی (۱۰٪)",
      formulaDescriptionFa: "۱۰٪ بر عواید ناخالص خدمات مخابراتی، شرکت‌های هوایی مسافربری، و هوتل‌ها/رستورانت‌های لوکس و درجه اول.",
      formulaDescriptionPs: "پر مخابراتي، هوایي شرکتونو او لوکسو هوټلونو ۱۰٪ انتفاعي مالیه.",
      formulaDescriptionEn: "10% BRT on gross receipts from telecommunications, passenger airlines, and superior hotel/restaurant services.",
    },
  },
  {
    ruleKey: "mof-brt-2pct-guide8",
    taxTypeCode: "BRT",
    ruleName: "مالیه معاملات انتفاعی ۲٪ (نرخ پایه رهنمود شماره ۸ وزارت مالیه)",
    legalName: "قانون مالیات بر عایدات و رهنمود شماره ۸ شرکت‌های سهامی و محدودالمسؤولیت",
    articleNumber: "ماده ۶۴ و ماده ۶۵",
    calculationType: "gross_percentage",
    rate: 2,
    effectiveFrom: "2009-03-21",
    version: 1,
    sourceName: "وزارت مالیه — رهنمود شماره ۸ اظهارنامه شرکت‌ها",
    sourceUrl: "https://mof.gov.af/sites/default/files/2019-03/Guide%2008%20-%20Tax%20Guide%20for%20Corporations%20and%20Limited%20Liability%20Companies-E-min.pdf",
    verificationStatus: "verified",
    conditions: {
      formulaMode: "gross_percentage",
      periodUnit: "quarterly",
      filingFormCode: "فورم مالیه انتفاعی ۲٪",
      formulaDescriptionFa: "۲٪ بر عواید ناخالص بخش‌های مشمول نرخ ۲٪ طبق رهنمود شماره ۸ وزارت مالیه.",
      formulaDescriptionPs: "د رهنمود ۸ له مخې پر ناخالصو عوایدو ۲٪ انتفاعي مالیه.",
      formulaDescriptionEn: "2% Business Receipts Tax on qualifying gross receipts per MoF Guide 08.",
    },
  },
  {
    ruleKey: "mof-cit-annual-art4",
    taxTypeCode: "CIT-ANNUAL",
    ruleName: "مالیه بر عایدات خالص سالانه اشخاص حکمی و شرکت‌ها (۲۰٪ مفاد خالص منهای کریدیت موضوعی)",
    legalName: "قانون مالیات بر عایدات و رهنمود شماره ۸ اظهارنامه سالانه",
    articleNumber: "ماده ۴ فقره (۱) و ماده ۱۸",
    calculationType: "net_percentage",
    rate: 20,
    effectiveFrom: "2009-03-21",
    version: 1,
    sourceName: "وزارت مالیه — رهنمود شماره ۸ اظهارنامه مالیاتی سالانه",
    sourceUrl: "https://mof.gov.af/sites/default/files/2019-03/%D8%B1%D9%87%D9%86%D9%85%D9%88%D8%AF%20%D8%B4%D9%85%D8%A7%D8%B1%D9%87%208-min(1).pdf",
    verificationStatus: "verified",
    conditions: {
      formulaMode: "net_percentage",
      periodUnit: "annual",
      allowExpenseDeduction: true,
      penaltyAmnestyApplied: true,
      filingFormCode: "اظهارنامه مالیاتی سالانه شرکت‌ها و بیلانس شیت",
      formulaDescriptionFa: "مالیه سالانه = [(عواید ناخالص − مصارف قابل مجرایی ماده ۱۸ به شمول مالیه انتفاعی − معافیت‌ها) × ۲۰٪] − کریدیت مالیات موضوعی پیش‌پرداخت‌شده (۲٪ قراردادی / ۲٪ واردات).",
      formulaDescriptionPs: "کلنۍ مالیه = [(ناخالص عواید − د منلو وړ مصارف − معافیتونه) × ۲۰٪] − مخکې ورکړل شوې موضوعي مالیه.",
      formulaDescriptionEn: "Annual CIT = [Max(0, Gross Income − Allowable Expenses − Exemptions) × 20%] − Creditable Withholding Taxes Paid.",
    },
  },
  {
    ruleKey: "mof-guild-fixed-new",
    taxTypeCode: "FIXED-GUILD",
    ruleName: "طرزالعمل جدید مالیه اصناف و کسبه‌کاران (معافیت تا ۲,۰۰۰,۰۰۰ افغانی + ۰.۳٪ بر مازاد)",
    legalName: "طرزالعمل تثبیت مالیه ثابت اصناف و فرمان جدید تخفیف و معافیت اصناف وزارت مالیه",
    articleNumber: "رهنمود شماره ۲۵ و فرمان معافیت اصناف",
    calculationType: "exempt_threshold_excess",
    rate: 0.3,
    effectiveFrom: "2023-03-21",
    version: 2,
    sourceName: "وزارت مالیه — ریاست عمومی عواید (طرزالعمل مالیه ثابت اصناف و معافیت جرایم)",
    sourceUrl: "https://www.mof.gov.af/dr/%D8%B9%D9%88%D8%A7%DB%8C%D8%AF-%D9%85%D8%B3%D8%AA%D9%88%D9%81%DB%8C%D8%AA-%D9%81%D8%A7%D8%B1%DB%8C%D8%A7%D8%A8-%D8%B3%DB%8C-%D9%88-%D8%AF%D9%88-%D9%81%DB%8C%D8%B5%D8%AF-%D8%A7%D9%81%D8%B2%D8%A7%DB%8C%D8%B4-%DB%8C%D8%A7%D9%81%D8%AA%D9%87",
    verificationStatus: "verified",
    conditions: {
      formulaMode: "exempt_threshold_excess",
      exemptThreshold: 2000000,
      periodUnit: "annual",
      penaltyAmnestyApplied: true,
      filingFormCode: "فورم تثبیت مالیه ثابت اصناف",
      formulaDescriptionFa: "فروش سالانه اصناف و دوکانداران تا ۲,۰۰۰,۰۰۰ افغانی کاملاً معاف (۰٪)؛ بر مبلغ مازاد بر ۲,۰۰۰,۰۰۰ افغانی صرفاً ۰.۳٪ مالیه سنجش می‌شود (همراه با معافیت ۱۰۰٪ جرایم مالیاتی).",
      formulaDescriptionPs: "تر ۲,۰۰۰,۰۰۰ افغانیو پورې کلنی پلور بشپړ معاف؛ تر ۲ میلیونو پورته پر اضافه مبلغ یوازې ۰.۳٪ مالیه.",
      formulaDescriptionEn: "Annual sales up to 2,000,000 AFN are 100% exempt; excess over 2,000,000 AFN is taxed at 0.3%.",
    },
  },
  {
    ruleKey: "mof-guild-fixed-v1-05pct",
    taxTypeCode: "FIXED-GUILD",
    ruleName: "طرزالعمل قبلی مالیه اصناف (معافیت تا ۲,۰۰۰,۰۰۰ افغانی + ۰.۵٪ بر مازاد — نسخه ۱)",
    legalName: "طرزالعمل تثبیت مالیه ثابت اصناف سال ۱۴۰۱–۱۴۰۲",
    articleNumber: "رهنمود شماره ۲۵ نسخه اول",
    calculationType: "exempt_threshold_excess",
    rate: 0.5,
    effectiveFrom: "2022-03-21",
    effectiveTo: "2023-03-20",
    version: 1,
    sourceName: "وزارت مالیه — رهنمود شماره ۲۵ تثبیت مالیه ثابت اصناف",
    sourceUrl: "https://ard.gov.af/?c=tax-guidlines-dr&s=dari",
    verificationStatus: "verified",
    conditions: {
      formulaMode: "exempt_threshold_excess",
      exemptThreshold: 2000000,
      periodUnit: "annual",
      penaltyAmnestyApplied: true,
      filingFormCode: "فورم تثبیت مالیه ثابت اصناف",
      formulaDescriptionFa: "نسخه تاریخی ۱۴۰۱: معافیت تا ۲,۰۰۰,۰۰۰ افغانی و ۰.۵٪ بر مازاد.",
      formulaDescriptionPs: "پخوانۍ نسخه: تر ۲,۰۰۰,۰۰۰ افغانیو معافیت او پر اضافه مبلغ ۰.۵٪.",
      formulaDescriptionEn: "Historical v1 rule: 2,000,000 AFN exemption threshold + 0.5% on excess.",
    },
  },
  {
    ruleKey: "mof-small-trade-fixed-art75",
    taxTypeCode: "FIXED-SMALL-TRADE",
    ruleName: "مالیه ثابت ربع‌وار تجارت‌های کوچک (طبقه‌بندی عواید سالانه — ماده ۷۵)",
    legalName: "قانون مالیات بر عایدات ماده ۷۵ و رهنمود شماره ۱۹ وزارت مالیه",
    articleNumber: "ماده ۷۵ فقره (۲) تا (۴)",
    calculationType: "flat_amount",
    rate: 500,
    effectiveFrom: "2009-03-21",
    version: 1,
    sourceName: "وزارت مالیه — رهنمود شماره ۱۹ مالیات ثابت فعالیت‌های تجاری",
    sourceUrl: "https://mof.gov.af/sites/default/files/2019-03/Guide%2019%20-%20Fixed%20Taxes%20on%20Commercial%20Activities(3)(1)-min.pdf",
    verificationStatus: "verified",
    conditions: {
      formulaMode: "flat_amount",
      periodUnit: "quarterly",
      penaltyAmnestyApplied: true,
      filingFormCode: "فورم تثبیت مالیه ثابت تجارت‌های کوچک",
      tiers: [
        { min: 0, max: 59999.99, rate: 0, amount: 0 },
        { min: 60000, max: 150000, rate: 0, amount: 500 },
        { min: 150000.01, max: 500000, rate: 0, amount: 1500 },
        { min: 500000.01, max: 3000000, rate: 3, amount: 0 },
      ],
      formulaDescriptionFa: "طبقه‌بندی مالیه ثابت ربع‌وار بر اساس عواید سالانه: تا ۶۰,۰۰۰ افغانی معاف؛ از ۶۰,۰۰۰ الی ۱۵۰,۰۰۰ افغانی ۵۰۰ افغانی در هر ربع؛ از ۱۵۰,۰۰۰ الی ۵۰۰,۰۰۰ افغانی ۱,۵۰۰ افغانی در هر ربع؛ از ۵۰۰,۰۰۰ الی ۳,۰۰۰,۰۰۰ افغانی ۳٪ از عواید ناخالص سالانه (یا ارائه اظهارنامه).",
      formulaDescriptionPs: "د کلنو عوایدو پر بنسټ ربعې ثابته مالیه: تر ۶۰,۰۰۰ معاف؛ له ۶۰,۰۰۰ تر ۱۵۰,۰۰۰ پورې ۵۰۰ افغانۍ په ربع؛ له ۱۵۰,۰۰۰ تر ۵۰۰,۰۰۰ پورې ۱,۵۰۰ افغانۍ؛ له ۵۰۰,۰۰۰ تر ۳,۰۰۰,۰۰۰ پورې ۳٪.",
      formulaDescriptionEn: "Quarterly fixed tax tiers by annual income: <60,000 AFN exempt; 60,000–150,000 AFN 500 AFN/quarter; 150,000–500,000 AFN 1,500 AFN/quarter; 500,000–3,000,000 AFN 3% of annual gross.",
    },
  },
  {
    ruleKey: "mof-import-fixed-licensed-art70",
    taxTypeCode: "FIXED-IMPORT",
    ruleName: "مالیه ثابت اموال وارده — دارای جواز تجارت (۲٪ قابل مجرایی در مالیات سالانه)",
    legalName: "قانون مالیات بر عایدات و رهنمود شماره ۱۹ مالیات ثابت فعالیت‌های تجارتی",
    articleNumber: "ماده ۷۰ فقره (۱)",
    calculationType: "gross_percentage",
    rate: 2,
    effectiveFrom: "2009-03-21",
    version: 1,
    sourceName: "وزارت مالیه — رهنمود شماره ۱۹ مالیات ثابت فعالیت‌های تجاری",
    sourceUrl: "https://mof.gov.af/sites/default/files/2019-03/Guide%2019%20-%20Fixed%20Taxes%20on%20Commercial%20Activities(3)(1)-min.pdf",
    verificationStatus: "verified",
    conditions: {
      formulaMode: "gross_percentage",
      creditableAgainstIncomeTax: true,
      filingFormCode: "فورم گمرکی و سنجش مالیه ثابت واردات (۲٪)",
      formulaDescriptionFa: "۲٪ بر ارزش تمام‌شد اموال وارده (به شمول محصول گمرکی) برای اشخاص دارای جواز تجارت؛ این مبلغ پیش‌پرداخت بوده و در اظهارنامه سالانه مالیات بر عایدات مجرا داده می‌شود.",
      formulaDescriptionPs: "د جواز لرونکو واردونکو پر وارداتي اموالو ۲٪ مالیه (په کلنۍ اظهارنامه کې د مجرایۍ وړ).",
      formulaDescriptionEn: "2% advance fixed tax on landed cost of imports for licensed importers (creditable against annual income tax).",
    },
  },
  {
    ruleKey: "mof-import-fixed-unlicensed-art70",
    taxTypeCode: "FIXED-IMPORT",
    ruleName: "مالیه ثابت اموال وارده — فاقد جواز تجارت (۳٪ مقطوع)",
    legalName: "قانون مالیات بر عایدات و رهنمود شماره ۱۹ مالیات ثابت فعالیت‌های تجارتی",
    articleNumber: "ماده ۷۰ فقره (۲)",
    calculationType: "gross_percentage",
    rate: 3,
    effectiveFrom: "2009-03-21",
    version: 1,
    sourceName: "وزارت مالیه — رهنمود شماره ۱۹ مالیات ثابت فعالیت‌های تجاری",
    sourceUrl: "https://mof.gov.af/sites/default/files/2019-03/Guide%2019%20-%20Fixed%20Taxes%20on%20Commercial%20Activities(3)(1)-min.pdf",
    verificationStatus: "verified",
    conditions: {
      formulaMode: "gross_percentage",
      creditableAgainstIncomeTax: false,
      filingFormCode: "فورم مالیه ثابت واردات بدون جواز (۳٪)",
      formulaDescriptionFa: "۳٪ مالیه مقطوع به عوض مالیات بر عایدات بر ارزش تمام‌شد اموال وارده توسط اشخاص فاقد جواز تجارت.",
      formulaDescriptionPs: "بې جوازه واردونکو ته پر وارداتي اموالو ۳٪ مقطوع مالیه.",
      formulaDescriptionEn: "3% final fixed tax in lieu of income tax on imports by persons without a business license.",
    },
  },
  {
    ruleKey: "mof-dividend-interest-art46",
    taxTypeCode: "WHT-DIV",
    ruleName: "مالیه موضوعی مفاد سهام، تکتانه و حق‌الامتیاز (۲۰٪)",
    legalName: "قانون مالیات بر عایدات وزارت مالیه",
    articleNumber: "ماده ۴۶ و ماده ۶۰",
    calculationType: "gross_percentage",
    rate: 20,
    effectiveFrom: "2009-03-21",
    version: 1,
    sourceName: "وزارت مالیه — فورم راپور ماهانه مالیه موضوعی مفاد سهام و حق‌الامتیاز",
    sourceUrl: "https://www.mof.gov.af/en/documents",
    verificationStatus: "verified",
    conditions: {
      formulaMode: "gross_percentage",
      periodUnit: "monthly",
      filingFormCode: "فورم راپور ماهوار مالیات موضوعی سهام و حق‌الامتیاز",
      formulaDescriptionFa: "۲۰٪ مالیه موضوعی از تادیات مفاد سهام، تکتانه و حق‌الامتیاز.",
      formulaDescriptionPs: "د ونډو ګټې او حق‌الامتیاز له تادیاتو څخه ۲۰٪ موضوعي مالیه.",
      formulaDescriptionEn: "20% withholding tax on dividends, interest, and royalties.",
    },
  },
];

/**
 * Ensures all Ministry of Finance tax types and versioned rules are seeded for the given organization.
 */
export async function ensureMofTaxCatalog(tx: DbOrTx, organizationId: string, userId: string | null) {
  const existingTypes = await tx.select().from(taxTypes).where(eq(taxTypes.organizationId, organizationId));
  const typeByCode = new Map(existingTypes.map((t) => [t.code, t]));

  for (const item of MOF_TAX_TYPES_SEED) {
    let current = typeByCode.get(item.code);
    if (!current) {
      const [inserted] = await tx
        .insert(taxTypes)
        .values({
          organizationId,
          code: item.code,
          name: item.name,
          description: item.description,
        })
        .returning();
      typeByCode.set(item.code, inserted);
    }
  }

  for (const r of MOF_TAX_RULES_SEED) {
    const [existing] = await tx
      .select({ id: taxRules.id })
      .from(taxRules)
      .where(and(eq(taxRules.organizationId, organizationId), eq(taxRules.ruleKey, r.ruleKey), eq(taxRules.version, r.version)))
      .limit(1);
    if (!existing) {
      const tt = typeByCode.get(r.taxTypeCode);
      await tx.insert(taxRules).values({
        organizationId,
        ruleKey: r.ruleKey,
        ruleName: r.ruleName,
        legalName: r.legalName,
        articleNumber: r.articleNumber,
        taxTypeId: tt?.id ?? null,
        calculationType: r.calculationType,
        rate: r.rate,
        conditions: r.conditions,
        effectiveFrom: r.effectiveFrom,
        effectiveTo: r.effectiveTo ?? null,
        version: r.version,
        sourceName: r.sourceName,
        sourceUrl: r.sourceUrl,
        verificationStatus: r.verificationStatus,
        lastReviewedAt: new Date(),
        reviewedBy: userId,
        createdBy: userId,
      });
    }
  }
}
