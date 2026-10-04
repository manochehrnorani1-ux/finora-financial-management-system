begin;

do $$
declare
  v_case record;
  v_step2 record;
  v_later integer;
begin
  select id, case_number, status, closed_at, current_step_no, next_action, completed_at
    into v_case
  from public.cases
  where id='822c6df7-b1fb-442d-ad0c-e2905db9bedc'
    and case_number='CASE-1405-00002'
    and status='closed'
    and current_step_no=6;

  if not found then
    raise exception 'case_1405_00002_repair_precondition_failed_case';
  end if;

  select id, status, completed_at, completed_by
    into v_step2
  from public.case_workflow_steps
  where case_id=v_case.id and step_no=2;

  if not found or v_step2.status <> 'completed' or v_step2.completed_at is null or v_step2.completed_by is null then
    raise exception 'case_1405_00002_repair_precondition_failed_step2';
  end if;

  select count(*) into v_later
  from public.case_workflow_steps
  where case_id=v_case.id and step_no between 3 and 6 and status='completed';

  if v_later <> 4 then
    raise exception 'case_1405_00002_repair_precondition_failed_later_steps';
  end if;

  if exists (select 1 from public.documents where case_id=v_case.id)
     or exists (select 1 from public.case_files where case_id=v_case.id) then
    raise exception 'case_1405_00002_repair_precondition_failed_documents_present';
  end if;

  -- Preserve the only evidenced valid workflow point: step 1 was genuinely completed.
  update public.case_workflow_steps
  set status='active', completed_at=null, completed_by=null, updated_at=now()
  where case_id=v_case.id and step_no=2;

  update public.case_workflow_steps
  set status='pending', completed_at=null, completed_by=null, updated_at=now()
  where case_id=v_case.id and step_no between 3 and 6;

  update public.cases
  set status='missing_documents',
      closed_at=null,
      completed_at=null,
      current_step_no=2,
      next_action='جمع‌آوری ۵ سند حمایوی',
      updated_at=now()
  where id=v_case.id;

  insert into public.audit_logs (
    organization_id,user_id,action,entity_type,entity_id,old_data,new_data,created_at
  ) values (
    v_case.organization_id,null,'DATA_REPAIR','case',v_case.id,
    jsonb_build_object(
      'caseNumber',v_case.case_number,
      'status','closed',
      'closedAt',v_case.closed_at,
      'currentStepNo',6,
      'workflowStepsReverted','2-6',
      'reason','Closed after workflow/document gate was bypassed; no case documents or case files exist.'
    ),
    jsonb_build_object(
      'caseNumber',v_case.case_number,
      'status','missing_documents',
      'closedAt',null,
      'currentStepNo',2,
      'nextAction','جمع‌آوری ۵ سند حمایوی',
      'workflowStep1','completed',
      'workflowStep2','active',
      'workflowSteps3to6','pending',
      'reason','Historical repair based on audit evidence; no document, verification, completion, user, or timestamp was fabricated.'
    ),
    now()
  );
end $$;

commit;