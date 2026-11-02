create index if not exists idx_messages_project on public.messages (project_id);
create index if not exists idx_project_members_profile on public.project_members (profile_id);
create index if not exists idx_projects_owner on public.projects (owner_id);
create index if not exists idx_reviews_project on public.reviews (project_id);
create index if not exists idx_reviews_reviewer on public.reviews (reviewer_id);
create index if not exists idx_tasks_created_by on public.tasks (created_by);
