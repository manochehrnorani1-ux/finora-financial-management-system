"use server";
import { and, desc, eq, or, isNull, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { taxRules, taxTypes } from "@/db/schema";
import { requireContext } from "@/lib/auth";
import { evaluateTaxRule, type TaxComputationStep } from "@/lib/tax-engine";
import { num, optStr, round2, str } from "@/lib/format";
import { todayIso } from "@/lib/jalali";

export interface TaxEngineRule {
  id: string;
  ruleKey: string;
  ruleName: string;
  articleNumber: string | null;
  rate: number | null;
  calculationType: string;
  formulaMode: string;
  version: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  verificationStatus: string;
  taxTypeCode: string | null;
  taxTypeName: string | null;
  description: string | null;
  exemptThreshold: number | null;
  formulaDescription: string | null;
  filingFormCode: string | null;
}

export interface TaxEngineResult {
  usable: boolean;
  status: string;
  formulaMode: string;
  taxableBase: number;
  effectiveRate: number | null;
  taxAmount: number | null;
  steps: TaxComputationStep[];
  formulaSummary: string;
}

/** All verified Ministry of Finance rules available for calculation, scoped to the active organization. */
export async function getTaxEngineRulesAction(): Promise<TaxEngineRule[]> {
  const ctx = await requireContext("tax_rules.read");
  const rows = await db
    .select({ r: taxRules, typeCode: taxTypes.code, typeName: taxTypes.name })
    .from(taxRules)
    .leftJoin(taxTypes, eq(taxRules.taxTypeId, taxTypes.id))
    .where(and(eq(taxRules.organizationId, ctx.org.id), eq(taxRules.verificationStatus, "verified")))
    .orderBy(taxRules.ruleKey, desc(taxRules.version));
  const seen = new Set<string>();
  const out: TaxEngineRule[] = [];
  for (const { r, typeCode, typeName } of rows) {
    if (seen.has(r.ruleKey)) continue; // latest version only
    seen.add(r.ruleKey);
    const cond = (r.conditions ?? {}) as Record<string, unknown>;
    out.push({
      id: r.id,
      ruleKey: r.ruleKey,
      ruleName: r.ruleName,
      articleNumber: r.articleNumber,
      rate: r.rate,
      calculationType: r.calculationType,
      formulaMode: String(cond.formulaMode ?? r.calculationType),
      version: r.version,
      effectiveFrom: r.effectiveFrom,
      effectiveTo: r.effectiveTo,
      sourceName: r.sourceName,
      sourceUrl: r.sourceUrl,
      verificationStatus: r.verificationStatus,
      taxTypeCode: typeCode,
      taxTypeName: typeName,
      description: typeName,
      exemptThreshold: typeof cond.exemptThreshold === "number" ? cond.exemptThreshold : null,
      formulaDescription: typeof cond.formulaDescriptionFa === "string" ? cond.formulaDescriptionFa : null,
      filingFormCode: typeof cond.filingFormCode === "string" ? cond.filingFormCode : null,
    });
  }
  return out;
}

/** Runs a tax calculation preview from the Ministry of Finance rule engine without creating any record. */
export async function computeTaxPreviewAction(fd: FormData): Promise<{ ok: boolean; result?: TaxEngineResult; ruleName?: string; error?: string }> {
  try {
    const ctx = await requireContext("tax_settlements.read");
    const ruleId = str(fd.get("ruleId"));
    const periodStart = str(fd.get("periodStart")) || todayIso();
    const periodEnd = str(fd.get("periodEnd")) || periodStart;
    const input = {
      taxableAmount: round2(num(fd.get("taxableAmount"))),
      allowableExpenses: round2(num(fd.get("allowableExpenses"))),
      exemptions: round2(num(fd.get("exemptions"))),
      deductions: round2(num(fd.get("deductions"))),
      monthsCount: Math.max(1, Math.round(num(fd.get("monthsCount"), 1))),
    };
    const [rule] = await db.select().from(taxRules).where(and(eq(taxRules.id, ruleId), eq(taxRules.organizationId, ctx.org.id))).limit(1);
    if (!rule) return { ok: false, error: "not_found" };
    const result = evaluateTaxRule(rule, periodStart, periodEnd, input);
    return { ok: true, result, ruleName: rule.ruleName };
  } catch {
    return { ok: false, error: "server_error" };
  }
}
