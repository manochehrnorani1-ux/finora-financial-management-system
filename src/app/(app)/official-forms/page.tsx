import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cases, customers, officialForms, customerBranches, customerEmployees } from "@/db/schema";
import { pageContext, sp1, type SP } from "@/lib/page";
import { saveOfficialForm, verifyOfficialFormAction, createGeneratedFormAction } from "@/actions/official-forms";
import { ensurePublicWebsite } from "@/lib/website-seed";
import { ActionButton, FormDialog, type Field } from "@/components/forms";
import { Badge, Card, PageHeader, Table } from "@/components/ui";
import type { Metadata } from "next";
import { formatDate } from "@/lib/jalali";

export const metadata: Metadata = {
  title: "فورم‌های رسمی افغانستان",
};

export default async function OfficialFormsPage({ searchParams }: { searchParams: SP }) {
  const { ctx, t, fmt } = await pageContext("official_forms.read");
  const q = await searchParams;
  const caseId = sp1(q.caseId);
  await db.transaction((tx) => ensurePublicWebsite(tx, ctx.org.id, ctx.user.id));
  const [forms, caseOptions, branchOptions, employeeOptions] = await Promise.all([
    db.select().from(officialForms).where(eq(officialForms.organizationId, ctx.org.id)).orderBy(officialForms.agency, officialForms.formKey, desc(officialForms.version)),
    db.select({ c: cases, customer: customers.name }).from(cases).innerJoin(customers, eq(cases.customerId, customers.id)).where(eq(cases.organizationId, ctx.org.id)).orderBy(desc(cases.createdAt)).limit(300),
    db.select({ id: customerBranches.id, customerId: customerBranches.customerId, label: customerBranches.name, number: customerBranches.branchNumber }).from(customerBranches).where(eq(customerBranches.organizationId, ctx.org.id)).orderBy(customerBranches.branchNumber),
    db.select({ id: customerEmployees.id, customerId: customerEmployees.customerId, label: customerEmployees.fullName, position: customerEmployees.position }).from(customerEmployees).where(eq(customerEmployees.organizationId, ctx.org.id)).orderBy(customerEmployees.fullName),
  ]);
  const fields: Field[] = [
    { name: "formKey", label: "Form key", required: true, placeholder: "dab-msp-renewal" },
    { name: "agency", label: t("institution"), type: "select", required: true, defaultValue: "DAB-MSP", options: [{ value: "DAB-MSP", label: `${t("dab")} — Money services` }, { value: "DAB-FXD", label: `${t("dab")} — FX dealers` }, { value: "MOF", label: t("ministryFinance") }, { value: "FINTRACA", label: "FinTRACA" }, { value: "FINORA", label: "FINORA Internal" }] },
    { name: "formName", label: t("formName"), required: true, full: true },
    { name: "formNumber", label: t("formNumber") },
    { name: "effectiveFrom", label: t("effectiveFrom"), type: "date" },
    { name: "isOfficial", label: t("officialFormLabel"), type: "checkbox", defaultValue: true },
    { name: "sourceUrl", label: t("sourceUrl"), type: "text", required: true, full: true, help: "HTTPS .gov.af only for an official form" },
    { name: "originalFileUrl", label: t("originalTemplate"), type: "text", full: true },
    { name: "templateFile", label: t("originalTemplate"), type: "file", full: true },
    { name: "fieldsJson", label: `${t("fieldMapping")} · fields JSON`, type: "textarea", full: true, placeholder: '[{"key":"tin","label":"TIN","required":true}]' },
    { name: "mappingJson", label: `${t("fieldMapping")} · source mapping JSON`, type: "textarea", full: true, placeholder: '{"tin":"customer.tin","case_no":"case.caseNumber"}' },
  ];
  const versionStatus = (s: string) => s === "verified" ? "approved" : s === "internal" ? "draft" : "pending_approval";
  return (
    <>
      <PageHeader title={t("officialForms")} subtitle={t("sourceListed")} actions={ctx.can("official_forms.write") && <FormDialog title={t("add")} triggerLabel={`+ ${t("add")} / ${t("versionHistory")}`} action={saveOfficialForm} fields={fields} wide />} />
      <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        <strong>{t("officialFormLabel")}: </strong>{t("sourceListed")} {t("internalFormNotice")}
      </div>
      <Card>
        <Table headers={[t("institution"), t("formName"), t("formNumber"), t("formVersion"), t("effectiveFrom"), t("verification"), t("sourceUrl"), t("actions")]} empty={t("noData")}
          rows={forms.map((f) => [
            <span key="a" className="text-xs font-semibold">{f.agency}</span>,
            <div key="n">
              <div className="font-medium">{f.formName}</div>
              <div className="text-[11px] text-slate-400">
                {f.isOfficial ? t("officialFormLabel") : t("internalForms")} · {Array.isArray(f.fields) ? f.fields.length : 0} {t("fieldMapping")}
              </div>
            </div>,
            f.formNumber ?? "-",
            <span key="v" className="font-mono">v{f.version}</span>,
            formatDate(f.effectiveFrom, fmt),
            <Badge key="s" status={versionStatus(f.verificationStatus)} label={t(f.verificationStatus === "source_listed" ? "sourceListed" : f.verificationStatus === "verified" ? "verified" : f.verificationStatus === "internal" ? "internalForms" : f.verificationStatus)} />,
            <a key="u" href={f.sourceUrl === "FINORA_INTERNAL" ? undefined : f.sourceUrl} target="_blank" rel="noreferrer" className={f.sourceUrl === "FINORA_INTERNAL" ? "text-slate-400" : "text-emerald-700 underline"}>{f.sourceUrl === "FINORA_INTERNAL" ? "—" : t("view")}</a>,
            <div key="a" className="flex flex-wrap gap-1">
              {f.templateAttachmentId && <a href={`/api/files/${f.templateAttachmentId}`} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-300 px-2 py-1 text-xs">{t("originalTemplate")}</a>}
              {!f.templateAttachmentId && f.originalFileUrl && <a href={f.originalFileUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-800">⬇ {t("originalTemplate")}</a>}
              {ctx.can("official_forms.verify") && f.isOfficial && f.verificationStatus !== "verified" && <ActionButton action={verifyOfficialFormAction} args={[f.id]} label={t("verify")} variant="warning" confirm={t("legalReviewRequired")} />}
              {ctx.can("official_forms.write") && (
                <FormDialog title={t("generateForm")} triggerLabel={t("generateForm")} triggerVariant="secondary" triggerSize="sm" action={createGeneratedFormAction} hidden={{ formId: f.id }} successPath="/generated-forms/{id}" fields={[
                  { name: "caseId", label: t("case"), type: "select", defaultValue: caseId, options: caseOptions.map((c) => ({ value: c.c.id, label: `${c.c.caseNumber} — ${c.customer}` })) },
                  { name: "branchId", label: "نمایندگی مورد نظر", type: "select", options: branchOptions.map((b) => ({ value: b.id, label: `${b.number ?? "—"} — ${b.label ?? "نمایندگی"}` })) },
                  { name: "employeeId", label: "کارمند/نماینده مورد نظر", type: "select", options: employeeOptions.map((e) => ({ value: e.id, label: `${e.label} — ${e.position ?? ""}` })) },
                ]} />
              )}
            </div>,
          ])} />
      </Card>
      <div className="mt-4 text-xs text-slate-500 leading-6">{t("documentReference")} {t("calculatedSnapshot")}</div>
    </>
  );
}
