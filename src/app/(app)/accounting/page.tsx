import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, journalEntries, journalEntryLines, profiles } from "@/db/schema";
import { pageContext, sp1, type SP } from "@/lib/page";
import { trialBalance } from "@/lib/reports";
import { saveAccount, saveJournalEntry, postJournalAction, reverseJournalAction, deleteJournalAction } from "@/actions/finance";
import { Badge, Card, Money, PageHeader, Table, Tabs } from "@/components/ui";
import { ActionButton, FormDialog, JournalLines, type Field } from "@/components/forms";
import type { Metadata } from "next";
import { formatDate } from "@/lib/jalali";

export const metadata: Metadata = {
  title: "حسابداری و اسناد ژورنال",
};

export default async function AccountingPage({ searchParams }: { searchParams: SP }) {
  const { ctx, t, fmt } = await pageContext("accounting.read");
  const q = await searchParams;
  const tab = sp1(q.tab) ?? (sp1(q.entry) ? "journal" : "journal");
  const entryId = sp1(q.entry);
  const accts = await db.select().from(accounts).where(eq(accounts.organizationId, ctx.org.id)).orderBy(accounts.accountCode);
  const acctOptions = accts.filter((a) => !accts.some((c) => c.parentId === a.id)).map((a) => ({ id: a.id, label: `${a.accountCode} ${a.accountName}` }));
  const canWrite = ctx.can("accounting.write");
  const canPost = ctx.can("accounting.post");
  const tabs = [
    { key: "journal", href: "/accounting?tab=journal", label: t("journalEntries") },
    { key: "accounts", href: "/accounting?tab=accounts", label: t("chartOfAccounts") },
    { key: "trial", href: "/accounting?tab=trial", label: t("trialBalance") },
  ];

  let body;
  if (tab === "accounts") {
    const types = ["asset", "liability", "equity", "income", "expense"];
    const fields = (a?: typeof accounts.$inferSelect): Field[] => [
      { name: "accountCode", label: t("accountCode"), required: true, defaultValue: a?.accountCode },
      { name: "accountName", label: t("accountName2"), required: true, defaultValue: a?.accountName },
      { name: "accountType", label: t("accountType"), type: "select", required: true, defaultValue: a?.accountType ?? "asset", options: types.map((x) => ({ value: x, label: t(x === "income" ? "incomeType" : x === "expense" ? "expenseType" : x) })) },
      { name: "parentId", label: t("parentAccount"), type: "select", defaultValue: a?.parentId, options: accts.filter((x) => x.id !== a?.id).map((x) => ({ value: x.id, label: `${x.accountCode} ${x.accountName}` })) },
      { name: "isActive", label: t("status"), type: "select", required: true, defaultValue: a ? String(a.isActive) : "true", options: [{ value: "true", label: t("active") }, { value: "false", label: t("inactive") }] },
    ];
    const depth = (a: typeof accounts.$inferSelect): number => (a.parentId ? 1 + depth(accts.find((x) => x.id === a.parentId)!) : 0);
    body = (
      <Card title={t("chartOfAccounts")} actions={canWrite && <FormDialog title={t("add")} triggerLabel={`+ ${t("add")}`} triggerSize="sm" action={saveAccount} fields={fields()} />}>
        <Table headers={[t("accountCode"), t("accountName2"), t("accountType"), t("status"), t("actions")]} empty={t("noData")}
          rows={accts.map((a) => [
            <span key="c" className="font-mono">{a.accountCode}</span>,
            <span key="n" style={{ paddingInlineStart: depth(a) * 16 }} className={depth(a) === 0 ? "font-bold" : ""}>{a.accountName}{a.systemKey && <span className="ms-1 text-[10px] text-slate-400">⚙</span>}</span>,
            t(a.accountType === "income" ? "incomeType" : a.accountType === "expense" ? "expenseType" : a.accountType),
            <Badge key="s" status={a.isActive ? "active" : "inactive"} label={t(a.isActive ? "active" : "inactive")} />,
            canWrite ? <FormDialog key="e" title={t("edit")} triggerLabel={t("edit")} triggerVariant="secondary" triggerSize="sm" action={saveAccount} fields={fields(a)} hidden={{ id: a.id }} /> : null,
          ])} />
      </Card>
    );
  } else if (tab === "trial") {
    const tb = await trialBalance(ctx.org.id, sp1(q.to));
    body = (
      <Card title={t("trialBalance")} actions={<form method="get" className="flex gap-2"><input type="hidden" name="tab" value="trial" /><input type="date" name="to" defaultValue={sp1(q.to)} className="input !w-auto" /><button className="rounded-lg bg-slate-800 text-white px-3 text-sm">{t("apply")}</button></form>}>
        <Table headers={[t("accountCode"), t("accountName2"), t("accountType"), t("debit"), t("creditCol"), t("balance")]} empty={t("noData")}
          rows={tb.list.filter((r) => r.debit || r.credit).map((r) => [<span key="c" className="font-mono">{r.code}</span>, r.name, t(r.type === "income" ? "incomeType" : r.type === "expense" ? "expenseType" : r.type), <Money key="d" value={r.debit} />, <Money key="cr" value={r.credit} />, <Money key="b" value={r.balance} colored />])}
          footer={[t("total"), "", "", <Money key="d" value={tb.totalDebit} />, <Money key="c" value={tb.totalCredit} />, <span key="ok" className={tb.totalDebit === tb.totalCredit ? "text-emerald-700" : "text-red-600"}>{tb.totalDebit === tb.totalCredit ? "✓" : "✗"}</span>]} />
        <p className="mt-3 text-xs text-slate-500">{t("accountingRule")}</p>
      </Card>
    );
  } else {
    const entries = await db.select({ e: journalEntries, user: profiles.fullName }).from(journalEntries).leftJoin(profiles, eq(journalEntries.createdBy, profiles.id)).where(eq(journalEntries.organizationId, ctx.org.id)).orderBy(desc(journalEntries.entryDate), desc(journalEntries.createdAt)).limit(200);
    const selected = entryId ? entries.find((x) => x.e.id === entryId)?.e ?? (await db.select().from(journalEntries).where(and(eq(journalEntries.id, entryId), eq(journalEntries.organizationId, ctx.org.id))))[0] : null;
    const lines = selected ? await db.select({ l: journalEntryLines, code: accounts.accountCode, name: accounts.accountName }).from(journalEntryLines).innerJoin(accounts, eq(journalEntryLines.accountId, accounts.id)).where(eq(journalEntryLines.journalEntryId, selected.id)) : [];
    const newEntry = canWrite && (
      <FormDialog title={t("create")} triggerLabel={`+ ${t("create")}`} triggerSize="sm" action={saveJournalEntry} wide
        fields={[{ name: "entryDate", label: t("entryDate"), type: "date", required: true }, { name: "description", label: t("description"), full: true }]}
        secondarySubmit={canPost ? { label: t("post"), name: "post", value: "1" } : undefined}>
        <JournalLines accounts={acctOptions} />
      </FormDialog>
    );
    body = (
      <div className="grid lg:grid-cols-5 gap-4">
        <Card title={t("journalEntries")} className="lg:col-span-3" actions={newEntry}>
          <Table headers={[t("entryNumber"), t("entryDate"), t("description"), t("reference"), t("status"), t("actions")]} empty={t("noData")}
            rows={entries.map(({ e }) => [
              <a key="n" href={`/accounting?tab=journal&entry=${e.id}`} className={`font-mono text-xs ${e.id === entryId ? "font-bold text-emerald-700" : "text-emerald-700"}`}>{e.entryNumber}</a>,
              formatDate(e.entryDate, fmt),
              <span key="d" className="line-clamp-1 max-w-[200px]">{e.description}</span>,
              <span key="r" className="text-xs text-slate-500">{e.referenceType ?? "-"}</span>,
              <Badge key="s" status={e.status} label={t(e.status)} />,
              <div key="a" className="flex gap-1">
                {e.status === "draft" && canPost && <ActionButton action={postJournalAction} args={[e.id]} label={t("post")} variant="primary" confirm={t("confirm") + "?"} />}
                {e.status === "draft" && canWrite && <ActionButton action={deleteJournalAction} args={[e.id]} label={t("delete")} variant="danger" confirm={t("confirmDelete")} />}
                {e.status === "posted" && ctx.can("accounting.reverse") && <ActionButton action={reverseJournalAction} args={[e.id]} label={t("reverse")} variant="warning" prompt={t("reason")} />}
              </div>,
            ])} />
        </Card>
        <Card title={selected ? `${selected.entryNumber} — ${t(selected.status)}` : t("details")} className="lg:col-span-2"
          actions={selected && selected.status === "draft" && canWrite && (
            <FormDialog title={t("edit")} triggerLabel={t("edit")} triggerSize="sm" triggerVariant="secondary" action={saveJournalEntry} wide hidden={{ id: selected.id }}
              fields={[{ name: "entryDate", label: t("entryDate"), type: "date", required: true, defaultValue: selected.entryDate }, { name: "description", label: t("description"), full: true, defaultValue: selected.description }]}
              secondarySubmit={canPost ? { label: t("post"), name: "post", value: "1" } : undefined}>
              <JournalLines accounts={acctOptions} initial={lines.map((l) => ({ accountId: l.l.accountId, debit: Number(l.l.debit), credit: Number(l.l.credit), description: l.l.description }))} />
            </FormDialog>
          )}>
          {!selected ? <p className="text-sm text-slate-400 text-center py-8">{t("select")}</p> : (
            <>
              <p className="text-sm text-slate-600 mb-2">{formatDate(selected.entryDate, fmt)} · {selected.description}</p>
              <Table headers={[t("account"), t("debit"), t("creditCol")]} empty={t("noData")}
                rows={lines.map((l) => [<span key="a" className="text-xs"><span className="font-mono">{l.code}</span> {l.name}</span>, <Money key="d" value={l.l.debit} />, <Money key="c" value={l.l.credit} />])}
                footer={[t("total"), <Money key="d" value={lines.reduce((s, l) => s + Number(l.l.debit), 0)} />, <Money key="c" value={lines.reduce((s, l) => s + Number(l.l.credit), 0)} />]} />
              {selected.status === "posted" && <p className="mt-2 text-xs text-slate-400">{t("cannotEditPosted")}</p>}
            </>
          )}
        </Card>
      </div>
    );
  }
  return (
    <>
      <PageHeader title={t("accounting")} subtitle={t("accountingRule")} />
      <Tabs items={tabs} active={tab} />
      {body}
    </>
  );
}
