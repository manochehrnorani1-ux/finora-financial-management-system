create or replace function public.guard_case_terminal_state()
returns trigger
language plpgsql
set search_path = public
as $$
declare incomplete_count integer;
begin
  if new.status in ('ready_for_delivery','closed') then
    select count(*) into incomplete_count
    from public.case_workflow_steps
    where case_id = new.id and status <> 'completed';
    if incomplete_count > 0 then
      raise exception 'case_workflow_incomplete';
    end if;
  end if;
  if new.status = 'delivered' and old.status <> 'ready_for_delivery' then
    raise exception 'invalid_transition';
  end if;
  if new.status = 'closed' and old.status <> 'delivered' then
    raise exception 'invalid_transition';
  end if;
  return new;
end;
$$;

drop trigger if exists cases_terminal_state_guard on public.cases;
create trigger cases_terminal_state_guard
before update of status on public.cases
for each row execute function public.guard_case_terminal_state();