/*
# Profile builder: education level, university, major, graduation year

## Why
The reference profile-builder design requires education level, university, and
major in its first step, and offers a graduation year in "About you". These had
no column on `profiles` yet.

## Changes
- profiles: add `education_level text`, `university text`, `major text`,
  `graduation_year integer` — all nullable, additive, no existing data touched.
- Column-level UPDATE grant for these four columns to `authenticated`, following
  the same pattern migration 005 established for every other client-editable
  profile field.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education_level text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS university text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS major text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS graduation_year integer;

GRANT UPDATE (education_level, university, major, graduation_year) ON profiles TO authenticated;
