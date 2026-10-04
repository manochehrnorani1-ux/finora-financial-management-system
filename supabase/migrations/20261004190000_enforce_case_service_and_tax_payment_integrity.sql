-- FINORA: enforce the Customer -> Service -> Case chain and protect tax payment integrity.

alter table public.cases
  alter column service_id set not null;

alter table public.cases
  drop constraint if exists cases_service_id_fkey;

alter table public.cases
  add constraint cases_service_id_fkey
  foreign key (service_id) references public.services(id) on delete restrict;

create or replace function public.enforce_case_parent_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  customer_org uuid;
  service_org uuid;
begin
  select organization_id into customer_org
  from public.customers
  where id = new.customer_id;

  if customer_org is null or customer_org <> new.organization_id then
    raise exception 'case_customer_organization_mismatch';
  end if;

  select organization_id into service_org
  from public.services
  where id = new.service_id;

  if service_org is null or service_org <> new.organization_id then
    raise exception 'case_service_organization_mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists cases_parent_scope_guard on public.cases;

create trigger cases_parent_scope_guard
before insert or update of organization_id, customer_id, service_id
on public.cases
for each row
execute function public.enforce_case_parent_scope();

create or replace function public.require_tax_settlement_case()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  case_customer uuid;
  case_org uuid;
begin
  if new.case_id is null then
    raise exception 'tax_settlement_case_required';
  end if;

  select customer_id, organization_id
    into case_customer, case_org
  from public.cases
  where id = new.case_id;

  if case_customer is null
     or case_org is null
     or case_org <> new.organization_id
     or case_customer <> new.customer_id then
    raise exception 'tax_settlement_case_customer_mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists tax_settlements_require_case on public.tax_settlements;

create trigger tax_settlements_require_case
before insert or update of organization_id, customer_id, case_id
on public.tax_settlements
for each row
execute function public.require_tax_settlement_case();

create or replace function public.guard_tax_settlement_payment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  settlement_org uuid;
  settlement_status text;
  settlement_remaining numeric;
begin
  if tg_op = 'UPDATE' then
    raise exception 'tax_settlement_payment_immutable';
  end if;

  if tg_op = 'DELETE' then
    raise exception 'tax_settlement_payment_immutable';
  end if;

  if new.amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  select organization_id, status, remaining_amount
    into settlement_org, settlement_status, settlement_remaining
  from public.tax_settlements
  where id = new.settlement_id
  for update;

  if settlement_org is null or settlement_org <> new.organization_id then
    raise exception 'tax_settlement_payment_organization_mismatch';
  end if;

  if settlement_status not in ('approved', 'part_paid') then
    raise exception 'legal_review_required';
  end if;

  if settlement_remaining is null or new.amount > settlement_remaining then
    raise exception 'amount_exceeds_due';
  end if;

  return new;
end;
$$;

drop trigger if exists tax_settlement_payment_guard on public.tax_settlement_payments;

create trigger tax_settlement_payment_guard
before insert or update or delete
on public.tax_settlement_payments
for each row
execute function public.guard_tax_settlement_payment();

alter table public.tax_settlement_payments
  drop constraint if exists tax_settlement_payments_amount_positive;

alter table public.tax_settlement_payments
  add constraint tax_settlement_payments_amount_positive
  check (amount > 0);

alter table public.tax_settlements
  drop constraint if exists tax_settlements_nonnegative_amounts;

alter table public.tax_settlements
  add constraint tax_settlements_nonnegative_amounts
  check (tax_amount >= 0 and paid_amount >= 0 and remaining_amount >= 0);