import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attachments, publicSites } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db
    .select({ mimeType: attachments.mimeType, fileName: attachments.fileName, fileSize: attachments.fileSize, content: attachments.content })
    .from(attachments)
    .innerJoin(publicSites, eq(publicSites.organizationId, attachments.organizationId))
    .where(and(eq(attachments.id, id), eq(publicSites.isPublished, true)));

  if (!row || !row.mimeType.startsWith("image/")) return new Response("Not found", { status: 404 });

  return new Response(Buffer.from(row.content, "base64"), {
    headers: {
      "Content-Type": row.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(row.fileName)}"`,
      "Content-Length": String(row.fileSize),
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
    },
  });
}
