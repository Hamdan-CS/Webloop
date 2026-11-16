/*
  # 030 — Official (verified) profiles

  The app marks the official WebLoop account with a verified tick, an
  "Official" label and the WebLoop logo. Official = the profile is in
  admin_roles.

  admin_roles stays unreadable (REVOKE in migration 021). This function
  exposes ONLY the list of profile ids in it — no granted_by, no timestamps,
  nothing else — and is callable by guests too, because the Feed and
  profile pages are public.
*/

CREATE OR REPLACE FUNCTION public.official_profile_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT profile_id FROM public.admin_roles;
$$;

REVOKE ALL ON FUNCTION public.official_profile_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.official_profile_ids() TO anon, authenticated;
