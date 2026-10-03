import "server-only";
import { sql } from "drizzle-orm";
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
  // Keep this as one round-trip with no base table scan. Each counter is an
  // independent scoped aggregate, which is cheaper than using cases as a dummy FROM.
  const result = await db.execute(sql`
    select
      (
        select count(*)::int
        from ${cases} c
        where c.organization_id = ${orgId}
          and c.status in ('new', 'missing_documents', 'awaiting_approval')
      ) as cases,
      (
        select count(*)::int
        from ${documents} d
        where d.organization_id = ${orgId}
          and d.status in ('submitted', 'under_review')
      ) as documents,
      (
        select count(*)::int
        from ${incomes} i
        where i.organization_id = ${orgId}
          and i.status = 'pending_approval'
      ) as income_approvals,
      (
        select count(*)::int
        from ${expenses} e
        where e.organization_id = ${orgId}
          and e.status = 'pending_approval'
      ) as expense_approvals,
      (
        select count(*)::int
        from ${taxSettlements} t
        where t.organization_id = ${orgId}
          and t.status = 'REQUIRES_LEGAL_REVIEW'
      ) as tax_review
  `);

  const row = result.rows[0] as {
    cases?: number;
    documents?: number;
    income_approvals?: number;
    expense_approvals?: number;
    tax_review?: number;
  } | undefined;

  const casesCount = Number(row?.cases ?? 0);
  const documentsCount = Number(row?.documents ?? 0);
  const approvals = Number(row?.income_approvals ?? 0) + Number(row?.expense_approvals ?? 0);
  const taxReview = Number(row?.tax_review ?? 0);

  return {
    cases: casesCount,
    documents: documentsCount,
    approvals,
    taxReview,
    total: casesCount + documentsCount + approvals + taxReview,
  };
}
