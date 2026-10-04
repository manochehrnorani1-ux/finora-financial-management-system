import Link from "next/link";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { cases, customers, documents } from "@/db/schema";
import { pageContext, sp1, type SP } from "@/lib/page";
import { saveDocument, transitionDocument, deleteDocument } from "@/actions/master";
import { Badge, Card, PageHeader, Table } from "@/components/ui";
import { ActionButton, FormDialog, type Field } from "@/components/forms";
import { formatDate } from "@/lib/jalali";
import type { Metadata } from "next";
import { DOC_STATUSES, DOC_TYPES } from "@/lib/format";
import WorkflowTarget from "@/components/workflow-target";

export const metadata: Metadata = {
  title: "مدیریت اسناد و مکاتیب",
};

export default async function DocumentsPage({ searchParams }: { searchParams: SP }) {
  const { ctx, t, fmt } = await pageContext("documents.read");
  const q = await searchParams;
  const search = sp1(q.q) ?? "";
  const status = sp1(q.status) ?? "";
  const caseId = sp1(q.caseId) ?? "";
  const requiredTitle = sp1(q.requiredTitle) ?? "";
  const workflowReturn = sp1(q.workflowReturn) ?? "";
  const where = [eq(documents.organizationId, ctx.org.id)];
  if (status) where.push(eq(documents.status, status));
  if (caseId) where.push(eq(documents.caseId, caseId));
  if (search) where.push(or(ilike(documents.title, `%${search}%`), ilike(documents.documentNumber, `%${search}%`))!);
  const [rows, custs, caseOptions] = await Promise.all([
    db.select({ d: documents, customer: customers.name, caseNumber: cases.caseNumber })
      .from(documents)
      .leftJoin(customers, eq(documents.customerId, customers.id))
      .leftJoin(cases, eq(documents.caseId, cases.id))
      .where(and(...where))
      .orderBy(desc(documents.createdAt))
      .limit(300),
    db.select({ id: customers.id, name: customers.name, code: customers.customerCode }).from(customers).where(eq(customers.organizationId, ctx.org.id)).orderBy(customers.name),
    db.select({ id: cases.id, caseNumber: cases.caseNumber, customerName: customers.name }).from(cases).innerJoin(customers, eq(cases.customerId, customers.id)).where(eq(cases.organizationId, ctx.org.id)).orderBy(desc(cases.createdAt)).limit(300),
  ]);
  const fields: Field[] = [
    { name: "title", label: t("title"), required: true, defaultValue: requiredTitle, full: true },
    { name: "documentType", label: t("documentType"), type: "select", required: true, defaultValue: "letter", options: DOC_TYPES.map((x) => ({ value: x, label: t(x) })) },
    { name: "documentNumber", label: t("documentNumber"), placeholder: "AUTO" },
    { name: "caseId", label: t("case"), type: "select", defaultValue: caseId, options: caseOptions.map((k) => ({ value: k.id, label: `${k.caseNumber} — ${k.customerName}` })) },
    { name: "customerId", label: t("customer"), type: "select", options: custs.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })) },
    { name: "documentDate", label: t("date"), type: "date", required: true },
    { name: "officialNumber", label: t("officialNumber") },
    { name: "legalReference", label: t("legalReference") },
    { name: "description", label: t("description"), type: "textarea" },
  ];
  const canWrite = ctx.can("documents.write");
  const canApprove = ctx.can("documents.approve");
  return (
    <>
      <PageHeader title={t("documents")} subtitle={`${rows.length} ${t("records")}`} actions={<>
        <form method="get" className="flex flex-wrap gap-2">
          <input name="q" defaultValue={search} placeholder={t("search")} className="input max-w-[160px]" />
          {caseOptions.length > 0 && (
            <select name="caseId" defaultValue={caseId} className="input !w-auto">
              <option value="">{t("case")}: {t("all")}</option>
              {caseOptions.map((k) => <option key={k.id} value={k.id}>{k.caseNumber}</option>)}
            </select>
          )}
          <select name="status" defaultValue={status} className="input !w-auto">
            <option value="">{t("all")}</option>
            {DOC_STATUSES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
          </select>
          <button className="rounded-lg border border-slate-300 px-3 text-sm bg-white">{t("filter")}</button>
        </form>
        {requiredTitle && canWrite && <FormDialog title={`تکمیل سند: ${requiredTitle}`} triggerLabel="تکمیل همین سند موردنیاز" triggerVariant="warning" action={saveDocument} fields={fields} hidden={{ caseId }} successPath="/documents/{id}" />}
        {canWrite && <FormDialog title={t("create")} triggerLabel={`+ ${t("create")}`} action={saveDocument} fields={fields} successPath="/documents/{id}" />}
      </>} />
      <Card>
        <Table
          headers={[t("documentNumber"), t("title"), t("case"), t("documentType"), t("customer"), t("date"), t("status"), t("actions")]}
          empty={t("noData")}
          rows={rows.map(({ d, customer, caseNumber }) => [
            <Link key="n" href={`/documents/${d.id}`} className="font-mono text-xs text-emerald-700">{d.documentNumber}</Link>,
            <Link key="t" href={`/documents/${d.id}`} className="font-medium hover:underline">{d.title}{d.revision > 1 && <span className="ms-1 text-[10px] text-slate-400">rev.{d.revision}</span>}</Link>,
            d.caseId ? <Link key="k" href={`/cases/${d.caseId}`} className="font-mono text-xs text-emerald-800">{caseNumber ?? d.caseId.slice(0, 8)}</Link> : "-",
            t(d.documentType),
            customer ?? "-",
            formatDate(d.documentDate, fmt),
            <Badge key="s" status={d.status} label={t(d.status)} />,
            <div key="a" className="flex flex-wrap gap-1">
              {canWrite && ["draft", "rejected"].includes(d.status) && <ActionButton action={transitionDocument} args={[d.id, "submit"]} label={t("submit")} variant="primary" />}
              {canApprove && d.status === "submitted" && <ActionButton action={transitionDocument} args={[d.id, "review"]} label={t("review")} variant="warning" />}
              {canApprove && ["under_review", "submitted"].includes(d.status) && <ActionButton action={transitionDocument} args={[d.id, "approve"]} label={t("approve")} variant="primary" confirm={t("confirm") + "?"} />}
              {canApprove && ["under_review", "submitted"].includes(d.status) && <ActionButton action={transitionDocument} args={[d.id, "reject"]} label={t("reject")} variant="danger" prompt={t("reason")} />}
              {canWrite && d.status === "approved" && <ActionButton action={transitionDocument} args={[d.id, "complete"]} label={t("complete")} variant="primary" />}
              {canWrite && ["completed", "rejected", "cancelled"].includes(d.status) && <ActionButton action={transitionDocument} args={[d.id, "archive"]} label={t("archive")} />}
              {ctx.can("documents.delete") && ["draft", "cancelled", "rejected"].includes(d.status) && <ActionButton action={deleteDocument} args={[d.id]} label={t("delete")} variant="danger" confirm={t("confirmDelete")} />}
            </div>,
          ])}
        />
      </Card>
    </>
  );
}
