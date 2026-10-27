/*
# Profile builder: preferred roles, languages, portfolio links, image storage

## Why
The profile-builder wizard (attached reference design) ports skill, preferred-role,
and language tag fields plus a portfolio/project links list and real avatar/banner
image uploads. `profiles` had no columns for roles/languages/portfolio links, and no
Supabase Storage bucket existed anywhere in this project for images.

## Changes
- profiles: add `preferred_roles text[]`, `languages text[]`, `portfolio_links text[]`,
  each NOT NULL DEFAULT '{}' — additive, nullable-equivalent, no existing data touched.
- Column-level UPDATE grant for these three columns to `authenticated`, following the
  same pattern migration 005 established for every other client-editable profile field.
- New public storage bucket `profile-media` (5MB limit, image/png|jpeg|webp only) for
  avatar/banner uploads, with RLS so an authenticated user may only write inside a
  folder named after their own auth.uid() (`profile-media/{uid}/...`). Read is public,
  consistent with profiles already being publicly viewable.

## Security
- RLS on storage.objects restricts writes to the uploader's own folder.
- No existing columns, policies, or grants are modified or removed.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_roles text[] NOT NULL DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portfolio_links text[] NOT NULL DEFAULT '{}';

GRANT UPDATE (preferred_roles, languages, portfolio_links) ON profiles TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-media', 'profile-media', true, 5242880, ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "profile media public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-media');

CREATE POLICY "profile media insert own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'profile-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "profile media update own folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'profile-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "profile media delete own folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'profile-media' AND (storage.foldername(name))[1] = auth.uid()::text);
