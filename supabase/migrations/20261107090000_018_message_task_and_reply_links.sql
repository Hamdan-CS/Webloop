/*
# Link messages to tasks and to other messages (quote-reply)

## Purpose
Lets a project owner create a task directly from a chat conversation (auto-assigned to
the other person in that conversation) with a reference card shown in the thread, and
lets either side of a conversation quote-reply to any message.

## Changes
- `messages.task_id` (nullable, FK tasks, ON DELETE SET NULL): set when a message is the
  task-reference card produced by "Add Task" in a conversation.
- `messages.reply_to_id` (nullable, self-referencing FK messages, ON DELETE SET NULL):
  set when a message quotes an earlier message in the same conversation.
- No RLS changes needed: existing `messages` policies (migration 004) are row-level
  (sender/recipient), not column-restricted, so these new nullable columns are already
  covered by the existing INSERT/SELECT policies.
*/

ALTER TABLE messages ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_task ON messages(task_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_id);
