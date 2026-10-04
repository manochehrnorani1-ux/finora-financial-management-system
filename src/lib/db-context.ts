import "server-only";

import { sql } from "drizzle-orm";
import { db } from "../db/index.ts";

/**
 * Minimal server-derived security context required by the RLS transaction boundary.
 *
 * Callers should pass the AppContext returned by requireContext()/getContext().
 * No client-controlled organization_id, user_id, role, or permissions are accepted.
 */
export type RlsContext = {
  user: { id: string };
  org: { id: string };
  roleKey: string;
  roleId: string;
  perms: ReadonlySet<string>;
};

export type RlsTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function assertRlsContext(ctx: RlsContext): void {
  if (!ctx?.user?.id) throw new Error("invalid_rls_context:user");
  if (!ctx?.org?.id) throw new Error("invalid_rls_context:organization");
  if (!ctx.roleKey) throw new Error("invalid_rls_context:role");
  if (!ctx.roleId) throw new Error("invalid_rls_context:role_id");
  if (!(ctx.perms instanceof Set)) throw new Error("invalid_rls_context:permissions");
}

/**
 * Execute application DB work inside one transaction-local PostgreSQL security context.
 *
 * set_config(..., true) is PostgreSQL's transaction-local equivalent of SET LOCAL:
 * the fourth argument is deliberately true so the setting is discarded automatically
 * at COMMIT/ROLLBACK and cannot leak through a pooled connection.
 */
export async function withRlsContext<T>(
  ctx: RlsContext,
  operation: (tx: RlsTransaction) => Promise<T> | T,
): Promise<T> {
  assertRlsContext(ctx);

  const permissions = JSON.stringify([...ctx.perms].sort());

  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${ctx.user.id}, true)`);
    await tx.execute(sql`select set_config('app.organization_id', ${ctx.org.id}, true)`);
    await tx.execute(sql`select set_config('app.role', ${ctx.roleKey}, true)`);
    await tx.execute(sql`select set_config('app.permissions', ${permissions}, true)`);

    return operation(tx);
  });
}
