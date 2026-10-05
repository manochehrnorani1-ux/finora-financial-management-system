import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, generatedForms, officialForms } from "@/db/schema";
import { pageContext } from "@/lib/page";
import { PrintButton } from "@/components/forms";
import { OfficialFormPrintTemplate } from "@/components/OfficialFormPrintTemplate";
import { mergeZipFields } from "@/lib/zip-form-definitions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "چاپ فورم",
};

export default async function GeneratedFormPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, t, lang } = await pageContext("official_forms.read");
  const [row] = await db
    .select({ g: generatedForms, f: officialForms, customer: customers.name })
    .from(generatedForms)
    .leftJoin(officialForms, eq(generatedForms.officialFormId, officialForms.id))
    .leftJoin(customers, eq(generatedForms.customerId, customers.id))
    .where(and(eq(generatedForms.id, id), eq(generatedForms.organizationId, ctx.org.id)));
  if (!row) notFound();
  const values = (row.g.valuesSnapshot ?? {}) as Record<string, unknown>;
  const rawFields = mergeZipFields(row.f?.formKey ?? "", (row.f?.fields ?? []) as never) as {
    key: string;
    label: string;
    required?: boolean;
  }[];
  const missingFields = rawFields.filter((f) => f.required && !String(values[f.key] ?? "").trim());
  const language = lang === "ps" ? "ps" : lang === "en" ? "en" : "fa";
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Link
          href={`/generated-forms/${id}`}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          ← {t("back")}
        </Link>
        <PrintButton label={t("printForm")} audit={{ entityType: "generated_form", entityId: id }} />
        <span className="text-xs text-slate-500">
          {row.g.formNameSnapshot} · {row.g.internalNumber}
        </span>
      </div>
      {missingFields.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 print:hidden">
          <strong>Information required</strong>
          <div className="mt-1">Missing: {missingFields.map((f) => f.label).join("، ")}</div>
          <div className="mt-1 text-xs">این فورم تا تکمیل معلومات الزامی آماده چاپ رسمی نیست.</div>
        </div>
      )}
      <OfficialFormPrintTemplate
        formKey={row.f?.formKey ?? ""}
        formName={row.g.formNameSnapshot}
        agency={row.g.agencySnapshot}
        formNumber={row.f?.formNumber}
        internalNumber={row.g.internalNumber}
        language={language}
        values={values}
      />
    </>
  );
}
