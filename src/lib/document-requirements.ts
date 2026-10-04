import "server-only";

export const VERIFIED_DOCUMENT_STATUSES = ["approved", "completed"] as const;

function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function requiredDocumentTitles(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((x): x is string => typeof x === "string" && x.trim().length > 0);

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["fa", "ps", "en"]) {
      const candidate = record[key];
      if (Array.isArray(candidate)) {
        const titles = candidate.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
        if (titles.length) return titles;
      }
    }
  }

  return [];
}

export function missingRequiredDocuments(
  required: string[],
  documents: Array<{ title: string | null; status: string | null }>,
): string[] {
  const verified = new Set(
    documents
      .filter((doc) => doc.title && doc.status && VERIFIED_DOCUMENT_STATUSES.includes(doc.status as (typeof VERIFIED_DOCUMENT_STATUSES)[number]))
      .map((doc) => normalize(doc.title as string)),
  );

  return required.filter((title) => !verified.has(normalize(title)));
}

export function requiredDocumentStatus(
  title: string,
  documents: Array<{ title: string | null; status: string | null }>,
): "missing" | "uploaded" | "under_review" | "verified" | "rejected" {
  const matches = documents.filter((doc) => doc.title && normalize(doc.title) === normalize(title));
  if (!matches.length) return "missing";
  if (matches.some((doc) => VERIFIED_DOCUMENT_STATUSES.includes(doc.status as (typeof VERIFIED_DOCUMENT_STATUSES)[number]))) return "verified";
  if (matches.some((doc) => doc.status === "rejected")) return "rejected";
  if (matches.some((doc) => doc.status === "under_review" || doc.status === "submitted")) return "under_review";
  return "uploaded";
}
