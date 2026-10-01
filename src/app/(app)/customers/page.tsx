import Link from "next/link";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { pageContext, sp1, type SP } from "@/lib/page";
import { saveCustomer, deleteCustomer } from "@/actions/master";
import { Badge, Card, PageHeader, Table } from "@/components/ui";
import { ActionButton, FormDialog, SearchBox, type Field } from "@/components/forms";
import type { Metadata } from "next";
import { formatDate } from "@/lib/jalali";

export const metadata: Metadata = {
  title: "مدیریت مشتریان",
};

export default async function CustomersPage({ searchParams }: { searchParams: SP }) {
  const { ctx, t, fmt } = await pageContext("customers.read");
  const q = sp1((await searchParams).q) ?? "";
  const where = q
    ? and(eq(customers.organizationId, ctx.org.id), or(ilike(customers.name, `%${q}%`), ilike(customers.customerCode, `%${q}%`), ilike(customers.phone, `%${q}%`), ilike(customers.nationalId, `%${q}%`)))
    : eq(customers.organizationId, ctx.org.id);
  const rows = await db.select().from(customers).where(where).orderBy(desc(customers.createdAt)).limit(300);
  const fields = (c?: typeof customers.$inferSelect): Field[] => [
    { name: "name", label: t("name"), required: true, defaultValue: c?.name },
    { name: "englishName", label: "نام شرکت به انگلیسی", defaultValue: c?.englishName },
    { name: "tradeName", label: "نام تجارتی", defaultValue: c?.tradeName },
    { name: "tradeNameEn", label: "نام تجارتی به انگلیسی", defaultValue: c?.tradeNameEn },
    { name: "fatherName", label: t("fatherName"), defaultValue: c?.fatherName },
    { name: "customerCode", label: t("customerCode"), defaultValue: c?.customerCode, placeholder: "AUTO" },
    { name: "nationalId", label: t("nationalId"), defaultValue: c?.nationalId },
    { name: "customerType", label: t("customerType"), type: "select", required: true, defaultValue: c?.customerType ?? "individual", options: [{ value: "individual", label: t("individual") }, { value: "business", label: t("business") }] },
    { name: "tin", label: t("tin"), defaultValue: c?.tin },
    { name: "licenseNumber", label: t("licenseNumber"), defaultValue: c?.licenseNumber },
    { name: "activity", label: t("activity"), defaultValue: c?.activity },
    { name: "phone", label: t("phone"), defaultValue: c?.phone },
    { name: "email", label: t("email"), type: "email", defaultValue: c?.email },
    { name: "province", label: t("province"), defaultValue: c?.province },
    { name: "district", label: t("district"), defaultValue: c?.district },
    { name: "area", label: t("area"), defaultValue: c?.area },
    { name: "address", label: t("address"), defaultValue: c?.address, full: true },
    { name: "status", label: t("status"), type: "select", required: true, defaultValue: c?.status ?? "active", options: [{ value: "active", label: t("active") }, { value: "inactive", label: t("inactive") }, { value: "archived", label: t("archived") }] },
    { name: "notes", label: t("notes"), type: "textarea", defaultValue: c?.notes },
    { name: "logoFile", label: `${t("customerLogo")} (JPG/PNG — max 2MB)`, type: "file", full: true, help: c?.logoAttachmentId ? "لوگوی فعلی ثبت شده است؛ برای تغییر فایل جدید انتخاب کنید." : undefined },
  ];
  const canWrite = ctx.can("customers.write");
  return (
    <>
      <PageHeader title={t("customers")} subtitle={`${rows.length} ${t("records")}`} actions={<>
        <SearchBox placeholder={t("search")} defaultValue={q} />
        {canWrite && <FormDialog title={t("add")} triggerLabel={`+ ${t("add")}`} action={saveCustomer} fields={fields()} />}
      </>} />
      <Card>
        <Table
          headers={[t("customerCode"), t("name"), t("fatherName"), t("phone"), t("nationalId"), t("status"), t("createdAt"), t("actions")]}
          empty={t("noData")}
          rows={rows.map((c) => [
            <Link key="c" href={`/customer-accounts/${c.id}`} className="font-mono text-xs text-emerald-700">{c.customerCode}</Link>,
            <span key="n" className="font-medium">{c.name}{c.isDemo && <span className="ms-1 text-[10px] text-amber-600">({t("demoBadge")})</span>}</span>,
            c.fatherName ?? "-",
            <span key="p" dir="ltr">{c.phone ?? "-"}</span>,
            c.nationalId ?? "-",
            <Badge key="s" status={c.status} label={t(c.status)} />,
            formatDate(c.createdAt, fmt),
            <div key="a" className="flex gap-1">
              <Link href={`/customer-accounts/${c.id}`} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50">{t("ledger")}</Link>
              <Link href={`/customers/${c.id}/business-profile`} className="rounded-lg border border-emerald-300 px-2.5 py-1 text-xs text-emerald-700 hover:bg-emerald-50">معلومات تجارتی</Link>
              {canWrite && <FormDialog title={t("edit")} triggerLabel={t("edit")} triggerVariant="secondary" triggerSize="sm" action={saveCustomer} fields={fields(c)} hidden={{ id: c.id }} />}
              {ctx.can("customers.delete") && <ActionButton action={deleteCustomer} args={[c.id]} label={t("archive")} variant="warning" confirm={t("confirmDelete")} />}
            </div>,
          ])}
        />
      </Card>
    </>
  );
}
