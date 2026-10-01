"use server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { attachments, cases, customers, generatedForms, officialForms, customerBankAccounts, customerBranches, customerEmployees, customerGuarantees, customerLicenses, customerShareholders } from "@/db/schema";
import { mergeZipFields } from "@/lib/zip-form-definitions";
import { requireContext } from "@/lib/auth";
import { audit, FinanceError, nextNumber } from "@/lib/finance";
import { optStr, str } from "@/lib/format";
import { act } from "./util";
import { formFile, readDocumentUpload } from "@/lib/upload";

function officialUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (u.hostname === "gov.af" || u.hostname.endsWith(".gov.af"));
  } catch {
    return false;
  }
}

function safeJson<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function sourceValue(path: string, c: Record<string, unknown>, kase: Record<string, unknown>, business: Record<string, unknown>) {
  const [root, ...parts] = path.split(".");
  let value: unknown = root === "customer" ? c : root === "case" ? kase : root === "business" ? business : undefined;
  for (const part of parts) value = value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value ?? null;
}

export async function saveOfficialForm(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("official_forms.write");
    const agency = str(fd.get("agency"));
    const formName = str(fd.get("formName"));
    const rawKey = str(fd.get("formKey")) || formName;
    const formKey = rawKey.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
    const isOfficial = fd.get("isOfficial") === "on";
    const sourceUrlInput = optStr(fd.get("sourceUrl"));
    if (!agency || !formName || !formKey) throw new FinanceError("invalid_input");
    if (isOfficial && (!sourceUrlInput || !officialUrl(sourceUrlInput))) throw new FinanceError("official_source_required");
    const fields = safeJson<{ key: string; label: string; type?: string }[]>(str(fd.get("fieldsJson")), []);
    const mapping = safeJson<Record<string, string>>(str(fd.get("mappingJson")), {});
    if (!Array.isArray(fields) || fields.some((f) => !f || typeof f.key !== "string" || typeof f.label !== "string")) throw new FinanceError("invalid_input");
    const file = formFile(fd.get("templateFile"));
    const fileBytes = await readDocumentUpload(file);
    return db.transaction(async (tx) => {
      const previousRows = await tx.select().from(officialForms).where(and(eq(officialForms.organizationId, ctx.org.id), eq(officialForms.formKey, formKey))).orderBy(desc(officialForms.version)).limit(1);
      const previous = previousRows[0];
      let templateAttachmentId: string | null = null;
      if (file instanceof File && fileBytes) {
        const [a] = await tx.insert(attachments).values({ organizationId: ctx.org.id, fileName: file.name, mimeType: file.type || "application/octet-stream", fileSize: file.size, content: fileBytes.toString("base64"), uploadedBy: ctx.user.id }).returning();
        templateAttachmentId = a.id;
      }
      const version = (previous?.version ?? 0) + 1;
      const verificationStatus = isOfficial ? "source_listed" : "internal";
      const [row] = await tx.insert(officialForms).values({
        organizationId: ctx.org.id,
        formKey,
        agency,
        formName,
        formNumber: optStr(fd.get("formNumber")),
        version,
        effectiveFrom: optStr(fd.get("effectiveFrom")),
        sourceUrl: isOfficial ? sourceUrlInput! : "FINORA_INTERNAL",
        originalFileUrl: optStr(fd.get("originalFileUrl")),
        templateAttachmentId,
        fields,
        fieldMapping: mapping,
        isOfficial,
        verificationStatus,
        supersedesId: previous?.id ?? null,
        createdBy: ctx.user.id,
      }).returning();
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "official_form_version", entityId: row.id, newData: { formKey, formName, agency, version, isOfficial, sourceUrl: row.sourceUrl, verificationStatus } });
      return { id: row.id };
    });
  });
}

export async function verifyOfficialFormAction(id: string) {
  return act(async () => {
    const ctx = await requireContext("official_forms.verify");
    await db.transaction(async (tx) => {
      const [row] = await tx.select().from(officialForms).where(and(eq(officialForms.id, id), eq(officialForms.organizationId, ctx.org.id))).for("update");
      if (!row) throw new FinanceError("not_found");
      if (!row.isOfficial || !officialUrl(row.sourceUrl)) throw new FinanceError("official_source_required");
      await tx.update(officialForms).set({ verificationStatus: "verified", lastCheckedAt: new Date(), createdBy: row.createdBy }).where(eq(officialForms.id, id));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "OFFICIAL_FORM_VERIFY", entityType: "official_form", entityId: id, oldData: { status: row.verificationStatus }, newData: { status: "verified", sourceUrl: row.sourceUrl, manualReview: true } });
    });
  });
}

export async function createGeneratedFormAction(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("official_forms.write");
    const formId = str(fd.get("formId"));
    const caseId = optStr(fd.get("caseId"));
    const requestedCustomerId = optStr(fd.get("customerId"));
    return db.transaction(async (tx) => {
      const [form] = await tx.select().from(officialForms).where(and(eq(officialForms.id, formId), eq(officialForms.organizationId, ctx.org.id)));
      if (!form) throw new FinanceError("not_found");
      let customerRow: Record<string, unknown> = {};
      let caseRow: Record<string, unknown> = {};
      let customerId: string | null = requestedCustomerId;
      if (caseId) {
        const [joined] = await tx.select({ c: cases, customer: customers }).from(cases).innerJoin(customers, eq(cases.customerId, customers.id)).where(and(eq(cases.id, caseId), eq(cases.organizationId, ctx.org.id)));
        if (!joined) throw new FinanceError("not_found");
        customerRow = joined.customer as unknown as Record<string, unknown>;
        caseRow = joined.c as unknown as Record<string, unknown>;
        customerId = joined.c.customerId;
      }
      if (!customerId) throw new FinanceError("invalid_input");
      if (!Object.keys(customerRow).length) {
        const [customer] = await tx.select().from(customers).where(and(eq(customers.id, customerId), eq(customers.organizationId, ctx.org.id)));
        if (!customer) throw new FinanceError("not_found");
        customerRow = customer as unknown as Record<string, unknown>;
      }
      const branchId = optStr(fd.get("branchId"));
      const employeeId = optStr(fd.get("employeeId"));
      const [licenseRows, shareholderRows, employeeRows, branchRows, bankRows, guaranteeRows] = await Promise.all([
        tx.select().from(customerLicenses).where(and(eq(customerLicenses.organizationId, ctx.org.id), eq(customerLicenses.customerId, customerId!))).orderBy(desc(customerLicenses.createdAt)),
        tx.select().from(customerShareholders).where(and(eq(customerShareholders.organizationId, ctx.org.id), eq(customerShareholders.customerId, customerId!))).orderBy(desc(customerShareholders.createdAt)),
        tx.select().from(customerEmployees).where(and(eq(customerEmployees.organizationId, ctx.org.id), eq(customerEmployees.customerId, customerId!))).orderBy(desc(customerEmployees.createdAt)),
        tx.select().from(customerBranches).where(and(eq(customerBranches.organizationId, ctx.org.id), eq(customerBranches.customerId, customerId!))).orderBy(desc(customerBranches.createdAt)),
        tx.select().from(customerBankAccounts).where(and(eq(customerBankAccounts.organizationId, ctx.org.id), eq(customerBankAccounts.customerId, customerId!))).orderBy(desc(customerBankAccounts.createdAt)),
        tx.select().from(customerGuarantees).where(and(eq(customerGuarantees.organizationId, ctx.org.id), eq(customerGuarantees.customerId, customerId!))).orderBy(desc(customerGuarantees.createdAt)),
      ]);
      const selectedBranch = branchRows.find((b) => b.id === branchId) ?? branchRows[0] ?? null;
      const selectedEmployee = employeeRows.find((e) => e.id === employeeId) ?? employeeRows[0] ?? null;
      const selectedRep = selectedBranch?.representativeEmployeeId ? employeeRows.find((e) => e.id === selectedBranch.representativeEmployeeId) ?? null : selectedEmployee;
      const primaryLicense = licenseRows[0] ?? null;
      const shareholderSummary = shareholderRows.map((s) => [s.fullName, s.fatherName ?? "", s.nationalId ?? "", s.ownershipPercentage == null ? "" : String(s.ownershipPercentage), s.province ?? "", s.district ?? "", s.area ?? ""].join(" | ")).join("\n");
      const branchSummary = branchRows.map((b) => [b.branchNumber ?? "", b.name ?? "", b.province ?? "", b.district ?? "", b.area ?? "", b.market ?? "", b.shopNumber ?? "", b.phone ?? ""].join(" | ")).join("\n");
      const bankSummary = bankRows.map((b) => [b.accountName, b.accountNumber, b.bankName, b.currency].join(" | ")).join("\n");
      const guarantorSummary = guaranteeRows.map((g) => [g.guarantorName, g.guarantorFatherName ?? "", g.guarantorNationalId ?? "", g.guarantorPhone ?? "", g.businessName ?? "", g.businessLicenseNumber ?? ""].join(" | ")).join("\n");
      const business = {
        shareholders: shareholderRows, shareholdersCount: shareholderRows.length, shareholdersSummary: shareholderSummary,
        employees: employeeRows, employeesCount: employeeRows.length,
        branches: branchRows, branchesCount: branchRows.length, branchesSummary: branchSummary,
        bankAccounts: bankRows, bankAccountsCount: bankRows.length, bankAccountsSummary: bankSummary,
        guarantees: guaranteeRows, guarantorsSummary: guarantorSummary,
        primaryLicense, selectedBranch: selectedBranch ? { ...selectedBranch, representative: selectedRep } : null,
        selectedEmployee,
      };
      const enrichedCustomer = {
        ...customerRow,
        primaryLicense,
        shareholders: shareholderRows,
        shareholdersCount: shareholderRows.length,
        shareholdersSummary: shareholderSummary,
        employees: employeeRows,
        employeesCount: employeeRows.length,
        branches: branchRows,
        branchesCount: branchRows.length,
        branchesSummary: branchSummary,
        bankAccounts: bankRows,
        bankAccountsCount: bankRows.length,
        bankAccountsSummary: bankSummary,
        guarantees: guaranteeRows,
        guarantorsSummary: guarantorSummary,
        selectedBranch: selectedBranch ? { ...selectedBranch, representative: selectedRep } : null,
        selectedEmployee,
      };
      const mergedFields = mergeZipFields(form.formKey, form.fields as never);
      const fieldList = mergedFields as { key: string; label: string; required?: boolean }[];
      const baseMapping = form.fieldMapping as Record<string, string>;
      const zipMapping = Object.fromEntries(mergedFields.filter((f) => f.mapping).map((f) => [f.key, f.mapping!]));
      const mapping = { ...baseMapping, ...zipMapping };
      const values: Record<string, unknown> = {};
      let missing = false;
      for (const f of fieldList) {
        const source = mapping[f.key];
        const value = source ? sourceValue(source, enrichedCustomer, caseRow, business) : null;
        values[f.key] = value;
        if (f.required && (value === null || value === "" || (typeof value === "number" && value <= 0))) missing = true;
      }
      values._zipBusiness = business;
      const allMapped = fieldList.length > 0 && fieldList.every((f) => Boolean(mapping[f.key]));
      const internal = !form.isOfficial;
      const matchStatus = !fieldList.length || !allMapped || missing ? "MISSING_FIELD" : internal ? "MATCHED" : "LEGAL_REVIEW_REQUIRED";
      const internalNumber = await nextNumber(tx, ctx.org.id, "generated_form");
      const [row] = await tx.insert(generatedForms).values({
        organizationId: ctx.org.id,
        internalNumber,
        officialFormId: form.id,
        caseId,
        customerId,
        formNameSnapshot: form.formName,
        agencySnapshot: form.agency,
        versionSnapshot: form.version,
        valuesSnapshot: values,
        mappingSnapshot: mapping,
        matchStatus,
        documentType: internal ? "FINORA_INTERNAL_FORM" : "FINORA_GENERATED_WORKSHEET",
        createdBy: ctx.user.id,
      }).returning();
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "generated_form", entityId: row.id, newData: { internalNumber, formId, caseId, version: form.version, matchStatus, documentType: row.documentType } });
      return { id: row.id };
    });
  });
}

/** Persists staff-filled form values (خانه‌پری) and re-evaluates the official-form match status. */
export async function saveGeneratedFormValuesAction(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("official_forms.write");
    const id = str(fd.get("id"));
    return db.transaction(async (tx) => {
      const [row] = await tx.select({ g: generatedForms, form: officialForms })
        .from(generatedForms)
        .leftJoin(officialForms, eq(generatedForms.officialFormId, officialForms.id))
        .where(and(eq(generatedForms.id, id), eq(generatedForms.organizationId, ctx.org.id)))
        .for("update");
      if (!row) throw new FinanceError("not_found");
      const previous = (row.g.valuesSnapshot ?? {}) as Record<string, unknown>;
      const values: Record<string, unknown> = { ...previous };
      for (const [key, entry] of fd.entries()) {
        if (!key.startsWith("field_")) continue;
        const fieldKey = key.slice("field_".length);
        values[fieldKey] = str(entry);
      }
      const fieldList = mergeZipFields(row.form?.formKey ?? "", (row.form?.fields ?? []) as never) as { key: string; label: string; required?: boolean }[];
      const mapping = { ...(row.form?.fieldMapping ?? {}) as Record<string, string>, ...Object.fromEntries(fieldList.filter((f: any) => f.mapping).map((f: any) => [f.key, f.mapping])) };
      const missingRequired = fieldList.some((f) => f.required && !String(values[f.key] ?? "").trim());
      const allMapped = fieldList.length > 0 && fieldList.every((f) => Boolean(mapping[f.key]));
      const internal = !row.form?.isOfficial;
      const matchStatus = !fieldList.length || !allMapped ? "MISSING_FIELD" : missingRequired ? "MISSING_FIELD" : internal ? "MATCHED" : "LEGAL_REVIEW_REQUIRED";
      await tx.update(generatedForms).set({ valuesSnapshot: values, matchStatus }).where(eq(generatedForms.id, id));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "UPDATE", entityType: "generated_form", entityId: id, oldData: { matchStatus: row.g.matchStatus }, newData: { matchStatus, filledFields: Object.keys(values).length } });
      return { id };
    });
  });
}
