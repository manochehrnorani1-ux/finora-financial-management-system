import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { backups } from "@/db/schema";
import { getContext } from "@/lib/auth";
import { audit } from "@/lib/finance";

export const dynamic = "force-dynamic";

/** Download a stored backup (admin only, org-scoped). Database credentials are never exposed. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx || !ctx.can("backup.manage")) return new Response("Forbidden", { status: 403 });
  const [b] = await db.select().from(backups).where(and(eq(backups.id, id), eq(backups.organizationId, ctx.org.id)));
  if (!b) return new Response("Not found", { status: 404 });
  await audit(db, { orgId: ctx.org.id, userId: ctx.user.id, action: "DOWNLOAD", entityType: "backup", entityId: b.id, newData: { fileName: b.fileName, sizeBytes: b.sizeBytes } });
  return new Response(JSON.stringify(b.data), { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${b.fileName}"` } });
}
