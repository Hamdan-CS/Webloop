create policy select_own_projects on public.projects
for select to authenticated using (
  exists (select 1 from public.profiles pr
          where pr.id = projects.owner_id and pr.user_id = (select auth.uid()))
);
