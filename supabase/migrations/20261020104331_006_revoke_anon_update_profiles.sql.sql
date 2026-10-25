/*
# Revoke UPDATE on profiles from anon role

## Purpose
The previous role-based access control migration revoked table-wide UPDATE from
`authenticated` and re-granted only user-editable columns. The `anon` role still
held a broad table-level UPDATE grant on profiles (inherited from the default
public grants), which is unnecessary — anon users cannot update any profile
(they have no auth.uid(), so the update_own_profile RLS policy blocks them
regardless). This tightens the grant to remove the unused and potentially
confusing anon UPDATE access.

## Changes
- REVOKE UPDATE on profiles FROM anon.
- No re-grant: anon does not need UPDATE on profiles.

## Security
- Defense in depth: even though RLS already blocks anon updates via the
  user_id = auth.uid() check (which is null for anon), removing the column
  privilege ensures the column-level guard also holds for anon, not just
  authenticated.
*/

REVOKE UPDATE ON profiles FROM anon;
