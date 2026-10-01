import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { organizationMembers, organizations, permissions, profiles, rolePermissions, roles, sessions } from "@/db/schema";
import type { Permission, RoleKey } from "./permissions";

export const SESSION_COOKIE = "finora_session";
const SESSION_DAYS = 14;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await db.insert(sessions).values({ userId, token, expiresAt });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.token, token));
  store.delete(SESSION_COOKIE);
}

export type SessionUser = typeof profiles.$inferSelect;

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ user: profiles })
    .from(sessions)
    .innerJoin(profiles, eq(sessions.userId, profiles.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const user = rows[0]?.user;
  if (!user || !user.isActive) return null;
  return user;
});

export type Org = typeof organizations.$inferSelect;

export interface AppContext {
  user: SessionUser;
  org: Org;
  roleKey: RoleKey;
  roleId: string;
  perms: Set<Permission>;
  memberships: { orgId: string; orgName: string; roleKey: string; isDemo: boolean }[];
  can: (p: Permission) => boolean;
}

/** Resolve the current user's active organization membership + effective permissions (from DB). */
export const getContext = cache(async (): Promise<AppContext | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const memberships = await db
    .select({
      orgId: organizations.id,
      orgName: organizations.name,
      roleKey: roles.key,
      roleId: roles.id,
      isDemo: organizations.isDemo,
      status: organizationMembers.status,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
    .where(and(eq(organizationMembers.userId, user.id), eq(organizationMembers.status, "active")));
  if (memberships.length === 0) return null;
  let active = memberships.find((m) => m.orgId === user.activeOrganizationId);
  if (!active) {
    active = memberships[0];
    await db.update(profiles).set({ activeOrganizationId: active.orgId }).where(eq(profiles.id, user.id));
  }
  const [org] = await db.select().from(organizations).where(eq(organizations.id, active.orgId));
  const permRows = await db
    .select({ key: permissions.key })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, active.roleId));
  const perms = new Set(permRows.map((r) => r.key as Permission));
  return {
    user,
    org,
    roleKey: active.roleKey as RoleKey,
    roleId: active.roleId,
    perms,
    memberships: memberships.map((m) => ({ orgId: m.orgId, orgName: m.orgName, roleKey: m.roleKey, isDemo: m.isDemo })),
    can: (p) => perms.has(p),
  };
});

export class AuthError extends Error {
  constructor(msg = "unauthorized") {
    super(msg);
  }
}

/** Server-side authorization guard used by every action / route. Throws when permission is missing. */
export async function requireContext(perm?: Permission): Promise<AppContext> {
  const ctx = await getContext();
  if (!ctx) throw new AuthError("unauthenticated");
  if (perm && !ctx.can(perm)) throw new AuthError("forbidden");
  return ctx;
}

export async function requestMeta() {
  try {
    const h = await headers();
    return {
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null,
      ua: h.get("user-agent") ?? null,
    };
  } catch {
    return { ip: null, ua: null };
  }
}
