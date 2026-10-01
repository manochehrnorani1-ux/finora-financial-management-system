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
import { getZipFormDefinition } from "@/lib/zip-form-definitions";

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
  const rawFields = mergeZipFields(row.f?.formKey ?? "", (row.f?.fields ?? []) as never) as { key: string; label: string; labelPs?: string | null; labelEn?: string | null; type?: string; required?: boolean; options?: string[] | null; help?: string | null; mapping?: string | null }[];
  const map = row.g.mappingSnapshot as Record<string, string>;
  const official = row.g.documentType !== "FINORA_INTERNAL_FORM";
  const canWrite = ctx.can("official_forms.write");

  const labelFor = (f: { label: string; labelPs?: string | null; labelEn?: string | null }) => {
    if (lang === "ps") return f.labelPs ?? f.label;
    if (lang === "en") return f.labelEn ?? f.label;
    return f.label;
  };

  const zipDef = getZipFormDefinition(row.f?.formKey ?? "");
  const missingFields = rawFields.filter((f) => f.required && !String(values[f.key] ?? "").trim());
  const zipBusiness = (values._zipBusiness ?? {}) as any;
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
          {missingFields.length > 0 && (
            <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
              <strong>Information required</strong>
              <div className="mt-1">Missing: {missingFields.map((f) => f.label).join("، ")}</div>
              <div className="mt-1 text-xs">این فورم تا تکمیل معلومات الزامی آماده چاپ رسمی نیست.</div>
            </div>
          )}
          {zipDef && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-6">
              <strong>ZIP-derived completeness checklist</strong>
              <div>Required attachments: {zipDef.requiredAttachments.length}</div>
              <div>Business records: {zipBusiness.shareholdersCount ?? 0} shareholders · {zipBusiness.branchesCount ?? 0} branches · {zipBusiness.employeesCount ?? 0} employees · {zipBusiness.bankAccountsCount ?? 0} bank accounts</div>
            </div>
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
          {zipDef ? zipDef.sections.map((section) => (
            <section key={section.title} className="mt-5">
              <h2 className="mb-2 border-b border-slate-700 pb-1 text-sm font-bold">{section.title}</h2>
              <div className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                {section.fields.map((key) => {
                  const f = fields.find((x) => x.key === key);
                  if (!f) return null;
                  return <div key={`p-${f.key}`} className={`flex items-baseline gap-2 border-b border-dashed border-slate-200 pb-1 ${f.type === "textarea" ? "sm:col-span-full" : ""}`}>
                    <span className="shrink-0 text-slate-600">{f.label}:</span>
                    <span className="flex-1 font-medium whitespace-pre-line">{initialValues[f.key] || "…………………"}</span>
                  </div>;
                })}
              </div>
            </section>
          )) : (
            <div className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              {fields.map((f) => (
                <div key={`p-${f.key}`} className={`flex items-baseline gap-2 border-b border-dashed border-slate-200 pb-1 ${f.type === "textarea" ? "sm:col-span-full" : ""}`}>
                  <span className="shrink-0 text-slate-600">{f.label}:</span>
                  <span className="flex-1 font-medium">{initialValues[f.key] || "…………………"}</span>
                </div>
              ))}
            </div>
          )}
          {zipDef && Array.isArray(zipBusiness.shareholders) && zipBusiness.shareholders.length > 0 && (
            <table className="mt-5 w-full border-collapse text-xs">
              <caption className="mb-1 text-start font-bold">فهرست سهمداران</caption>
              <thead><tr><th className="border p-1">نام</th><th className="border p-1">نام پدر</th><th className="border p-1">تذکره</th><th className="border p-1">فیصدی سهم</th><th className="border p-1">ولایت</th><th className="border p-1">ولسوالی</th><th className="border p-1">ناحیه</th></tr></thead>
              <tbody>{zipBusiness.shareholders.map((s:any) => <tr key={s.id}><td className="border p-1">{s.fullName}</td><td className="border p-1">{s.fatherName ?? "—"}</td><td className="border p-1">{s.nationalId ?? "—"}</td><td className="border p-1">{s.ownershipPercentage ?? "—"}</td><td className="border p-1">{s.province ?? "—"}</td><td className="border p-1">{s.district ?? "—"}</td><td className="border p-1">{s.area ?? "—"}</td></tr>)}</tbody>
            </table>
          )}
          {zipDef && Array.isArray(zipBusiness.branches) && zipBusiness.branches.length > 0 && (
            <table className="mt-5 w-full border-collapse text-xs">
              <caption className="mb-1 text-start font-bold">فهرست نمایندگی‌ها</caption>
              <thead><tr><th className="border p-1">شماره</th><th className="border p-1">نماینده</th><th className="border p-1">ولایت</th><th className="border p-1">ولسوالی</th><th className="border p-1">ناحیه</th><th className="border p-1">مارکیت</th><th className="border p-1">دکان</th><th className="border p-1">تماس</th></tr></thead>
              <tbody>{zipBusiness.branches.map((b:any) => <tr key={b.id}><td className="border p-1">{b.branchNumber ?? "—"}</td><td className="border p-1">{b.name ?? "—"}</td><td className="border p-1">{b.province ?? "—"}</td><td className="border p-1">{b.district ?? "—"}</td><td className="border p-1">{b.area ?? "—"}</td><td className="border p-1">{b.market ?? "—"}</td><td className="border p-1">{b.shopNumber ?? "—"}</td><td className="border p-1">{b.phone ?? "—"}</td></tr>)}</tbody>
            </table>
          )}
          {zipDef && Array.isArray(zipBusiness.employees) && zipBusiness.employees.length > 0 && (
            <table className="mt-5 w-full border-collapse text-xs">
              <caption className="mb-1 text-start font-bold">فهرست کارمندان</caption>
              <thead><tr><th className="border p-1">نام</th><th className="border p-1">نام پدر</th><th className="border p-1">موقف</th><th className="border p-1">تذکره</th><th className="border p-1">TIN</th><th className="border p-1">شماره تماس</th></tr></thead>
              <tbody>{zipBusiness.employees.map((e:any) => <tr key={e.id}><td className="border p-1">{e.fullName}</td><td className="border p-1">{e.fatherName ?? "—"}</td><td className="border p-1">{e.position ?? "—"}</td><td className="border p-1">{e.nationalId ?? "—"}</td><td className="border p-1">{e.tin ?? "—"}</td><td className="border p-1">{e.phone ?? "—"}</td></tr>)}</tbody>
            </table>
          )}
          {zipDef && Array.isArray(zipBusiness.guarantees) && zipBusiness.guarantees.length > 0 && (
            <table className="mt-5 w-full border-collapse text-xs">
              <caption className="mb-1 text-start font-bold">فهرست تضمین‌کنندگان</caption>
              <thead><tr><th className="border p-1">نام ضامن</th><th className="border p-1">ولد</th><th className="border p-1">تذکره</th><th className="border p-1">تماس</th><th className="border p-1">تشبث</th><th className="border p-1">جواز تشبث</th></tr></thead>
              <tbody>{zipBusiness.guarantees.map((g:any) => <tr key={g.id}><td className="border p-1">{g.guarantorName}</td><td className="border p-1">{g.guarantorFatherName ?? "—"}</td><td className="border p-1">{g.guarantorNationalId ?? "—"}</td><td className="border p-1">{g.guarantorPhone ?? "—"}</td><td className="border p-1">{g.businessName ?? "—"}</td><td className="border p-1">{g.businessLicenseNumber ?? "—"}</td></tr>)}</tbody>
            </table>
          )}
          {zipDef && Array.isArray(zipBusiness.bankAccounts) && zipBusiness.bankAccounts.length > 0 && (
            <table className="mt-5 w-full border-collapse text-xs">
              <caption className="mb-1 text-start font-bold">حساب‌های بانکی</caption>
              <thead><tr><th className="border p-1">نام حساب</th><th className="border p-1">نمبر حساب</th><th className="border p-1">بانک</th><th className="border p-1">اسعار</th></tr></thead>
              <tbody>{zipBusiness.bankAccounts.map((b:any) => <tr key={b.id}><td className="border p-1">{b.accountName}</td><td className="border p-1">{b.accountNumber}</td><td className="border p-1">{b.bankName}</td><td className="border p-1">{b.currency}</td></tr>)}</tbody>
            </table>
          )}
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
