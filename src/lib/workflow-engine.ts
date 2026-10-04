"use server";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { caseWorkflowSteps, cases, documents, services, taxSettlements } from "@/db/schema";
import { pageContext } from "@/lib/page";
import { missingRequiredDocuments, requiredDocumentStatus, requiredDocumentTitles } from "@/lib/document-requirements";

export type WorkflowActionType = "document" | "verification" | "payment" | "service" | "complete_stage" | "blocked" | "none";
export type WorkflowBlocker = { code: string; label: string; detail: string; target?: string };
export type WorkflowAction = {
  stageId: string | null;
  stageNo: number | null;
  actionType: WorkflowActionType;
  label: string;
  description: string;
  target: string | null;
  blockers: WorkflowBlocker[];
  canProceed: boolean;
};

function targetFromMetadata(caseId: string, metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;
  const target = m.target;
  if (target && typeof target === "object") {
    const path = (target as Record<string, unknown>).path;
    if (typeof path === "string" && path.startsWith("/")) return path;
  }
  const path = m.targetPath;
  return typeof path === "string" && path.startsWith("/") ? path : null;
}

function returnTarget(caseId: string, suffix = "") {
  return `/cases/${caseId}${suffix}`;
}

export async function evaluateWorkflowGate(caseId: string): Promise<WorkflowAction> {
  const { ctx } = await pageContext("cases.read");
  const [row] = await db.select({ c: cases, service: services })
    .from(cases)
    .leftJoin(services, eq(cases.serviceId, services.id))
    .where(and(eq(cases.id, caseId), eq(cases.organizationId, ctx.org.id)));
  if (!row) return { stageId: null, stageNo: null, actionType: "blocked", label: "دوسیه یافت نشد", description: "دسترسی به این دوسیه ممکن نیست.", target: null, blockers: [{ code: "not_found", label: "دسترسی", detail: "دوسیه در سازمان فعلی یافت نشد." }], canProceed: false };

  const [step] = await db.select().from(caseWorkflowSteps)
    .where(and(eq(caseWorkflowSteps.caseId, caseId), eq(caseWorkflowSteps.organizationId, ctx.org.id), eq(caseWorkflowSteps.status, "active")))
    .orderBy(asc(caseWorkflowSteps.stepNo)).limit(1);

  if (!step) return { stageId: null, stageNo: null, actionType: "none", label: "گردش‌کار آماده نیست", description: "برای این دوسیه مرحله فعال وجود ندارد.", target: null, blockers: [], canProceed: false };

  const required = requiredDocumentTitles(row.service?.requiredDocuments);
  const docs = await db.select({ id: documents.id, title: documents.title, status: documents.status })
    .from(documents).where(and(eq(documents.caseId, caseId), eq(documents.organizationId, ctx.org.id)));
  const blockers: WorkflowBlocker[] = [];

  for (const title of required) {
    const status = requiredDocumentStatus(title, docs);
    if (status === "missing") {
      blockers.push({ code: "document_missing", label: title, detail: "سند مورد نیاز بارگذاری نشده است.", target: `/documents?caseId=${caseId}&q=${encodeURIComponent(title)}&requiredTitle=${encodeURIComponent(title)}&workflowReturn=${encodeURIComponent(returnTarget(caseId))}` });
    } else if (status !== "verified") {
      const doc = docs.find((d) => d.title?.trim().toLocaleLowerCase() === title.trim().toLocaleLowerCase());
      blockers.push({ code: "document_unverified", label: title, detail: status === "rejected" ? "سند رد شده است و باید اصلاح شود." : "سند موجود است اما هنوز تأیید نشده است.", target: doc ? `/documents/${doc.id}?workflowTarget=verification&workflowReturn=${encodeURIComponent(returnTarget(caseId))}` : undefined });
    }
  }

  if (row.workflowKey === "tax-settlement" && step.stepNo === 5) {
    const settlements = await db.select({ id: taxSettlements.id, status: taxSettlements.status, remainingAmount: taxSettlements.remainingAmount })
      .from(taxSettlements).where(and(eq(taxSettlements.caseId, caseId), eq(taxSettlements.organizationId, ctx.org.id)));
    if (settlements.length === 0) blockers.push({ code: "tax_settlement_missing", label: "تصفیه مالیاتی", detail: "تصفیه مالیاتی این دوسیه ثبت نشده است.", target: `/tax-settlements?caseId=${caseId}` });
    else if (settlements.length > 1) blockers.push({ code: "tax_settlement_ambiguous", label: "تصفیه مالیاتی", detail: "بیش از یک تصفیه برای این دوسیه وجود دارد و باید بررسی شود.", target: `/tax-settlements?caseId=${caseId}` });
    else {
      const s = settlements[0];
      if (["calculated", "REQUIRES_LEGAL_REVIEW"].includes(s.status)) blockers.push({ code: "tax_settlement_approval", label: "تأیید تصفیه مالیاتی", detail: "تصفیه مالیاتی هنوز برای پرداخت/ادامه آماده نیست.", target: `/tax-settlements/${s.id}` });
      else if (Number(s.remainingAmount ?? 0) > 0) blockers.push({ code: "payment_pending", label: "پرداخت مالیاتی", detail: "باقی‌مانده پرداخت مالیاتی تکمیل نشده است.", target: `/tax-settlements/${s.id}` });
    }
  } else if (Number(step.amount ?? 0) > Number(step.paidAmount ?? 0)) {
    blockers.push({ code: "payment_pending", label: "پرداخت مرحله", detail: "پرداخت این مرحله کامل نشده است.", target: returnTarget(caseId, `?workflowTarget=payment&stepId=${step.id}`) });
  }

  if (blockers.length > 0) {
    const first = blockers[0];
    const actionType: WorkflowActionType = first.code.includes("document") ? (first.code === "document_missing" ? "document" : "verification") : first.code === "payment_pending" ? "payment" : "blocked";
    return { stageId: step.id, stageNo: step.stepNo, actionType, label: first.label, description: first.detail, target: first.target ?? null, blockers, canProceed: false };
  }

  const metadataTarget = targetFromMetadata(caseId, step.metadata);
  if (metadataTarget) return { stageId: step.id, stageNo: step.stepNo, actionType: "service", label: step.actionRequired || step.title, description: "اقدام عملیاتی این مرحله را انجام دهید.", target: metadataTarget, blockers: [], canProceed: true };
  return { stageId: step.id, stageNo: step.stepNo, actionType: "complete_stage", label: "تکمیل مرحله", description: "تمام Gateهای این مرحله پاس شده‌اند. مرحله را تکمیل کنید تا مرحله بعد فعال شود.", target: returnTarget(caseId, `?workflowTarget=step-complete&stepId=${step.id}`), blockers: [], canProceed: true };
}

export async function getNextWorkflowAction(caseId: string) {
  return evaluateWorkflowGate(caseId);
}
