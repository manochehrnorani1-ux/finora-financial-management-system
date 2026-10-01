alter table public.case_workflow_steps
  add column if not exists paid_amount numeric(18,2) not null default 0,
  add column if not exists remaining_amount numeric(18,2) not null default 0;

update public.case_workflow_steps
set remaining_amount = greatest(coalesce(amount, 0) - coalesce(paid_amount, 0), 0);

create table if not exists public.case_workflow_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  workflow_step_id uuid not null references public.case_workflow_steps(id) on delete cascade,
  amount numeric(18,2) not null default 0,
  currency text not null default 'AFN',
  payment_date date not null,
  payment_method text,
  reference_number text,
  notes text,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists case_workflow_payments_step_idx
  on public.case_workflow_payments(organization_id, workflow_step_id, payment_date);
create index if not exists case_workflow_payments_case_idx
  on public.case_workflow_payments(organization_id, case_id, payment_date);

alter table public.case_workflow_payments enable row level security;
