import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cases, officialForms, services, taxTypes } from "@/db/schema";
import type { Metadata } from "next";
import { pageContext, sp1, type SP } from "@/lib/page";
import { saveService, deleteService } from "@/actions/master";
import { OPERATIONAL_SERVICES, groupLabel, serviceDesc, serviceDocs, serviceLabel, serviceShort, serviceSteps, type OperationalService } from "@/lib/operational-services";
import { WORKFLOW_KEYS, WORKFLOW_SERVICES, isWorkflowKey } from "@/lib/case-workflow-definitions";
import { ensurePublicWebsite } from "@/lib/website-seed";
import { Badge, Card, Money, PageHeader, Stat } from "@/components/ui";
import { ActionButton, FormDialog, type Field } from "@/components/forms";

export const metadata: Metadata = {
  title: "مدیریت خدمات و نرخ‌ها",
};

type ServiceRow = typeof services.$inferSelect;

export default async function ServiceManagementPage({ searchParams }: { searchParams: SP }) {
  const { ctx, t, lang } = await pageContext("services.read");
  const q = await searchParams;
  const groupFilter = sp1(q.group) ?? "";

  // Keep the service catalogue in sync with the operational definitions
  await db.transaction((tx) => ensurePublicWebsite(tx, ctx.org.id, ctx.user.id));

  const [rows, taxes, formRows, caseRows] = await Promise.all([
    db.select({ s: services, tax: taxTypes.name }).from(services).leftJoin(taxTypes, eq(services.taxTypeId, taxTypes.id)).where(eq(services.organizationId, ctx.org.id)).orderBy(services.publicOrder, desc(services.createdAt)),
    db.select().from(taxTypes).where(eq(taxTypes.organizationId, ctx.org.id)),
    db.select({ id: officialForms.id, formKey: officialForms.formKey, formName: officialForms.formName, agency: officialForms.agency }).from(officialForms).where(eq(officialForms.organizationId, ctx.org.id)).orderBy(officialForms.agency, officialForms.formKey),
    db.select({ id: cases.id, caseNumber: cases.caseNumber, serviceId: cases.serviceId, status: cases.status }).from(cases).where(eq(cases.organizationId, ctx.org.id)).orderBy(desc(cases.createdAt)).limit(500),
  ]);

  const formByKey = new Map(formRows.map((f) => [f.formKey, f]));
  const casesForService = (serviceId: string) => caseRows.filter((c) => c.serviceId === serviceId);

  const fields = (s?: ServiceRow): Field[] => {
    const c = (s?.publicContent ?? {}) as Record<string, unknown>;
    const short = (c.short ?? {}) as Record<string, string>;
    const req = (s?.requiredDocuments ?? {}) as Record<string, unknown>;
    const proc = (s?.workflowSteps ?? {}) as Record<string, unknown>;
    const grp = ((c.group as string) ?? (s?.category ?? "licensing")) as "licensing" | "tax";
    const listFrom = (key: string) => (Array.isArray(req[key]) ? (req[key] as string[]).join("\n") : "");
    const stepsFrom = (key: string) => (Array.isArray(proc[key]) ? (proc[key] as string[]).join("\n") : "");
    return [
      { name: "name", label: `${t("name")} — دری`, required: true, defaultValue: s?.name },
      { name: "namePs", label: `${t("name")} — پښتو`, defaultValue: (c.title as Record<string, string>)?.ps ?? "" },
      { name: "nameEn", label: `${t("name")} — English`, defaultValue: (c.title as Record<string, string>)?.en ?? "" },
      { name: "shortFa", label: `شرح کوتاه — دری`, defaultValue: short.fa ?? "" },
      { name: "shortPs", label: `شرح کوتاه — پښتو`, defaultValue: short.ps ?? "" },
      { name: "shortEn", label: `Short description — English`, defaultValue: short.en ?? "" },
      { name: "category", label: t("category"), type: "select", required: true, defaultValue: grp, options: [{ value: "licensing", label: groupLabel("licensing", lang) }, { value: "tax", label: groupLabel("tax", lang) }] },
      { name: "defaultPrice", label: `${t("serviceFee")} (${ctx.org.currency})`, type: "number", required: true, defaultValue: s?.defaultPrice ?? 0, help: t("feeOnReview") },
      { name: "feeQuoteRequired", label: t("feeOnReview"), type: "checkbox", defaultValue: s?.feeQuoteRequired ?? true },
      { name: "taxTypeId", label: t("taxType"), type: "select", defaultValue: s?.taxTypeId, options: taxes.map((x) => ({ value: x.id, label: `${x.name} (${x.code})` })) },
      { name: "status", label: t("status"), type: "select", required: true, defaultValue: s?.status ?? "active", options: [{ value: "active", label: t("active") }, { value: "inactive", label: t("inactive") }] },
      { name: "publicListed", label: t("published"), type: "checkbox", defaultValue: s?.publicListed ?? false },
      { name: "publicOrder", label: t("number"), type: "number", defaultValue: s?.publicOrder ?? 0 },
      { name: "estimatedDays", label: t("estimatedDays"), type: "number", defaultValue: s?.estimatedDays ?? "" },
      { name: "description", label: `${t("description")} — دری`, type: "textarea", defaultValue: s?.description, full: true },
      { name: "descriptionPs", label: `${t("description")} — پښتو`, type: "textarea", defaultValue: (c.description as Record<string, string>)?.ps ?? "", full: true },
      { name: "descriptionEn", label: `${t("description")} — English`, type: "textarea", defaultValue: (c.description as Record<string, string>)?.en ?? "", full: true },
      { name: "requirementsFa", label: `${t("requiredDocuments")} — دری (هر مورد در یک خط)`, type: "textarea", defaultValue: listFrom("fa"), full: true },
      { name: "requirementsPs", label: `${t("requiredDocuments")} — پښتو`, type: "textarea", defaultValue: listFrom("ps"), full: true },
      { name: "requirementsEn", label: `${t("requiredDocuments")} — English`, type: "textarea", defaultValue: listFrom("en"), full: true },
      { name: "stepsFa", label: `${t("workflowSteps")} — دری (هر مرحله در یک خط)`, type: "textarea", defaultValue: stepsFrom("fa"), full: true },
      { name: "stepsPs", label: `${t("workflowSteps")} — پښتو`, type: "textarea", defaultValue: stepsFrom("ps"), full: true },
      { name: "stepsEn", label: `${t("workflowSteps")} — English`, type: "textarea", defaultValue: stepsFrom("en"), full: true },
    ];
  };

  const canWrite = ctx.can("services.write");
  const renderServiceCard = (def: OperationalService) => {
    const row = rows.find((r) => r.s.name === def.fa);
    const s = row?.s;
    const linkedForms = def.forms.map((k) => formByKey.get(k)).filter(Boolean);
    const linkedCases = s ? casesForService(s.id) : [];
    return (
      <article key={def.key} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md">
        <span className="pointer-events-none absolute -end-1 -top-3 text-6xl font-black leading-none text-slate-100" aria-hidden="true">{def.number}</span>
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="inline-block h-1 w-10 rounded-full bg-emerald-600" />
              <h3 className="mt-2 text-base font-bold text-slate-900">{serviceLabel(def, lang)}</h3>
              <p className="mt-1 text-sm text-slate-600">{serviceShort(def, lang)}</p>
            </div>
            {s && <Badge status={s.status} label={t(s.status)} />}
          </div>
          <p className="mt-3 text-xs leading-6 text-slate-500">{serviceDesc(def, lang)}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("requiredDocuments")}</h4>
              <ul className="mt-2 space-y-1 text-xs text-slate-700">
                {serviceDocs(def, lang).map((d, i) => <li key={i} className="flex gap-2"><span className="text-emerald-700">•</span><span>{d}</span></li>)}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("workflowSteps")}</h4>
              <ol className="mt-2 space-y-1 text-xs text-slate-700">
                {serviceSteps(def, lang).map((st, i) => <li key={i} className="flex gap-2"><span className="font-mono text-slate-400">{i + 1}.</span><span>{st}</span></li>)}
              </ol>
            </div>
          </div>

          {linkedForms.length > 0 && (
            <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("officialForms")}</h4>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {linkedForms.map((f) => (
                  <Link key={f!.id} href="/official-forms" className="rounded-md border border-emerald-200 bg-white px-2 py-1 text-[11px] text-emerald-800 hover:bg-emerald-50">
                    {f!.agency} · {f!.formName}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div className="rounded-lg bg-slate-50 px-2 py-1.5"><div className="text-slate-500">{t("serviceFee")}</div><div className="mt-0.5 font-semibold text-emerald-800">{s && !s.feeQuoteRequired ? <Money value={s.defaultPrice} currency={ctx.org.currency} /> : t("feeOnReview")}</div></div>
            <div className="rounded-lg bg-slate-50 px-2 py-1.5"><div className="text-slate-500">{t("estimatedDays")}</div><div className="mt-0.5 font-semibold">{def.estimatedDays ?? "—"}</div></div>
            <div className="rounded-lg bg-slate-50 px-2 py-1.5"><div className="text-slate-500">{t("cases")}</div><div className="mt-0.5 font-semibold">{linkedCases.length}</div></div>
            <div className="rounded-lg bg-slate-50 px-2 py-1.5"><div className="text-slate-500">{t("published")}</div><div className="mt-0.5 font-semibold">{s?.publicListed ? t("yes") : t("no")}</div></div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
            <Link href={`/cases?serviceId=${s?.id ?? ""}`} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800">+ {t("case")}</Link>
            <Link href={`/official-forms`} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs hover:bg-slate-50">{t("officialForms")}</Link>
            {canWrite && s && <FormDialog title={t("edit")} triggerLabel={t("edit")} triggerVariant="secondary" triggerSize="sm" action={saveService} fields={fields(s)} hidden={{ id: s.id }} wide />}
            {canWrite && !s && (
              <FormDialog
                title={`${t("add")} — ${serviceLabel(def, lang)}`}
                triggerLabel={t("add")}
                triggerVariant="secondary"
                triggerSize="sm"
                action={saveService}
                hidden={{ name: def.fa, category: def.group, publicOrder: String(def.order), estimatedDays: def.estimatedDays === null ? "" : String(def.estimatedDays) }}
                fields={[
                  { name: "name", label: `${t("name")} — دری`, required: true, defaultValue: def.fa },
                  { name: "category", label: t("category"), type: "select", required: true, defaultValue: def.group, options: [{ value: "licensing", label: groupLabel("licensing", lang) }, { value: "tax", label: groupLabel("tax", lang) }] },
                  { name: "estimatedDays", label: t("estimatedDays"), type: "number", defaultValue: def.estimatedDays ?? "" },
                  { name: "publicListed", label: t("published"), type: "checkbox", defaultValue: true },
                ]}
              />
            )}
            {canWrite && s && ctx.can("services.delete") && <ActionButton action={deleteService} args={[s.id]} label={t("delete")} variant="danger" confirm={t("confirmDelete")} />}
          </div>
        </div>
      </article>
    );
  };

  return (
    <>
      <PageHeader
        title={t("services")}
        subtitle={`${WORKFLOW_KEYS.length} ${t("servicesWorkflow")} · ${caseRows.length} ${t("cases")}`}
        actions={<>
          <form method="get" className="flex gap-2">
            <select name="group" defaultValue={groupFilter} className="input !w-auto">
              <option value="">{t("all")}</option>
              <option value="licensing">{groupLabel("licensing", lang)}</option>
              <option value="tax">{groupLabel("tax", lang)}</option>
            </select>
            <button className="rounded-lg border border-slate-300 bg-white px-3 text-sm">{t("filter")}</button>
          </form>
          {canWrite && <FormDialog title={t("add")} triggerLabel={`+ ${t("add")}`} action={saveService} fields={fields()} wide />}
        </>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("servicesWorkflow")} value={WORKFLOW_KEYS.length} tone="blue" />
        <Stat label={t("cases")} value={caseRows.length} tone="green" />
        <Stat label={t("officialForms")} value={formRows.length} />
        <Stat label={t("pendingWork")} value={caseRows.filter((k) => !["closed", "cancelled"].includes(k.status)).length} tone="amber" />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold text-slate-900">{t("servicesWorkflow")}</h2>
        <p className="mb-4 text-sm text-slate-500">{t("workflowProcess")} — {t("nextAction")}</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {WORKFLOW_KEYS.filter((key) => groupFilter === "" || (groupFilter === "tax" ? key === "tax-settlement" : key !== "tax-settlement")).map((key, index) => {
            const def = WORKFLOW_SERVICES[key];
            const svc = rows.find((r) => r.s.serviceKey === key)?.s;
            const activeCases = caseRows.filter((k) => k.serviceId === svc?.id).length;
            return <Link key={key} href={`/services-workflow/${key}`} className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-400 hover:shadow-md">
              <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 font-mono text-sm font-bold text-emerald-800">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><h3 className="font-bold text-slate-900">{def.label[lang]}</h3><p className="mt-1 text-xs leading-6 text-slate-500">{def.summary[lang]}</p></div></div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs"><span className="text-slate-500">{activeCases} {t("cases")} · {def.stages.length} {t("workflowProcess")}</span><span className="font-semibold text-emerald-700">{t("openModule")} →</span></div>
            </Link>;
          })}
        </div>
      </section>
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{t("publicServices")}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {OPERATIONAL_SERVICES.filter((s) => !isWorkflowKey(s.key) && (!groupFilter || s.group === groupFilter)).map(renderServiceCard)}
        </div>
      </section>
    </>
  );
}
