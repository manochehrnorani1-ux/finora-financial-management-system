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
      if (existing.workflowKey !== workflowKey) {
        await tx.update(services)
          .set({ workflowKey })
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
