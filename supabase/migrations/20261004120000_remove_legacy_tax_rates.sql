-- FINORA simplification
-- tax_rates was a legacy rate table. Runtime tax calculation uses verified tax_rules.
-- Existing historical tax_records are intentionally preserved.
DROP TABLE IF EXISTS public.tax_rates;
