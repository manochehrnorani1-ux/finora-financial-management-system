"use server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  attachments, caseFiles, casePlanSteps, caseRequirements, caseStepPayments, caseTasks, cases,
  customerLicenses, customerObligations, customers, obligationPayments, services, serviceFeeReceipts, documents,
} from "@/db/schema";
import { requireContext } from "@/lib/auth";
import { audit, FinanceError, nextNumber } from "@/lib/finance";
import { assertCaseReady, getCaseSnapshot, initializeCaseWorkflow } from "@/lib/case-workflows";
import { isWorkflowKey } from "@/lib/case-workflow-definitions";
import { num, optStr, round2, str } from "@/lib/format";
import { todayIso } from "@/lib/jalali";
import { formFile, readDocumentUpload } from "@/lib/upload";
import { act } from "./util";

const isoDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v + "T12:00:00").getTime());
const active = (status: string) => !["closed", "cancelled", "delivered"].includes(status);

export async function verifyCaseRequirementAction(requirementId: string) {
  return act(async () => {
    const ctx = await requireContext("cases.approve");
    await db.transaction(async (tx) => {
      const [req] = await tx.select().from(caseRequirements).where(and(eq(caseRequirements.id, requirementId), eq(caseRequirements.organizationId, ctx.org.id))).for("update");
      if (!req || !req.evidenceAttachmentId || req.status !== "submitted") throw new FinanceError("case_documents_incomplete");
      const [k] = await tx.select().from(cases).where(and(eq(cases.id, req.caseId), eq(cases.organizationId, ctx.org.id))).for("update");
      if (!k || !active(k.status)) throw new FinanceError("cannot_edit_final");
      const [evidence] = await tx.select({ id: caseFiles.id }).from(caseFiles).where(and(eq(caseFiles.organizationId, ctx.org.id), eq(caseFiles.caseId, k.id), eq(caseFiles.attachmentId, req.evidenceAttachmentId)));
      if (!evidence) throw new FinanceError("case_documents_incomplete");
      await tx.update(caseRequirements).set({ status: "verified", verifiedBy: ctx.user.id, verifiedAt: new Date() }).where(eq(caseRequirements.id, requirementId));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "APPROVE", entityType: "case_requirement", entityId: req.id, oldData: { status: req.status }, newData: { status: "verified", caseId: k.id, evidenceAttachmentId: req.evidenceAttachmentId } });
    });
  });
}

/** Only authorized reviewers can update the client-wide licence register. */
export async function recordCustomerLicenseAction(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("cases.approve");
    const caseId = optStr(fd.get("caseId"));
    const customerId = str(fd.get("customerId"));
    const id = optStr(fd.get("licenseId"));
    const licenseNumber = str(fd.get("licenseNumber"));
    const status = str(fd.get("status"));
    const authorityReference = str(fd.get("authorityReference"));
    const expiresAt = optStr(fd.get("expiresAt"));
    const issuedAt = optStr(fd.get("issuedAt"));
    if (!licenseNumber || !authorityReference || !["active", "suspended", "expired", "cancelled", "pending"].includes(status) || (expiresAt && !isoDate(expiresAt)) || (issuedAt && !isoDate(issuedAt)) || (expiresAt && issuedAt && expiresAt < issuedAt)) throw new FinanceError("invalid_input");
    return db.transaction(async (tx) => {
      const [cust] = await tx.select().from(customers).where(and(eq(customers.id, customerId), eq(customers.organizationId, ctx.org.id)));
      if (!cust) throw new FinanceError("customer_not_found");
      if (caseId) {
        const [k] = await tx.select().from(cases).where(and(eq(cases.id, caseId), eq(cases.organizationId, ctx.org.id), eq(cases.customerId, customerId))).for("update");
        if (!k) throw new FinanceError("not_found");
      }
      const data = { licenseNumber, licenseType: str(fd.get("licenseType")) || "fx", status, authorityReference, issuedAt, expiresAt, notes: optStr(fd.get("notes")), updatedAt: new Date() };
      let license;
      if (id) {
        const [old] = await tx.select().from(customerLicenses).where(and(eq(customerLicenses.id, id), eq(customerLicenses.organizationId, ctx.org.id), eq(customerLicenses.customerId, customerId))).for("update");
        if (!old) throw new FinanceError("not_found");
        [license] = await tx.update(customerLicenses).set(data).where(eq(customerLicenses.id, id)).returning();
        await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "UPDATE", entityType: "customer_license", entityId: id, oldData: old, newData: license });
      } else {
        [license] = await tx.insert(customerLicenses).values({ ...data, organizationId: ctx.org.id, customerId, createdBy: ctx.user.id }).returning();
        await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "customer_license", entityId: license.id, newData: license });
      }
      await tx.update(customers).set({ licenseNumber, updatedAt: new Date() }).where(eq(customers.id, customerId));
      if (caseId) await tx.update(cases).set({ licenseId: license.id, updatedAt: new Date() }).where(eq(cases.id, caseId));
      return { id: license.id };
    });
  });
}

/** Record externally evidenced debt; no tax rate or penalty is guessed. */
export async function recordCustomerObligationAction(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("tax_settlements.write");
    const customerId = str(fd.get("customerId"));
    const caseId = optStr(fd.get("caseId"));
    const category = str(fd.get("category"));
    const description = str(fd.get("description"));
    const authorityReference = str(fd.get("authorityReference"));
    const amount = round2(num(fd.get("amount")));
    const file = formFile(fd.get("file"));
    const bytes = await readDocumentUpload(file);
    if (!customerId || !description || !authorityReference || !["tax_adjustment", "penalty", "other"].includes(category) || !Number.isFinite(amount) || amount <= 0) throw new FinanceError("invalid_input");
    if ((category === "tax_adjustment" || category === "penalty") && !bytes) throw new FinanceError("evidence_required");
    return db.transaction(async (tx) => {
      const [cust] = await tx.select({ id: customers.id }).from(customers).where(and(eq(customers.id, customerId), eq(customers.organizationId, ctx.org.id)));
      if (!cust) throw new FinanceError("customer_not_found");
      if (caseId) {
        const [k] = await tx.select({ id: cases.id }).from(cases).where(and(eq(cases.id, caseId), eq(cases.organizationId, ctx.org.id), eq(cases.customerId, customerId)));
        if (!k) throw new FinanceError("invalid_input");
      }
      const [att] = file && bytes ? await tx.insert(attachments).values({ organizationId: ctx.org.id, fileName: file.name, mimeType: file.type || "application/octet-stream", fileSize: file.size, content: bytes.toString("base64"), uploadedBy: ctx.user.id }).returning() : [null];
      const [ob] = await tx.insert(customerObligations).values({ organizationId: ctx.org.id, customerId, caseId, category, description, amount, currency: ctx.org.currency, authorityReference, evidenceAttachmentId: att?.id ?? null, createdBy: ctx.user.id }).returning();
      if (caseId && att) await tx.insert(caseFiles).values({ organizationId: ctx.org.id, caseId, attachmentId: att.id, uploadedBy: ctx.user.id });
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "customer_obligation", entityId: ob.id, newData: { customerId, caseId, amount, category, authorityReference, evidenceAttachmentId: att?.id } });
      return { id: ob.id };
    });
  });
}

export async function recordObligationPaymentAction(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("tax_settlements.write");
    const obligationId = str(fd.get("obligationId"));
    const amount = round2(num(fd.get("amount")));
    const authorityReceipt = str(fd.get("authorityReceipt"));
    const paymentDate = str(fd.get("paymentDate")) || todayIso();
    const file = formFile(fd.get("file"));
    const bytes = await readDocumentUpload(file);
    if (!Number.isFinite(amount) || amount <= 0 || !authorityReceipt || !isoDate(paymentDate)) throw new FinanceError("invalid_input");
    return db.transaction(async (tx) => {
      const [ob] = await tx.select().from(customerObligations).where(and(eq(customerObligations.id, obligationId), eq(customerObligations.organizationId, ctx.org.id))).for("update");
      if (!ob) throw new FinanceError("not_found");
      const prior = await tx.select({ amount: obligationPayments.amount }).from(obligationPayments).where(and(eq(obligationPayments.organizationId, ctx.org.id), eq(obligationPayments.obligationId, obligationId)));
      const paid = round2(prior.reduce((sum, row) => sum + Number(row.amount), 0));
      if (amount > round2(Number(ob.amount) - paid)) throw new FinanceError("amount_exceeds_due");
      const [att] = file && bytes ? await tx.insert(attachments).values({ organizationId: ctx.org.id, fileName: file.name, mimeType: file.type || "application/octet-stream", fileSize: file.size, content: bytes.toString("base64"), uploadedBy: ctx.user.id }).returning() : [null];
      const [payment] = await tx.insert(obligationPayments).values({ organizationId: ctx.org.id, obligationId, amount, paymentDate, authorityReceipt, evidenceAttachmentId: att?.id ?? null, createdBy: ctx.user.id }).returning();
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "obligation_payment", entityId: payment.id, newData: { obligationId, amount, authorityReceipt, evidenceAttachmentId: att?.id, remaining: round2(Number(ob.amount) - paid - amount) } });
      return { id: payment.id };
    });
  });
}

/** Creates a child case for the same client; existing balances and licence are shared. */
export async function createLinkedCaseAction(parentId: string, childKey: string) {
  return act(async () => {
    const ctx = await requireContext("cases.write");
    if (!["tax-settlement", "fx-unfreeze", "corrective-plan"].includes(childKey)) throw new FinanceError("invalid_input");
    return db.transaction(async (tx) => {
      const [parent] = await tx.select().from(cases).where(and(eq(cases.id, parentId), eq(cases.organizationId, ctx.org.id))).for("update");
      if (!parent || !active(parent.status) || parent.serviceKey === childKey) throw new FinanceError("invalid_transition");
      const [existing] = await tx.select({ id: cases.id }).from(cases).where(and(eq(cases.organizationId, ctx.org.id), eq(cases.parentCaseId, parentId), eq(cases.serviceKey, childKey), inArray(cases.status, ["new", "reviewing", "missing_documents", "in_progress", "awaiting_review", "awaiting_approval", "ready_for_delivery"]))).limit(1);
      if (existing) return { id: existing.id };
      const [service] = await tx.select().from(services).where(and(eq(services.organizationId, ctx.org.id), eq(services.serviceKey, childKey), eq(services.status, "active"))).limit(1);
      if (!service) throw new FinanceError("not_found");
      const [child] = await tx.insert(cases).values({ organizationId: ctx.org.id, caseNumber: await nextNumber(tx, ctx.org.id, "case"), customerId: parent.customerId, serviceId: service.id, serviceKey: childKey, parentCaseId: parent.id, licenseId: parent.licenseId, openedAt: todayIso(), dueDate: parent.dueDate, responsibleEmployeeId: parent.responsibleEmployeeId, priority: parent.priority, serviceFee: 0, discountAmount: 0, feeCurrency: ctx.org.currency, status: "new", createdBy: ctx.user.id, isDemo: parent.isDemo }).returning();
      await initializeCaseWorkflow(tx, ctx.org.id, child.id, childKey, service);
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "linked_case", entityId: child.id, newData: { parentCaseId: parent.id, serviceKey: childKey, customerId: parent.customerId } });
      return { id: child.id };
    });
  });
}

export async function completeCaseTaskAction(caseId: string, taskId: string, result: string) {
  return act(async () => {
    const ctx = await requireContext("cases.write");
    const notes = result.trim();
    if (notes.length < 3) throw new FinanceError("invalid_input");
    return db.transaction(async (tx) => {
      const [k] = await tx.select().from(cases).where(and(eq(cases.id, caseId), eq(cases.organizationId, ctx.org.id))).for("update");
      if (!k || !active(k.status)) throw new FinanceError("cannot_edit_final");
      const state = await getCaseSnapshot(tx, ctx.org.id, caseId);
      const task = state.currentTask;
      if (!task || task.id !== taskId) throw new FinanceError("case_task_order");
      if (task.stepKey === "documents" && state.missingDocs > 0) throw new FinanceError("case_documents_incomplete");
      if (task.stepKey === "license_check" && (!state.license || state.license.status === "unknown")) throw new FinanceError("case_license_missing");
      if (task.stepKey === "license_check" && k.serviceKey === "fx-renewal" && state.license?.status === "suspended") throw new FinanceError("case_license_suspended");
      if (task.stepKey === "settlement" && (state.totalDebt > 0 || state.pendingLegalReview > 0 || state.incompleteLinkedSettlement)) throw new FinanceError("case_financial_blocker");
      if (task.stepKey === "service_fee" && state.feeRemaining > 0) throw new FinanceError("case_fee_unpaid");
      if (task.stepKey === "corrective_plan" && (state.milestones.length === 0 || state.milestones.some((m) => m.step.status !== "approved"))) throw new FinanceError("case_plan_incomplete");
      if (task.stepKey === "outcome" && (k.outcomeStatus !== "approved" || !k.outcomeReference)) throw new FinanceError("case_outcome_missing");
      await tx.update(caseTasks).set({ status: "completed", result: notes, completedBy: ctx.user.id, completedAt: new Date() }).where(eq(caseTasks.id, task.id));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "COMPLETE", entityType: "case_task", entityId: task.id, oldData: { status: task.status }, newData: { caseId, stepKey: task.stepKey, result: notes } });
      return { id: task.id };
    });
  });
}

export async function createPlanStepAction(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("cases.write");
    const caseId = str(fd.get("caseId"));
    const title = str(fd.get("title"));
    const dueDate = str(fd.get("dueDate"));
    const amountDue = round2(num(fd.get("amountDue")));
    if (title.length < 3 || !isoDate(dueDate) || !Number.isFinite(amountDue) || amountDue < 0) throw new FinanceError("invalid_input");
    return db.transaction(async (tx) => {
      const [k] = await tx.select().from(cases).where(and(eq(cases.id, caseId), eq(cases.organizationId, ctx.org.id))).for("update");
      if (!k || !active(k.status) || !["corrective-plan", "fx-unfreeze"].includes(k.serviceKey)) throw new FinanceError("invalid_transition");
      const steps = await tx.select({ position: casePlanSteps.position }).from(casePlanSteps).where(and(eq(casePlanSteps.organizationId, ctx.org.id), eq(casePlanSteps.caseId, caseId))).orderBy(asc(casePlanSteps.position));
      const [step] = await tx.insert(casePlanSteps).values({ organizationId: ctx.org.id, caseId, position: (steps.at(-1)?.position ?? 0) + 1, title, dueDate, amountDue, status: "pending", createdBy: ctx.user.id }).returning();
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "case_plan_step", entityId: step.id, newData: { caseId, position: step.position, title, dueDate, amountDue } });
      return { id: step.id };
    });
  });
}

export async function recordPlanPaymentAction(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("cases.write");
    const stepId = str(fd.get("stepId"));
    const amount = round2(num(fd.get("amount")));
    const authorityReceipt = str(fd.get("authorityReceipt"));
    const paymentDate = str(fd.get("paymentDate")) || todayIso();
    const file = formFile(fd.get("file"));
    const bytes = await readDocumentUpload(file);
    if (!Number.isFinite(amount) || amount <= 0 || !authorityReceipt || !isoDate(paymentDate)) throw new FinanceError("invalid_input");
    return db.transaction(async (tx) => {
      const [step] = await tx.select().from(casePlanSteps).where(and(eq(casePlanSteps.id, stepId), eq(casePlanSteps.organizationId, ctx.org.id)));
      if (!step) throw new FinanceError("not_found");
      const [k] = await tx.select().from(cases).where(and(eq(cases.id, step.caseId), eq(cases.organizationId, ctx.org.id))).for("update");
      if (!k || !active(k.status) || step.status === "approved") throw new FinanceError("cannot_edit_final");
      const state = await getCaseSnapshot(tx, ctx.org.id, k.id);
      if (state.milestones.find((m) => m.step.status !== "approved")?.step.id !== stepId) throw new FinanceError("case_task_order");
      const milestone = state.milestones.find((m) => m.step.id === stepId)!;
      if (amount > round2(Number(step.amountDue) - milestone.paid)) throw new FinanceError("amount_exceeds_due");
      const [att] = file && bytes ? await tx.insert(attachments).values({ organizationId: ctx.org.id, fileName: file.name, mimeType: file.type || "application/octet-stream", fileSize: file.size, content: bytes.toString("base64"), uploadedBy: ctx.user.id }).returning() : [null];
      const [payment] = await tx.insert(caseStepPayments).values({ organizationId: ctx.org.id, stepId, amount, paymentDate, authorityReceipt, evidenceAttachmentId: att?.id ?? null, createdBy: ctx.user.id }).returning();
      if (att) await tx.insert(caseFiles).values({ organizationId: ctx.org.id, caseId: k.id, attachmentId: att.id, uploadedBy: ctx.user.id });
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "case_step_payment", entityId: payment.id, newData: { caseId: k.id, stepId, amount, authorityReceipt, evidenceAttachmentId: att?.id, remaining: round2(Number(step.amountDue) - milestone.paid - amount) } });
      return { id: payment.id };
    });
  });
}

export async function transitionPlanStepAction(stepId: string, action: string, result?: string | null) {
  return act(async () => {
    if (!["start", "complete", "approve"].includes(action)) throw new FinanceError("invalid_transition");
    const ctx = await requireContext(action === "approve" ? "cases.approve" : "cases.write");
    return db.transaction(async (tx) => {
      const [step] = await tx.select().from(casePlanSteps).where(and(eq(casePlanSteps.id, stepId), eq(casePlanSteps.organizationId, ctx.org.id)));
      if (!step) throw new FinanceError("not_found");
      const [k] = await tx.select().from(cases).where(and(eq(cases.id, step.caseId), eq(cases.organizationId, ctx.org.id))).for("update");
      if (!k || !active(k.status)) throw new FinanceError("cannot_edit_final");
      const state = await getCaseSnapshot(tx, ctx.org.id, k.id);
      if (state.milestones.find((m) => m.step.status !== "approved")?.step.id !== stepId) throw new FinanceError("case_task_order");
      const milestone = state.milestones.find((m) => m.step.id === stepId)!;
      if (action === "start" && step.status !== "pending") throw new FinanceError("invalid_transition");
      if (action === "complete" && (step.status !== "in_progress" || !result?.trim() || milestone.paid < Number(step.amountDue))) throw new FinanceError("case_plan_incomplete");
      if (action === "approve" && step.status !== "completed") throw new FinanceError("invalid_transition");
      const status = action === "start" ? "in_progress" : action === "complete" ? "completed" : "approved";
      await tx.update(casePlanSteps).set({ status, completionNotes: action === "complete" ? result?.trim() : step.completionNotes, approvedBy: action === "approve" ? ctx.user.id : step.approvedBy, approvedAt: action === "approve" ? new Date() : step.approvedAt }).where(eq(casePlanSteps.id, stepId));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: action === "approve" ? "APPROVE" : "UPDATE", entityType: "case_plan_step", entityId: stepId, oldData: { status: step.status }, newData: { caseId: k.id, status, result: result ?? null } });
      return { id: stepId };
    });
  });
}

/** Authority decision is explicitly entered by a manager; the system never grants an official licence itself. */
export async function recordCaseOutcomeAction(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("cases.approve");
    const caseId = str(fd.get("caseId"));
    const decision = str(fd.get("decision"));
    const authorityReference = str(fd.get("authorityReference"));
    const outcomeDate = str(fd.get("outcomeDate")) || todayIso();
    const licenseNumber = optStr(fd.get("licenseNumber"));
    const notes = str(fd.get("notes"));
    const file = formFile(fd.get("file"));
    const bytes = await readDocumentUpload(file);
    if (!["approved", "rejected", "returned"].includes(decision) || !authorityReference || !isoDate(outcomeDate) || (decision !== "approved" && notes.length < 3)) throw new FinanceError("invalid_input");
    return db.transaction(async (tx) => {
      const [k] = await tx.select().from(cases).where(and(eq(cases.id, caseId), eq(cases.organizationId, ctx.org.id))).for("update");
      if (!k || !active(k.status)) throw new FinanceError("cannot_edit_final");
      const state = await getCaseSnapshot(tx, ctx.org.id, caseId);
      if (decision === "approved" && state.missingDocs > 0) throw new FinanceError("case_documents_incomplete");
      if (decision === "approved" && !bytes) throw new FinanceError("evidence_required");
      if (decision === "approved" && k.serviceKey === "fx-license" && !licenseNumber) throw new FinanceError("case_license_missing");
      if (decision === "approved" && ["fx-renewal", "fx-cancel", "fx-unfreeze"].includes(k.serviceKey) && !state.license) throw new FinanceError("case_license_missing");
      const [att] = file && bytes ? await tx.insert(attachments).values({ organizationId: ctx.org.id, fileName: file.name, mimeType: file.type || "application/octet-stream", fileSize: file.size, content: bytes.toString("base64"), uploadedBy: ctx.user.id }).returning() : [null];
      if (att) await tx.insert(caseFiles).values({ organizationId: ctx.org.id, caseId, attachmentId: att.id, uploadedBy: ctx.user.id });
      let licenseId = k.licenseId;
      if (decision === "approved" && ["fx-license", "fx-renewal", "fx-cancel", "fx-unfreeze"].includes(k.serviceKey)) {
        const newStatus = k.serviceKey === "fx-cancel" ? "cancelled" : "active";
        if (state.license) {
          const [lic] = await tx.update(customerLicenses).set({ status: newStatus, licenseNumber: licenseNumber ?? state.license.licenseNumber, authorityReference, expiresAt: optStr(fd.get("expiresAt")) ?? state.license.expiresAt, updatedAt: new Date() }).where(and(eq(customerLicenses.id, state.license.id), eq(customerLicenses.organizationId, ctx.org.id))).returning();
          licenseId = lic.id;
          await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "UPDATE", entityType: "customer_license", entityId: lic.id, oldData: state.license, newData: { status: newStatus, authorityReference, outcomeDate } });
        } else {
          const [lic] = await tx.insert(customerLicenses).values({ organizationId: ctx.org.id, customerId: k.customerId, licenseNumber: licenseNumber!, licenseType: "fx", status: newStatus, authorityReference, expiresAt: optStr(fd.get("expiresAt")), createdBy: ctx.user.id }).returning();
          licenseId = lic.id;
          await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "customer_license", entityId: lic.id, newData: { status: newStatus, authorityReference } });
        }
        await tx.update(customers).set({ licenseNumber: licenseNumber ?? state.license?.licenseNumber, updatedAt: new Date() }).where(eq(customers.id, k.customerId));
      }
      await tx.update(cases).set({ licenseId, outcomeReference: authorityReference, outcomeStatus: decision, outcomeDate, updatedAt: new Date() }).where(eq(cases.id, caseId));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: decision === "approved" ? "APPROVE" : "REVIEW", entityType: "case_outcome", entityId: caseId, oldData: { outcomeStatus: k.outcomeStatus }, newData: { decision, authorityReference, outcomeDate, evidenceAttachmentId: att?.id, notes } });
      return { id: caseId };
    });
  });
}
