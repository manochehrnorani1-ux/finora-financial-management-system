"use server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attachments, cases, complianceEvents, customers } from "@/db/schema";
import { requireContext } from "@/lib/auth";
import { audit, FinanceError } from "@/lib/finance";
import { num, optStr, str } from "@/lib/format";
import { act } from "./util";
import { formFile, readDocumentUpload } from "@/lib/upload";

const TYPES = ["kyc_review", "large_remittance", "large_fx", "suspicious_activity", "sanctions_screening", "supporting_evidence", "other"];
const RESULTS = ["needs_review", "clear", "escalated", "blocked"];

export async function createComplianceEventAction(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("compliance.write");
    const customerId = optStr(fd.get("customerId"));
    const caseId = optStr(fd.get("caseId"));
    const eventType = str(fd.get("eventType"));
    const result = str(fd.get("result")) || "needs_review";
    if (!TYPES.includes(eventType) || !RESULTS.includes(result)) throw new FinanceError("invalid_input");
    const amountText = str(fd.get("amount"));
    const amount = amountText ? num(fd.get("amount")) : null;
    if (amount !== null && amount < 0) throw new FinanceError("invalid_amount");
    const file = formFile(fd.get("evidenceFile"));
    const bytes = await readDocumentUpload(file);
    return db.transaction(async (tx) => {
      if (customerId) {
        const [c] = await tx.select({ id: customers.id }).from(customers).where(and(eq(customers.id, customerId), eq(customers.organizationId, ctx.org.id)));
        if (!c) throw new FinanceError("customer_not_found");
      }
      if (caseId) {
        const [k] = await tx.select({ customerId: cases.customerId }).from(cases).where(and(eq(cases.id, caseId), eq(cases.organizationId, ctx.org.id)));
        if (!k || (customerId && customerId !== k.customerId)) throw new FinanceError("invalid_input");
      }
      let fileIds: string[] = [];
      if (file instanceof File && bytes) {
        const [a] = await tx.insert(attachments).values({ organizationId: ctx.org.id, fileName: file.name, mimeType: file.type || "application/octet-stream", fileSize: file.size, content: bytes.toString("base64"), uploadedBy: ctx.user.id }).returning();
        fileIds = [a.id];
      }
      const [row] = await tx.insert(complianceEvents).values({
        organizationId: ctx.org.id,
        caseId,
        customerId,
        eventType,
        occurredAt: new Date(str(fd.get("occurredAt") || new Date().toISOString())),
        amount,
        currency: optStr(fd.get("currency")),
        counterparty: optStr(fd.get("counterparty")),
        referenceNumber: optStr(fd.get("referenceNumber")),
        supportingFileIds: fileIds,
        result,
        internalReportType: "FINORA_INTERNAL_REPORT",
        notes: optStr(fd.get("notes")),
        createdBy: ctx.user.id,
      }).returning();
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "compliance_event", entityId: row.id, newData: { eventType, result, customerId, caseId, amount, supportingFileIds: fileIds, reportType: "FINORA_INTERNAL_REPORT" } });
      return { id: row.id };
    });
  });
}

export async function reviewComplianceEventAction(id: string, result: string, notes?: string | null) {
  return act(async () => {
    const ctx = await requireContext("compliance.write");
    if (!RESULTS.includes(result)) throw new FinanceError("invalid_input");
    await db.transaction(async (tx) => {
      const [row] = await tx.select().from(complianceEvents).where(and(eq(complianceEvents.id, id), eq(complianceEvents.organizationId, ctx.org.id))).for("update");
      if (!row) throw new FinanceError("not_found");
      await tx.update(complianceEvents).set({ result, notes: notes?.trim() || row.notes, reviewedBy: ctx.user.id }).where(eq(complianceEvents.id, id));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "REVIEW", entityType: "compliance_event", entityId: id, oldData: { result: row.result }, newData: { result, reviewedBy: ctx.user.id, notes: notes ?? null } });
    });
  });
}
