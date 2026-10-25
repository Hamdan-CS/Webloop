/*
# Add linkedin_url to profiles

1. Modified Tables
- profiles: added `linkedin_url` (text, nullable) — optional LinkedIn profile URL
2. Security
- No RLS changes needed — the new column inherits the table's existing policies.
- UPDATE grant already covers the new column (table-level grant).
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_url text;
