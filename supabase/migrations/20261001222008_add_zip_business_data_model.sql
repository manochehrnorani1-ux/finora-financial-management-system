-- ZIP-derived business data model.
-- Adds only fields/entities that are required by the supplied business documents.
-- No destructive operations and no changes to existing rows.

alter table public.customers
  add column if not exists english_name text,
  add column if not exists trade_name text,
  add column if not exists trade_name_en text;

alter table public.documents
  add column if not exists expiry_date date,
  add column if not exists issuing_authority text;

create table if not exists public.customer_licenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  license_number text not null,
  license_type text not null,
  issuing_authority text,
  issue_date date,
  expiry_date date,
  activity text,
  service_types jsonb not null default '[]'::jsonb,
  required_capital numeric(18,2) not null default 0,
  working_capital numeric(18,2) not null default 0,
  guarantee_amount numeric(18,2) not null default 0,
  status text not null default 'active',
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customer_licenses_number_unique
  on public.customer_licenses(organization_id, customer_id, license_number);
create index if not exists customer_licenses_customer_idx
  on public.customer_licenses(organization_id, customer_id, expiry_date);

create table if not exists public.customer_shareholders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  full_name text not null,
  father_name text,
  grandfather_name text,
  national_id text,
  tin text,
  phone text,
  email text,
  province text,
  district text,
  area text,
  address text,
  education_level text,
  education_field text,
  work_experience_years integer,
  ownership_percentage numeric(7,4),
  share_value numeric(18,2) not null default 0,
  role text,
  status text not null default 'active',
  photo_attachment_id uuid references public.attachments(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_shareholders_customer_idx
  on public.customer_shareholders(organization_id, customer_id, status);
create unique index if not exists customer_shareholders_identity_unique
  on public.customer_shareholders(organization_id, customer_id, national_id)
  where national_id is not null;

create table if not exists public.customer_employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  full_name text not null,
  father_name text,
  national_id text,
  tin text,
  phone text,
  email text,
  position text,
  department text,
  education_level text,
  education_field text,
  work_experience_years integer,
  employment_date date,
  salary numeric(18,2) not null default 0,
  province text,
  district text,
  area text,
  address text,
  status text not null default 'active',
  photo_attachment_id uuid references public.attachments(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_employees_customer_idx
  on public.customer_employees(organization_id, customer_id, status);
create unique index if not exists customer_employees_identity_unique
  on public.customer_employees(organization_id, customer_id, national_id)
  where national_id is not null;

create table if not exists public.customer_branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  branch_number text,
  name text,
  province text,
  district text,
  area text,
  village text,
  market text,
  floor text,
  shop_number text,
  address text,
  phone text,
  email text,
  representative_employee_id uuid references public.customer_employees(id) on delete set null,
  license_number text,
  issue_date date,
  expiry_date date,
  status text not null default 'active',
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_branches_customer_idx
  on public.customer_branches(organization_id, customer_id, status);
create unique index if not exists customer_branches_number_unique
  on public.customer_branches(organization_id, customer_id, branch_number)
  where branch_number is not null;

create table if not exists public.customer_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  bank_name text not null,
  account_name text not null,
  account_number text not null,
  branch_number text,
  currency text not null default 'AFN',
  status text not null default 'active',
  statement_attachment_id uuid references public.attachments(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_bank_accounts_customer_idx
  on public.customer_bank_accounts(organization_id, customer_id, status);
create unique index if not exists customer_bank_accounts_number_unique
  on public.customer_bank_accounts(organization_id, customer_id, account_number);

create table if not exists public.customer_guarantees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  beneficiary_shareholder_id uuid references public.customer_shareholders(id) on delete set null,
  guarantor_name text not null,
  guarantor_father_name text,
  guarantor_national_id text,
  guarantor_tin text,
  guarantor_phone text,
  guarantor_province text,
  guarantor_district text,
  guarantor_area text,
  guarantor_village text,
  business_name text,
  business_type text,
  business_license_number text,
  business_license_expiry date,
  business_issuing_authority text,
  business_address text,
  photo_attachment_id uuid references public.attachments(id) on delete set null,
  guarantee_type text not null default 'shareholder',
  start_date date,
  end_date date,
  status text not null default 'active',
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_guarantees_customer_idx
  on public.customer_guarantees(organization_id, customer_id, status);
create index if not exists customer_guarantees_beneficiary_idx
  on public.customer_guarantees(organization_id, beneficiary_shareholder_id);

alter table public.customer_licenses enable row level security;
alter table public.customer_shareholders enable row level security;
alter table public.customer_employees enable row level security;
alter table public.customer_branches enable row level security;
alter table public.customer_bank_accounts enable row level security;
alter table public.customer_guarantees enable row level security;
