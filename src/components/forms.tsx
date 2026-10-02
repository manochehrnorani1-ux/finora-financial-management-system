"use client";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { recordPrintAction } from "@/actions/audit";
import { ERROR_MESSAGES } from "@/lib/errors";
import { JALALI_MONTHS, jalaliMonthLength, toGregorian, toJalali, todayIso } from "@/lib/jalali";
import type { ActionResult } from "@/actions/util";

/* ---------------- Toast ---------------- */
export function toast(type: "success" | "error", message: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("finora:toast", { detail: { type, message } }));
}

export function Toaster() {
  const [items, setItems] = useState<{ id: number; type: string; message: string }[]>([]);
  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent).detail;
      const id = Date.now() + Math.random();
      setItems((s) => [...s, { id, ...d }]);
      setTimeout(() => setItems((s) => s.filter((i) => i.id !== id)), 4000);
    };
    window.addEventListener("finora:toast", h);
    return () => window.removeEventListener("finora:toast", h);
  }, []);
  return (
    <div className="fixed bottom-4 start-4 z-[100] flex flex-col gap-2 print:hidden">
      {items.map((i) => (
        <div key={i.id} className={`rounded-lg px-4 py-3 text-sm shadow-lg text-white ${i.type === "error" ? "bg-red-600" : "bg-emerald-600"}`}>
          {i.message}
        </div>
      ))}
    </div>
  );
}

export function useErrorText() {
  const { lang, t } = useI18n();
  const idx = lang === "fa" ? 0 : lang === "ps" ? 1 : 2;
  return (code?: string) => (code && ERROR_MESSAGES[code] ? ERROR_MESSAGES[code][idx] : t("error"));
}

/* ---------------- Buttons ---------------- */
const VARIANTS: Record<string, string> = {
  primary: "bg-emerald-700 hover:bg-emerald-800 text-white",
  secondary: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300",
  danger: "bg-red-600 hover:bg-red-700 text-white",
  ghost: "text-slate-600 hover:bg-slate-100",
  warning: "bg-amber-500 hover:bg-amber-600 text-white",
};
export function btnClass(variant = "primary", size: "sm" | "md" = "md") {
  return `inline-flex items-center justify-center gap-1 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${size === "sm" ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm"} ${VARIANTS[variant] ?? VARIANTS.primary}`;
}

export function ActionButton({
  action,
  args = [],
  label,
  confirm,
  prompt,
  variant = "secondary",
  size = "sm",
  className = "",
  successMessage,
}: {
  action: (...a: never[]) => Promise<ActionResult>;
  args?: unknown[];
  label: ReactNode;
  confirm?: string;
  prompt?: string;
  variant?: string;
  size?: "sm" | "md";
  className?: string;
  successMessage?: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { t } = useI18n();
  const errText = useErrorText();
  return (
    <button
      type="button"
      disabled={pending}
      className={`${btnClass(variant, size)} ${className}`}
      onClick={() => {
        let extra: string | null | undefined;
        if (prompt) {
          extra = window.prompt(prompt);
          if (extra === null) return;
        }
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          const r = await (action as (...a: unknown[]) => Promise<ActionResult>)(...args, ...(prompt ? [extra] : []));
          if (r.ok) {
            toast("success", successMessage ?? t("success"));
            router.refresh();
          } else toast("error", r.message ? `${errText(r.error)}: ${r.message}` : errText(r.error));
        });
      }}
    >
      {pending ? "…" : label}
    </button>
  );
}

/* ---------------- Jalali date input ---------------- */
export function DateInput({ name, defaultValue, required, className = "" }: { name: string; defaultValue?: string | null; required?: boolean; className?: string }) {
  const { lang, dateFormat, t } = useI18n();
  const fallback = todayIso();
  const candidate = String(defaultValue ?? "").replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))) || (required ? fallback : "");
  const isValidIsoDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    if (year < 1 || month < 1 || month > 12 || day < 1) return false;
    return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
  };
  const init = candidate === "" ? "" : (isValidIsoDate(candidate) ? candidate : fallback);
  const base = init || fallback;
  const g = base.split("-").map((x) => parseInt(x, 10));
  const j0 = toJalali(g[0], g[1], g[2]);
  const [jy, setJy] = useState(j0.jy);
  const [jm, setJm] = useState(j0.jm);
  const [jd, setJd] = useState(j0.jd);
  const [empty, setEmpty] = useState(!init);
  if (dateFormat === "gregorian") {
    return <input type="date" name={name} defaultValue={init} required={required} className={`input ${className}`} />;
  }
  const dmax = jalaliMonthLength(jy, jm);
  const dd = Math.min(jd, dmax);
  const gg = toGregorian(jy, jm, dd);
  const iso = `${gg.gy}-${String(gg.gm).padStart(2, "0")}-${String(gg.gd).padStart(2, "0")}`;
  const isoDate = new Date(iso + "T00:00:00");
  const validIso = /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(isoDate.getTime()) &&
    isoDate.getFullYear() === gg.gy && isoDate.getMonth() + 1 === gg.gm && isoDate.getDate() === gg.gd;
  const years = Array.from({ length: 21 }, (_, i) => j0.jy - 10 + i);
  const months = JALALI_MONTHS[lang];
  return (
    <div className={`flex items-center gap-1 ${className}`} dir="ltr">
      <input type="hidden" name={name} value={empty ? "" : (validIso ? iso : fallback)} required={required} />
      <select className="input !w-16 px-1" value={dd} disabled={empty} onChange={(e) => setJd(+e.target.value)}>
        {Array.from({ length: dmax }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
      <select className="input flex-1 px-1" value={jm} disabled={empty} onChange={(e) => setJm(+e.target.value)}>
        {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </select>
      <select className="input !w-20 px-1" value={jy} disabled={empty} onChange={(e) => setJy(+e.target.value)}>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      {!required && <button type="button" onClick={() => setEmpty((v) => !v)} className="shrink-0 rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">{empty ? t("select") : t("close")}</button>}
    </div>
  );
}

/* ---------------- Config-driven form dialog ---------------- */
export interface Field {
  name: string;
  label: string;
  type?: "text" | "number" | "select" | "date" | "textarea" | "checkbox" | "email" | "password" | "file";
  options?: { value: string; label: string }[];
  required?: boolean;
  defaultValue?: string | number | boolean | null;
  placeholder?: string;
  step?: string;
  help?: string;
  showIf?: { field: string; values: string[] };
  full?: boolean;
  readOnly?: boolean;
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:p-6 print:hidden" onClick={onClose}>
      <div className={`w-full ${wide ? "max-w-4xl" : "max-w-xl"} rounded-xl bg-white shadow-2xl my-4`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function FormDialog({
  title,
  triggerLabel,
  triggerVariant = "primary",
  triggerSize = "md",
  action,
  fields,
  hidden = {},
  submitLabel,
  secondarySubmit,
  children,
  wide,
  note,
  successPath,
}: {
  title: string;
  triggerLabel: ReactNode;
  triggerVariant?: string;
  triggerSize?: "sm" | "md";
  action: (fd: FormData) => Promise<ActionResult>;
  fields: Field[];
  hidden?: Record<string, string | null | undefined>;
  submitLabel?: string;
  secondarySubmit?: { label: string; name: string; value: string; variant?: string };
  children?: ReactNode;
  wide?: boolean;
  note?: string;
  /** e.g. "/documents/{id}" — navigates after success with the created id */
  successPath?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [values, setValues] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const { t } = useI18n();
  const errText = useErrorText();
  const initial = useMemo(() => {
    const v: Record<string, string> = {};
    for (const f of fields) v[f.name] = f.defaultValue == null ? "" : String(f.defaultValue);
    return v;
  }, [fields]);
  const cur = (n: string) => values[n] ?? initial[n] ?? "";
  const visible = (f: Field) => !f.showIf || f.showIf.values.includes(cur(f.showIf.field));

  const submit = (extra?: { name: string; value: string }) => {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return;
    const fd = new FormData(form);
    if (extra) fd.set(extra.name, extra.value);
    start(async () => {
      const r = await action(fd);
      if (r.ok) {
        toast("success", t("success"));
        setOpen(false);
        setValues({});
        const target = successPath && r.id ? successPath.replace("{id}", r.id) : undefined;
        if (target) router.push(target);
        else router.refresh();
      } else toast("error", errText(r.error));
    });
  };

  return (
    <>
      <button type="button" className={btnClass(triggerVariant, triggerSize)} onClick={() => setOpen(true)}>
        {triggerLabel}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} wide={wide}>
        {note && <p className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">{note}</p>}
        <form ref={formRef} onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-3">
          {Object.entries(hidden).map(([k, v]) => v != null && <input key={k} type="hidden" name={k} value={v} />)}
          <div className={`grid gap-3 ${wide ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            {fields.filter(visible).map((f) => (
              <label key={f.name} className={`block text-sm ${f.full || f.type === "textarea" ? "sm:col-span-full" : ""}`}>
                <span className="mb-1 block text-slate-600">{f.label}{f.required && <span className="text-red-500"> *</span>}</span>
                {f.type === "select" ? (
                  <select name={f.name} required={f.required} className="input" value={cur(f.name)} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} disabled={f.readOnly}>
                    {!f.required && <option value="">{t("select")}</option>}
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea name={f.name} required={f.required} defaultValue={initial[f.name]} rows={3} className="input" placeholder={f.placeholder} />
                ) : f.type === "date" ? (
                  <DateInput name={f.name} defaultValue={initial[f.name] || undefined} required={f.required} />
                ) : f.type === "checkbox" ? (
                  <input type="checkbox" name={f.name} defaultChecked={f.defaultValue === true || f.defaultValue === "on"} className="h-5 w-5 accent-emerald-700" />
                ) : f.type === "file" ? (
                  <input type="file" name={f.name} required={f.required} className="input" />
                ) : (
                  <input
                    type={f.type ?? "text"}
                    name={f.name}
                    required={f.required}
                    step={f.step ?? (f.type === "number" ? "0.01" : undefined)}
                    min={f.type === "number" ? "0" : undefined}
                    defaultValue={initial[f.name]}
                    placeholder={f.placeholder}
                    readOnly={f.readOnly}
                    className="input"
                    dir={f.type === "number" || f.type === "email" ? "ltr" : undefined}
                    onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  />
                )}
                {f.help && <span className="mt-1 block text-xs text-slate-400">{f.help}</span>}
              </label>
            ))}
          </div>
          {children}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button type="button" className={btnClass("secondary")} onClick={() => setOpen(false)}>{t("cancel")}</button>
            {secondarySubmit && (
              <button type="button" disabled={pending} className={btnClass(secondarySubmit.variant ?? "warning")} onClick={() => submit({ name: secondarySubmit.name, value: secondarySubmit.value })}>
                {secondarySubmit.label}
              </button>
            )}
            <button type="submit" disabled={pending} className={btnClass("primary")}>{pending ? "…" : submitLabel ?? t("save")}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* ---------------- Journal entry line editor ---------------- */
export function JournalLines({ accounts, initial }: { accounts: { id: string; label: string }[]; initial?: { accountId: string; debit: number; credit: number; description: string | null }[] }) {
  const { t } = useI18n();
  const [lines, setLines] = useState(initial?.length ? initial : [{ accountId: "", debit: 0, credit: 0, description: "" }, { accountId: "", debit: 0, credit: 0, description: "" }]);
  const td = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const tc = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = Math.abs(td - tc) < 0.005 && td > 0;
  const upd = (i: number, k: string, v: string) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500 text-xs">
              <th className="text-start p-1">{t("account")}</th>
              <th className="text-start p-1">{t("description")}</th>
              <th className="p-1 w-32">{t("debit")}</th>
              <th className="p-1 w-32">{t("creditCol")}</th>
              <th className="p-1 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td className="p-1">
                  <select name="line_account" className="input" value={l.accountId} onChange={(e) => upd(i, "accountId", e.target.value)} required>
                    <option value="">{t("select")}</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                </td>
                <td className="p-1"><input name="line_desc" className="input" value={l.description ?? ""} onChange={(e) => upd(i, "description", e.target.value)} /></td>
                <td className="p-1"><input name="line_debit" type="number" step="0.01" min="0" dir="ltr" className="input" value={l.debit} onChange={(e) => upd(i, "debit", e.target.value)} /></td>
                <td className="p-1"><input name="line_credit" type="number" step="0.01" min="0" dir="ltr" className="input" value={l.credit} onChange={(e) => upd(i, "credit", e.target.value)} /></td>
                <td className="p-1"><button type="button" className="text-red-500" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button type="button" className={btnClass("secondary", "sm")} onClick={() => setLines((ls) => [...ls, { accountId: "", debit: 0, credit: 0, description: "" }])}>+ {t("addLine")}</button>
        <div className={`font-mono ${balanced ? "text-emerald-700" : "text-red-600"}`} dir="ltr">
          {t("totalDebit")}: {td.toFixed(2)} | {t("totalCredit")}: {tc.toFixed(2)}
        </div>
      </div>
      {!balanced && <p className="text-xs text-red-600">{t("unbalanced")}</p>}
    </div>
  );
}

/* ---------------- Misc client helpers ---------------- */
export function PrintButton({ label, audit }: { label: string; audit?: { entityType: string; entityId?: string | null } }) {
  const [pending, start] = useTransition();
  const errText = useErrorText();
  return (
    <button type="button" disabled={pending} className={btnClass("secondary", "sm")} onClick={() => {
      if (!audit) { window.print(); return; }
      start(async () => {
        const result = await recordPrintAction(audit.entityType, audit.entityId ?? null);
        if (!result.ok) { toast("error", errText(result.error)); return; }
        window.print();
      });
    }}>{pending ? "…" : label}</button>
  );
}

export function SearchBox({ placeholder, defaultValue }: { placeholder: string; defaultValue?: string }) {
  return (
    <form method="get" className="flex gap-2">
      <input name="q" defaultValue={defaultValue} placeholder={placeholder} className="input max-w-xs" />
      <button className={btnClass("secondary")}>🔍</button>
    </form>
  );
}
