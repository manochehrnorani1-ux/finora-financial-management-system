import type { ReactNode } from "react";
import { fmtMoney, STATUS_COLORS } from "@/lib/format";

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 print:hidden">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className = "", actions }: { title?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold text-slate-700">{title}</h2>
          {actions && <div className="flex flex-wrap gap-2 print:hidden">{actions}</div>}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, sub, tone = "default" }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: "default" | "green" | "red" | "blue" | "amber" }) {
  const tones = {
    default: "from-slate-50 to-white border-slate-200",
    green: "from-emerald-50 to-white border-emerald-200",
    red: "from-red-50 to-white border-red-200",
    blue: "from-sky-50 to-white border-sky-200",
    amber: "from-amber-50 to-white border-amber-200",
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-b p-4 ${tones[tone]}`}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg sm:text-xl font-bold text-slate-800 font-mono" dir="ltr">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function Badge({ status, label }: { status: string; label?: string }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600"}`}>{label ?? status}</span>;
}

export function Money({ value, currency, colored }: { value: number | string | null | undefined; currency?: string; colored?: boolean }) {
  const n = Number(value ?? 0);
  return (
    <span className={`font-mono whitespace-nowrap ${colored ? (n < 0 ? "text-red-600" : n > 0 ? "text-emerald-700" : "") : ""}`} dir="ltr">
      {fmtMoney(n, currency)}
    </span>
  );
}

export function Table({ headers, rows, empty, footer }: { headers: ReactNode[]; rows: ReactNode[][]; empty: string; footer?: ReactNode[] }) {
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-start font-semibold whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-3 py-10 text-center text-slate-400">{empty}</td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-slate-50/70">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 align-middle">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && (
          <tfoot>
            <tr className="bg-slate-50 font-semibold">
              {footer.map((c, i) => (
                <td key={i} className="px-3 py-2">{c}</td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export function Tabs({ items, active }: { items: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <nav className="mb-4 flex flex-wrap gap-1 border-b border-slate-200 print:hidden">
      {items.map((i) => (
        <a key={i.key} href={i.href} className={`px-3 py-2 text-sm rounded-t-lg border-b-2 -mb-px ${active === i.key ? "border-emerald-700 text-emerald-800 font-semibold bg-emerald-50/50" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
          {i.label}
        </a>
      ))}
    </nav>
  );
}

export function KV({ items }: { items: [ReactNode, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
      {items.map(([k, v], i) => (
        <div key={i} className="flex justify-between gap-3 border-b border-dashed border-slate-100 py-1">
          <dt className="text-slate-500">{k}</dt>
          <dd className="font-medium text-slate-800 text-end">{v ?? "-"}</dd>
        </div>
      ))}
    </dl>
  );
}
