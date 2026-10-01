import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { cases, customers, generatedForms, officialForms } from "@/db/schema";
import { pageContext } from "@/lib/page";
import { getZipFormDefinition, mergeZipFields } from "@/lib/zip-form-definitions";
import { OfficialFormPrintTemplate } from "@/components/OfficialFormPrintTemplate";

export default async function GeneratedFormPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, lang } = await pageContext("official_forms.read");
  const [row] = await db.select({ g: generatedForms, f: officialForms, c: cases, customer: customers.name })
    .from(generatedForms)
    .leftJoin(officialForms, eq(generatedForms.officialFormId, officialForms.id))
    .leftJoin(cases, eq(generatedForms.caseId, cases.id))
    .leftJoin(customers, eq(generatedForms.customerId, customers.id))
    .where(and(eq(generatedForms.id, id), eq(generatedForms.organizationId, ctx.org.id)));
  if (!row) notFound();

  const values = row.g.valuesSnapshot as Record<string, unknown>;
  const definition = getZipFormDefinition(row.f?.formKey ?? "");
  const fields = mergeZipFields(row.f?.formKey ?? "", (row.f?.fields ?? []) as never) as Array<{key:string;label:string;required?:boolean}>;
  const missing = fields.filter(f => f.required && !String(values[f.key] ?? "").trim()).map(f => f.label);
  const language = lang === "en" ? "en" : lang === "ps" ? "ps" : "fa";

  if (missing.length > 0) {
    return <main className="print-document" dir={language === "en" ? "ltr" : "rtl"} lang={language}>
      <header className="print-document-header"><div><div className="print-agency">{row.g.agencySnapshot}</div><div className="print-title">{row.g.formNameSnapshot}</div></div><div className="print-meta">{row.g.internalNumber}</div></header>
      <section className="print-section"><h2 className="print-section-title">{language === "en" ? "Form information is incomplete" : language === "ps" ? "د فورم معلومات بشپړ نه دي" : "معلومات فورم کامل نیست"}</h2>
        <ul>{missing.map(x => <li key={x}>{x}</li>)}</ul>
        <p className="print-paragraph">{language === "en" ? "Complete the missing information in the source record before printing." : language === "ps" ? "د چاپ مخکې د سرچینې په ریکارډ کې ناتمام معلومات بشپړ کړئ." : "قبل از چاپ، معلومات ناقص را در ریکارډ منبع تکمیل کنید."}</p>
      </section>
    </main>;
  }

  return (
    <div className={definition?.orientation === "landscape" ? "print-landscape" : ""}>
      <OfficialFormPrintTemplate formKey={row.f?.formKey ?? ""} formName={row.g.formNameSnapshot} agency={row.g.agencySnapshot} formNumber={row.f?.formNumber} internalNumber={row.g.internalNumber} language={language} values={values} />
      <script dangerouslySetInnerHTML={{ __html: "window.addEventListener('load',()=>window.print())" }} />
    </div>
  );
}
