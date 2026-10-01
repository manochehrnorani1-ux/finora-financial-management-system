import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  casePlanSteps, caseRequirements, caseStepPayments, caseTasks, cases, customerLicenses,
  customerObligations, customers, obligationPayments, serviceFeeReceipts, services,
  taxSettlements,
} from "@/db/schema";
import { FinanceError, type Tx, type DbOrTx } from "./finance";
import { WORKFLOW_SERVICES, isWorkflowKey, type StageKey, type Language } from "./case-workflow-definitions";
import { round2 } from "./format";
import { todayIso } from "./jalali";

export async function initializeCaseWorkflow(tx: Tx, orgId: string, caseId: string, key: string, service?: typeof services.$inferSelect | null) {
  if (!isWorkflowKey(key)) return;
  const definition = WORKFLOW_SERVICES[key];
  const titles = (service?.requiredDocuments as Record<string, unknown> | undefined)?.fa;
  const checklist = Array.isArray(titles) && titles.length ? titles.filter((v): v is string => typeof v === "string" && !!v.trim()) : definition.requirements.fa;
  if (checklist.length) await tx.insert(caseRequirements).values(checklist.map((title, index) => ({ organizationId: orgId, caseId, position: index + 1, title }))).onConflictDoNothing();
  await tx.insert(caseTasks).values(definition.stages.map((stepKey, index) => ({ organizationId: orgId, caseId, position: index + 1, stepKey }))).onConflictDoNothing();
}

export type CaseSnapshot = Awaited<ReturnType<typeof getCaseSnapshot>>;

/** One organization-scoped source for every service page, case gate and dashboard. */
export async function getCaseSnapshot(conn: DbOrTx, orgId: string, caseId: string) {
  const [k] = await conn.select().from(cases).where(and(eq(cases.id, caseId), eq(cases.organizationId, orgId))).limit(1);
  if (!k) throw new FinanceError("not_found");
  const [customer] = await conn.select().from(customers).where(and(eq(customers.id, k.customerId), eq(customers.organizationId, orgId))).limit(1);
  if (!customer) throw new FinanceError("customer_not_found");
  const [service] = k.serviceId ? await conn.select().from(services).where(and(eq(services.id, k.serviceId), eq(services.organizationId, orgId))).limit(1) : [null];
  const [registeredLicense] = k.licenseId ? await conn.select().from(customerLicenses).where(and(eq(customerLicenses.id, k.licenseId), eq(customerLicenses.organizationId, orgId), eq(customerLicenses.customerId, k.customerId))).limit(1) : [null];
  const [latestLicense] = !registeredLicense ? await conn.select().from(customerLicenses).where(and(eq(customerLicenses.organizationId, orgId), eq(customerLicenses.customerId, k.customerId))).orderBy(desc(customerLicenses.updatedAt)).limit(1) : [null];
  const license = registeredLicense ?? latestLicense ?? null;

  const requirements = await conn.select().from(caseRequirements).where(and(eq(caseRequirements.organizationId, orgId), eq(caseRequirements.caseId, caseId))).orderBy(asc(caseRequirements.position));
  const tasks = await conn.select().from(caseTasks).where(and(eq(caseTasks.organizationId, orgId), eq(caseTasks.caseId, caseId))).orderBy(asc(caseTasks.position));
  const steps = await conn.select().from(casePlanSteps).where(and(eq(casePlanSteps.organizationId, orgId), eq(casePlanSteps.caseId, caseId))).orderBy(asc(casePlanSteps.position));
  const stepIds = steps.map((s) => s.id);
  const stepPayments = stepIds.length ? await conn.select().from(caseStepPayments).where(and(eq(caseStepPayments.organizationId, orgId), inArray(caseStepPayments.stepId, stepIds))) : [];
  const milestones = steps.map((step) => ({
    step,
    paid: round2(stepPayments.filter((p) => p.stepId === step.id).reduce((sum, p) => sum + Number(p.amount), 0)),
    overdue: step.status !== "approved" && step.dueDate < todayIso(),
  }));
  const taxRows = await conn.select().from(taxSettlements).where(and(eq(taxSettlements.organizationId, orgId), eq(taxSettlements.customerId, k.customerId))).orderBy(desc(taxSettlements.createdAt));
  const obligations = await conn.select().from(customerObligations).where(and(eq(customerObligations.organizationId, orgId), eq(customerObligations.customerId, k.customerId))).orderBy(desc(customerObligations.createdAt));
  const obligationIds = obligations.map((o) => o.id);
  const paidObligations = obligationIds.length ? await conn.select().from(obligationPayments).where(and(eq(obligationPayments.organizationId, orgId), inArray(obligationPayments.obligationId, obligationIds))) : [];
  const liabilities = obligations.map((obligation) => {
    const paid = round2(paidObligations.filter((p) => p.obligationId === obligation.id).reduce((sum, p) => sum + Number(p.amount), 0));
    return { obligation, paid, remaining: round2(Math.max(0, Number(obligation.amount) - paid)) };
  });
  const receipts = await conn.select().from(serviceFeeReceipts).where(and(eq(serviceFeeReceipts.organizationId, orgId), eq(serviceFeeReceipts.caseId, caseId)));
  const feeTotal = round2(Math.max(0, Number(k.serviceFee) - Number(k.discountAmount)));
  const feePaid = round2(receipts.reduce((sum, r) => sum + Number(r.paidAmount), 0));
  const feeRemaining = round2(Math.max(0, feeTotal - feePaid));
  const taxDebt = round2(taxRows.filter((r) => ["approved", "part_paid", "paid"].includes(r.status)).reduce((sum, r) => sum + Number(r.remainingAmount ?? 0), 0));
  const otherDebt = round2(liabilities.reduce((sum, l) => sum + l.remaining, 0));
  const totalDebt = round2(taxDebt + otherDebt);
  const pendingLegalReview = taxRows.filter((r) => r.status === "REQUIRES_LEGAL_REVIEW").length;
  const linkedCases = await conn.select().from(cases).where(and(eq(cases.organizationId, orgId), eq(cases.parentCaseId, caseId))).orderBy(desc(cases.createdAt));
  const incompleteLinkedSettlement = linkedCases.some((v) => v.serviceKey === "tax-settlement" && !["closed", "cancelled"].includes(v.status));
  const incompleteCorrective = linkedCases.some((v) => v.serviceKey === "corrective-plan" && !["closed", "cancelled"].includes(v.status));
  const verifiedDocs = requirements.filter((r) => r.status === "verified").length;
  const missingDocs = requirements.length - verifiedDocs;
  const currentTask = tasks.find((v) => v.status !== "completed") ?? null;

  let nextActionKey = "awaitingTask";
  let blockerKey: string | null = null;
  if (k.status === "closed" || k.status === "cancelled") nextActionKey = "caseClosed";
  else if (!isWorkflowKey(k.serviceKey) || !service) nextActionKey = "workflowNoService";
  else if (k.serviceKey === "fx-renewal" && license?.status === "suspended") { nextActionKey = "suspensionBlock"; blockerKey = "suspensionBlock"; }
  else if (currentTask?.stepKey === "license_check" && (!license || license.status === "unknown")) nextActionKey = "awaitingLicense";
  else if (currentTask?.stepKey === "documents" && missingDocs > 0) nextActionKey = "awaitingEvidence";
  else if (currentTask?.stepKey === "financial_review") nextActionKey = "awaitingTaxReview";
  else if (currentTask?.stepKey === "corrective_plan" && (milestones.length === 0 || milestones.some((m) => m.step.status !== "approved") || incompleteCorrective)) nextActionKey = "awaitingPlan";
  else if ((currentTask?.stepKey === "settlement" || currentTask?.stepKey === "outcome") && (totalDebt > 0 || incompleteLinkedSettlement || pendingLegalReview > 0)) { nextActionKey = "awaitingSettlement"; blockerKey = "awaitingSettlement"; }
  else if ((currentTask?.stepKey === "service_fee" || currentTask?.stepKey === "outcome") && feeRemaining > 0) { nextActionKey = "awaitingFee"; blockerKey = "awaitingFee"; }
  else if (currentTask?.stepKey === "outcome" && k.outcomeStatus !== "approved") nextActionKey = "awaitingAuthority";
  else if (currentTask) nextActionKey = "awaitingTask";
  else if (k.status === "ready_for_delivery" || k.status === "delivered") nextActionKey = "readyToClose";
  else nextActionKey = "readyToApprove";

  return {
    caseRecord: k, customer, service, license, requirements, tasks, milestones, liabilities, taxRows, linkedCases,
    feeTotal, feePaid, feeRemaining, taxDebt, otherDebt, totalDebt, pendingLegalReview, verifiedDocs, missingDocs,
    currentTask, nextActionKey, blockerKey, incompleteLinkedSettlement,
  };
}

/** Financial and evidence gates are checked again inside the same DB transaction as a transition. */
export function assertCaseReady(state: CaseSnapshot) {
  if (state.missingDocs > 0) throw new FinanceError("case_documents_incomplete");
  if (state.totalDebt > 0 || state.incompleteLinkedSettlement || state.pendingLegalReview > 0) throw new FinanceError("case_financial_blocker");
  if (state.linkedCases.some((v) => v.serviceKey === "corrective-plan" && !["closed", "cancelled"].includes(v.status))) throw new FinanceError("case_plan_incomplete");
  if (state.feeRemaining > 0) throw new FinanceError("case_fee_unpaid");
  if (state.milestones.some((m) => m.step.status !== "approved")) throw new FinanceError("case_plan_incomplete");
  if (state.caseRecord.serviceKey === "corrective-plan" && state.milestones.length === 0) throw new FinanceError("case_plan_incomplete");
  if (state.tasks.some((task) => task.status !== "completed")) throw new FinanceError("case_task_incomplete");
  if (state.caseRecord.outcomeStatus !== "approved" || !state.caseRecord.outcomeReference) throw new FinanceError("case_outcome_missing");
  if (state.caseRecord.serviceKey === "fx-renewal" && state.license?.status === "suspended") throw new FinanceError("case_license_suspended");
}
