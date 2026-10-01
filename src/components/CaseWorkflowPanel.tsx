import Link from "next/link";
import { ActionButton, FormDialog, type Field } from "@/components/forms";
import { Badge, Card, Money, Stat, Table } from "@/components/ui";
import { formatDate } from "@/lib/jalali";
import { round2 } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { WORKFLOW_SERVICES, WORKFLOW_STAGES, isWorkflowKey } from "@/lib/case-workflow-definitions";
import type { CaseSnapshot } from "@/lib/case-workflows";
import {
  completeCaseTaskAction, createLinkedCaseAction, createPlanStepAction, recordCaseOutcomeAction,
  recordCustomerLicenseAction, recordCustomerObligationAction, recordObligationPaymentAction,
  recordPlanPaymentAction, transitionPlanStepAction, verifyCaseRequirementAction,
} from "@/actions/case-workflow";
import { uploadCaseFile } from "@/actions/master";

const LICENSE_STATUS: Record<string, string> = { active: "licenseValid", suspended: "licenseSuspended", expired: "licenseExpired", cancelled: "licenseCancelled", pending: "licensePending", unknown: "licenseUnknown" };
const MILESTONE_STATUS: Record<string, string> = { pending: "milestonePending", in_progress: "milestoneInProgress", completed: "milestoneCompleted", approved: "milestoneApproved" };

export async function CaseWorkflowPanel({ state, perms, currency, fmt }: { state: CaseSnapshot; perms: string[]; currency: string; fmt: "jalali" | "gregorian" }) {
  const { t, lang } = await getT();
  const k = state.caseRecord;
  const canWrite = perms.includes("cases.write") && !["closed", "cancelled"].includes(k.status);
  const canApprove = perms.includes("cases.approve") && !["closed", "cancelled"].includes(k.status);
  const canTax = perms.includes("tax_settlements.read");
  const canObligation = perms.includes("tax_settlements.write") && !["closed", "cancelled"].includes(k.status);
  const core = isWorkflowKey(k.serviceKey);
  const def = isWorkflowKey(k.serviceKey) ? WORKFLOW_SERVICES[k.serviceKey] : null;
  const license = state.license;
  const currentMilestone = state.milestones.find((m) => m.step.status !== "approved");
  const isLicenceService = ["fx-license", "fx-renewal", "fx-cancel", "fx-unfreeze"].includes(k.serviceKey);
  const relevantLinks = k.serviceKey === "fx-renewal" && license?.status === "suspended" ? ["fx-unfreeze"] : k.serviceKey === "fx-unfreeze" ? ["corrective-plan", "tax-settlement"] : k.serviceKey === "tax-settlement" ? [] : ["tax-settlement"];
  const authorityOptions = ["active", "suspended", "expired", "cancelled", "pending"].map((s) => ({ value: s, label: t(LICENSE_STATUS[s]) }));

  return (
    <div className="mb-5 space-y-4">
      <Card className={state.blockerKey ? "border-amber-300" : "border-emerald-200"}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("nextAction")}</div>
            <h2 className={`mt-1 text-lg font-bold ${state.blockerKey ? "text-amber-900" : "text-emerald-900"}`}>{t(state.nextActionKey)}</h2>
            <p className="mt-1 text-sm text-slate-600">{def?.summary[lang] ?? t("workflowNoService")}</p>
            {state.blockerKey && <p className="mt-2 text-xs font-semibold text-amber-800">⚠ {t("workflowGuard")}</p>}
          </div>
          {core && <Link href={`/services-workflow/${k.serviceKey}`} className="rounded-lg border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-800">{t("servicesWorkflow")} →</Link>}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Stat label={t("licenseStatus")} value={t(LICENSE_STATUS[license?.status ?? "unknown"])} tone={license?.status === "suspended" ? "red" : license?.status === "active" ? "green" : "amber"} sub={license?.licenseNumber ?? state.customer.licenseNumber ?? t("licenseUnknown")} />
        <Stat label={t("requirementsChecklist")} value={`${state.verifiedDocs}/${state.requirements.length}`} tone={state.missingDocs ? "amber" : "green"} sub={`${state.missingDocs} ${t("requirementMissing")}`} />
        {canTax && <Stat label={t("taxDebt")} value={<Money value={state.taxDebt} currency={currency} />} tone={state.taxDebt ? "red" : "green"} />}
        {canTax && <Stat label={t("otherDebt")} value={<Money value={state.otherDebt} currency={currency} />} tone={state.otherDebt ? "red" : "green"} />}
        <Stat label={t("paidAmount")} value={<Money value={state.feePaid} currency={currency} />} tone="blue" sub={t("caseFee")} />
        <Stat label={t("remainingAmount")} value={<Money value={state.feeRemaining} currency={currency} />} tone={state.feeRemaining ? "amber" : "green"} sub={t("caseFee")} />
      </div>

      {core && <Card title={t("workflowProcess")}>
        <ol className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {state.tasks.map((task) => {
            const stage = WORKFLOW_STAGES[task.stepKey as keyof typeof WORKFLOW_STAGES];
            if (!stage) return null;
            const current = state.currentTask?.id === task.id;
            return <li key={task.id} className={`rounded-lg border p-3 text-xs ${task.status === "completed" ? "border-emerald-200 bg-emerald-50" : current ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
              <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">{task.position}. {t(stage.title).replace(/^\d+[.\.،]?\s*/, "")}</h3><Badge status={task.status === "completed" ? "approved" : current ? "pending_approval" : "draft"} label={task.status === "completed" ? t("complete") : current ? t("inProgress") : t("milestonePending")} /></div>
              <dl className="mt-2 space-y-1 text-slate-600"><div><dt className="inline font-semibold">{t("workflowInput")}: </dt><dd className="inline">{t(stage.input)}</dd></div><div><dt className="inline font-semibold">{t("workflowAction")}: </dt><dd className="inline">{t(stage.action)}</dd></div><div><dt className="inline font-semibold">{t("workflowResult")}: </dt><dd className="inline">{t(stage.result)}</dd></div></dl>
              {task.result && <p className="mt-2 rounded-md bg-white/80 p-2 text-slate-700">{task.result}</p>}
              {current && canWrite && <div className="mt-3"><ActionButton action={completeCaseTaskAction} args={[k.id, task.id]} label={t("completeStage")} variant="primary" prompt={t("stageResult")} /></div>}
            </li>;
          })}
        </ol>
      </Card>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t("requirementsChecklist")} actions={canWrite && state.missingDocs > 0 && <FormDialog title={t("upload")} triggerLabel={`+ ${t("upload")}`} action={uploadCaseFile} hidden={{ caseId: k.id }} fields={[
          { name: "requirementId", label: t("selectRequirement"), type: "select", required: true, options: state.requirements.filter((r) => r.status !== "verified").map((r) => ({ value: r.id, label: `${r.position}. ${r.title}` })) },
          { name: "file", label: t("evidence"), type: "file", required: true },
        ]} />}>
          {state.requirements.length === 0 ? <p className="text-sm text-slate-500">{t("noData")}</p> : <ul className="space-y-2">{state.requirements.map((r) => <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="font-mono text-xs text-slate-400">{String(r.position).padStart(2, "0")}</span><span className="min-w-0 flex-1">{r.title}</span><Badge status={r.status === "verified" ? "approved" : r.status === "submitted" ? "under_review" : "rejected"} label={t(r.status === "verified" ? "requirementVerified" : r.status === "submitted" ? "requirementSubmitted" : "requirementMissing")} />{r.evidenceAttachmentId && <a href={`/api/files/${r.evidenceAttachmentId}`} target="_blank" rel="noreferrer" className="text-xs text-emerald-700 underline">{t("view")}</a>}{canApprove && r.status === "submitted" && <ActionButton action={verifyCaseRequirementAction} args={[r.id]} label={t("verifyEvidence")} variant="primary" />}</li>)}</ul>}
        </Card>
        <Card title={t("licenseStatus")} actions={canApprove && <FormDialog title={t("recordLicense")} triggerLabel={t("recordLicense")} action={recordCustomerLicenseAction} hidden={{ customerId: k.customerId, caseId: k.id, licenseId: license?.id }} fields={[
          { name: "licenseNumber", label: t("licenseNumberCurrent"), required: true, defaultValue: license?.licenseNumber ?? state.customer.licenseNumber },
          { name: "status", label: t("licenseStatus"), type: "select", required: true, defaultValue: license?.status ?? "pending", options: authorityOptions },
          { name: "licenseType", label: t("documentType"), defaultValue: license?.licenseType ?? "fx" },
          { name: "issuedAt", label: t("date"), type: "date", defaultValue: license?.issuedAt },
          { name: "expiresAt", label: t("endDate"), type: "date", defaultValue: license?.expiresAt },
          { name: "authorityReference", label: t("authorityReference"), required: true, defaultValue: license?.authorityReference },
          { name: "notes", label: t("notes"), type: "textarea" },
        ]} />}>
          <div className="space-y-1 text-sm"><div className="flex justify-between"><span className="text-slate-500">{t("licenseNumberCurrent")}</span><strong dir="ltr">{license?.licenseNumber ?? state.customer.licenseNumber ?? "—"}</strong></div><div className="flex justify-between"><span className="text-slate-500">{t("licenseStatus")}</span><Badge status={license?.status === "active" ? "approved" : "pending_approval"} label={t(LICENSE_STATUS[license?.status ?? "unknown"])} /></div><div className="flex justify-between"><span className="text-slate-500">{t("endDate")}</span><span>{license?.expiresAt ? formatDate(license.expiresAt, fmt) : "—"}</span></div><div className="flex justify-between"><span className="text-slate-500">{t("authorityReference")}</span><span>{license?.authorityReference ?? "—"}</span></div></div>
          {k.serviceKey === "fx-renewal" && license?.status === "suspended" && <p className="mt-3 rounded-md bg-amber-50 p-2 text-xs text-amber-900">{t("suspensionBlock")}</p>}
        </Card>
      </div>

      {canTax && <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t("debtTotal")} actions={canObligation && <FormDialog title={t("recordObligation")} triggerLabel={`+ ${t("recordObligation")}`} action={recordCustomerObligationAction} hidden={{ caseId: k.id, customerId: k.customerId }} fields={[
          { name: "category", label: t("obligationCategory"), type: "select", required: true, defaultValue: "other", options: [{ value: "tax_adjustment", label: t("obligationTax") }, { value: "penalty", label: t("obligationPenalty") }, { value: "other", label: t("obligationOther") }] },
          { name: "amount", label: `${t("amount")} (${currency})`, type: "number", required: true },
          { name: "authorityReference", label: t("authorityReference"), required: true },
          { name: "description", label: t("description"), type: "textarea", required: true },
          { name: "file", label: t("evidence"), type: "file", help: t("evidenceRequiredForTax") },
        ]} />}>
          <div className="mb-3 grid grid-cols-3 gap-2 text-xs"><div className="rounded-lg bg-red-50 p-2">{t("taxDebt")}: <Money value={state.taxDebt} currency={currency} /></div><div className="rounded-lg bg-amber-50 p-2">{t("otherDebt")}: <Money value={state.otherDebt} currency={currency} /></div><div className="rounded-lg bg-slate-50 p-2 font-bold">{t("debtTotal")}: <Money value={state.totalDebt} currency={currency} /></div></div>
          {state.liabilities.length > 0 && <ul className="space-y-2">{state.liabilities.map(({ obligation, paid, remaining }) => <li key={obligation.id} className="rounded-lg border border-slate-200 p-2 text-xs"><div className="flex flex-wrap justify-between gap-2"><strong>{t(obligation.category === "penalty" ? "obligationPenalty" : obligation.category === "tax_adjustment" ? "obligationTax" : "obligationOther")}: {obligation.description}</strong><Money value={remaining} currency={obligation.currency} colored /></div><div className="mt-1 text-slate-500">{t("authorityReference")}: {obligation.authorityReference} · {t("paidAmount")}: <Money value={paid} /></div>{canObligation && remaining > 0 && <div className="mt-2"><FormDialog title={t("recordExternalPayment")} triggerLabel={t("recordExternalPayment")} triggerSize="sm" action={recordObligationPaymentAction} hidden={{ obligationId: obligation.id }} note={t("externalPaymentNote")} fields={[{ name: "amount", label: `${t("amount")} (${currency})`, type: "number", required: true, defaultValue: remaining }, { name: "paymentDate", label: t("date"), type: "date", required: true }, { name: "authorityReceipt", label: t("authorityReceipt"), required: true }, { name: "file", label: t("evidence"), type: "file" }]} /></div>}</li>)}</ul>}
          <p className="mt-3 text-xs leading-5 text-slate-500">{t("externalPaymentNote")}</p>
        </Card>
        <Card title={t("taxSettlement")} actions={perms.includes("tax_settlements.write") && <Link href={`/tax-settlements?caseId=${k.id}`} className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-emerald-700">+ {t("taxSettlement")}</Link>}>
          {state.taxRows.length === 0 ? <p className="text-sm text-slate-500">{t("noData")}</p> : <Table headers={[t("settlementNumber"), t("status"), t("taxAmount"), t("remainingAmount")]} empty={t("noData")} rows={state.taxRows.slice(0, 10).map((s) => [<Link key="n" href={`/tax-settlements/${s.id}`} className="font-mono text-xs text-emerald-700">{s.settlementNumber}</Link>, <Badge key="s" status={s.status === "paid" ? "approved" : "pending_approval"} label={t(s.status === "REQUIRES_LEGAL_REVIEW" ? "requiresLegalReview" : s.status)} />, s.taxAmount === null ? "—" : <Money key="a" value={s.taxAmount} currency={currency} />, s.remainingAmount === null ? "—" : <Money key="r" value={s.remainingAmount} currency={currency} />])} />}
          {state.pendingLegalReview > 0 && <p className="mt-2 text-xs font-medium text-amber-800">{state.pendingLegalReview} · {t("ruleNotFound")}</p>}
        </Card>
      </div>}

      {core && (["corrective-plan", "fx-unfreeze"].includes(k.serviceKey) || state.milestones.length > 0) && <Card title={t("correctiveMilestones")} actions={canWrite && <FormDialog title={t("createMilestone")} triggerLabel={`+ ${t("createMilestone")}`} action={createPlanStepAction} hidden={{ caseId: k.id }} fields={[
        { name: "title", label: t("title"), required: true, full: true },
        { name: "dueDate", label: t("milestoneDue"), type: "date", required: true },
        { name: "amountDue", label: `${t("milestoneAmount")} (${currency})`, type: "number", required: true, defaultValue: 0 },
      ]} />}>
        <p className="mb-3 text-xs text-slate-500">{t("externalPaymentNote")} {t("casePlanInSequence")}</p>
        <Table headers={[t("number"), t("title"), t("milestoneDue"), t("milestoneAmount"), t("milestonePaid"), t("status"), t("actions")]} empty={t("noData")} rows={state.milestones.map(({ step, paid, overdue }) => [
          <span key="p" className="font-mono">{step.position}</span>,
          step.title,
          <span key="d" className={overdue ? "font-semibold text-red-700" : ""}>{formatDate(step.dueDate, fmt)}{overdue && ` · ${t("milestoneOverdue")}`}</span>,
          <Money key="a" value={step.amountDue} currency={currency} />,
          <Money key="m" value={paid} currency={currency} />,
          <Badge key="b" status={step.status === "approved" ? "approved" : overdue ? "rejected" : "pending_approval"} label={t(MILESTONE_STATUS[step.status] ?? step.status)} />,
          <div key="x" className="flex flex-wrap gap-1">
            {canWrite && currentMilestone?.step.id === step.id && step.status === "pending" && <ActionButton action={transitionPlanStepAction} args={[step.id, "start"]} label={t("milestoneStart")} variant="primary" />}
            {canWrite && currentMilestone?.step.id === step.id && Number(step.amountDue) > paid && <FormDialog title={t("recordExternalPayment")} triggerLabel={t("recordExternalPayment")} triggerSize="sm" action={recordPlanPaymentAction} hidden={{ stepId: step.id }} note={t("externalPaymentNote")} fields={[{ name: "amount", label: `${t("amount")} (${currency})`, type: "number", required: true, defaultValue: round2(Number(step.amountDue) - paid) }, { name: "paymentDate", label: t("date"), type: "date", required: true }, { name: "authorityReceipt", label: t("authorityReceipt"), required: true }, { name: "file", label: t("evidence"), type: "file" }]} />}
            {canWrite && currentMilestone?.step.id === step.id && step.status === "in_progress" && paid >= Number(step.amountDue) && <ActionButton action={transitionPlanStepAction} args={[step.id, "complete"]} label={t("milestoneComplete")} variant="primary" prompt={t("stageResult")} />}
            {canApprove && currentMilestone?.step.id === step.id && step.status === "completed" && <ActionButton action={transitionPlanStepAction} args={[step.id, "approve"]} label={t("milestoneApprove")} variant="primary" />}
          </div>,
        ])} />
      </Card>}

      {core && <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t("linkedCases")} actions={canWrite && relevantLinks.map((key) => <ActionButton key={key} action={createLinkedCaseAction} args={[k.id, key]} label={key === "tax-settlement" ? `+ ${t("createLinkedSettlement")}` : `+ ${WORKFLOW_SERVICES[key as keyof typeof WORKFLOW_SERVICES].label[lang]}`} variant="secondary" />)}>
          {state.linkedCases.length === 0 ? <p className="text-sm text-slate-500">{t("noData")}</p> : <ul className="space-y-2">{state.linkedCases.map((child) => <li key={child.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"><Link href={`/cases/${child.id}`} className="font-mono text-emerald-700">{child.caseNumber}</Link><span>{isWorkflowKey(child.serviceKey) ? WORKFLOW_SERVICES[child.serviceKey].label[lang] : t("case")}</span><Badge status={child.status === "closed" ? "approved" : "pending_approval"} label={t(child.status)} /></li>)}</ul>}
        </Card>
        <Card title={t("authorityOutcome")} actions={canApprove && <FormDialog title={t("recordOutcome")} triggerLabel={t("recordOutcome")} action={recordCaseOutcomeAction} hidden={{ caseId: k.id }} note={t("outcomeEvidenceNote")} fields={[
          { name: "decision", label: t("authorityOutcome"), type: "select", required: true, defaultValue: "approved", options: [{ value: "approved", label: t("outcomeApproved") }, { value: "rejected", label: t("outcomeRejected") }, { value: "returned", label: t("outcomeReturned") }] },
          { name: "authorityReference", label: t("authorityReference"), required: true },
          { name: "outcomeDate", label: t("date"), type: "date", required: true },
          ...(isLicenceService ? [{ name: "licenseNumber", label: t("licenseNumberCurrent"), defaultValue: license?.licenseNumber ?? state.customer.licenseNumber, required: k.serviceKey === "fx-license" } as Field, { name: "expiresAt", label: t("endDate"), type: "date" } as Field] : []),
          { name: "file", label: t("evidence"), type: "file" },
          { name: "notes", label: t("notes"), type: "textarea", full: true },
        ]} />}>
          <dl className="space-y-2 text-sm"><div className="flex justify-between gap-2"><dt className="text-slate-500">{t("status")}</dt><dd className="font-semibold">{k.outcomeStatus ? t(k.outcomeStatus === "approved" ? "outcomeApproved" : k.outcomeStatus === "rejected" ? "outcomeRejected" : "outcomeReturned") : t("awaitingAuthority")}</dd></div><div className="flex justify-between gap-2"><dt className="text-slate-500">{t("authorityReference")}</dt><dd dir="ltr">{k.outcomeReference ?? "—"}</dd></div><div className="flex justify-between gap-2"><dt className="text-slate-500">{t("date")}</dt><dd>{k.outcomeDate ? formatDate(k.outcomeDate, fmt) : "—"}</dd></div></dl>
          <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs leading-5 text-amber-900">{t("noAutoSubmission")}</p>
        </Card>
      </div>}
    </div>
  );
}
