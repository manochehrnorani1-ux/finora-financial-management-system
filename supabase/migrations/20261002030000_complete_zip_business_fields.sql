-- Complete fields identified directly from ZIP source documents.
-- Non-destructive: adds only genuinely missing business-data columns.
alter table public.customers
  add column if not exists market text,
  add column if not exists floor text,
  add column if not exists shop_number text;

alter table public.customer_employees
  add column if not exists village text;

alter table public.customer_guarantees
  add column if not exists business_phone text,
  add column if not exists business_email text;
