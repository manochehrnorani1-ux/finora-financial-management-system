alter table public.customer_accounts
  add column if not exists current_balance numeric(18,2);

update public.customer_accounts a
set current_balance = coalesce(a.opening_balance, 0) + coalesce((
  select sum(l.debit - l.credit)
  from public.customer_ledger l
  where l.organization_id = a.organization_id
    and l.customer_id = a.customer_id
), 0);

alter table public.customer_accounts
  alter column current_balance set default 0;

update public.customer_accounts
set current_balance = 0
where current_balance is null;
