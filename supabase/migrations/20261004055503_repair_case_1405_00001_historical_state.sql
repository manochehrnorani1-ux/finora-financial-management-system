-- Historical repair for one identified legacy case.
-- Preconditions are intentionally strict: this migration must not affect any other case.
begin;

do $$
begin
  if not exists (
    select 1
    from public.cases
    where id = '54f7de6f-7d41-459a-a393-5e3bd8f06098'
      and case_number = 'CASE-1405-00001'
      and status = 'closed'
      and closed_at = '2026-10-02'
      and current_step_no = 1
      and completed_at is null
  ) then
    raise exception 'case_repair_precondition_failed';
  end if;
end $$;

update public.cases
set status = 'awaiting_review',
    closed_at = null,
    updated_at = now()
where id = '54f7de6f-7d41-459a-a393-5e3bd8f06098'
  and case_number = 'CASE-1405-00001';

insert into public.audit_logs (
  organization_id,
  user_id,
  action,
  entity_type,
  entity_id,
  old_data,
  new_data,
  created_at
) values (
  '36608f74-d7c5-4ef1-af25-800a85aedcf3',
  null,
  'DATA_REPAIR',
  'case',
  '54f7de6f-7d41-459a-a393-5e3bd8f06098',
  jsonb_build_object(
    'caseNumber', 'CASE-1405-00001',
    'status', 'closed',
    'closedAt', '2026-10-02',
    'currentStepNo', 1,
    'nextAction', 'ثبت مشتری و تشکیل دوسیه',
    'completedAt', null
  ),
  jsonb_build_object(
    'caseNumber', 'CASE-1405-00001',
    'status', 'awaiting_review',
    'closedAt', null,
    'reason', 'Historical repair: terminal transitions occurred while workflow steps remained incomplete; no evidence supports completed delivery/closure.',
    'evidence', 'Reverted to the last pre-terminal audited state; workflow step records were not fabricated or altered.'
  ),
  now()
);

commit;