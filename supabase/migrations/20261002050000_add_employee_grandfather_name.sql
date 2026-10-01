-- ZIP source form "معلومات عمومی سهمداران و کارمندان شرکت" contains a separate ولدیت value.
-- Non-destructive: add only the missing employee source field.
alter table public.customer_employees
  add column if not exists grandfather_name text;
