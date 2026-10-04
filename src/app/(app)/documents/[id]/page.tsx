import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, customers, documentFiles, documentRevisions, documents, profiles } from "@/db/schema";
import { pageContext } from "@/lib/page";
import { saveDocument, transitionDocument, uploadDocumentFile, deleteDocumentFile } from "@/actions/master";
import { Badge, Card, KV, PageHeader } from "@/components/ui";
import { ActionButton, FormDialog, PrintButton, type Field } from "@/components/forms";
import { formatDate, formatDateTime } from "@/lib/jalali";
import { DOC_TYPES } from "@/lib/format";
import WorkflowTarget from "@/components/workflow-target";

const FLOW = ["draft", "submitted", "under_review", "approved", "completed", "archived"];

export default async function DocumentDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const workflowTarget = typeof query.workflowTarget === "string" ? query.workflowTarget : null;
  const { ctx, t, fmt } = await pageContext("documents.read");
  const [row] = await db.select({ d: documents, customer: customers.name }).from(documents).leftJoin(customers, eq(documents.customerId, customers.id)).where(and(eq(documents.id, id), eq(documents.organizationId, ctx.org.id)));
  if (!row) notFound();
  const d = row.d;
  const [files, revisions, logs, custs, creator, approver] = await Promise.all([
    db.select().from(documentFiles).where(eq(documentFiles.documentId, id)).orderBy(desc(documentFiles.createdAt)),
    db.select().from(documentRevisions).where(eq(documentRevisions.documentId, id)).orderBy(desc(documentRevisions.revision)),
    db.select({ a: auditLogs, user: profiles.fullName }).from(auditLogs).leftJoin(profiles, eq(auditLogs.userId, profiles.id)).where(and(eq(auditLogs.entityId, id), eq(auditLogs.organizationId, ctx.org.id))).orderBy(desc(auditLogs.createdAt)),
    db.select({ id: customers.id, name: customers.name, code: customers.customerCode }).from(customers).where(eq(customers.organizationId, ctx.org.id)).orderBy(customers.name),
    d.createdBy ? db.select({ n: profiles.fullName }).from(profiles).where(eq(profiles.id, d.createdBy)) : Promise.resolve([]),
    d.approvedBy ? db.select({ n: profiles.fullName }).from(profiles).where(eq(profiles.id, d.approvedBy)) : Promise.resolve([]),
  ]);
  const isFinal = ["approved", "completed", "archived"].includes(d.status);
  const canWrite = ctx.can("documents.write");
  const canApprove = ctx.can("documents.approve");
  const fields: Field[] = [
    { name: "title", label: t("title"), required: true, defaultValue: d.title, full: true },
    { name: "documentType", label: t("documentType"), type: "select", required: true, defaultValue: d.documentType, options: DOC_TYPES.map((x) => ({ value: x, label: t(x) })) },
    { name: "customerId", label: t("customer"), type: "select", defaultValue: d.customerId, options: custs.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })) },
    { name: "documentDate", label: t("date"), type: "date", required: true, defaultValue: d.documentDate },
    { name: "officialNumber", label: t("officialNumber"), defaultValue: d.officialNumber },
    { name: "legalReference", label: t("legalReference"), defaultValue: d.legalReference },
    { name: "description", label: t("description"), type: "textarea", defaultValue: d.description },
    ...(isFinal ? [{ name: "reason", label: t("reason"), required: true, full: true } as Field] : []),
  ];
  const stepIdx = FLOW.indexOf(d.status);
  return (
    <>
      <PageHeader
        title={<span className="flex items-center gap-2">{d.title} <Badge status={d.status} label={t(d.status)} /></span>}
        subtitle={`${d.documentNumber} · rev.${d.revision}`}
        actions={<>
          <Link href="/documents" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">← {t("back")}</Link>
          <PrintButton label={t("print")} audit={{ entityType: "document", entityId: d.id }} />
          {(isFinal ? canApprove : canWrite) && d.status !== "archived" && <FormDialog title={t("edit")} triggerLabel={t("edit")} triggerVariant="secondary" action={saveDocument} fields={fields} hidden={{ id: d.id }} note={isFinal ? t("amendmentNote") : undefined} />}
          {canWrite && ["draft", "rejected"].includes(d.status) && <ActionButton action={transitionDocument} args={[d.id, "submit"]} label={t("submit")} variant="primary" size="md" />}
          {canApprove && d.status === "submitted" && <ActionButton action={transitionDocument} args={[d.id, "review"]} label={t("review")} variant="warning" size="md" />}
          {canApprove && ["under_review", "submitted"].includes(d.status) && <ActionButton action={transitionDocument} args={[d.id, "approve"]} label={t("approve")} variant="primary" size="md" confirm={t("confirm") + "?"} />}
          {canApprove && ["under_review", "submitted"].includes(d.status) && <ActionButton action={transitionDocument} args={[d.id, "reject"]} label={t("reject")} variant="danger" size="md" prompt={t("reason")} />}
          {canWrite && d.status === "approved" && <ActionButton action={transitionDocument} args={[d.id, "complete"]} label={t("complete")} variant="primary" size="md" />}
          {canWrite && ["draft", "submitted"].includes(d.status) && <ActionButton action={transitionDocument} args={[d.id, "cancel"]} label={t("cancel")} variant="danger" size="md" confirm={t("confirm") + "?"} />}
          {canWrite && ["completed", "rejected", "cancelled"].includes(d.status) && <ActionButton action={transitionDocument} args={[d.id, "archive"]} label={t("archive")} size="md" />}
        </>}
      />
      <WorkflowTarget target={workflowTarget} />
      <div data-workflow-target="verification"><Card title={t("workflow")} className="mb-4">
        <ol className="flex flex-wrap items-center gap-2 text-xs">
          {FLOW.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 ${i <= stepIdx && stepIdx >= 0 ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-500"} ${d.status === s ? "ring-2 ring-emerald-300" : ""}`}>{t(s)}</span>
              {i < FLOW.length - 1 && <span className="text-slate-300">→</span>}
            </li>
          ))}
          {["rejected", "cancelled"].includes(d.status) && <li><Badge status={d.status} label={t(d.status)} /></li>}
        </ol>
        {d.rejectionReason && <p className="mt-2 text-sm text-red-700">{t("reason")}: {d.rejectionReason}</p>}
      </Card></div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title={t("details")}>
          <KV items={[
            [t("documentNumber"), d.documentNumber],
            [t("officialNumber"), d.officialNumber ?? "-"],
            [t("legalReference"), d.legalReference ?? "-"],
            [t("documentType"), t(d.documentType)],
            [t("customer"), row.customer ? <Link href={`/customer-accounts/${d.customerId}`} className="text-emerald-700">{row.customer}</Link> : "-"],
            [t("date"), formatDate(d.documentDate, fmt)],
            [t("createdBy"), creator[0]?.n ?? "-"],
            [t("approvedBy"), approver[0]?.n ?? "-"],
            [t("createdAt"), formatDateTime(d.createdAt, fmt)],
          ]} />
          {d.description && <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">{d.description}</p>}
        </Card>
        <Card title={t("files")} actions={canWrite && <FormDialog title={t("upload")} triggerLabel={t("upload")} triggerSize="sm" action={uploadDocumentFile} fields={[{ name: "file", label: t("files"), type: "file", required: true, full: true }]} hidden={{ documentId: d.id }} />}>
          <ul className="divide-y divide-slate-100 text-sm">
            {files.length === 0 && <li className="py-4 text-center text-slate-400">{t("noData")}</li>}
            {files.map((f) => (
              <li key={f.id} className="py-2 flex items-center justify-between gap-2">
                <a href={f.storagePath} target="_blank" className="text-emerald-700 truncate" rel="noreferrer">{f.fileName}</a>
                <span className="text-xs text-slate-400" dir="ltr">{(f.fileSize / 1024).toFixed(1)} KB</span>
                {canWrite && <ActionButton action={deleteDocumentFile} args={[f.id]} label="×" variant="danger" confirm={t("confirmDelete")} />}
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t("revisions")}>
          <ul className="divide-y divide-slate-100 text-sm">
            {revisions.length === 0 && <li className="py-4 text-center text-slate-400">{t("noData")}</li>}
            {revisions.map((r) => (
              <li key={r.id} className="py-2">
                <div className="flex justify-between"><span className="font-medium">rev.{r.revision}</span><span className="text-xs text-slate-400">{formatDateTime(r.createdAt, fmt)}</span></div>
                <div className="text-xs text-slate-600">{t("reason")}: {r.reason}</div>
                <pre className="mt-1 text-[11px] bg-slate-50 rounded p-2 overflow-x-auto" dir="ltr">{JSON.stringify(r.changes, null, 1)}</pre>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t("auditLog")}>
          <ul className="divide-y divide-slate-100 text-sm">
            {logs.map((l) => (
              <li key={l.a.id} className="py-2 flex items-center justify-between gap-2">
                <div><span className="font-mono text-xs bg-slate-100 rounded px-1.5 py-0.5">{l.a.action}</span> <span className="text-slate-600">{l.user ?? "-"}</span></div>
                <span className="text-xs text-slate-400">{formatDateTime(l.a.createdAt, fmt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
