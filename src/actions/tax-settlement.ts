"use server";
import { and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { attachments, cases, customers, taxRules, taxSettlementPayments, taxSettlements, taxTypes } from "@/db/schema";
import { requireContext } from "@/lib/auth";
import { audit, FinanceError, nextNumber } from "@/lib/finance";
import { num, optStr, round2, str } from "@/lib/format";
import { todayIso } from "@/lib/jalali";
import { ensureMofTaxCatalog, evaluateTaxRule, type TaxRuleConditions } from "@/lib/tax-engine";
import { act } from "./util";
import { formFile, readDocumentUpload } from "@/lib/upload";

function isOfficialSource(v: string) {
  try { const u = new URL(v); return u.protocol === "https:" && (u.hostname === "gov.af" || u.hostname.endsWith(".gov.af")); } catch { return false; }
}

function parseJson(text: string) {
  if (!text.trim()) return {};
  try { const v = JSON.parse(text); return v && typeof v === "object" ? v : {}; } catch { throw new FinanceError("invalid_input"); }
}

/** Immutable rule version; saved rules remain unverified until a privileged reviewer checks the official source. */
export async function saveTaxRuleAction(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("tax_rules.write");
    const ruleName = str(fd.get("ruleName"));
    const ruleKey = str(fd.get("ruleKey")).toLowerCase().replace(/[^a-z0-9-]+/g, "-") || ruleName.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
    const sourceUrl = optStr(fd.get("sourceUrl"));
    const rateRaw = str(fd.get("rate"));
    const rateValue = rateRaw === "" ? null : num(rateRaw);
    const effectiveFrom = str(fd.get("effectiveFrom"));
    const formulaMode = str(fd.get("formulaMode")) || "net_percentage";
    if (!ruleName || !ruleKey || !effectiveFrom || !sourceUrl || !isOfficialSource(sourceUrl) || (rateValue !== null && (rateValue < 0 || rateValue > 100))) throw new FinanceError("invalid_input");
    const rawConditions = parseJson(str(fd.get("conditions"))) as TaxRuleConditions;
    const exemptThresholdRaw = str(fd.get("exemptThreshold"));
    const conditions: TaxRuleConditions = {
      ...rawConditions,
      formulaMode: formulaMode as TaxRuleConditions["formulaMode"],
      ...(exemptThresholdRaw ? { exemptThreshold: num(exemptThresholdRaw) } : {}),
      ...(optStr(fd.get("filingFormCode")) ? { filingFormCode: optStr(fd.get("filingFormCode"))! } : {}),
      ...(optStr(fd.get("formulaDescriptionFa")) ? { formulaDescriptionFa: optStr(fd.get("formulaDescriptionFa"))! } : {}),
    };
    return db.transaction(async (tx) => {
      const priorRows = await tx.select().from(taxRules).where(and(eq(taxRules.organizationId, ctx.org.id), eq(taxRules.ruleKey, ruleKey))).orderBy(desc(taxRules.version)).limit(1);
      const prior = priorRows[0];
      const previousDay = new Date(effectiveFrom + "T12:00:00");
      previousDay.setDate(previousDay.getDate() - 1);
      const previousEffectiveTo = previousDay.toISOString().slice(0, 10);
      if (prior && prior.effectiveFrom < effectiveFrom && (!prior.effectiveTo || prior.effectiveTo >= effectiveFrom)) {
        await tx.update(taxRules).set({ effectiveTo: previousEffectiveTo }).where(eq(taxRules.id, prior.id));
      }
      const [row] = await tx.insert(taxRules).values({
        organizationId: ctx.org.id,
        ruleKey,
        ruleName,
        legalName: optStr(fd.get("legalName")),
        articleNumber: optStr(fd.get("articleNumber")),
        taxTypeId: optStr(fd.get("taxTypeId")),
        calculationType: formulaMode,
        rate: rateValue,
        conditions,
        effectiveFrom,
        effectiveTo: optStr(fd.get("effectiveTo")),
        version: (prior?.version ?? 0) + 1,
        sourceName: optStr(fd.get("sourceName")),
        sourceUrl,
        verificationStatus: "requires_legal_review",
        supersedesId: prior?.id ?? null,
        createdBy: ctx.user.id,
      }).returning();
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "TAX_RULE_CHANGE", entityType: "tax_rule", entityId: row.id, newData: { ruleKey, version: row.version, calculationType: formulaMode, rate: rateValue, sourceUrl, verificationStatus: row.verificationStatus } });
      return { id: row.id };
    });
  });
}

export async function verifyTaxRuleAction(id: string) {
  return act(async () => {
    const ctx = await requireContext("tax_rules.verify");
    await db.transaction(async (tx) => {
      const [rule] = await tx.select().from(taxRules).where(and(eq(taxRules.id, id), eq(taxRules.organizationId, ctx.org.id))).for("update");
      if (!rule) throw new FinanceError("not_found");
      const cond = (rule.conditions ?? {}) as TaxRuleConditions;
      const hasFormula = rule.rate !== null || Array.isArray(cond.brackets) || Array.isArray(cond.tiers);
      if (!rule.sourceUrl || !isOfficialSource(rule.sourceUrl) || !hasFormula || !rule.effectiveFrom) throw new FinanceError("official_source_required");
      await tx.update(taxRules).set({ verificationStatus: "verified", lastReviewedAt: new Date(), reviewedBy: ctx.user.id }).where(eq(taxRules.id, id));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "TAX_RULE_VERIFY", entityType: "tax_rule", entityId: id, oldData: { status: rule.verificationStatus }, newData: { status: "verified", sourceUrl: rule.sourceUrl, reviewedBy: ctx.user.id } });
    });
  });
}

export async function syncMofRulesAction() {
  return act(async () => {
    const ctx = await requireContext("tax_rules.write");
    await db.transaction(async (tx) => {
      await ensureMofTaxCatalog(tx, ctx.org.id, ctx.user.id);
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "TAX_RULE_CHANGE", entityType: "mof_catalog_sync", newData: { syncedAt: new Date().toISOString() } });
    });
  });
}

export async function createTaxSettlementAction(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("tax_settlements.write");
    const customerId = str(fd.get("customerId"));
    const caseId = optStr(fd.get("caseId"));
    let taxTypeId = optStr(fd.get("taxTypeId"));
    const periodStart = str(fd.get("periodStart"));
    const periodEnd = str(fd.get("periodEnd"));
    const taxableAmount = round2(num(fd.get("taxableAmount")));
    const allowableExpenses = round2(num(fd.get("allowableExpenses")));
    const exemptions = round2(num(fd.get("exemptions")));
    const deductions = round2(num(fd.get("deductions")));
    const monthsCount = Math.max(1, Math.round(num(fd.get("monthsCount"), 1)));
    const requestedRule = optStr(fd.get("ruleId"));
    if (!customerId || !periodStart || !periodEnd || periodEnd < periodStart || [taxableAmount, allowableExpenses, exemptions, deductions].some((x) => x < 0)) throw new FinanceError("invalid_input");
    return db.transaction(async (tx) => {
      const [customer] = await tx.select().from(customers).where(and(eq(customers.id, customerId), eq(customers.organizationId, ctx.org.id)));
      if (!customer) throw new FinanceError("customer_not_found");
      if (caseId) {
        const [kase] = await tx.select().from(cases).where(and(eq(cases.id, caseId), eq(cases.organizationId, ctx.org.id), eq(cases.customerId, customerId)));
        if (!kase) throw new FinanceError("invalid_input");
      }
      if (taxTypeId) {
        const [taxType] = await tx.select({ id: taxTypes.id }).from(taxTypes).where(and(eq(taxTypes.id, taxTypeId), eq(taxTypes.organizationId, ctx.org.id)));
        if (!taxType) throw new FinanceError("invalid_input");
      }
      let rule: typeof taxRules.$inferSelect | undefined;
      if (requestedRule) {
        const [r] = await tx.select().from(taxRules).where(and(eq(taxRules.id, requestedRule), eq(taxRules.organizationId, ctx.org.id)));
        rule = r;
        if (r?.taxTypeId && !taxTypeId) taxTypeId = r.taxTypeId;
      } else if (taxTypeId) {
        const [r] = await tx.select().from(taxRules).where(and(
          eq(taxRules.organizationId, ctx.org.id),
          eq(taxRules.taxTypeId, taxTypeId),
          eq(taxRules.verificationStatus, "verified"),
          lte(taxRules.effectiveFrom, periodStart),
          or(isNull(taxRules.effectiveTo), gte(taxRules.effectiveTo, periodEnd)),
        )).orderBy(desc(taxRules.effectiveFrom), desc(taxRules.version)).limit(1);
        rule = r;
      }
      const calc = evaluateTaxRule(rule, periodStart, periodEnd, {
        taxableAmount,
        allowableExpenses,
        exemptions,
        deductions,
        monthsCount,
      });
      const usable = calc.usable && !!rule;
      const taxAmount = calc.taxAmount;
      const status = calc.status;
      const [settlement] = await tx.insert(taxSettlements).values({
        organizationId: ctx.org.id,
        settlementNumber: await nextNumber(tx, ctx.org.id, "tax_settlement"),
        customerId,
        caseId,
        taxTypeId,
        periodStart,
        periodEnd,
        taxableAmount,
        allowableExpenses,
        exemptions,
        deductions,
        taxRate: calc.effectiveRate,
        taxAmount,
        paidAmount: 0,
        remainingAmount: taxAmount,
        ruleId: usable ? rule!.id : null,
        ruleVersion: usable ? rule!.version : null,
        ruleSnapshot: usable
          ? {
              ruleKey: rule!.ruleKey,
              ruleName: rule!.ruleName,
              legalName: rule!.legalName,
              articleNumber: rule!.articleNumber,
              rate: calc.effectiveRate,
              conditions: rule!.conditions,
              effectiveFrom: rule!.effectiveFrom,
              effectiveTo: rule!.effectiveTo,
              version: rule!.version,
              sourceName: rule!.sourceName,
              sourceUrl: rule!.sourceUrl,
              calculationType: calc.formulaMode,
              taxableBase: calc.taxableBase,
              monthsCount,
              steps: calc.steps,
              formulaSummary: calc.formulaSummary,
            }
          : { status: "REQUIRES_LEGAL_REVIEW", reason: calc.formulaSummary },
        legalSource: usable ? rule!.sourceUrl : null,
        status,
        notes: optStr(fd.get("notes")),
        createdBy: ctx.user.id,
      }).returning();
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "tax_settlement", entityId: settlement.id, newData: { settlementNumber: settlement.settlementNumber, status, formulaMode: calc.formulaMode, ruleId: settlement.ruleId, ruleVersion: settlement.ruleVersion, taxableBase: calc.taxableBase, taxAmount } });
      return { id: settlement.id };
    });
  });
}

export async function approveTaxSettlementAction(id: string) {
  return act(async () => {
    const ctx = await requireContext("tax_settlements.approve");
    await db.transaction(async (tx) => {
      const [row] = await tx.select().from(taxSettlements).where(and(eq(taxSettlements.id, id), eq(taxSettlements.organizationId, ctx.org.id))).for("update");
      if (!row) throw new FinanceError("not_found");
      if (row.status !== "calculated" || row.taxAmount === null || !row.ruleId) throw new FinanceError("legal_review_required");
      await tx.update(taxSettlements).set({ status: "approved", updatedAt: new Date() }).where(eq(taxSettlements.id, id));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "APPROVE", entityType: "tax_settlement", entityId: id, oldData: { status: row.status }, newData: { status: "approved", taxAmount: row.taxAmount, ruleVersion: row.ruleVersion } });
    });
  });
}

export async function recordTaxSettlementPaymentAction(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("tax_settlements.write");
    const id = str(fd.get("settlementId"));
    const amount = round2(num(fd.get("amount")));
    const paymentDate = str(fd.get("paymentDate")) || todayIso();
    if (amount <= 0) throw new FinanceError("invalid_amount");
    const file = formFile(fd.get("evidenceFile"));
    const bytes = await readDocumentUpload(file);
    return db.transaction(async (tx) => {
      const [row] = await tx.select().from(taxSettlements).where(and(eq(taxSettlements.id, id), eq(taxSettlements.organizationId, ctx.org.id))).for("update");
      if (!row) throw new FinanceError("not_found");
      if (!["approved", "part_paid"].includes(row.status) || row.remainingAmount === null) throw new FinanceError("legal_review_required");
      if (amount > Number(row.remainingAmount)) throw new FinanceError("amount_exceeds_due");
      let evidenceAttachmentId: string | null = null;
      if (file instanceof File && bytes) {
        const [a] = await tx.insert(attachments).values({ organizationId: ctx.org.id, fileName: file.name, mimeType: file.type || "application/octet-stream", fileSize: file.size, content: bytes.toString("base64"), uploadedBy: ctx.user.id }).returning();
        evidenceAttachmentId = a.id;
      }
      const [payment] = await tx.insert(taxSettlementPayments).values({
        organizationId: ctx.org.id,
        settlementId: id,
        amount,
        currency: ctx.org.currency,
        paymentDate,
        officialReceiptNumber: optStr(fd.get("officialReceiptNumber")),
        evidenceAttachmentId,
        notes: optStr(fd.get("notes")),
        recordedBy: ctx.user.id,
      }).returning();
      const paidAmount = round2(Number(row.paidAmount) + amount);
      const remainingAmount = round2(Number(row.taxAmount) - paidAmount);
      const status = remainingAmount <= 0 ? "paid" : "part_paid";
      await tx.update(taxSettlements).set({ paidAmount, remainingAmount: Math.max(0, remainingAmount), status, updatedAt: new Date() }).where(eq(taxSettlements.id, id));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "tax_settlement_payment", entityId: payment.id, newData: { settlementId: id, amount, paymentDate, officialReceiptNumber: payment.officialReceiptNumber, remainingAmount } });
      return { id: payment.id };
    });
  });
}
