/*
# Phase 3: Profile Management, Banners, and Messaging

## Purpose
Adds profile banner images, a simple on-platform messaging system so users can
contact each other, and exposes project management (delete + status updates)
that the frontend will use on the creator profile page.

## Changes

### 1. profiles: add banner_url column
- New nullable `banner_url` text column for a custom banner image on profile pages.
- No security change needed — profiles SELECT is already public; UPDATE is
  owner-scoped via user_id = auth.uid().

### 2. New table: messages
- Simple threaded messaging between profiles.
- Fields: id, sender_id, recipient_id, project_id (optional context), body,
  is_read, created_at.
- RLS: a user can read/insert/update-read-status only on messages where they
  are the sender or recipient (checked through profiles.user_id = auth.uid()).

### 3. applications: add applicant_count convenience
- No schema change needed; the frontend counts applications per project via
  fetchProjectApplications. RLS already allows project owners to read
  applications on their projects.

## Security
- profiles: existing UPDATE policy covers banner_url.
- messages: 4 new CRUD policies (select/insert/update/delete) scoped to
  sender OR recipient via profiles.user_id = auth.uid().
*/

-- ============================================================
-- 1. profiles: banner_url
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url text;

-- ============================================================
-- 2. messages table
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- A user can read messages they sent or received
DROP POLICY IF EXISTS "select_own_messages" ON messages;
CREATE POLICY "select_own_messages" ON messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = messages.sender_id AND p.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = messages.recipient_id AND p.user_id = auth.uid())
  );

-- A user can send messages as themselves
DROP POLICY IF EXISTS "insert_own_messages" ON messages;
CREATE POLICY "insert_own_messages" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = messages.sender_id AND p.user_id = auth.uid())
  );

-- A recipient can mark their messages as read
DROP POLICY IF EXISTS "update_own_messages" ON messages;
CREATE POLICY "update_own_messages" ON messages FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = messages.recipient_id AND p.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = messages.recipient_id AND p.user_id = auth.uid())
  );

-- Sender or recipient can delete a message
DROP POLICY IF EXISTS "delete_own_messages" ON messages;
CREATE POLICY "delete_own_messages" ON messages FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = messages.sender_id AND p.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = messages.recipient_id AND p.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(recipient_id, is_read);
