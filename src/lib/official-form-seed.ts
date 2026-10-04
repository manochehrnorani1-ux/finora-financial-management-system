import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { officialForms } from "@/db/schema";
import { OFFICIAL_FORMS_CATALOG } from "./forms-catalog";
import type { Tx } from "./finance";

/**
 * Seeds the official editable form templates (Da Afghanistan Bank + Ministry of
 * Finance / ARD) into `official_forms` for an organization, so staff get every
 * template ready to fill and print with zero manual setup.
 *
 * Idempotent: inserts version 1 for unseen formKeys and bumps the version only
 * when the catalog definition actually changed. Seeded rows carry
 * verificationStatus "source_listed" — fields are sourced from the authority's
 * official listing pages and await legal verification via the normal
 * verifyOfficialFormAction flow.
 */
export async function ensureOfficialFormTemplates(tx: Tx, orgId: string) {
  const today = new Date().toISOString().slice(0, 10);
  for (const def of OFFICIAL_FORMS_CATALOG) {
    const rows = await tx
      .select()
      .from(officialForms)
      .where(and(eq(officialForms.organizationId, orgId), eq(officialForms.formKey, def.formKey)))
      .orderBy(desc(officialForms.version))
      .limit(1);
    const latest = rows[0];
    const fieldsJson = JSON.stringify(def.fields);
    const mapping = Object.fromEntries(
      def.fields.filter((f) => f.mapping).map((f) => [f.key, f.mapping as string]),
    );
    const mappingJson = JSON.stringify(mapping);
    if (
      latest &&
      JSON.stringify(latest.fields) === fieldsJson &&
      JSON.stringify(latest.fieldMapping) === mappingJson &&
      latest.formName === def.formName &&
      latest.sourceUrl === def.sourceUrl &&
      (latest.originalFileUrl ?? null) === (def.originalFileUrl ?? null)
    ) {
      continue;
    }
    await tx.insert(officialForms).values({
      organizationId: orgId,
      formKey: def.formKey,
      agency: def.agency,
      formName: def.formName,
      formNumber: def.formNumber ?? null,
      version: latest ? latest.version + 1 : 1,
      effectiveFrom: today,
      sourceUrl: def.sourceUrl,
      originalFileUrl: def.originalFileUrl ?? null,
      fields: def.fields,
      fieldMapping: mapping,
      isOfficial: true,
      verificationStatus: "source_listed",
    });
  }
}
