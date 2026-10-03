-- Restore active application models that are still consumed by runtime code.
create table if not exists public.case_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  body text not null,
  visibility text not null default 'internal',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.document_revisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  document_id uuid not null references public.documents(id) on delete cascade,
  revision integer not null,
  snapshot jsonb not null,
  changes jsonb not null,
  reason text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.document_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  document_id uuid not null references public.documents(id) on delete cascade,
  attachment_id uuid not null references public.attachments(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text not null,
  file_size bigint not null,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists case_notes_case_idx on public.case_notes(case_id, created_at);
create index if not exists document_revisions_document_idx on public.document_revisions(document_id, revision);
create index if not exists document_files_document_idx on public.document_files(document_id, created_at);
