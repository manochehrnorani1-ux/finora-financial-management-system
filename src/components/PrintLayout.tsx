"use client";

import type { ReactNode } from "react";

type Org = {
  name: string;
  legalName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  licenseNumber?: string | null;
  taxNumber?: string | null;
  logoUrl?: string | null;
  currency: string;
  fiscalYearStartMonth: number;
};

type Props = {
  org: Org;
  title: string;
  reportNumber: string;
  period?: string;
  language?: "fa" | "ps" | "en";
  landscape?: boolean;
  children: ReactNode;
  summary?: ReactNode;
};

export function PrintLayout({ org, title, reportNumber, period, language = "fa", landscape = false, children, summary }: Props) {
  const rtl = language !== "en";
  const printDate = new Intl.DateTimeFormat(language === "en" ? "en-AF" : language === "ps" ? "ps-AF" : "fa-AF", {
    dateStyle: "medium",
  }).format(new Date());
  return (
    <main className={landscape ? "finora-print finora-print-landscape" : "finora-print"} dir={rtl ? "rtl" : "ltr"} lang={language}>
      <div className="finora-print-actions print:hidden">
        <a href="/reports" className="finora-print-btn">بازگشت</a>
        <button type="button" className="finora-print-btn finora-print-primary" onClick={() => window.print()}>چاپ گزارش / ذخیره PDF</button>
      </div>

      <header className="finora-print-header">
        <div className="finora-print-brand">
          {org.logoUrl ? <img src={org.logoUrl} alt={org.name} className="finora-print-logo" /> : <div className="finora-print-logo-placeholder" aria-hidden="true" />}
          <div>
            <div className="finora-print-state">امارت اسلامی افغانستان</div>
            <div className="finora-print-company">{org.legalName || org.name}</div>
            <div className="finora-print-subtitle">{title}</div>
          </div>
        </div>
        <div className="finora-print-company-meta">
          <div>{org.address || "—"}</div>
          <div>{org.phone || "—"}{org.email ? ` · ${org.email}` : ""}</div>
        </div>
      </header>

      <section className="finora-print-meta-grid">
        <div><span>شماره گزارش</span><strong dir="ltr">{reportNumber}</strong></div>
        <div><span>تاریخ صدور</span><strong>{printDate}</strong></div>
        <div><span>دوره گزارش</span><strong>{period || "—"}</strong></div>
        <div><span>سال مالی</span><strong>{org.fiscalYearStartMonth ? `شروع ماه ${org.fiscalYearStartMonth}` : "—"}</strong></div>
        <div><span>TIN</span><strong dir="ltr">{org.taxNumber || "—"}</strong></div>
        <div><span>جواز DAB</span><strong dir="ltr">{org.licenseNumber || "—"}</strong></div>
        <div><span>شرکت</span><strong>{org.name}</strong></div>
        <div><span>ارز مبنا</span><strong dir="ltr">{org.currency}</strong></div>
      </section>

      {summary && <section className="finora-print-summary">{summary}</section>}

      <section className="finora-print-body">{children}</section>

      <section className="finora-print-signatures">
        <div><span>مدیرعامل / مسئول مجاز</span><div>____________________________</div></div>
        <div><span>مسئول مالی</span><div>____________________________</div></div>
        <div><span>مهر و امضاء</span><div>____________________________</div></div>
      </section>

      <footer className="finora-print-footer">
        <span>{org.name} · TIN: {org.taxNumber || "—"}</span>
        <span>Report: {reportNumber} · Print: {printDate}</span>
        <span className="finora-page-number" />
      </footer>
    </main>
  );
}

export function PrintTable({ headers, rows, footer }: { headers: string[]; rows: ReactNode[][]; footer?: ReactNode[] }) {
  return (
    <div className="finora-print-table-wrap">
      <table className="finora-print-table">
        <thead><tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={headers.length} className="finora-empty">داده‌ای برای این گزارش وجود ندارد.</td></tr> :
            rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}
        </tbody>
        {footer && <tfoot><tr>{footer.map((cell, i) => <td key={i}>{cell}</td>)}</tr></tfoot>}
      </table>
    </div>
  );
}

export function PrintMoney({ value, currency = "AFN" }: { value: number | string | null | undefined; currency?: string }) {
  return <span dir="ltr" className="finora-number">{Number(value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</span>;
}
