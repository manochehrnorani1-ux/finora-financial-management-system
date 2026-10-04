import "server-only";
import { and, eq } from "drizzle-orm";
import { services } from "@/db/schema";
import { OPERATIONAL_SERVICES } from "./operational-services";
import type { Tx } from "./finance";

export async function ensureWorkflowServices(tx: Tx, orgId: string, isDemo = false) {
  const rows = await tx.select().from(services).where(eq(services.organizationId, orgId));

  for (const [index, def] of OPERATIONAL_SERVICES.entries()) {
    const workflowKey = def.key;
    const existing = rows.find((s) => s.workflowKey === workflowKey) ?? rows.find((s) => s.name === def.fa);

    if (existing) {
      const patch: Partial<typeof services.$inferInsert> = {};
      if (existing.workflowKey !== workflowKey) patch.workflowKey = workflowKey;
      // Keep the seeded workflow steps in sync with the catalog so the
      // simplified 4-stage flow applies to new cases in existing orgs.
      // Materialized case_workflow_steps of in-flight cases are untouched.
      const currentSteps = (existing.workflowSteps ?? {}) as Record<string, unknown>;
      const wantedSteps = def.workflow;
      if (
        JSON.stringify(currentSteps.fa ?? null) !== JSON.stringify(wantedSteps.fa) ||
        JSON.stringify(currentSteps.ps ?? null) !== JSON.stringify(wantedSteps.ps) ||
        JSON.stringify(currentSteps.en ?? null) !== JSON.stringify(wantedSteps.en)
      ) {
        patch.workflowSteps = wantedSteps;
      }
      if (Object.keys(patch).length > 0) {
        await tx.update(services)
          .set(patch)
          .where(and(eq(services.id, existing.id), eq(services.organizationId, orgId)));
      }
      continue;
    }

    const [created] = await tx.insert(services).values({
      organizationId: orgId,
      name: def.fa,
      category: def.group,
      description: def.descFa,
      defaultPrice: def.defaultPrice,
      estimatedDays: def.estimatedDays,
      publicListed: !isDemo,
      publicOrder: def.order || 100 + index,
      feeQuoteRequired: def.defaultPrice <= 0,
      requiredDocuments: def.requiredDocuments,
      workflowSteps: def.workflow,
      publicContent: {
        title: { fa: def.fa, ps: def.ps, en: def.en },
        description: { fa: def.descFa, ps: def.descPs, en: def.descEn },
        short: { fa: def.shortFa, ps: def.shortPs, en: def.shortEn },
        group: def.group,
        forms: def.forms,
      },
      workflowKey,
      status: "active",
      isDemo,
    }).returning();

    rows.push(created);
  }
}
