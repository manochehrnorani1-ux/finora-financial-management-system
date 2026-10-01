import Link from "next/link";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { attachments, cases, complianceEvents, customers, profiles } from "@/db/schema";
import { pageContext, sp1, type SP } from "@/lib/page";
import { createComplianceEventAction, reviewComplianceEventAction } from "@/actions/compliance";
import { ActionButton, FormDialog, type Field } from "@/components/forms";
import { Badge, Card, PageHeader, Table } from "@/components/ui";
import { CURRENCIES } from "@/lib/format";
import { formatDateTime } from "@/lib/jalali";

const EVENT_KEYS: Record<string, string> = { kyc_review: "kycReview", large_remittance: "largeRemittance", large_fx: "largeFx", suspicious_activity: "suspiciousActivity", sanctions_screening: "sanctionsScreening", supporting_evidence: "evidence", other: "other" };
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "تطبیق و نظارت KYC/AML",
};

const RESULTS: Record<string, string> = { needs_review: "awaitingReview", clear: "clear", escalated: "escalated", blocked: "blocked" };

export default async function CompliancePage({ searchParams }: { searchParams: SP }) {
  const { ctx, t, fmt } = await pageContext("compliance.read");
  const q = await searchParams;
  const search = sp1(q.q);
  const result = sp1(q.result);
  const where = [eq(complianceEvents.organizationId, ctx.org.id)];
  if (result) where.push(eq(complianceEvents.result, result));
  if (search) where.push(or(ilike(complianceEvents.referenceNumber, `%${search}%`), ilike(complianceEvents.counterparty, `%${search}%`), ilike(complianceEvents.notes, `%${search}%`))!);
  const [rows, custs, caseRows] = await Promise.all([
    db.select({ e: complianceEvents, customer: customers.name, code: customers.customerCode, caseNumber: cases.caseNumber, user: profiles.fullName })
      .from(complianceEvents).leftJoin(customers, eq(complianceEvents.customerId, customers.id)).leftJoin(cases, eq(complianceEvents.caseId, cases.id)).leftJoin(profiles, eq(complianceEvents.createdBy, profiles.id)).where(and(...where)).orderBy(desc(complianceEvents.occurredAt)).limit(400),
    db.select({ id: customers.id, name: customers.name, code: customers.customerCode }).from(customers).where(eq(customers.organizationId, ctx.org.id)).orderBy(customers.name),
    db.select({ id: cases.id, caseNumber: cases.caseNumber, customerId: cases.customerId }).from(cases).where(eq(cases.organizationId, ctx.org.id)).orderBy(desc(cases.createdAt)),
  ]);
  const pending = rows.filter((x) => x.e.result === "needs_review").length;
  const fields: Field[] = [
    { name: "eventType", label: t("eventType"), type: "select", required: true, defaultValue: "kyc_review", options: Object.entries(EVENT_KEYS).map(([v, k]) => ({ value: v, label: t(k) })) },
    { name: "customerId", label: t("customer"), type: "select", options: custs.map((x) => ({ value: x.id, label: `${x.code} — ${x.name}` })) },
    { name: "caseId", label: t("case"), type: "select", options: caseRows.map((x) => ({ value: x.id, label: x.caseNumber })) },
    { name: "result", label: t("status"), type: "select", required: true, defaultValue: "needs_review", options: Object.entries(RESULTS).map(([v, k]) => ({ value: v, label: t(k) })) },
    { name: "amount", label: t("amount"), type: "number" },
    { name: "currency", label: t("currency"), type: "select", options: CURRENCIES.map((x) => ({ value: x, label: x })) },
    { name: "counterparty", label: t("counterparty") },
    { name: "referenceNumber", label: t("reference") },
    { name: "occurredAt", label: t("date"), type: "date" },
    { name: "evidenceFile", label: t("evidence"), type: "file" },
    { name: "notes", label: t("notes"), type: "textarea", full: true },
  ];
  const attachmentIds = [...new Set(rows.flatMap((x) => Array.isArray(x.e.supportingFileIds) ? x.e.supportingFileIds as string[] : []))];
  const files = attachmentIds.length ? await db.select({ id: attachments.id, fileName: attachments.fileName }).from(attachments).where(eq(attachments.organizationId, ctx.org.id)) : [];
  return (
    <>
      <PageHeader title={t("compliance")} subtitle={t("internalReport")} actions={ctx.can("compliance.write") && <FormDialog title={t("create")} triggerLabel={`+ ${t("add")}`} action={createComplianceEventAction} fields={fields} wide />} />
      <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"><strong>{t("internalReport")}</strong>. {t("officialReport")} — FINORA internal records do not submit regulatory reports. No hard-coded thresholds or external list screening is claimed.</div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">{t("compliance")}</div><div className="font-bold mt-1">{rows.length}</div></div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="text-xs text-amber-700">{t("awaitingReview")}</div><div className="font-bold mt-1">{pending}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">{t("largeRemittance")}</div><div className="font-bold mt-1">{rows.filter((x) => x.e.eventType === "large_remittance").length}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">{t("suspiciousActivity")}</div><div className="font-bold mt-1">{rows.filter((x) => x.e.eventType === "suspicious_activity").length}</div></div>
      </div>
      <Card title={`${t("compliance")} · ${rows.length} ${t("records")}`} actions={<form method="get" className="flex gap-2"><input name="q" defaultValue={search} placeholder={t("search")} className="input max-w-52"/><select name="result" defaultValue={result ?? ""} className="input !w-auto"><option value="">{t("all")}</option>{Object.entries(RESULTS).map(([v,k]) => <option key={v} value={v}>{t(k)}</option>)}</select><button className="rounded-lg border bg-white px-3 text-sm">{t("filter")}</button><a href="/api/reports/export?type=compliance&format=csv" className="rounded-lg border bg-white px-3 py-2 text-xs">{t("exportCsv")}</a></form>}>
        <Table headers={[t("date"), t("eventType"), t("customer"), t("caseNumber"), t("counterparty"), t("amount"), t("reference"), t("evidence"), t("status"), t("user"), t("actions")]} empty={t("noData")} rows={rows.map(({ e, customer, code, caseNumber, user }) => [
          formatDateTime(e.occurredAt, fmt), t(EVENT_KEYS[e.eventType] ?? e.eventType), customer ? <Link key="c" href={`/customer-accounts/${e.customerId}`} className="text-emerald-700">{code} · {customer}</Link> : "-", caseNumber ?? "-", e.counterparty ?? "-", e.amount === null ? "-" : `${Number(e.amount).toLocaleString()} ${e.currency ?? ""}`, e.referenceNumber ?? "-",
          <span key="files" className="text-xs">{(Array.isArray(e.supportingFileIds) ? e.supportingFileIds : []).map((id) => { const file = files.find((f) => f.id === id); return <a key={id} href={`/api/files/${id}`} target="_blank" rel="noreferrer" className="block text-emerald-700">{file?.fileName ?? t("download")}</a>; })}</span>,
          <Badge key="s" status={e.result === "clear" ? "approved" : e.result === "blocked" ? "rejected" : "pending_approval"} label={t(RESULTS[e.result] ?? e.result)} />, user ?? "-",
          <div key="a" className="flex flex-wrap gap-1">{ctx.can("compliance.write") && ["clear", "needs_review", "escalated", "blocked"].filter((x) => x !== e.result).map((x) => <ActionButton key={x} action={reviewComplianceEventAction} args={[e.id, x]} label={t(RESULTS[x])} variant={x === "blocked" ? "danger" : x === "clear" ? "primary" : "secondary"} prompt={t("notes")} />)}</div>,
        ])} />
      </Card>
    </>
  );
}
