-- Align the Drizzle contract with the live FINORA database and remove an obsolete Supabase Auth trigger.
alter table public.profiles alter column password_hash set not null;
alter table public.profiles alter column full_name set not null;
alter table public.organization_members alter column role_id set not null;
alter table public.official_forms alter column agency set not null;
alter table public.official_forms alter column source_url set not null;
alter table public.generated_forms alter column form_name_snapshot set not null;
alter table public.generated_forms alter column agency_snapshot set not null;
alter table public.generated_forms alter column version_snapshot set not null;
alter table public.tax_rules alter column effective_from set not null;
alter table public.letters alter column recipient set not null;
alter table public.letters alter column subject set not null;
alter table public.letters alter column body set not null;

create index if not exists case_workflow_payments_case_fk_idx
  on public.case_workflow_payments(case_id);
create index if not exists case_workflow_payments_step_fk_idx
  on public.case_workflow_payments(workflow_step_id);
create index if not exists case_workflow_payments_recorded_by_fk_idx
  on public.case_workflow_payments(recorded_by);
create index if not exists case_workflow_steps_completed_by_fk_idx
  on public.case_workflow_steps(completed_by);

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
