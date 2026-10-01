import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attachments, cases, customers, letters, organizations } from "@/db/schema";
import { pageContext } from "@/lib/page";
import { finalizeLetterAction, saveLetterAction } from "@/actions/letters";
import { ActionButton, FormDialog, PrintButton, type Field } from "@/components/forms";
import { Badge, Card, PageHeader, KV } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/jalali";
import { CustomerLogo, FinoraLogo } from "@/components/BrandLogos";

export default async function LetterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, t, fmt } = await pageContext("letters.read");
  const [row] = await db.select({ l: letters, customer: customers.name, customerLogoId: customers.logoAttachmentId, caseNumber: cases.caseNumber, org: organizations })
    .from(letters).leftJoin(customers, eq(letters.customerId, customers.id)).leftJoin(cases, eq(letters.caseId, cases.id)).innerJoin(organizations, eq(letters.organizationId, organizations.id)).where(and(eq(letters.id, id), eq(letters.organizationId, ctx.org.id)));
  if (!row) notFound();
  const attachedIds = Array.isArray(row.l.attachments) ? row.l.attachments as string[] : [];
  const attached = attachedIds.length ? await db.select().from(attachments).where(and(eq(attachments.organizationId, ctx.org.id))) : [];
  const files = attached.filter((a) => attachedIds.includes(a.id));
  const l = row.l;
  const fields: Field[] = [
    { name: "language", label: t("language"), type: "select", required: true, defaultValue: l.language, options: [{ value: "fa", label: "دری" }, { value: "ps", label: "پښتو" }, { value: "en", label: "English" }] },
    { name: "letterDate", label: t("date"), type: "date", required: true, defaultValue: l.letterDate },
    { name: "caseId", label: t("case"), defaultValue: l.caseId, readOnly: true },
    { name: "officialNumber", label: t("officialNumber"), defaultValue: l.officialNumber },
    { name: "recipient", label: t("recipient"), required: true, defaultValue: l.recipient },
    { name: "reference", label: t("reference"), defaultValue: l.reference },
    { name: "subject", label: t("subject"), required: true, defaultValue: l.subject, full: true },
    { name: "body", label: t("letterBody"), type: "textarea", required: true, defaultValue: l.body, full: true },
    { name: "attachmentIds", label: `${t("attachments")} · IDs separated by spaces`, defaultValue: attachedIds.join(" "), full: true },
    { name: "signerName", label: t("signature"), defaultValue: l.signerName },
    { name: "signerTitle", label: t("role"), defaultValue: l.signerTitle },
  ];
  return (
    <>
      <PageHeader title={`${t("letters")} · ${l.internalNumber}`} subtitle={l.subject} actions={<>
        <Link href="/letters" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">← {t("back")}</Link>
        {l.status === "draft" && ctx.can("letters.write") && <FormDialog title={t("edit")} triggerLabel={t("edit")} triggerVariant="secondary" action={saveLetterAction} fields={fields} hidden={{ id: l.id }} wide />}
        {l.status === "draft" && ctx.can("letters.write") && <ActionButton action={finalizeLetterAction} args={[l.id]} label={t("finalize")} variant="primary" confirm={t("confirm") + "?"} />}
        <PrintButton label={t("print")} audit={{ entityType: "letter", entityId: l.id }} />
      </>} />
      <div className="mx-auto max-w-4xl rounded-xl border border-slate-300 bg-white px-6 py-8 sm:px-12 sm:py-12 print:border-0 print:shadow-none">
        <div className="border-b-2 border-emerald-800 pb-4 flex justify-between gap-4">
          <div className="flex items-center gap-3">
            <FinoraLogo height={44} />
            <div className="text-xs text-slate-500">{t("slogan")}</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-end text-sm"><div><strong>{t("letterNumber")}:</strong> <span dir="ltr" className="font-mono">{l.internalNumber}</span></div>{l.officialNumber && <div><strong>{t("officialNumber")}:</strong> {l.officialNumber}</div>}<div>{formatDate(l.letterDate, fmt)}</div></div>
            {l.customerId && <CustomerLogo attachmentId={row.customerLogoId} name={row.customer ?? t("customer")} height={44} />}
          </div>
        </div>
        <div className="mt-5 flex justify-between items-start gap-4"><div><div className="text-sm">{t("recipient")}: <strong>{l.recipient}</strong></div>{l.reference && <div className="mt-1 text-xs text-slate-500">{t("reference")}: {l.reference}</div>}</div><Badge status={l.status === "finalized" ? "approved" : "draft"} label={t(l.status)} /></div>
        <h1 className="my-8 text-center text-xl font-bold">{l.subject}</h1>
        <div className="min-h-56 whitespace-pre-wrap text-sm sm:text-base leading-9">{l.body}</div>
        {files.length > 0 && <div className="mt-6 border-t pt-4"><div className="font-semibold text-sm">{t("attachments")}</div><ul className="mt-2 text-sm list-disc ps-5">{files.map((f) => <li key={f.id}><a href={`/api/files/${f.id}`} className="text-emerald-700 underline">{f.fileName}</a></li>)}</ul></div>}
        <div className="mt-12 grid grid-cols-2 gap-12 text-sm">
          <div><div className="border-t border-slate-400 pt-2">{l.signerName || t("signature")}</div><div className="text-xs text-slate-500">{l.signerTitle}</div></div>
          <div><div className="border-t border-slate-400 pt-2">{t("stamp")}</div></div>
        </div>
        <footer className="mt-12 border-t pt-3 text-center text-xs text-slate-400">{row.org.name} · {row.org.phone ?? ""} · {formatDateTime(l.createdAt, fmt)}</footer>
      </div>
      <Card title={t("details")} className="mt-4 print:hidden"><KV items={[[t("caseNumber"), row.caseNumber ?? "-"], [t("customer"), row.customer ?? "-"], [t("createdAt"), formatDateTime(l.createdAt, fmt)], [t("updatedAt"), formatDateTime(l.updatedAt, fmt)]]} /></Card>
    </>
  );
}
