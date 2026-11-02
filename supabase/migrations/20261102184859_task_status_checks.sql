alter table public.tasks add constraint tasks_status_check check (status in
  ('open','in_progress','submitted','approved','changes_requested','rejected'));
alter table public.task_submissions add constraint task_submissions_status_check check (status in
  ('pending','approved','changes_requested','not_completed','rejected'));
