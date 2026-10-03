import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const BACKUP_TABLES = [
  "customers", "services", "tax_types", "tax_rules", "accounts", "cash_accounts", "bank_accounts",
  "customer_licenses", "cases", "attachments", "case_requirements", "case_tasks", "case_plan_steps", "customer_obligations",
  "documents", "contracts", "official_forms", "public_sites", "official_resources", "document_revisions", "document_files", "case_notes", "case_files",
  "journal_entries", "incomes", "expenses", "transactions", "journal_entry_lines", "cash_transactions", "bank_transactions", "customer_accounts", "customer_ledger", "tax_records",
  "tax_settlements", "tax_settlement_payments", "service_fee_receipts", "case_step_payments", "obligation_payments", "generated_forms", "letters", "compliance_events",
  "exchange_rates", "approval_rules", "counters", "reports", "system_settings", "audit_logs",
] as const;

export async function exportOrganizationData(orgId: string) {
  const data: Record<string, Record<string, unknown>[]> = {};
  for (const t of BACKUP_TABLES) {
    const res = await db.execute(sql`select * from ${sql.identifier(t)} where organization_id = ${orgId}`);
    data[t] = res.rows as Record<string, unknown>[];
  }
  return data;
}
