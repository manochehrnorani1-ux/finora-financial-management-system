"use server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { publicSites } from "@/db/schema";
import { requireContext } from "@/lib/auth";
import { audit, FinanceError } from "@/lib/finance";
import { optStr, str } from "@/lib/format";
import { SITE_CONTENT } from "@/lib/website-seed";
import { act } from "./util";

export async function savePublicWebsiteAction(fd: FormData) {
  return act(async () => {
    const ctx = await requireContext("public_site.manage");
    const isPublished = fd.get("isPublished") === "on";
    const existingRows = await db.select().from(publicSites).where(eq(publicSites.organizationId, ctx.org.id)).limit(1);
    const old = existingRows[0];
    const prev = (old?.content ?? SITE_CONTENT) as typeof SITE_CONTENT;
    const values = {
      fa: {
        ...prev.fa,
        tagline: str(fd.get("taglineFa")) || SITE_CONTENT.fa.tagline,
        phone1: str(fd.get("phone1")), phone2: str(fd.get("phone2")), phone3: str(fd.get("phone3")),
        email: str(fd.get("email")), address: str(fd.get("addressFa")),
      },
      ps: {
        ...prev.ps,
        tagline: str(fd.get("taglinePs")) || SITE_CONTENT.ps.tagline,
        phone1: str(fd.get("phone1")), phone2: str(fd.get("phone2")), phone3: str(fd.get("phone3")),
        email: str(fd.get("email")), address: str(fd.get("addressPs")),
      },
      en: {
        ...prev.en,
        tagline: str(fd.get("taglineEn")) || SITE_CONTENT.en.tagline,
        phone1: str(fd.get("phone1")), phone2: str(fd.get("phone2")), phone3: str(fd.get("phone3")),
        email: str(fd.get("email")), address: str(fd.get("addressEn")),
      },
    };
    if (!values.fa.phone1 || !values.fa.email || !values.fa.address) throw new FinanceError("invalid_input");
    // Public intake and online collection are deliberately not activated until their full secure workflows exist.
    const value = { isPublished, publicRequestsEnabled: false, onlinePaymentsEnabled: false, content: values };
    await db.transaction(async (tx) => {
      if (old) await tx.update(publicSites).set({ ...value, updatedBy: ctx.user.id, updatedAt: new Date() }).where(eq(publicSites.id, old.id));
      else await tx.insert(publicSites).values({ organizationId: ctx.org.id, ...value, updatedBy: ctx.user.id });
      await audit(tx, { orgId: ctx.org.id, userId: ctx.user.id, action: "SETTINGS_CHANGE", entityType: "public_site", entityId: old?.id ?? null, oldData: old ?? null, newData: { ...value, content: { languages: Object.keys(values) } } });
    });
  });
}
