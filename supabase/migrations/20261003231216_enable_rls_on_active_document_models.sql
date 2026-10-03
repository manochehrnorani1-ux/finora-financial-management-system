-- Enable RLS on active document/case support tables.
alter table public.case_notes enable row level security;
alter table public.document_files enable row level security;
alter table public.document_revisions enable row level security;
