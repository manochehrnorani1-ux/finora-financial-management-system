export function fmtMoney(n: number | string | null | undefined, currency?: string) {
  const v = Number(n ?? 0);
  const s = v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${s} ${currency}` : s;
}

export function num(v: FormDataEntryValue | null | undefined, fallback = 0) {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(String(v).replace(/,/g, "").replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))));
  return isNaN(n) ? fallback : n;
}

export function str(v: FormDataEntryValue | null | undefined) {
  const s = v === null || v === undefined ? "" : String(v).trim();
  return s;
}

export function optStr(v: FormDataEntryValue | null | undefined) {
  const s = str(v);
  return s === "" ? null : s;
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export const CURRENCIES = ["AFN", "USD", "EUR", "PKR", "IRR", "INR", "GBP", "SAR", "AED", "TRY", "CNY"];

export const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  pending_approval: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  finalized: "bg-emerald-100 text-emerald-700",
  posted: "bg-emerald-100 text-emerald-700",
  completed: "bg-teal-100 text-teal-700",
  active: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-red-100 text-red-700",
  reversed: "bg-purple-100 text-purple-700",
  archived: "bg-gray-200 text-gray-700",
  inactive: "bg-gray-200 text-gray-600",
  expired: "bg-gray-200 text-gray-600",
  recorded: "bg-blue-100 text-blue-700",
  in: "bg-emerald-100 text-emerald-700",
  out: "bg-red-100 text-red-700",
};

export const DOC_TYPES = ["letter", "application", "certificate", "license", "other"];
export const DOC_STATUSES = ["draft", "submitted", "under_review", "approved", "rejected", "completed", "cancelled", "archived"];
export const EXPENSE_CATEGORIES = ["administrative", "rent", "salaries", "utilities", "transport", "supplies", "other"];
