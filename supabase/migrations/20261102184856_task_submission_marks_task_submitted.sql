create function public.mark_task_submitted() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.tasks set status = 'submitted' where id = new.task_id;
  return new;
end $$;
revoke execute on function public.mark_task_submitted() from public, anon, authenticated;
create trigger task_submission_marks_task_submitted
after insert on public.task_submissions
for each row when (new.status = 'pending')
execute function public.mark_task_submitted();
