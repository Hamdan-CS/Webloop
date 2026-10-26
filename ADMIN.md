# WebLoop

A student project collaboration & talent marketplace: students ship real software, find teammates, build verified portfolios, and get discovered by companies/universities based on reviewed contributions rather than resumes.

Vite + React 18 + TypeScript, Tailwind CSS, React Router, Supabase (Postgres + Auth), three.js/@react-three/fiber for the homepage hero.

## Running it

```bash
npm install
npm run dev        # vite dev server, http://localhost:5173
npm run build       # production build -> dist/
npm run lint
npm run typecheck   # tsc --noEmit -p tsconfig.app.json
```

Requires `.env` (gitignored) with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Structure

- `src/pages/` — one component per route, wired up in [App.tsx](src/App.tsx).
- `src/components/auth/` — `AuthContext` (Supabase session/profile state), `AuthPrompt` (modal that prompts sign-in for gated actions), `RoleRoute` (guards dashboard routes by `creator_type`).
- `src/components/projects/` — project card/detail/task/application UI shared across pages.
- `src/components/layout/` — `Navbar`, `Footer`.
- `src/components/ui/` — small presentational primitives (`Avatar`, `Badge`, `Button`, `Rating`, `Select` — a custom-styled listbox used instead of a native `<select>`, since the native option popup can't be themed to match the dark UI).
- `src/lib/api.ts` — all Supabase queries (profiles, projects, applications, tasks/submissions, messages, reviews). Pages call these instead of touching `supabase` directly.
- `src/lib/types.ts` — shared domain types (`Profile`, `Project`, `Task`, `TaskSubmission`, `Message`, `Review`, etc.) mirroring the Postgres schema.
- `src/lib/supabase.ts` — Supabase client, built from the `VITE_SUPABASE_*` env vars.
- `supabase/migrations/` — numbered SQL migrations; the source of truth for the schema, RLS policies, and grants (applied directly against the hosted Supabase project, not run locally).
- Import alias: `@/` → `src/` (see [vite.config.ts](vite.config.ts)).

## Supabase setup

- Auth: Supabase Auth (email/password). `profiles` rows are created via a DB trigger on `auth.users` insert, decoupled from `auth.users` by `user_id` (see migrations 001–002) so `is_demo` seed profiles can exist without a real auth user.
- `AuthContext` loads the current profile via the `get_profile_by_user_id` RPC rather than a plain table select.
- Core tables: `profiles`, `projects` (+ `project_skills`, `project_roles`, `project_members`), `applications`, `tasks`, `task_submissions`, `messages`, `reviews`, `portfolio_items`.
- Access control is enforced with Postgres RLS policies plus table-level `GRANT`/`REVOKE` to the `anon` and `authenticated` roles — both layers matter. Migration 009 revoked `anon` SELECT on `tasks`/`task_submissions` and restricted reads to the project owner/accepted members; anything in app code that queries those tables for a public/anon audience (e.g. aggregate stats on a public profile) will now fail with a Postgres permission error rather than an RLS-empty result.
- Migration 010 added `profiles.linkedin_url` (nullable), alongside the pre-existing `github_url`/`website_url`.

## Known issue

`fetchProfileContributions` in [src/lib/api.ts](src/lib/api.ts) selects directly from `task_submissions` to compute the "approved contributions" stat shown on every [CreatorProfilePage](src/pages/CreatorProfilePage.tsx). Since migration 009 revoked `anon` SELECT on that table, this call throws for anonymous visitors, and because `loadData` in `CreatorProfilePage` has no try/catch around it, the page gets stuck on its loading spinner. Needs either a `SECURITY DEFINER` RPC that returns just the counts, or a narrower public policy/grant.
