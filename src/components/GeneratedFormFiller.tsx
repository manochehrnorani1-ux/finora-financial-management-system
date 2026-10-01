"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { saveGeneratedFormValuesAction } from "@/actions/official-forms";
import { btnClass, useErrorText, toast } from "@/components/forms";

export interface FillerField {
  key: string;
  label: string;
  type: "text" | "date" | "number" | "textarea" | "select";
  required?: boolean;
  options?: string[] | null;
  help?: string | null;
  mapping?: string | null;
}

/** Editable form fields for staff (خانه‌پری فورم) with save + print. */
export function GeneratedFormFiller({
  formId,
  fields,
  initialValues,
  readOnly,
}: {
  formId: string;
  fields: FillerField[];
  initialValues: Record<string, string>;
  readOnly: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const errText = useErrorText();
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [pending, start] = useTransition();

  const save = () => {
    const fd = new FormData();
    fd.set("id", formId);
    for (const f of fields) fd.set(`field_${f.key}`, values[f.key] ?? "");
    start(async () => {
      const r = await saveGeneratedFormValuesAction(fd);
      if (!r.ok) {
        toast("error", errText(r.error));
        return;
      }
      toast("success", t("success"));
      router.refresh();
    });
  };

  if (readOnly) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className={`rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 ${f.type === "textarea" ? "sm:col-span-full" : ""}`}>
            <div className="text-[11px] text-slate-500">{f.label}{f.required && <span className="text-red-500"> *</span>}</div>
            <div className="mt-0.5 whitespace-pre-wrap text-sm font-medium text-slate-800">{values[f.key] || "—"}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <label key={f.key} className={`block text-sm ${f.type === "textarea" ? "sm:col-span-full" : ""}`}>
            <span className="mb-1 block text-slate-600">
              {f.label}{f.required && <span className="text-red-500"> *</span>}
              {f.mapping && <span className="ms-1 text-[10px] text-emerald-700">(خودکار از دیتابیس)</span>}
            </span>
            {f.type === "select" ? (
              <select name={`field_${f.key}`} className="input" value={values[f.key] ?? ""} required={f.required} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}>
                <option value="">{t("select")}</option>
                {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.type === "textarea" ? (
              <textarea name={`field_${f.key}`} className="input" rows={4} value={values[f.key] ?? ""} required={f.required} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
            ) : (
              <input
                name={`field_${f.key}`}
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                step={f.type === "number" ? "0.01" : undefined}
                min={f.type === "number" ? "0" : undefined}
                className="input"
                dir={f.type === "number" ? "ltr" : undefined}
                value={values[f.key] ?? ""}
                required={f.required}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
            )}
            {f.help && <span className="mt-1 block text-[11px] text-slate-400">{f.help}</span>}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 print:hidden">
        <p className="text-xs text-slate-500">{t("autoFill")}</p>
        <div className="flex gap-2">
          <button type="button" disabled={pending} className={btnClass("secondary")} onClick={save}>{pending ? "…" : t("save")}</button>
          <button type="button" className={btnClass("primary")} onClick={() => window.print()}>{t("printForm")}</button>
        </div>
      </div>
    </div>
  );
}
