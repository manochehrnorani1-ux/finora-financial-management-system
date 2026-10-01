"use server";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { organizationMembers, profiles } from "@/db/schema";
import { createSession, destroySession, getContext, getSessionUser, hashPassword, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/finance";
import { LANG_COOKIE } from "@/lib/i18n/server";
import { createOrganization, ensureSystemRoles, seedDemoOrganization } from "@/lib/seed";
import { str } from "@/lib/format";
import { act, type ActionResult } from "./util";

export async function loginAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const email = str(fd.get("email")).toLowerCase();
  const password = str(fd.get("password"));
  const [user] = await db.select().from(profiles).where(eq(profiles.email, email));
  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
    await audit(db, { orgId: null, userId: user?.id ?? null, action: "LOGIN_FAILED", entityType: "auth", newData: { email } });
    return { ok: false, error: "invalid_credentials" };
  }
  await createSession(user.id);
  await audit(db, { orgId: user.activeOrganizationId, userId: user.id, action: "LOGIN", entityType: "auth", entityId: user.id });
  const store = await cookies();
  store.set(LANG_COOKIE, user.language, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/dashboard");
}

export async function registerAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const email = str(fd.get("email")).toLowerCase();
  const password = str(fd.get("password"));
  const fullName = str(fd.get("fullName"));
  const orgName = str(fd.get("organizationName"));
  if (!email || !fullName || !orgName || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "invalid_input" };
  if (password.length < 6) return { ok: false, error: "weak_password" };
  const [exists] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.email, email));
  if (exists) return { ok: false, error: "email_exists" };
  await ensureSystemRoles();
  const userId = await db.transaction(async (tx) => {
    const [user] = await tx.insert(profiles).values({ email, passwordHash: hashPassword(password), fullName, language: "fa" }).returning();
    const org = await createOrganization(tx, { name: orgName, ownerId: user.id });
    const demo = await seedDemoOrganization(tx, user.id);
    await tx.update(profiles).set({ activeOrganizationId: fd.get("startWithDemo") === "on" ? demo.id : org.id }).where(eq(profiles.id, user.id));
    await audit(tx, { orgId: org.id, userId: user.id, action: "CREATE", entityType: "user", entityId: user.id, newData: { email, fullName } });
    return user.id;
  });
  await createSession(userId);
  redirect("/dashboard");
}

export async function logoutAction() {
  const user = await getSessionUser();
  if (user) await audit(db, { orgId: user.activeOrganizationId, userId: user.id, action: "LOGOUT", entityType: "auth", entityId: user.id });
  await destroySession();
  redirect("/login");
}

export async function setLanguageAction(lang: string) {
  const l = lang === "ps" || lang === "en" ? lang : "fa";
  const store = await cookies();
  store.set(LANG_COOKIE, l, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  const user = await getSessionUser();
  if (user) await db.update(profiles).set({ language: l }).where(eq(profiles.id, user.id));
}

export async function switchOrganizationAction(orgId: string) {
  return act(async () => {
    const ctx = await getContext();
    if (!ctx) throw new Error("unauthenticated");
    const [m] = await db
      .select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.userId, ctx.user.id), eq(organizationMembers.organizationId, orgId), eq(organizationMembers.status, "active")));
    if (!m) return { ok: false, error: "forbidden" };
    await db.update(profiles).set({ activeOrganizationId: orgId }).where(eq(profiles.id, ctx.user.id));
  });
}

export async function changePasswordAction(fd: FormData) {
  return act(async () => {
    const user = await getSessionUser();
    if (!user) return { ok: false, error: "unauthenticated" };
    const current = str(fd.get("current"));
    const next = str(fd.get("password"));
    if (!verifyPassword(current, user.passwordHash)) return { ok: false, error: "invalid_credentials" };
    if (next.length < 6) return { ok: false, error: "weak_password" };
    await db.update(profiles).set({ passwordHash: hashPassword(next) }).where(eq(profiles.id, user.id));
    await audit(db, { orgId: user.activeOrganizationId, userId: user.id, action: "UPDATE", entityType: "user_password", entityId: user.id });
  });
}
