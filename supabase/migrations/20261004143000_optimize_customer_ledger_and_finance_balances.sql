-- Performance and tenant-scope hardening for customer ledger lookups.
create index if not exists customer_ledger_org_customer_date_idx
  on public.customer_ledger (organization_id, customer_id, transaction_date);

drop index if exists public.customer_ledger_idx;
