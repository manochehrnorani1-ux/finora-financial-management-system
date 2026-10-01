import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { cases, customers, generatedForms, officialForms } from "@/db/schema";
import { pageContext } from "@/lib/page";
import { PageHeader, Card, KV, Badge } from "@/components/ui";
import { PrintButton } from "@/components/forms";
import { GeneratedFormFiller, type FillerField } from "@/components/GeneratedFormFiller";
import { formatDateTime } from "@/lib/jalali";
import { CustomerLogo, FinoraLogo } from "@/components/BrandLogos";

export default async function GeneratedFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, t, fmt, lang } = await pageContext("official_forms.read");
  const [row] = await db.select({ g: generatedForms, f: officialForms, c: cases, customer: customers.name, customerLogoId: customers.logoAttachmentId })
    .from(generatedForms)
    .leftJoin(officialForms, eq(generatedForms.officialFormId, officialForms.id))
    .leftJoin(cases, eq(generatedForms.caseId, cases.id))
    .leftJoin(customers, eq(generatedForms.customerId, customers.id))
    .where(and(eq(generatedForms.id, id), eq(generatedForms.organizationId, ctx.org.id)));
  if (!row) notFound();
  const values = row.g.valuesSnapshot as Record<string, unknown>;
  const rawFields = (row.f?.fields ?? []) as { key: string; label: string; labelPs?: string | null; labelEn?: string | null; type?: string; required?: boolean; options?: string[] | null; help?: string | null }[];
  const map = row.g.mappingSnapshot as Record<string, string>;
  const official = row.g.documentType !== "FINORA_INTERNAL_FORM";
  const canWrite = ctx.can("official_forms.write");

  const labelFor = (f: { label: string; labelPs?: string | null; labelEn?: string | null }) => {
    if (lang === "ps") return f.labelPs ?? f.label;
    if (lang === "en") return f.labelEn ?? f.label;
    return f.label;
  };

  const fields: FillerField[] = rawFields.map((f) => ({
    key: f.key,
    label: labelFor(f),
    type: (f.type as FillerField["type"]) ?? "text",
    required: f.required ?? false,
    options: f.options ?? null,
    help: f.help ?? null,
    mapping: map[f.key] ?? null,
  }));

  const initialValues: Record<string, string> = {};
  for (const f of fields) initialValues[f.key] = values[f.key] == null ? "" : String(values[f.key]);

  return (
    <>
      <PageHeader
        title={row.g.formNameSnapshot}
        subtitle={`${row.g.internalNumber} · ${t("formVersion")} v${row.g.versionSnapshot} · ${row.g.agencySnapshot}`}
        actions={<>
          <Link href="/official-forms" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm print:hidden">← {t("back")}</Link>
          <PrintButton label={t("printForm")} audit={{ entityType: "generated_form", entityId: id }} />
        </>}
      />
      <div className="mx-auto max-w-4xl space-y-4">
        <Card>
          <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${official ? "border-amber-300 bg-amber-50 text-amber-900" : "border-blue-300 bg-blue-50 text-blue-900"}`}>
            {official ? t("officialReport") : t("internalFormNotice")}
            <p className="mt-1 text-xs font-normal">{official ? t("ruleNotFound") : "FINORA INTERNAL FORM"}</p>
          </div>
          <div className="mt-4">
            <KV items={[
              [t("formName"), row.g.formNameSnapshot],
              [t("institution"), row.g.agencySnapshot],
              [t("formNumber"), row.f?.formNumber ?? "-"],
              [t("formVersion"), `v${row.g.versionSnapshot}`],
              [t("caseNumber"), row.c?.caseNumber ?? "-"],
              [t("customer"), row.customer ?? "-"],
              [t("createdAt"), formatDateTime(row.g.createdAt, fmt)],
              [t("status"), <Badge key="s" status={row.g.matchStatus === "MATCHED" ? "approved" : "pending_approval"} label={t(row.g.matchStatus === "MATCHED" ? "matched" : row.g.matchStatus === "MISSING_FIELD" ? "missingField" : row.g.matchStatus === "MINOR_DIFFERENCE" ? "minorDifference" : row.g.matchStatus === "OUTDATED" ? "outdated" : "legalReviewRequired")} />],
            ]} />
          </div>
          {row.f?.sourceUrl && row.f.sourceUrl !== "FINORA_INTERNAL" && (
            <p className="mt-4 text-sm">{t("sourceUrl")}: <a href={row.f.sourceUrl} target="_blank" rel="noreferrer" className="text-emerald-700 underline">{row.f.sourceUrl}</a></p>
          )}
          {row.f?.originalFileUrl && (
            <p className="mt-2 text-sm">
              <a href={row.f.originalFileUrl} target="_blank" rel="noreferrer" className="text-emerald-700 underline">{t("originalTemplate")}</a>
              <span className="ms-2 text-xs text-slate-500">— {t("officialFormLabel")}</span>
            </p>
          )}
          {row.f?.templateAttachmentId && (
            <p className="mt-2 text-sm"><a href={`/api/files/${row.f.templateAttachmentId}`} target="_blank" rel="noreferrer" className="text-emerald-700 underline">{t("originalTemplate")}</a> — {t("fieldMapping")}</p>
          )}
        </Card>

        <Card title={`${t("generateForm")} — ${t("publicServiceDetails")}`}>
          <GeneratedFormFiller formId={id} fields={fields} initialValues={initialValues} readOnly={!canWrite} />
        </Card>

        {/* Print view: official-looking form sheet */}
        <div className="hidden print:block">
          <div className="flex items-start justify-between gap-4 border-b-2 border-emerald-800 pb-3">
            <div className="flex items-center gap-3">
              <FinoraLogo height={44} />
              <div className="text-xs text-slate-500">{t("slogan")}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-black">{row.g.agencySnapshot}</div>
              <div className="mt-1 text-base font-bold">{row.g.formNameSnapshot}</div>
              <div className="mt-1 text-xs text-slate-500">
                {row.f?.formNumber ? `${t("formNumber")}: ${row.f.formNumber} · ` : ""}{t("formVersion")} v{row.g.versionSnapshot}
              </div>
            </div>
            {row.customer && <CustomerLogo attachmentId={row.customerLogoId} name={row.customer} height={44} />}
          </div>
          <div className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            {fields.map((f) => (
              <div key={`p-${f.key}`} className={`flex items-baseline gap-2 border-b border-dashed border-slate-200 pb-1 ${f.type === "textarea" ? "sm:col-span-full" : ""}`}>
                <span className="shrink-0 text-slate-600">{f.label}:</span>
                <span className="flex-1 font-medium">{initialValues[f.key] || "…………………"}</span>
              </div>
            ))}
          </div>
          <div className="mt-10 grid grid-cols-2 gap-12 text-sm">
            <div className="border-t border-slate-400 pt-2">{t("signature")}</div>
            <div className="border-t border-slate-400 pt-2">{t("stamp")}</div>
          </div>
          <div className="mt-8 border-t pt-2 text-center text-[11px] text-slate-500">
            FINORA GENERATED WORKSHEET · {t("internalFormNotice")} · {t("sourceUrl")}: {row.f?.sourceUrl ?? "-"}
          </div>
        </div>
      </div>
    </>
  );
}
