import "server-only";
import { and, eq } from "drizzle-orm";
import { officialForms, officialResources, publicSites, services } from "@/db/schema";
import type { Tx } from "./finance";
import { OFFICIAL_FORMS_CATALOG } from "./forms-catalog";
import { OPERATIONAL_SERVICES } from "./operational-services";
import { todayIso } from "./jalali";

export const SITE_CONTENT = {
  fa: { tagline: "از ارقام تا اطمینان", phone1: "0744173723", phone2: "0744232689", phone3: "0744436286", email: "manochehr.mb@gmail.com", address: "مومند مارکیت، منزل دوم، کندز، افغانستان" },
  ps: { tagline: "له شمېرو تر باور", phone1: "0744173723", phone2: "0744232689", phone3: "0744436286", email: "manochehr.mb@gmail.com", address: "مومند مارکېټ، دویم پوړ، کندز، افغانستان" },
  en: { tagline: "From figures to confidence", phone1: "0744173723", phone2: "0744232689", phone3: "0744436286", email: "manochehr.mb@gmail.com", address: "Momand Market, 2nd Floor, Kunduz, Afghanistan" },
};




const resources = [
  { agency: "MOF", title: "ریاست عمومی عواید — رهنمودها و طرزالعمل‌های مالیاتی", url: "https://ard.gov.af/?c=tax-guidlines-dr&s=dari", description: "منبع رسمی رهنمودهای مالیاتی (مالیه موضوعی کرایه، معاشات، انتفاعی، اظهارنامه و تثبیت مالیه اصناف).", isOfficialDomain: true },
  { agency: "MOF", title: "طرزالعمل ساده سازی پروسه تصفیه مالیات (۵ سند حمایوی — ماده ۵۹)", url: "https://ard.gov.af/497/497", description: "اطلاعیه رسمی ریاست عمومی عواید در مورد طی مراحل تصفیه مالیاتی با ۵ سند حمایوی ظرف ۲۱ روز.", isOfficialDomain: true },
  { agency: "DAB", title: "فورم‌های خدمات پولی (صفحه رسمی منبع)", url: "https://dab.gov.af/dr/فورم-های-خدمات-پولی", description: "فورمونه په رسمي پاڼه کې لړل شوي. د اوسني اعتبار/نسخې کتنه اړینه ده.", isOfficialDomain: true },
  { agency: "DAB", title: "فورم‌ها و رهنمودهای صرافی و خدمات پولی", url: "https://www.dab.gov.af/Licensing-Guidelines-Forms", description: "فهرست رسمی فورم‌ها و رهنمودهای جوازدهی؛ نسخه هر فایل قبل از استفاده بررسی شود.", isOfficialDomain: true },
  { agency: "DAB", title: "نظارت از مؤسسات مالی غیر بانکی", url: "https://dab.gov.af/dr/آمریت-عمومی-نظارت-از-مؤسسات-مالی-غیر-بانکی", description: "صفحه رسمی د افغانستان بانک در مورد نظارت سکتور مالی غیر بانکی.", isOfficialDomain: true },
  { agency: "MOF", title: "فورمه‌جات وزارت مالیه", url: "https://www.mof.gov.af/dr/فورمه-جات-0", description: "صفحه رسمی وزارت مالیه؛ قوانین و فورم‌ها قبل از استفاده دوباره بررسی شوند.", isOfficialDomain: true },
  { agency: "FinTRACA", title: "Financial Intelligence Unit of Afghanistan", url: "https://fintraca.gov.af/", description: "منبع رسمی آگاهی و معلومات AML/CFT؛ ثبت FINORA به معنی ارسال گزارش رسمی نیست.", isOfficialDomain: true },
];

export async function ensurePublicWebsite(tx: Tx, organizationId: string, userId: string | null) {
  await tx.insert(publicSites).values({ organizationId, isPublished: true, publicRequestsEnabled: false, onlinePaymentsEnabled: false, content: SITE_CONTENT, updatedBy: userId }).onConflictDoNothing({ target: publicSites.organizationId });

  const [anyPublic] = await tx.select({ id: services.id }).from(services).where(and(eq(services.organizationId, organizationId), eq(services.publicListed, true))).limit(1);
  if (!anyPublic) {
    for (const s of OPERATIONAL_SERVICES) {
      const publicContent = {
        title: { fa: s.fa, ps: s.ps, en: s.en },
        description: { fa: s.descFa, ps: s.descPs, en: s.descEn },
        short: { fa: s.shortFa, ps: s.shortPs, en: s.shortEn },
        requirements: s.requiredDocuments,
        workflow: s.workflow,
        forms: s.forms,
        number: s.number,
        group: s.group,
        feeText: { fa: "پس از بررسی دوسیه و توافق مشتری تعیین می‌شود.", ps: "دوسیه تر ارزونې او د مراجع تر موافقې وروسته ټاکل کېږي.", en: "Quoted after case review and client agreement." },
      };
      await tx.insert(services).values({
        organizationId,
        name: s.fa,
        category: s.group,
        description: s.descFa,
        defaultPrice: s.defaultPrice,
        publicListed: true,
        publicContent,
        requiredDocuments: s.requiredDocuments,
        workflowSteps: s.workflow,
        estimatedDays: s.estimatedDays,
        publicOrder: s.order,
        feeQuoteRequired: true,
        status: "active",
        isDemo: false,
      });
    }
  }

  for (const r of resources) {
    const [existing] = await tx.select({ id: officialResources.id }).from(officialResources).where(and(eq(officialResources.organizationId, organizationId), eq(officialResources.url, r.url))).limit(1);
    if (!existing) await tx.insert(officialResources).values({ organizationId, ...r, lastCheckedAt: new Date() });
  }

  // Forms whose detailed field structure is defined in the official forms catalog
  // (extracted from the official DAB / MoF form listings and file layouts).
  for (const def of OFFICIAL_FORMS_CATALOG) {
    const [existing] = await tx.select().from(officialForms).where(and(eq(officialForms.organizationId, organizationId), eq(officialForms.formKey, def.formKey), eq(officialForms.version, 1))).limit(1);
    const fields = def.fields.map((f) => ({ key: f.key, label: f.label, labelPs: f.labelPs ?? null, labelEn: f.labelEn ?? null, type: f.type ?? "text", required: f.required ?? false, options: f.options ?? null, help: f.help ?? null }));
    const fieldMapping: Record<string, string> = {};
    for (const f of def.fields) if (f.mapping) fieldMapping[f.key] = f.mapping;
    if (!existing) {
      await tx.insert(officialForms).values({
        organizationId,
        formKey: def.formKey,
        agency: def.agency,
        formName: def.formName,
        formNumber: def.formNumber ?? def.formKey.toUpperCase(),
        version: 1,
        sourceUrl: def.sourceUrl,
        originalFileUrl: def.originalFileUrl ?? null,
        fields,
        fieldMapping,
        isOfficial: true,
        verificationStatus: "source_listed",
        lastCheckedAt: new Date(),
        createdBy: userId,
      });
    } else {
      // Upgrade rows seeded earlier with the generic field set to the detailed official field structure.
      // Compares actual field keys with the catalog so any mismatch triggers a re-seed of the latest version.
      const currentKeys = Array.isArray(existing.fields) ? existing.fields.map((f: { key?: string }) => String(f?.key ?? "")).sort().join(",") : "";
      const catalogKeys = def.fields.map((f) => f.key).sort().join(",");
      const needsUpgrade = currentKeys !== catalogKeys;
      if (needsUpgrade) {
        const latestVersion = existing.version;
        await tx.update(officialForms).set({
          formName: def.formName,
          formNumber: def.formNumber ?? def.formKey.toUpperCase(),
          sourceUrl: def.sourceUrl,
          originalFileUrl: existing.originalFileUrl ?? def.originalFileUrl ?? null,
          fields,
          fieldMapping,
        }).where(eq(officialForms.id, existing.id));
        // Close the previous version period so history stays immutable
        if (latestVersion > 0) {
          await tx.update(officialForms).set({ effectiveTo: todayIso() }).where(and(eq(officialForms.formKey, def.formKey), eq(officialForms.version, latestVersion)));
        }
      }
    }
  }
}
