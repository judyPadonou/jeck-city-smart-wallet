-- Replace the partial unique index with a real UNIQUE constraint so ON CONFLICT (osm_id) works.
-- Postgres allows multiple NULLs in a standard UNIQUE constraint, so Pro merchants
-- (which have osm_id = NULL) remain unaffected.
DROP INDEX IF EXISTS public.merchants_osm_id_unique;

ALTER TABLE public.merchants
  ADD CONSTRAINT merchants_osm_id_key UNIQUE (osm_id);