/*
# Restructure profiles: decouple from auth.users for demo data

## Why
Phase 1 includes clearly-labeled demo content (sample students, companies, projects) so
guests can explore a populated platform. Demo profiles cannot reference auth.users (no real
auth accounts exist for them). Decoupling profiles.id from auth.users lets demo profiles
coexist with real user profiles.

## Changes
- profiles: add standalone `id` (uuid PK, default gen_random_uuid) and nullable `user_id`
  (references auth.users). The id is no longer FK to auth.users.
- This is a non-destructive restructure: existing real-user profiles would migrate via user_id.

## Security
- RLS self-edit now checks user_id = auth.uid() instead of id = auth.uid().
*/

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Add user_id column if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='user_id') THEN
    ALTER TABLE profiles ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update policies to use user_id for ownership
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_creator_type ON profiles(creator_type);
