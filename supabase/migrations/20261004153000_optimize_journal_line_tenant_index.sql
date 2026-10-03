-- Scope journal-line lookups by organization and journal entry.
create index if not exists jel_entry_org_idx
  on public.journal_entry_lines (organization_id, journal_entry_id);

drop index if exists public.jel_entry_idx;
