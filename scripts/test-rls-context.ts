import assert from "node:assert/strict";
import { withRlsContext } from "../src/lib/db-context.ts";
import { pool } from "../src/db/index.ts";

const required = ["DATABASE_URL"];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}

const ctxA = {
  user: { id: "phase-a-user-a" },
  org: { id: "phase-a-org-a" },
  roleKey: "operator",
  roleId: "phase-a-role-a",
  perms: new Set(["customers.read"]),
};

const ctxB = {
  user: { id: "phase-a-user-b" },
  org: { id: "phase-a-org-b" },
  roleKey: "viewer",
  roleId: "phase-a-role-b",
  perms: new Set(["dashboard.read"]),
};

async function readContext(client) {
  const result = await client.query(`
    select
      current_setting('app.user_id', true) as user_id,
      current_setting('app.organization_id', true) as organization_id,
      current_setting('app.role', true) as role_key,
      current_setting('app.permissions', true) as permissions
  `);
  return result.rows[0];
}

async function main() {
  // The application helper itself must establish the transaction-local context.
  const observedA = await withRlsContext(ctxA, async (tx) => {
    const result = await tx.execute(`
      select
        current_setting('app.user_id', true) as user_id,
        current_setting('app.organization_id', true) as organization_id,
        current_setting('app.role', true) as role_key,
        current_setting('app.permissions', true) as permissions
    `);
    return result.rows[0];
  });

  assert.equal(observedA.user_id, ctxA.user.id);
  assert.equal(observedA.organization_id, ctxA.org.id);
  assert.equal(observedA.role_key, ctxA.roleKey);
  assert.deepEqual(JSON.parse(observedA.permissions), ["customers.read"]);

  const client = await pool.connect();
  try {
    // Explicit same-connection reuse proves transaction-local settings disappear after COMMIT.
    await client.query("BEGIN");
    await client.query("select set_config('app.organization_id', $1, true)", [ctxA.org.id]);
    assert.equal((await readContext(client)).organization_id, ctxA.org.id);
    await client.query("COMMIT");

    assert.equal((await readContext(client)).organization_id, "");

    // Rollback isolation.
    await client.query("BEGIN");
    await client.query("select set_config('app.organization_id', $1, true)", [ctxA.org.id]);
    assert.equal((await readContext(client)).organization_id, ctxA.org.id);
    await client.query("ROLLBACK");
    assert.equal((await readContext(client)).organization_id, "");

    // Exception isolation.
    await client.query("BEGIN");
    await client.query("select set_config('app.organization_id', $1, true)", [ctxA.org.id]);
    try {
      throw new Error("phase-a-intentional-exception");
    } catch (error) {
      await client.query("ROLLBACK");
      assert.equal(error.message, "phase-a-intentional-exception");
    }
    assert.equal((await readContext(client)).organization_id, "");

    // A subsequent transaction can establish a different context on the same pooled connection.
    await client.query("BEGIN");
    await client.query("select set_config('app.organization_id', $1, true)", [ctxB.org.id]);
    assert.equal((await readContext(client)).organization_id, ctxB.org.id);
    await client.query("COMMIT");
    assert.equal((await readContext(client)).organization_id, "");

    console.log(JSON.stringify({
      status: "PASS",
      evidence: {
        helper_context: observedA,
        commit_isolation: true,
        rollback_isolation: true,
        exception_isolation: true,
        same_connection_reuse_isolation: true,
      },
    }, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(async (error) => {
  console.error(JSON.stringify({
    status: "FAIL",
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  try { await pool.end(); } catch {}
  process.exitCode = 1;
});
