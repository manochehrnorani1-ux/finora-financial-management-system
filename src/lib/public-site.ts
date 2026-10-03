import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { officialResources, organizations, publicSites, services, systemSettings } from "@/db/schema";
import { ensureBootstrap } from "./seed";
import { SITE_CONTENT } from "./website-seed";

export type PublicLang = "fa" | "ps" | "en";

export const getPublicWebsite = cache(async () => {
  await ensureBootstrap();
  const [row] = await db
    .select({ site: publicSites, org: organizations })
    .from(publicSites)
    .innerJoin(organizations, eq(publicSites.organizationId, organizations.id))
    .where(and(eq(publicSites.isPublished, true), eq(organizations.isDemo, false)))
    .orderBy(organizations.createdAt)
    .limit(1);
  if (!row) return null;
  const [contactSetting] = await db
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(and(eq(systemSettings.organizationId, row.org.id), eq(systemSettings.key, "contact_phones")))
    .limit(1);
  const rawPhones = (contactSetting?.value as { phones?: unknown } | null)?.phones;
  const contactPhones = Array.isArray(rawPhones)
    ? rawPhones.filter((phone): phone is string => typeof phone === "string" && phone.trim().length > 0)
    : [];
  return {
    ...row,
    content: (row.site.content as typeof SITE_CONTENT) ?? SITE_CONTENT,
    contactPhones,
  };
});

export async function getPublicOfferings(orgId: string) {
  return db.select().from(services)
    .where(and(eq(services.organizationId, orgId), eq(services.status, "active"), eq(services.publicListed, true)))
    .orderBy(asc(services.publicOrder), asc(services.name));
}

export async function getPublicOfficialResources(orgId: string) {
  return db.select().from(officialResources).where(eq(officialResources.organizationId, orgId)).orderBy(asc(officialResources.agency), asc(officialResources.title));
}

export function localized(object: unknown, lang: PublicLang, fallback = "") {
  if (!object || typeof object !== "object") return fallback;
  const value = (object as Record<string, unknown>)[lang] ?? (object as Record<string, unknown>).fa ?? fallback;
  return typeof value === "string" ? value : fallback;
}

export function localizedList(object: unknown, lang: PublicLang): string[] {
  if (!object || typeof object !== "object") return [];
  const value = (object as Record<string, unknown>)[lang] ?? (object as Record<string, unknown>).fa;
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
}
