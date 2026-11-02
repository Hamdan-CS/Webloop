-- 1. Profiles are created only by the signup trigger. The app never inserts them.
revoke insert on public.profiles from anon, authenticated;

-- 2. Message recipients can mark a message read, but can't edit it.
revoke update on public.messages from anon, authenticated;
grant update (is_read) on public.messages to authenticated;

-- 3. New applications must start as pending.
alter policy insert_own_application on public.applications
with check (
  status = 'pending'
  and exists (
    select 1 from public.profiles
    where profiles.id = applications.applicant_id
      and profiles.user_id = (select auth.uid())
  )
);

-- 4. Only the assignee can submit, under their own name, as an unreviewed
--    submission, and only while the task is still open for work.
alter policy insert_own_task_submissions on public.task_submissions
with check (
  status = 'pending'
  and reviewed_at is null
  and rating is null
  and reviewer_feedback is null
  and exists (
    select 1
    from public.tasks
    join public.profiles on profiles.id = tasks.assignee_id
    where tasks.id = task_submissions.task_id
      and profiles.id = task_submissions.submitted_by
      and profiles.user_id = (select auth.uid())
      and tasks.status in ('open', 'in_progress', 'changes_requested')
  )
);

-- 5. Nobody needs to call the signup function directly. The trigger still runs it.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
