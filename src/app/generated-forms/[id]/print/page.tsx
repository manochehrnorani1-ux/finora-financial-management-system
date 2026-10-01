import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { cases, customers, generatedForms, officialForms } from "@/db/schema";
import { pageContext } from "@/lib/page";
import { getZipFormDefinition } from "@/lib/zip-form-definitions";
import { OfficialFormPrintTemplate } from "@/components/OfficialFormPrintTemplate";

export default async function GeneratedFormPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, lang } = await pageContext("official_forms.read");
  const [row] = await db.select({ g: generatedForms, f: officialForms, c: cases, customer: customers.name })
    .from(generatedForms)
    .leftJoin(officialForms, eq(generatedForms.officialFormId, officialForms.id))
    .leftJoin(cases, eq(generatedForms.caseId, cases.id))
    .leftJoin(customers, eq(generatedForms.customerId, customers.id))
    .where(and(eq(generatedForms.id, id), eq(generatedForms.organizationId, ctx.org.id)));
  if (!row) notFound();

  const values = row.g.valuesSnapshot as Record<string, unknown>;
  const definition = getZipFormDefinition(row.f?.formKey ?? "");
  const language = lang === "en" ? "en" : lang === "ps" ? "ps" : "fa";

  return (
    <html>
      <body className={definition?.orientation === "landscape" ? "print-landscape" : ""}>
        <OfficialFormPrintTemplate
          formKey={row.f?.formKey ?? ""}
          formName={row.g.formNameSnapshot}
          agency={row.g.agencySnapshot}
          formNumber={row.f?.formNumber}
          internalNumber={row.g.internalNumber}
          language={language}
          values={values}
        />
        <script dangerouslySetInnerHTML={{ __html: "window.addEventListener('load',()=>window.print())" }} />
      </body>
    </html>
  );
}
