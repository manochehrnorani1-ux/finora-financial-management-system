"use server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { cases, documents, generatedForms, letters, serviceFeeReceipts, taxSettlements } from "@/db/schema";
import { requireContext } from "@/lib/auth";
import { audit, FinanceError } from "@/lib/finance";
import { act } from "./util";

export async function recordPrintAction(entityType: string, entityId?: string | null) {
  return act(async () => {
    const ctx = await requireContext();
    const permission: Record<string, string> = { document: "documents.read", case: "cases.read", service_fee_receipt: "cases.read", letter: "letters.read", generated_form: "official_forms.read", report: "reports.read", tax_settlement: "tax_settlements.read" };
    const perm = permission[entityType];
    if (!perm || !ctx.can(perm as never)) throw new FinanceError("forbidden");
    if (entityId) {
      let exists = false;
      if (entityType === "document") exists = !!(await db.select({ id: documents.id }).from(documents).where(and(eq(documents.id, entityId), eq(documents.organizationId, ctx.org.id))).limit(1))[0];
      else if (entityType === "case") exists = !!(await db.select({ id: cases.id }).from(cases).where(and(eq(cases.id, entityId), eq(cases.organizationId, ctx.org.id))).limit(1))[0];
      else if (entityType === "service_fee_receipt") exists = !!(await db.select({ id: serviceFeeReceipts.id }).from(serviceFeeReceipts).where(and(eq(serviceFeeReceipts.id, entityId), eq(serviceFeeReceipts.organizationId, ctx.org.id))).limit(1))[0];
      else if (entityType === "letter") exists = !!(await db.select({ id: letters.id }).from(letters).where(and(eq(letters.id, entityId), eq(letters.organizationId, ctx.org.id))).limit(1))[0];
      else if (entityType === "generated_form") exists = !!(await db.select({ id: generatedForms.id }).from(generatedForms).where(and(eq(generatedForms.id, entityId), eq(generatedForms.organizationId, ctx.org.id))).limit(1))[0];
      else if (entityType === "tax_settlement") exists = !!(await db.select({ id: taxSettlements.id }).from(taxSettlements).where(and(eq(taxSettlements.id, entityId), eq(taxSettlements.organizationId, ctx.org.id))).limit(1))[0];
      if (!exists) throw new FinanceError("not_found");
    }
    await audit(db, { orgId: ctx.org.id, userId: ctx.user.id, action: "PRINT", entityType, entityId: entityId ?? null, newData: { at: new Date().toISOString() } });
  });
}
