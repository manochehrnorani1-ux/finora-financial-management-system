import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { backups, profiles } from "@/db/schema";
import { pageContext } from "@/lib/page";
import { createBackupAction, deleteBackupAction, restoreBackupAction, restoreFromFileAction } from "@/actions/admin";
import { Card, PageHeader, Table } from "@/components/ui";
import { ActionButton, FormDialog } from "@/components/forms";
import type { Metadata } from "next";
import { formatDateTime } from "@/lib/jalali";
import { canAccessSystemManagement } from "@/lib/permissions";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "پشتیبان‌گیری و بازیابی اطلاعات",
};

export default async function BackupPage() {
  const { ctx, t, fmt } = await pageContext("backup.manage");
  if (!canAccessSystemManagement(ctx.roleKey, ctx.perms)) redirect("/forbidden");
  const rows = await db.select({ b: { id: backups.id, fileName: backups.fileName, sizeBytes: backups.sizeBytes, tableCounts: backups.tableCounts, createdAt: backups.createdAt }, user: profiles.fullName }).from(backups).leftJoin(profiles, eq(backups.createdBy, profiles.id)).where(eq(backups.organizationId, ctx.org.id)).orderBy(desc(backups.createdAt));
  return (
    <>
      <PageHeader title={t("backupRestore")} subtitle={ctx.org.name} actions={<>
        <ActionButton action={createBackupAction} label={`+ ${t("createBackup")}`} variant="primary" size="md" />
        <FormDialog title={t("restoreFromFile")} triggerLabel={t("restoreFromFile")} triggerVariant="warning" action={restoreFromFileAction} note={t("restoreWarning")} fields={[{ name: "file", label: t("files"), type: "file", required: true, full: true }]} submitLabel={t("restore")} />
      </>} />
      <Card title={t("backupHistory")}>
        <p className="mb-3 text-xs text-slate-500">{t("restoreWarning")}</p>
        <Table headers={[t("date"), t("name"), t("size"), t("records"), t("user"), t("actions")]} empty={t("noData")}
          rows={rows.map(({ b, user }) => [
            formatDateTime(b.createdAt, fmt),
            <span key="n" className="font-mono text-xs" dir="ltr">{b.fileName}</span>,
            <span key="s" dir="ltr">{(b.sizeBytes / 1024).toFixed(1)} KB</span>,
            <details key="c" className="text-xs"><summary className="cursor-pointer text-slate-500">{Object.values(b.tableCounts as Record<string, number>).reduce((a, x) => a + x, 0)}</summary><pre className="mt-1 bg-slate-50 rounded p-2" dir="ltr">{JSON.stringify(b.tableCounts, null, 1)}</pre></details>,
            user ?? "-",
            <div key="a" className="flex gap-1">
              <a href={`/api/backups/${b.id}`} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs bg-white">{t("download")}</a>
              <ActionButton action={restoreBackupAction} args={[b.id]} label={t("restore")} variant="warning" confirm={t("restoreWarning")} />
              <ActionButton action={deleteBackupAction} args={[b.id]} label={t("delete")} variant="danger" confirm={t("confirmDelete")} />
            </div>,
          ])} />
      </Card>
    </>
  );
}
