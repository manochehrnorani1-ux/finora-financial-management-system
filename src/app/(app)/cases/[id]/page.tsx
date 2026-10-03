import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { attachments, bankAccounts, caseFiles, caseNotes, caseWorkflowSteps, cases, customers, documents, generatedForms, incomes, organizationMembers, profiles, serviceFeeReceipts, services, taxSettlements, cashAccounts } from "@/db/schema";
import { pageContext } from "@/lib/page";
import { saveCase, transitionCase, addCaseNoteForm, uploadCaseFile, saveDocument, deleteUnlinkedCaseAction, completeCaseWorkflowStepAction, updateCaseWorkflowStepAction, recordCaseWorkflowPaymentAction } from "@/actions/master";
import { receiveCaseFee } from "@/actions/finance";
import { ActionButton, FormDialog, PrintButton, type Field } from "@/components/forms";
import { Badge, Card, KV, Money, PageHeader, Stat, Table } from "@/components/ui";
import { formatCaseOpeningDate, formatDate, formatDateTime } from "@/lib/jalali";

const STATUS_KEY: Record<string, string> = { new: "newCase", reviewing: "reviewing", missing_documents: "missingDocuments", in_progress: "inProgress", awaiting_review: "awaitingReview", awaiting_approval: "awaitingApproval", ready_for_delivery: "readyForDelivery", delivered: "delivered", closed: "closed", cancelled: "cancelled" };

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, t, fmt } = await pageContext("cases.read");
  const [record] = await db.select({ c: cases, customer: customers, service: services, employee: profiles.fullName })
    .from(cases).innerJoin(customers, eq(cases.customerId, customers.id)).leftJoin(services, eq(cases.serviceId, services.id)).leftJoin(profiles, eq(cases.responsibleEmployeeId, profiles.id)).where(and(eq(cases.id, id), eq(cases.organizationId, ctx.org.id)));
  if (!record) notFound();
  const c = record.c;
  const [customerList, serviceList, members, notes, docs, fees, files, settlements, workflowSteps, forms, incomeRows, cash, bank] = await Promise.all([
    db.select({ id: customers.id, name: customers.name, code: customers.customerCode }).from(customers).where(eq(customers.organizationId, ctx.org.id)).orderBy(customers.name),
    db.select({ id: services.id, name: services.name }).from(services).where(eq(services.organizationId, ctx.org.id)),
    db.select({ id: profiles.id, name: profiles.fullName }).from(organizationMembers).innerJoin(profiles, eq(organizationMembers.userId, profiles.id)).where(and(eq(organizationMembers.organizationId, ctx.org.id), eq(organizationMembers.status, "active"))),
    db.select({ n: caseNotes, user: profiles.fullName }).from(caseNotes).leftJoin(profiles, eq(caseNotes.createdBy, profiles.id)).where(and(eq(caseNotes.caseId, id), eq(caseNotes.organizationId, ctx.org.id))).orderBy(desc(caseNotes.createdAt)),
    db.select().from(documents).where(and(eq(documents.caseId, id), eq(documents.organizationId, ctx.org.id))).orderBy(desc(documents.createdAt)),
    db.select({ r: serviceFeeReceipts, user: profiles.fullName }).from(serviceFeeReceipts).leftJoin(profiles, eq(serviceFeeReceipts.issuedBy, profiles.id)).where(and(eq(serviceFeeReceipts.caseId, id), eq(serviceFeeReceipts.organizationId, ctx.org.id))).orderBy(desc(serviceFeeReceipts.createdAt)),
    db.select({ f: caseFiles, a: attachments, user: profiles.fullName }).from(caseFiles).innerJoin(attachments, eq(caseFiles.attachmentId, attachments.id)).leftJoin(profiles, eq(caseFiles.uploadedBy, profiles.id)).where(and(eq(caseFiles.caseId, id), eq(caseFiles.organizationId, ctx.org.id))).orderBy(desc(caseFiles.createdAt)),
    db.select().from(taxSettlements).where(and(eq(taxSettlements.caseId, id), eq(taxSettlements.organizationId, ctx.org.id))).orderBy(desc(taxSettlements.createdAt)),
    db.select().from(caseWorkflowSteps).where(and(eq(caseWorkflowSteps.caseId, id), eq(caseWorkflowSteps.organizationId, ctx.org.id))).orderBy(asc(caseWorkflowSteps.stepNo)),
    db.select().from(generatedForms).where(and(eq(generatedForms.caseId, id), eq(generatedForms.organizationId, ctx.org.id))).orderBy(desc(generatedForms.createdAt)),
    db.select().from(incomes).where(and(eq(incomes.caseId, id), eq(incomes.organizationId, ctx.org.id))).orderBy(desc(incomes.createdAt)),
    db.select({ id: cashAccounts.id, name: cashAccounts.name }).from(cashAccounts).where(and(eq(cashAccounts.organizationId, ctx.org.id), eq(cashAccounts.isActive, true))),
    db.select({ id: bankAccounts.id, label: sql<string>`${bankAccounts.bankName} || ' — ' || ${bankAccounts.accountNumber}` }).from(bankAccounts).where(and(eq(bankAccounts.organizationId, ctx.org.id), eq(bankAccounts.isActive, true))),
  ]);
  const feeTotal = Math.max(0, Number(c.serviceFee) - Number(c.discountAmount));
  const paid = fees.reduce((sum, r) => sum + Number(r.r.paidAmount), 0);
  const remaining = Math.max(0, feeTotal - paid);
  const paymentTargets = [...cash.map((a) => ({ value: `cash:${a.id}`, label: `${t("cash")}: ${a.name}` })), ...bank.map((a) => ({ value: `bank:${a.id}`, label: `${t("bank")}: ${a.label}` }))];
  const caseFields: Field[] = [
    { name: "customerId", label: t("customer"), type: "select", required: true, defaultValue: c.customerId, options: customerList.map((x) => ({ value: x.id, label: `${x.code} — ${x.name}` })) },
    { name: "serviceId", label: t("service"), type: "select", defaultValue: c.serviceId, options: serviceList.map((x) => ({ value: x.id, label: x.name })) },
    { name: "openedAt", label: t("openingDate"), type: "date", required: true, defaultValue: c.openedAt },
    { name: "responsibleEmployeeId", label: t("responsibleEmployee"), type: "select", defaultValue: c.responsibleEmployeeId, options: members.map((x) => ({ value: x.id, label: x.name })) },
    { name: "priority", label: t("priority"), type: "select", required: true, defaultValue: c.priority, options: ["normal", "high", "urgent"].map((x) => ({ value: x, label: t(x) })) },
    { name: "serviceFee", label: `${t("caseFee")} (${ctx.org.currency})`, type: "number", required: true, defaultValue: c.serviceFee },
    { name: "discountAmount", label: `${t("discount")} (${ctx.org.currency})`, type: "number", required: true, defaultValue: c.discountAmount },
    { name: "notes", label: t("internalNote"), type: "textarea", defaultValue: c.notes, full: true },
  ];
  const statusActions: { action: string; label: string; variant: string; needsApproval?: boolean }[] = ({
    new: [{ action: "review", label: "reviewing", variant: "primary" }, { action: "cancel", label: "cancelled", variant: "danger" }],
    reviewing: [{ action: "missing", label: "missingDocuments", variant: "warning" }, { action: "progress", label: "inProgress", variant: "primary" }],
    missing_documents: [{ action: "progress", label: "inProgress", variant: "primary" }, { action: "cancel", label: "cancelled", variant: "danger" }],
    in_progress: [{ action: "missing", label: "missingDocuments", variant: "warning" }, { action: "awaiting_review", label: "awaitingReview", variant: "primary" }],
    awaiting_review: [{ action: "progress", label: "inProgress", variant: "secondary" }, { action: "request_approval", label: "awaitingApproval", variant: "warning" }, { action: "ready", label: "readyForDelivery", variant: "primary", needsApproval: true }],
    awaiting_approval: [{ action: "progress", label: "inProgress", variant: "secondary" }, { action: "ready", label: "readyForDelivery", variant: "primary", needsApproval: true }],
    ready_for_delivery: [{ action: "deliver", label: "delivered", variant: "primary", needsApproval: true }],
    delivered: [{ action: "close", label: "closed", variant: "secondary", needsApproval: true }],
  } as Record<string, { action: string; label: string; variant: string; needsApproval?: boolean }[]>)[c.status] ?? [];
  return (
    <>
      <PageHeader title={<span className="flex flex-wrap items-center gap-2">{c.caseNumber}<Badge status={c.status === "closed" || c.status === "delivered" ? "completed" : c.status === "cancelled" || c.status === "missing_documents" ? "rejected" : "under_review"} label={t(STATUS_KEY[c.status] ?? c.status)} /></span>}
        subtitle={`${record.customer.name} · ${record.service?.name ?? t("services")}`}
        actions={<>
          <Link href="/cases" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">← {t("back")}</Link>
          <PrintButton label={t("print")} audit={{ entityType: "case", entityId: id }} />
          {ctx.can("cases.write") && !["closed", "cancelled"].includes(c.status) && <FormDialog title={t("edit")} triggerLabel={t("edit")} triggerVariant="secondary" action={saveCase} fields={caseFields} hidden={{ id: c.id }} wide />}
          {statusActions.filter((x) => !x.needsApproval || ctx.can("cases.approve")).filter((x) => x.needsApproval || ctx.can("cases.write")).map((x) => <ActionButton key={x.action} action={transitionCase} args={[c.id, x.action]} label={t(x.label)} variant={x.variant} confirm={x.action === "cancel" ? t("confirm") + "?" : undefined} />)}
          {ctx.can("cases.write") && !["closed", "cancelled"].includes(c.status) && <ActionButton action={transitionCase} args={[c.id, "cancel"]} label={t("cancel")} variant="danger" confirm={t("confirm") + "?"} />}
          {ctx.can("cases.delete") && ["new", "cancelled"].includes(c.status) && <ActionButton action={deleteUnlinkedCaseAction} args={[c.id]} label={t("delete")} variant="danger" confirm={t("confirmDelete")} />}
        </>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label={t("feeTotal")} value={<Money value={feeTotal} currency={c.feeCurrency} />} tone="blue" />
        <Stat label={t("paidAmount")} value={<Money value={paid} currency={c.feeCurrency} />} tone="green" />
        <Stat label={t("remainingAmount")} value={<Money value={remaining} currency={c.feeCurrency} />} tone={remaining > 0 ? "amber" : "green"} />
        <Stat label={t("status")} value={t(STATUS_KEY[c.status] ?? c.status)} />
      </div>
      {workflowSteps.length > 0 && (
        <Card title="گردش‌کار عملیاتی دوسیه" className="mb-4" actions={c.nextAction && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">اقدام بعدی: {c.nextAction}</span>}>
          <div className="space-y-3">
            {workflowSteps.map((step) => {
              const taxSettlementForPayment = c.workflowKey === "tax_settlement" && step.stepNo === 5 && settlements.length === 1 ? settlements[0] : null;
              const stepAmount = taxSettlementForPayment ? Number(taxSettlementForPayment.taxAmount ?? 0) : Number(step.amount ?? 0);
              const stepPaid = taxSettlementForPayment ? Number(taxSettlementForPayment.paidAmount ?? 0) : Number(step.paidAmount ?? 0);
              const stepRemaining = taxSettlementForPayment ? Number(taxSettlementForPayment.remainingAmount ?? 0) : Number(step.remainingAmount ?? 0);
              return (
              <div key={step.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold">{step.stepNo}</span>
                    <span className="font-medium">{step.title}</span>
                  </div>
                  <Badge status={step.status === "completed" ? "completed" : step.status === "active" ? "under_review" : step.status === "blocked" ? "rejected" : "draft"} label={step.status === "completed" ? "تکمیل‌شده" : step.status === "active" ? "مرحله فعلی" : step.status === "blocked" ? "متوقف" : "در انتظار"} />
                </div>
                <div className="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                  <span>اقدام: {step.actionRequired || "—"}</span>
                  <span>موعد: {step.dueDate ? formatDate(step.dueDate, fmt) : "—"}</span>
                  <span>مبلغ: {stepAmount <= 0 ? "—" : <Money value={stepAmount} currency={c.feeCurrency} />}</span>
                  <span>پرداخت‌شده: {stepPaid > 0 ? <Money value={stepPaid} currency={c.feeCurrency} /> : "—"}</span>
                  <span>باقی‌مانده: {stepRemaining > 0 ? <Money value={stepRemaining} currency={c.feeCurrency} /> : "—"}</span>
                </div>
                {ctx.can("cases.write") && step.status !== "completed" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <FormDialog
                      title="تنظیم مرحله عملیاتی"
                      triggerLabel="تنظیم مرحله"
                      triggerSize="sm"
                      action={updateCaseWorkflowStepAction}
                      hidden={{ id: step.id }}
                      fields={[
                        { name: "actionRequired", label: "اقدام مورد نیاز", defaultValue: step.actionRequired ?? step.title, full: true },
                        { name: "dueDate", label: "موعد", type: "date", defaultValue: step.dueDate ?? undefined },
                        { name: "amount", label: "مبلغ (" + c.feeCurrency + ")", type: "number", defaultValue: step.amount ?? undefined },
                        { name: "notes", label: "یادداشت", type: "textarea", defaultValue: step.notes ?? undefined, full: true },
                      ]}
                    />
                    {step.status === "active" && stepAmount > 0 && stepRemaining > 0 && <FormDialog title="ثبت پرداخت مرحله" triggerLabel="ثبت پرداخت" triggerSize="sm" action={recordCaseWorkflowPaymentAction} hidden={{ stepId: step.id }} fields={[{ name: "amount", label: "مبلغ پرداخت (" + c.feeCurrency + ")", type: "number", required: true, defaultValue: stepRemaining }, { name: "paymentDate", label: "تاریخ پرداخت", type: "date", required: true }, { name: "paymentMethod", label: "روش پرداخت" }, { name: "referenceNumber", label: "شماره مرجع/رسید" }, { name: "notes", label: "یادداشت", type: "textarea", full: true }]} />}
                    {step.status === "active" && c.workflowKey === "tax-settlement" && step.stepNo === 5 && settlements.length === 0 ? (
                      <Link href={`/tax-settlements?caseId=${c.id}`} className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-medium text-white">
                        ثبت تصفیه مالیاتی همین دوسیه →
                      </Link>
                    ) : step.status === "active" ? (
                      <ActionButton action={completeCaseWorkflowStepAction} args={[step.id]} label="تکمیل مرحله" variant="primary" confirm="این مرحله تکمیل شود؟" />
                    ) : null}
                  </div>
                )}
              </div>
            )})}
          </div>
        </Card>
      )}
      {c.workflowKey === "tax-settlement" && settlements.length === 0 && !["closed", "cancelled"].includes(c.status) && (
        <Card title="پرداخت مالیاتی — نیاز به تصفیه دارد" className="mb-4 border-amber-300 bg-amber-50">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm leading-6 text-amber-950">
              <strong>این دوسیه هنوز رکورد تصفیه مالیاتی ندارد.</strong>
              <div>برای ثبت هرگونه پرداخت مالیاتی، ابتدا تصفیه مالیاتی همین دوسیه را ثبت و محاسبه کنید؛ سیستم پرداخت را بدون آن اجازه نمی‌دهد.</div>
            </div>
            {ctx.can("tax_settlements.write") && (
              <Link href={`/tax-settlements?caseId=${c.id}`} className="shrink-0 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white">
                ثبت تصفیه این دوسیه →
              </Link>
            )}
          </div>
        </Card>
      )}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card title={t("details")} className="lg:col-span-1">
          <KV items={[[t("caseNumber"), c.caseNumber], [t("customer"), <Link key="c" href={`/customer-accounts/${c.customerId}`} className="text-emerald-700">{record.customer.name}</Link>], [t("service"), record.service?.name ?? "-"], [t("openingDate"), formatCaseOpeningDate(c.openedAt, fmt)], [t("responsibleEmployee"), record.employee ?? "-"], [t("priority"), t(c.priority)], [t("caseFee"), <Money key="f" value={c.serviceFee} currency={c.feeCurrency} />], [t("discount"), <Money key="d" value={c.discountAmount} currency={c.feeCurrency} />], [t("feeStatus"), t(c.feeStatus)], [t("createdBy"), c.createdBy === ctx.user.id ? ctx.user.fullName : ""]]} />
          {c.notes && <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">{c.notes}</p>}
        </Card>
        <Card title={t("caseFee")} className="lg:col-span-2" actions={ctx.can("cases.write") && remaining > 0 && <FormDialog title={t("issueReceipt")} triggerLabel={`+ ${t("issueReceipt")}`} action={receiveCaseFee} hidden={{ caseId: c.id }} fields={[
          { name: "amount", label: `${t("amount")} (${c.feeCurrency})`, type: "number", required: true, defaultValue: remaining },
          { name: "account", label: t("paymentMethod"), type: "select", required: true, defaultValue: paymentTargets[0]?.value, options: paymentTargets },
          { name: "date", label: t("date"), type: "date", required: true },
          { name: "description", label: t("description"), type: "textarea" },
        ]} successPath="/receipts/{id}" />}>
          <Table headers={[t("receiptNumber"), t("date"), t("amount"), t("paymentMethod"), t("user"), t("actions")]} empty={t("noData")} rows={fees.map(({ r, user }) => [<span key="n" className="font-mono text-xs">{r.receiptNumber}</span>, formatDateTime(r.createdAt, fmt), <Money key="a" value={r.paidAmount} currency={r.currency} />, t(r.paymentMethod), user ?? "-", <Link key="p" href={`/receipts/${r.id}`} className="text-emerald-700 text-xs">{t("printReceipt")}</Link>])} footer={[t("total"), "", <Money key="t" value={paid} currency={c.feeCurrency} />, "", "", ""]} />
          {incomeRows.length > 0 && <p className="mt-2 text-xs text-slate-500">{t("income")} · {incomeRows.map((x) => x.incomeNumber).join(", ")} — {t("receivable")}</p>}
        </Card>
        <Card title={t("documents")} className="lg:col-span-2" actions={<>
          {ctx.can("documents.write") && <FormDialog title={t("create")} triggerLabel={`+ ${t("document")}`} action={saveDocument} hidden={{ caseId: c.id, customerId: c.customerId }} fields={[
            { name: "title", label: t("title"), required: true, full: true },
            { name: "documentType", label: t("documentType"), type: "select", required: true, defaultValue: "letter", options: ["letter", "application", "certificate", "license", "other"].map((x) => ({ value: x, label: t(x) })) },
            { name: "documentDate", label: t("date"), type: "date", required: true },
            { name: "officialNumber", label: t("officialNumber") },
            { name: "legalReference", label: t("legalReference") },
            { name: "description", label: t("description"), type: "textarea", full: true },
          ]} />}
          <Link href={`/official-forms?caseId=${c.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs">{t("officialForms")}</Link>
        </>}>
          <Table headers={[t("documentNumber"), t("title"), t("documentType"), t("date"), t("status"), ""]} empty={t("noData")} rows={docs.map((d) => [<Link key="n" href={`/documents/${d.id}`} className="font-mono text-xs text-emerald-700">{d.documentNumber}</Link>, d.title, t(d.documentType), formatDate(d.documentDate, fmt), <Badge key="s" status={d.status} label={t(d.status)} />, <Link key="v" href={`/documents/${d.id}`} className="text-emerald-700 text-xs">{t("view")}</Link>])} />
        </Card>
        <Card title={t("files")} className="lg:col-span-1" actions={ctx.can("cases.write") && <FormDialog title={t("upload")} triggerLabel={t("upload")} triggerSize="sm" action={uploadCaseFile} hidden={{ caseId: c.id }} fields={[{ name: "file", label: t("files"), type: "file", required: true, full: true }]} />}>
          <ul className="divide-y divide-slate-100 text-sm">{files.length === 0 && <li className="py-4 text-center text-slate-400">{t("noData")}</li>}{files.map(({ f, a }) => <li key={f.id} className="py-2 flex items-center justify-between gap-2"><a href={`/api/files/${a.id}`} target="_blank" rel="noreferrer" className="truncate text-emerald-700">{a.fileName}</a><span className="text-xs text-slate-400" dir="ltr">{(a.fileSize / 1024).toFixed(1)} KB</span></li>)}</ul>
        </Card>
        <Card title={t("caseTimeline")} className="lg:col-span-2" actions={ctx.can("cases.write") && <FormDialog title={t("addNote")} triggerLabel={`+ ${t("addNote")}`} action={addCaseNoteForm} hidden={{ caseId: c.id }} fields={[{ name: "body", label: t("internalNote"), type: "textarea", required: true, full: true }]} />}>
          <ul className="divide-y divide-slate-100">{notes.length === 0 && <li className="py-4 text-center text-sm text-slate-400">{t("noData")}</li>}{notes.map(({ n, user }) => <li key={n.id} className="py-3"><div className="flex justify-between gap-2 text-xs text-slate-400"><span>{user ?? "-"} · {t("internalNote")}</span><span>{formatDateTime(n.createdAt, fmt)}</span></div><p className="mt-1 text-sm whitespace-pre-wrap">{n.body}</p></li>)}</ul>
        </Card>
        <Card title={t("taxSettlement")} className="lg:col-span-1" actions={<Link href={`/tax-settlements?caseId=${c.id}`} className="text-xs text-emerald-700">{t("details")} →</Link>}>
          <ul className="divide-y divide-slate-100 text-sm">{settlements.length === 0 && <li className="py-4 text-center text-slate-400">{t("noData")}</li>}{settlements.map((s) => <li key={s.id} className="py-2"><Link href={`/tax-settlements/${s.id}`} className="font-mono text-xs text-emerald-700">{s.settlementNumber}</Link><div className="mt-1 flex justify-between"><span>{t(s.status === "REQUIRES_LEGAL_REVIEW" ? "requiresLegalReview" : s.status)}</span><Money value={s.taxAmount} currency={ctx.org.currency} /></div></li>)}</ul>
        </Card>
        <Card title={t("officialForms")} className="lg:col-span-1">
          <ul className="divide-y divide-slate-100 text-sm">{forms.length === 0 && <li className="py-4 text-center text-slate-400">{t("noData")}</li>}{forms.map((f) => <li key={f.id} className="py-2"><Link href={`/generated-forms/${f.id}`} className="text-emerald-700">{f.formNameSnapshot}</Link><div className="text-xs text-slate-500">{t("formVersion")} {f.versionSnapshot} · {t(f.matchStatus === "LEGAL_REVIEW_REQUIRED" ? "legalReviewRequired" : f.matchStatus)}</div></li>)}</ul>
        </Card>
      </div>
    </>
  );
}
