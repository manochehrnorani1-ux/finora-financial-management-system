-- Operational workflow data model for FINORA case services.
alter table public.services add column if not exists workflow_key text;

alter table public.cases
  add column if not exists workflow_key text,
  add column if not exists current_step_no integer not null default 1,
  add column if not exists next_action text,
  add column if not exists target_date date,
  add column if not exists completed_at timestamptz;

create index if not exists services_org_workflow_key_idx on public.services (organization_id, workflow_key);
create index if not exists cases_org_workflow_idx on public.cases (organization_id, workflow_key, current_step_no);

create table if not exists public.case_workflow_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  step_no integer not null,
  step_key text not null,
  title text not null,
  status text not null default 'pending',
  action_required text,
  due_date date,
  amount numeric(18,2),
  completed_at timestamptz,
  completed_by uuid references public.profiles(id),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, step_no)
);

create index if not exists case_workflow_steps_case_idx on public.case_workflow_steps (organization_id, case_id, step_no);
create index if not exists case_workflow_steps_status_idx on public.case_workflow_steps (organization_id, status, due_date);
alter table public.case_workflow_steps enable row level security;

update public.services
set workflow_key = case
  when name = 'اخذ جواز صرافی' then 'license_acquisition_fx'
  when name = 'رفع تعلیق جواز' then 'license_unfreeze'
  when name = 'لغو جواز صرافی' then 'license_cancellation_fx'
  when name = 'تصفیه مالیه' then 'tax_settlement'
  else workflow_key
end
where workflow_key is null;

insert into public.services (
  organization_id, name, category, description, default_price,
  public_listed, public_content, required_documents, workflow_steps,
  estimated_days, public_order, fee_quote_required, status, is_demo, workflow_key
)
select o.id, s.name, s.category, s.description, 0, true, '{}'::jsonb, '[]'::jsonb, s.workflow_steps,
       s.estimated_days, 100 + s.ord, true, 'active', o.is_demo, s.workflow_key
from public.organizations o
cross join (
  values
    ('تصفیه مالیاتی','tax','مدیریت کامل دوسیه تصفیه مالیاتی مشتری از ثبت درخواست تا ثبت تصفیه و بستن دوسیه.','tax_settlement',21,1,'{"fa":["ثبت درخواست و تشکیل دوسیه","جمع‌آوری و بررسی اسناد مالیاتی","بررسی بدهی و تعهدات مالی","محاسبه و تأیید مبلغ تصفیه","ثبت پرداخت و تطبیق باقی‌مانده","ثبت تصفیه، صدور سند و بستن دوسیه"],"ps":["د غوښتنې ثبتول او دوسیه جوړول","د مالیاتي اسنادو راټولول او ارزونه","د پور او مالي تعهداتو ارزونه","د تصفیې مبلغ محاسبه او تایید","تادیه ثبتول او پاتې مبلغ تطبیقول","تصفیه ثبتول، سند صادرول او دوسیه تړل"],"en":["Register request and open case","Collect and review tax documents","Review liabilities and financial obligations","Calculate and approve settlement amount","Record payment and reconcile balance","Record clearance, issue document and close case"]}'::jsonb),
    ('تمدید جواز','licensing','مدیریت عملیاتی درخواست تمدید جواز، بررسی وضعیت مالی و تکمیل دوسیه.','license_renewal',14,2,'{"fa":["ثبت درخواست تمدید و تشکیل دوسیه","بررسی جواز فعلی و اسناد","بررسی وضعیت مالیاتی و بدهی","رفع موانع مالی و ثبت پرداخت","بررسی نهایی اسناد تمدید","ثبت نتیجه و بستن دوسیه"],"ps":["د تمدید غوښتنه ثبتول او دوسیه جوړول","د اوسني جواز او اسنادو ارزونه","د مالیاتي حالت او پور ارزونه","مالي خنډونه لرې کول او تادیه ثبتول","د تمدید اسنادو وروستۍ ارزونه","پایله ثبتول او دوسیه تړل"],"en":["Register renewal request and open case","Review current licence and documents","Review tax status and liabilities","Resolve financial blockers and record payment","Final review of renewal documents","Record result and close case"]}'::jsonb),
    ('اخذ جواز','licensing','مدیریت عملیاتی دوسیه اخذ جواز از ثبت متقاضی تا تکمیل و تسلیمی.','license_acquisition',21,3,'{"fa":["ثبت متقاضی و تشکیل دوسیه","جمع‌آوری و بررسی معلومات و اسناد","بررسی مالی و تعهدات","تکمیل اسناد و فورم‌ها","بازبینی و تأیید نهایی","تسلیمی، ثبت نتیجه و بستن دوسیه"],"ps":["متقاضي ثبتول او دوسیه جوړول","معلومات او اسناد راټولول او ارزول","مالي او تعهداتو ارزونه","اسناد او فورمونه بشپړول","وروستۍ بیاکتنه او تایید","سپارل، پایله ثبتول او دوسیه تړل"],"en":["Register applicant and open case","Collect and review information and documents","Review financial position and obligations","Complete documents and forms","Final review and confirmation","Submit, record result and close case"]}'::jsonb),
    ('لغو جواز','licensing','مدیریت عملیاتی لغو جواز همراه با بررسی تعهدات و تصفیه مالی.','license_cancellation',10,4,'{"fa":["ثبت درخواست لغو و تشکیل دوسیه","بررسی جواز و تعهدات باقی‌مانده","بررسی بدهی و تصفیه مالی","تکمیل اسناد و درخواست لغو","تأیید نهایی مشتری و مسئول","ثبت نتیجه لغو و بستن دوسیه"],"ps":["د لغوه غوښتنه ثبتول او دوسیه جوړول","د جواز او پاتې تعهداتو ارزونه","د پور او مالي تصفیې ارزونه","اسناد او د لغوه غوښتنه بشپړول","د مراجع او مسوول وروستی تایید","د لغوه پایله ثبتول او دوسیه تړل"],"en":["Register cancellation request and open case","Review licence and outstanding obligations","Review liabilities and financial settlement","Complete documents and cancellation request","Final client and responsible review","Record cancellation result and close case"]}'::jsonb),
    ('رفع تعلیق','licensing','مدیریت دوسیه رفع تعلیق از تشخیص دلیل تا تکمیل شرایط و ثبت نتیجه.','license_unfreeze',14,5,'{"fa":["ثبت درخواست رفع تعلیق","تشخیص دلیل و شرایط تعلیق","ایجاد و اجرای اقدامات اصلاحی","بررسی تعهدات مالی و پرداخت‌ها","تکمیل اسناد و تأیید نهایی","ثبت رفع تعلیق و بستن دوسیه"],"ps":["د تعلیق لرې کولو غوښتنه ثبتول","د تعلیق دلیل او شرایط تشخیصول","اصلاحي اقدامات جوړول او اجرا کول","د مالي تعهداتو او تادیاتو ارزونه","اسناد بشپړول او وروستی تایید","د تعلیق لرې کول ثبتول او دوسیه تړل"],"en":["Register suspension-lifting request","Identify suspension reason and conditions","Create and execute corrective actions","Review financial obligations and payments","Complete documents and final approval","Record reinstatement and close case"]}'::jsonb),
    ('ترتیب پلان اصلاحی','licensing','مدیریت پلان اصلاحی مرحله‌ای با مبلغ، موعد، پرداخت و تأیید هر مرحله.','corrective_plan',30,6,'{"fa":["ثبت مشکل و تعهد","تعیین مراحل، مبلغ و موعد","ثبت اجرای هر مرحله","ثبت پرداخت و تطبیق مبلغ","تأیید مرحله و فعال‌سازی مرحله بعد","تکمیل پلان و ثبت نتیجه نهایی"],"ps":["ستونزه او تعهد ثبتول","پړاوونه، مبلغ او نېټه ټاکل","د هر پړاو اجرا ثبتول","تادیه ثبتول او مبلغ تطبیقول","پړاو تاییدول او بل پړاو فعالول","پلان بشپړول او وروستۍ پایله ثبتول"],"en":["Record issue and obligation","Set stages, amounts and due dates","Record execution of each stage","Record payment and reconcile amount","Approve stage and activate next stage","Complete plan and record final result"]}'::jsonb)
) as s(name, category, description, workflow_key, estimated_days, ord, workflow_steps)
where not exists (
  select 1 from public.services x where x.organization_id = o.id and x.workflow_key = s.workflow_key
);