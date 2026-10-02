import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attachments } from "@/db/schema";
import { getContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Secure organization-logo access for authorized organization members. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx || !(ctx.can("settings.manage") || ctx.can("reports.read") || ctx.can("documents.read"))) {
    return new Response("Forbidden", { status: 403 });
  }

  const [file] = await db
    .select()
    .from(attachments)
    .where(and(eq(attachments.id, id), eq(attachments.organizationId, ctx.org.id)));

  if (!file || !file.mimeType.startsWith("image/")) return new Response("Not found", { status: 404 });

  return new Response(Buffer.from(file.content, "base64"), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.fileName)}"`,
      "Content-Length": String(file.fileSize),
      "Cache-Control": "private, max-age=300",
    },
  });
}
