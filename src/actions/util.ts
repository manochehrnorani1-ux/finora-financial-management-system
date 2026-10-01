import "server-only";
import { revalidatePath } from "next/cache";
import { AuthError } from "@/lib/auth";
import { FinanceError } from "@/lib/finance";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
  message?: string;
}

/** Wraps an action: runs it, revalidates the app tree and maps errors to stable codes (never leaks internals). */
export async function act(fn: () => Promise<ActionResult | void | { id?: string } | string>): Promise<ActionResult> {
  try {
    const r = await fn();
    revalidatePath("/", "layout");
    if (typeof r === "string") return { ok: true, message: r };
    if (r && typeof r === "object" && "ok" in r) return r as ActionResult;
    return { ok: true, id: (r as { id?: string } | undefined)?.id };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message === "unauthenticated" ? "unauthenticated" : "forbidden" };
    if (e instanceof FinanceError) return { ok: false, error: e.code.startsWith("forbidden") ? "forbidden" : e.code };
    const msg = e instanceof Error ? e.message : String(e);
    if (/unique|duplicate/i.test(msg)) return { ok: false, error: "duplicate" };
    if (/foreign key|violates/i.test(msg)) return { ok: false, error: "reference" };
    console.error("[action]", e);
    return { ok: false, error: "server_error" };
  }
}
