import "server-only";
import { FinanceError } from "./finance";

/**
 * Safely reads an uploaded file from FormData.
 *
 * Browsers serialize an *unselected* file input as an empty string ("") when the
 * form is submitted through a Next.js server action. Treating that as invalid
 * input breaks every optional file field (e.g. customer logo). This helper
 * normalises all of those cases to `null` (meaning "no file supplied").
 */
export function formFile(v: FormDataEntryValue | null | undefined): File | null {
  if (v instanceof File) return v.size > 0 ? v : null;
  if (typeof v === "string") {
    if (v.trim() === "") return null;
    throw new FinanceError("invalid_input");
  }
  return null;
}

/** Validates a logo upload (image only, max 2 MB) and returns its bytes. */
export async function readLogoUpload(file: File | null) {
  if (!file) return null;
  if (file.size > 2 * 1024 * 1024) throw new FinanceError("file_too_large");
  if (!file.type.startsWith("image/")) throw new FinanceError("invalid_input");
  return Buffer.from(await file.arrayBuffer());
}

/** Validates a document/evidence upload and returns its bytes. */
export async function readDocumentUpload(file: File | null, maxBytes = 10 * 1024 * 1024) {
  if (!file) return null;
  if (file.size > maxBytes) throw new FinanceError("file_too_large");
  return Buffer.from(await file.arrayBuffer());
}
