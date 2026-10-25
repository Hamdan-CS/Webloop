/*
# Fix search_path on update_tasks_updated_at function

Sets a fixed search_path on the trigger function to satisfy the database linter
(function_search_path_mutable warning). This is a security hardening fix — the
function behavior is unchanged.
*/

CREATE OR REPLACE FUNCTION public.update_tasks_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
