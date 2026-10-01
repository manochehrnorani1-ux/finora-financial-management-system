import Link from "next/link";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { customers, taxSettlements, taxTypes } from "@/db/schema";
import { pageContext, sp1, type SP } from "@/lib/page";
import { Badge, Card, Money, PageHeader, Stat, Table } from "@/components/ui";
import { TaxNav } from "@/components/TaxNav";
import { formatDate } from "@/lib/jalali";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "اظهارنامه‌های مالیاتی",
};

const SKEY: Record<string, string> = { calculated: "calculated", approved: "approved", part_paid: "part_paid", paid: "paid", REQUIRES_LEGAL_REVIEW: "requiresLegalReview" };

export default async function TaxReturnsPage({ searchParams }: { searchParams: SP }) {
  const { ctx, t, fmt } = await pageContext("tax_settlements.read");
  const q = await searchParams;
  const search = sp1(q.q) ?? "";
  const status = sp1(q.status) ?? "";
  const where = [eq(taxSettlements.organizationId, ctx.org.id)];
  if (status) where.push(eq(taxSettlements.status, status));
  if (search) where.push(or(ilike(taxSettlements.settlementNumber, `%${search}%`), ilike(customers.name, `%${search}%`), ilike(customers.tin, `%${search}%`))!);
  const rows = await db
    .select({ s: taxSettlements, customer: customers.name, code: customers.customerCode, tin: customers.tin, tax: taxTypes.code })
    .from(taxSettlements)
    .innerJoin(customers, eq(taxSettlements.customerId, customers.id))
    .leftJoin(taxTypes, eq(taxSettlements.taxTypeId, taxTypes.id))
    .where(and(...where))
    .orderBy(desc(taxSettlements.createdAt))
    .limit(300);

  const printable = rows.filter((r) => ["approved", "part_paid", "paid"].includes(r.s.status)).length;
  const cur = ctx.org.currency;

  return (
    <>
      <PageHeader title={t("taxReturns")} subtitle={`${rows.length} ${t("records")} · ${printable} ${t("approved")}`} actions={
        <form method="get" className="flex flex-wrap gap-2">
          <input name="q" defaultValue={search} placeholder={`${t("search")} (${t("settlementNumber")} / ${t("tin")})`} className="input max-w-56" />
          <select name="status" defaultValue={status} className="input !w-auto">
            <option value="">{t("all")}</option>
            {Object.entries(SKEY).map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}
          </select>
          <button className="rounded-lg border border-slate-300 bg-white px-3 text-sm">{t("filter")}</button>
        </form>
      } />
      <TaxNav active="returns" t={t} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("taxReturns")} value={rows.length} tone="blue" />
        <Stat label={t("approved")} value={printable} tone="green" />
        <Stat label={t("requiresLegalReview")} value={rows.filter((r) => r.s.status === "REQUIRES_LEGAL_REVIEW").length} tone="amber" />
        <Stat label={t("remainingAmount")} value={<Money value={rows.reduce((sum, r) => sum + Number(r.s.remainingAmount ?? 0), 0)} currency={cur} />} tone="red" />
      </div>
      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs leading-6 text-blue-900">{t("returnDisclaimer")}</div>
      <Card>
        <Table
          headers={[t("returnNumber"), t("customer"), t("tin"), t("taxType"), t("taxPeriod"), t("taxableAmount"), t("taxAmount"), t("remainingAmount"), t("status"), t("actions")]}
          empty={t("noReturns")}
          rows={rows.map(({ s, customer, code, tin, tax }) => [
            <Link key="n" href={`/tax-settlements/${s.id}`} className="font-mono text-xs font-semibold text-emerald-700">{s.settlementNumber}</Link>,
            `${code} · ${customer}`,
            <span key="t" dir="ltr" className="font-mono text-xs">{tin ?? "—"}</span>,
            tax ?? "-",
            `${formatDate(s.periodStart, fmt)} — ${formatDate(s.periodEnd, fmt)}`,
            <Money key="b" value={s.taxableAmount} currency={cur} />,
            s.taxAmount === null ? "—" : <Money key="a" value={s.taxAmount} currency={cur} />,
            s.remainingAmount === null ? "—" : <Money key="r" value={s.remainingAmount} currency={cur} />,
            <Badge key="s" status={s.status === "paid" || s.status === "approved" ? "approved" : s.status === "REQUIRES_LEGAL_REVIEW" ? "pending_approval" : "draft"} label={t(SKEY[s.status] ?? s.status)} />,
            <div key="x" className="flex gap-1">
              <Link href={`/tax-settlements/${s.id}/return`} className="rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-800">🖨 {t("printReturn")}</Link>
              <Link href={`/tax-settlements/${s.id}`} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs">{t("details")}</Link>
            </div>,
          ])}
        />
      </Card>
    </>
  );
}
