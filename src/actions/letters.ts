"use server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attachments, cases, customers, letters } from "@/db/schema";
import { requireContext } from "@/lib/auth";
import { audit, FinanceError, nextNumber } from "@/lib/finance";
import { optStr, str } from "@/lib/format";
import { todayIso } from "@/lib/jalali";
import { act } from "./util";

function parseAttachmentIds(raw: string): string[] {
  const list = raw.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
  if (list.some((x) => !/^[0-9a-f-]{36}$/i.test(x))) throw new FinanceError("invalid_input");
  return [...new Set(list)];
}

export async function saveLetterAction(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("letters.write");
    const id = optStr(fd.get("id"));
    const customerId = optStr(fd.get("customerId"));
    const caseId = optStr(fd.get("caseId"));
    const attachmentIds = parseAttachmentIds(str(fd.get("attachmentIds")));
    const data = {
      officialNumber: optStr(fd.get("officialNumber")),
      caseId,
      customerId,
      language: ["fa", "ps", "en"].includes(str(fd.get("language"))) ? str(fd.get("language")) : "fa",
      letterDate: str(fd.get("letterDate")) || todayIso(),
      recipient: str(fd.get("recipient")),
      reference: optStr(fd.get("reference")),
      subject: str(fd.get("subject")),
      body: str(fd.get("body")),
      attachments: attachmentIds,
      signerName: optStr(fd.get("signerName")),
      signerTitle: optStr(fd.get("signerTitle")),
    };
    if (!data.recipient || !data.subject || !data.body) throw new FinanceError("invalid_input");
    return db.transaction(async (tx) => {
      if (caseId) {
        const [k] = await tx.select({ customerId: cases.customerId }).from(cases).where(and(eq(cases.id, caseId), eq(cases.organizationId, ctx.org.id)));
        if (!k || (customerId && customerId !== k.customerId)) throw new FinanceError("invalid_input");
        data.customerId = k.customerId;
      }
      if (customerId) {
        const [c] = await tx.select({ id: customers.id }).from(customers).where(and(eq(customers.id, customerId), eq(customers.organizationId, ctx.org.id)));
        if (!c) throw new FinanceError("customer_not_found");
      }
      if (attachmentIds.length) {
        const rows = await tx.select({ id: attachments.id }).from(attachments).where(and(eq(attachments.organizationId, ctx.org.id)));
        const owned = new Set(rows.map((r) => r.id));
        if (attachmentIds.some((x) => !owned.has(x))) throw new FinanceError("invalid_input");
      }
      if (id) {
        const [old] = await tx.select().from(letters).where(and(eq(letters.id, id), eq(letters.organizationId, ctx.org.id))).for("update");
        if (!old) throw new FinanceError("not_found");
        if (old.status !== "draft") throw new FinanceError("cannot_edit_final");
        await tx.update(letters).set({ ...data, updatedAt: new Date() }).where(eq(letters.id, id));
        await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "UPDATE", entityType: "letter", entityId: id, oldData: old, newData: data });
        return { id };
      }
      const [row] = await tx.insert(letters).values({ ...data, organizationId: ctx.org.id, internalNumber: await nextNumber(tx, ctx.org.id, "letter"), status: "draft", createdBy: ctx.user.id }).returning();
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "CREATE", entityType: "letter", entityId: row.id, newData: row });
      return { id: row.id };
    });
  });
}

export async function finalizeLetterAction(id: string) {
  return act(async () => {
    const ctx = await requireContext("letters.write");
    await db.transaction(async (tx) => {
      const [row] = await tx.select().from(letters).where(and(eq(letters.id, id), eq(letters.organizationId, ctx.org.id))).for("update");
      if (!row) throw new FinanceError("not_found");
      if (row.status !== "draft") throw new FinanceError("cannot_edit_final");
      await tx.update(letters).set({ status: "finalized", updatedAt: new Date() }).where(eq(letters.id, id));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "POST", entityType: "letter", entityId: id, oldData: { status: row.status }, newData: { status: "finalized" } });
    });
  });
}

export async function deleteDraftLetterAction(id: string) {
  return act(async () => {
    const ctx = await requireContext("letters.write");
    await db.transaction(async (tx) => {
      const [row] = await tx.select().from(letters).where(and(eq(letters.id, id), eq(letters.organizationId, ctx.org.id)));
      if (!row) throw new FinanceError("not_found");
      if (row.status !== "draft") throw new FinanceError("cannot_edit_final");
      await tx.delete(letters).where(eq(letters.id, id));
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "DELETE", entityType: "letter", entityId: id, oldData: row });
    });
  });
}
