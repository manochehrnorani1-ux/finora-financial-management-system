import "server-only";
import { and, eq } from "drizzle-orm";
import { cases, services } from "@/db/schema";
import { SERVICE_FLOW, type WorkflowKey, isWorkflowKey } from "./case-workflow-definitions";
import { initializeCaseWorkflow } from "./case-workflows";
import type { Tx } from "./finance";

const GROUP: Record<WorkflowKey, string> = {
  "tax-settlement": "tax", "fx-renewal": "licensing", "fx-license": "licensing",
  "fx-cancel": "licensing", "fx-unfreeze": "licensing", "corrective-plan": "licensing",
};

/** Idempotent organization-specific workflow catalog. Existing service prices and edits are retained. */
export async function ensureWorkflowServices(tx: Tx, orgId: string, isDemo = false) {
  const rows = await tx.select().from(services).where(eq(services.organizationId, orgId));
  for (const [idx, def] of SERVICE_FLOW.entries()) {
    const matched = rows.find((s) => s.serviceKey === def.key) ?? rows.find((s) => s.name === def.label.fa);
    if (matched) {
      if (!matched.serviceKey) {
        await tx.update(services).set({ serviceKey: def.key }).where(eq(services.id, matched.id));
        matched.serviceKey = def.key;
      }
      continue;
    }
    const [created] = await tx.insert(services).values({
      organizationId: orgId, serviceKey: def.key, name: def.label.fa, category: GROUP[def.key],
      description: def.summary.fa, requiredDocuments: def.requirements,
      workflowSteps: { fa: [], ps: [], en: [] },
      publicContent: { title: def.label, description: def.summary, group: GROUP[def.key] },
      defaultPrice: 0, status: "active", publicListed: def.publicListed && !isDemo,
      publicOrder: 200 + idx * 10, feeQuoteRequired: true, isDemo,
    }).returning();
    rows.push(created);
  }
  const oldCases = await tx.select({ id: cases.id, serviceId: cases.serviceId, serviceKey: cases.serviceKey })
    .from(cases).where(eq(cases.organizationId, orgId));
  for (const k of oldCases) {
    if (!k.serviceId) continue;
    const service = rows.find((s) => s.id === k.serviceId);
    const key = service?.serviceKey ?? k.serviceKey;
    if (!isWorkflowKey(key)) continue;
    if (k.serviceKey !== key) await tx.update(cases).set({ serviceKey: key }).where(and(eq(cases.organizationId, orgId), eq(cases.id, k.id)));
    await initializeCaseWorkflow(tx, orgId, k.id, key, service);
  }
}
