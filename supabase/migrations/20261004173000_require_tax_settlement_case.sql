-- Enforce the FINORA rule: every tax settlement must belong to a client case.
-- Existing legacy rows with a null case_id are preserved for audit/history, but
-- new inserts and updates cannot create another case-less tax settlement.

create or replace function public.require_tax_settlement_case()
returns trigger
language plpgsql
as $$
begin
  if new.case_id is null then
    raise exception 'tax_settlement_case_required';
  end if;
  return new;
end;
$$;

drop trigger if exists tax_settlements_require_case on public.tax_settlements;

create trigger tax_settlements_require_case
before insert or update on public.tax_settlements
for each row
execute function public.require_tax_settlement_case();
