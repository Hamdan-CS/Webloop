/*
# 023 · Members can take an open (general) task

Project owners can create a task without an assignee ("General task, open to
the team"). Until now only the owner could update tasks, so a member could
not pick one up. This adds one narrowly scoped function instead of widening
the tasks UPDATE policy (a policy cannot limit which columns change):

- `claim_task(p_task_id)` — the signed-in user takes the task only if
  * they are a member of the task's project (project_members), and
  * the task is still unassigned and `open`.
  It sets `assignee_id` to the caller and `status` to `in_progress` (the same
  rule createTask/assign use: having an assignee means work has started).
  Nothing else on the task can change through it.
- The row is locked while checking, so two members can't take it at once.

The tasks RLS policies are unchanged.
*/

CREATE OR REPLACE FUNCTION public.claim_task(p_task_id uuid)
RETURNS tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_task tasks;
BEGIN
  SELECT profiles.id INTO v_profile_id
  FROM profiles
  WHERE profiles.user_id = auth.uid();

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'NOT_SIGNED_IN';
  END IF;

  SELECT * INTO v_task FROM tasks WHERE id = p_task_id FOR UPDATE;

  IF v_task.id IS NULL THEN
    RAISE EXCEPTION 'TASK_NOT_FOUND';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = v_task.project_id AND profile_id = v_profile_id
  ) THEN
    RAISE EXCEPTION 'NOT_A_MEMBER';
  END IF;

  IF v_task.assignee_id IS NOT NULL OR v_task.status <> 'open' THEN
    RAISE EXCEPTION 'TASK_ALREADY_TAKEN';
  END IF;

  UPDATE tasks
  SET assignee_id = v_profile_id, status = 'in_progress', updated_at = now()
  WHERE id = p_task_id
  RETURNING * INTO v_task;

  RETURN v_task;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_task(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.claim_task(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_task(uuid) TO authenticated;
