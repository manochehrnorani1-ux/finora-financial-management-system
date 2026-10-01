import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cases, customers, letters } from "@/db/schema";
import { pageContext, sp1, type SP } from "@/lib/page";
import { saveLetterAction, finalizeLetterAction, deleteDraftLetterAction } from "@/actions/letters";
import { ActionButton, FormDialog, type Field } from "@/components/forms";
import { Badge, Card, PageHeader, Table } from "@/components/ui";
import type { Metadata } from "next";
import { formatDate } from "@/lib/jalali";

export const metadata: Metadata = {
  title: "مکاتیب رسمی",
};

export default async function LettersPage({ searchParams }: { searchParams: SP }) {
  const { ctx, t, lang, fmt } = await pageContext("letters.read");
  const q = await searchParams;
  const status = sp1(q.status) ?? "";
  const where = [eq(letters.organizationId, ctx.org.id)];
  if (status) where.push(eq(letters.status, status));
  const [rows, custs, casesRows] = await Promise.all([
    db.select({ l: letters, customer: customers.name, caseNumber: cases.caseNumber }).from(letters).leftJoin(customers, eq(letters.customerId, customers.id)).leftJoin(cases, eq(letters.caseId, cases.id)).where(and(...where)).orderBy(desc(letters.letterDate), desc(letters.createdAt)).limit(300),
    db.select({ id: customers.id, name: customers.name, code: customers.customerCode }).from(customers).where(eq(customers.organizationId, ctx.org.id)),
    db.select({ id: cases.id, caseNumber: cases.caseNumber, customerId: cases.customerId }).from(cases).where(eq(cases.organizationId, ctx.org.id)),
  ]);
  const fields = (l?: typeof letters.$inferSelect): Field[] => [
    { name: "language", label: t("language"), type: "select", required: true, defaultValue: l?.language ?? lang, options: [{ value: "fa", label: "دری" }, { value: "ps", label: "پښتو" }, { value: "en", label: "English" }] },
    { name: "letterDate", label: t("date"), type: "date", required: true, defaultValue: l?.letterDate },
    { name: "caseId", label: t("case"), type: "select", defaultValue: l?.caseId, options: casesRows.map((c) => ({ value: c.id, label: c.caseNumber })) },
    { name: "customerId", label: t("customer"), type: "select", defaultValue: l?.customerId, options: custs.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })) },
    { name: "officialNumber", label: t("officialNumber"), defaultValue: l?.officialNumber, help: t("documentReference") },
    { name: "recipient", label: t("recipient"), required: true, defaultValue: l?.recipient },
    { name: "reference", label: t("reference"), defaultValue: l?.reference },
    { name: "subject", label: t("subject"), required: true, defaultValue: l?.subject, full: true },
    { name: "body", label: t("letterBody"), type: "textarea", required: true, defaultValue: l?.body, full: true },
    { name: "attachmentIds", label: `${t("attachments")} · IDs separated by spaces`, defaultValue: Array.isArray(l?.attachments) ? (l!.attachments as string[]).join(" ") : "", full: true },
    { name: "signerName", label: t("signature"), defaultValue: l?.signerName },
    { name: "signerTitle", label: t("role"), defaultValue: l?.signerTitle },
  ];
  return (
    <>
      <PageHeader title={t("letters")} subtitle={`${rows.length} ${t("records")}`} actions={<>
        <form method="get" className="flex gap-2"><select name="status" defaultValue={status} className="input !w-auto"><option value="">{t("all")}</option>{["draft", "finalized"].map((s) => <option key={s} value={s}>{t(s)}</option>)}</select><button className="rounded-lg border border-slate-300 bg-white px-3 text-sm">{t("filter")}</button></form>
        {ctx.can("letters.write") && <FormDialog title={t("create")} triggerLabel={`+ ${t("create")} ${t("letters")}`} action={saveLetterAction} fields={fields()} wide successPath="/letters/{id}" />}
      </>} />
      <Card><Table headers={[t("letterNumber"), t("date"), t("recipient"), t("subject"), t("customer"), t("caseNumber"), t("officialNumber"), t("status"), t("actions")]} empty={t("noData")} rows={rows.map(({ l, customer, caseNumber }) => [
        <Link key="n" href={`/letters/${l.id}`} className="font-mono text-xs text-emerald-700">{l.internalNumber}</Link>, formatDate(l.letterDate, fmt), l.recipient, <span key="s" className="line-clamp-1 max-w-48">{l.subject}</span>, customer ?? "-", caseNumber ?? "-", l.officialNumber ?? "-", <Badge key="b" status={l.status === "finalized" ? "approved" : "draft"} label={t(l.status)} />,
        <div key="a" className="flex flex-wrap gap-1"><Link href={`/letters/${l.id}`} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs">{t("details")}</Link>{l.status === "draft" && ctx.can("letters.write") && <ActionButton action={finalizeLetterAction} args={[l.id]} label={t("finalize")} variant="primary" />}{l.status === "draft" && ctx.can("letters.write") && <ActionButton action={deleteDraftLetterAction} args={[l.id]} label={t("delete")} variant="danger" confirm={t("confirmDelete")} />}</div>,
      ])} /></Card>
      <p className="mt-3 text-xs text-slate-500">{t("officialNumber")} د مرجع رسمي نمبر دی؛ {t("letterNumber")} د FINORA داخلي نمبر دی.</p>
    </>
  );
}
