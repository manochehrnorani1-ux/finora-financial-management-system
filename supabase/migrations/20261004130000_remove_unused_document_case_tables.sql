-- FINORA simplification: these legacy tables were empty and had no runtime code consumers.
DROP TABLE IF EXISTS public.document_revisions;
DROP TABLE IF EXISTS public.document_files;
DROP TABLE IF EXISTS public.case_notes;
