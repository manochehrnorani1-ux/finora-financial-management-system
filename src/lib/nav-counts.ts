import "server-only";
import { eq, sql } from "drizzle-orm";
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
  // One round-trip instead of five concurrent queries. This matters on serverless
  // deployments because the authenticated app layout executes this on every page.
  const result = await db
    .select({
      cases: sql<number>`(
        select count(*)::int
        from ${cases} c
        where c.organization_id = ${orgId}
          and c.status in ('new', 'missing_documents', 'awaiting_approval')
      )`,
      documents: sql<number>`(
        select count(*)::int
        from ${documents} d
        where d.organization_id = ${orgId}
          and d.status in ('submitted', 'under_review')
      )`,
      incomeApprovals: sql<number>`(
        select count(*)::int
        from ${incomes} i
        where i.organization_id = ${orgId}
          and i.status = 'pending_approval'
      )`,
      expenseApprovals: sql<number>`(
        select count(*)::int
        from ${expenses} e
        where e.organization_id = ${orgId}
          and e.status = 'pending_approval'
      )`,
      taxReview: sql<number>`(
        select count(*)::int
        from ${taxSettlements} t
        where t.organization_id = ${orgId}
          and t.status = 'REQUIRES_LEGAL_REVIEW'
      )`,
    })
    .from(cases)
    .where(eq(cases.organizationId, orgId))
    .limit(1);

  const row = result[0];
  const casesCount = Number(row?.cases ?? 0);
  const documentsCount = Number(row?.documents ?? 0);
  const approvals = Number(row?.incomeApprovals ?? 0) + Number(row?.expenseApprovals ?? 0);
  const taxReview = Number(row?.taxReview ?? 0);

  return {
    cases: casesCount,
    documents: documentsCount,
    approvals,
    taxReview,
    total: casesCount + documentsCount + approvals + taxReview,
  };
}
