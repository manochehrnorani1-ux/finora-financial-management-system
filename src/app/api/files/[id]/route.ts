import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attachments } from "@/db/schema";
import { getContext } from "@/lib/auth";
import { audit } from "@/lib/finance";

export const dynamic = "force-dynamic";

/** Secure file access: only members of the owning organization can download. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx || !ctx.can("documents.read")) return new Response("Forbidden", { status: 403 });
  const [f] = await db.select().from(attachments).where(and(eq(attachments.id, id), eq(attachments.organizationId, ctx.org.id)));
  if (!f) return new Response("Not found", { status: 404 });
  await audit(db, { orgId: ctx.org.id, userId: ctx.user.id, action: "DOWNLOAD", entityType: "attachment", entityId: f.id, newData: { fileName: f.fileName, fileSize: f.fileSize } });
  return new Response(Buffer.from(f.content, "base64"), {
    headers: { "Content-Type": f.mimeType, "Content-Disposition": `inline; filename="${encodeURIComponent(f.fileName)}"`, "Content-Length": String(f.fileSize) },
  });
}
