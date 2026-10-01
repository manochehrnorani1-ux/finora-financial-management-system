import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { cases, documents, expenses, incomes, taxSettlements } from "@/db/schema";

export interface NavCounts {
  cases: number;
  documents: number;
  approvals: number;
  taxReview: number;
  total: number;
}

/** Live attention counters for the navigation menu, scoped to the active organization. */
export async function getNavCounts(orgId: string): Promise<NavCounts> {
  const [caseCount, docCount, incomeApprovals, expenseApprovals, taxReview] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(cases).where(and(eq(cases.organizationId, orgId), inArray(cases.status, ["new", "missing_documents", "awaiting_approval"]))),
    db.select({ n: sql<number>`count(*)::int` }).from(documents).where(and(eq(documents.organizationId, orgId), inArray(documents.status, ["submitted", "under_review"]))),
    db.select({ n: sql<number>`count(*)::int` }).from(incomes).where(and(eq(incomes.organizationId, orgId), eq(incomes.status, "pending_approval"))),
    db.select({ n: sql<number>`count(*)::int` }).from(expenses).where(and(eq(expenses.organizationId, orgId), eq(expenses.status, "pending_approval"))),
    db.select({ n: sql<number>`count(*)::int` }).from(taxSettlements).where(and(eq(taxSettlements.organizationId, orgId), eq(taxSettlements.status, "REQUIRES_LEGAL_REVIEW"))),
  ]);
  const counts: NavCounts = {
    cases: caseCount[0]?.n ?? 0,
    documents: docCount[0]?.n ?? 0,
    approvals: (incomeApprovals[0]?.n ?? 0) + (expenseApprovals[0]?.n ?? 0),
    taxReview: taxReview[0]?.n ?? 0,
    total: 0,
  };
  counts.total = counts.cases + counts.documents + counts.approvals + counts.taxReview;
  return counts;
}
