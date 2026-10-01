import "server-only";
import { redirect } from "next/navigation";
import { getContext, type AppContext } from "./auth";
import type { Permission } from "./permissions";
import { getT } from "./i18n/server";

/** Page-level guard: unauthenticated -> login, missing permission -> dashboard (with forbidden flag). */
export async function pageContext(perm?: Permission): Promise<{ ctx: AppContext; t: (k: string) => string; lang: "fa" | "ps" | "en"; fmt: "jalali" | "gregorian" }> {
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  if (perm && !ctx.can(perm)) redirect("/dashboard?forbidden=1");
  const { t, lang } = await getT();
  return { ctx, t, lang, fmt: ctx.org.dateFormat === "gregorian" ? "gregorian" : "jalali" };
}

export type SP = Promise<Record<string, string | string[] | undefined>>;
export function sp1(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}
