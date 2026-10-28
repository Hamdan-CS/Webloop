/*
# Enable realtime for the floating Messages/Tasks panel

## Why
The Messages and Tasks floating panel (replacing the old Profile page tabs)
subscribes to Supabase realtime on `messages`, `tasks`, and `task_submissions`
so badge counts and open conversations/task lists update live without a
manual refresh. Tables must be added to the `supabase_realtime` publication
for `postgres_changes` subscriptions to receive events.

## Changes
- Add `messages`, `tasks`, `task_submissions` to the `supabase_realtime`
  publication. No row-level security or data changes — RLS still governs
  which rows a subscriber actually receives.
*/

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE task_submissions;
