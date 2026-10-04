create unique index if not exists services_org_name_unique on public.services (organization_id, lower(trim(name)));

create or replace function public.enforce_case_parent_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  customer_org uuid;
  service_org uuid;
  service_status text;
begin
  select organization_id into customer_org
  from public.customers
  where id = new.customer_id;
  if customer_org is null or customer_org <> new.organization_id then
    raise exception 'case_customer_organization_mismatch';
  end if;

  select organization_id, status into service_org, service_status
  from public.services
  where id = new.service_id;
  if service_org is null or service_org <> new.organization_id then
    raise exception 'case_service_organization_mismatch';
  end if;
  if tg_op = 'INSERT' or new.service_id is distinct from old.service_id then
    if service_status <> 'active' then
      raise exception 'case_service_inactive';
    end if;
  end if;
  return new;
end;
$$;