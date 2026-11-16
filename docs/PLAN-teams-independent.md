# WebLoop — Teams + Independent accounts (plan)

Nov 15, 2026 · @Abbas

Two changes: teams become groups that students create (not an account type), and a new **Independent** account joins Student, Company and University. Both need Supabase migrations.

## Decisions

| Topic | Decision |
| --- | --- |
| Name of the new account type | **Independent** — shown on the sign-up page next to Student, Company, University |
| Can Independents join or work on projects? | No. They can comment, recommend, post in the Feed, and publish their own projects and research |
| Who can join an Independent's project? | Students (and their teams). Not other Independents, companies or universities |
| Do tasks an Independent approves count as "verified"? | **Only if WebLoop has approved that Independent** (admin approval). Until then, approved tasks show but don't count as verified |
| Paid projects for Independents? | **Never.** Unpaid/educational and open-source only |
| The old "team" account type | Remove it. Existing team accounts become student accounts |
| What is a team? | A **reusable group** that a student creates: name, optional logo, members, own team page, used for many projects |
| Who can be in a team? | Students only (for now) |
| Publishing | Choose **Personal project** or **Team project**; Team = pick an existing team or create one and invite members |
| Explore cards | Team projects show "by \<Team name>" + member avatars, linking to the team page |

## Part A — Remove the unused "team" account type

The database allows `team` as an account type, but the sign-up page never offers it, so it is a leftover. Teams become groups in Part B instead.

**Where "team" is used today**

- Database: `profiles.creator_type` CHECK `('student','team','company','university')` (migration 001); sign-up triggers in migrations 005 and 019; feed rule in 021 (`creator_type IN ('student','team')`).
- Code: `src/types/index.ts` (`CreatorType`), `src/utils/roles.ts`, `App.tsx` (routes for `/dashboard/student`, `/my-applications`), `CreatorProfilePage.tsx`, `PostComposer.tsx`, `services/api.ts` (student count), feed filter "Student teams" (`FeedSidebar.tsx`, `features/feed/types.ts`).

**Steps**

1. **Check first** (read-only SQL): `select count(*) from profiles where creator_type = 'team';` Report the number to Abbas before changing anything.
2. **Migration `024_remove_team_account_type`:**
   - `update profiles set creator_type = 'student' where creator_type = 'team';`
   - Change the `creator_type` CHECK to `('student','company','university','independent')` (`independent` is added here so Part C doesn't need a second constraint change).
   - Update `handle_new_user` (latest version from 019) so unknown types fall back to `student` and `independent` is accepted.
   - Update the feed rule from 021 to `creator_type = 'student'`.
3. **Code:** remove `'team'` from `CreatorType` and every place listed above. Replace the feed filter "Student teams" with "Team projects" (posts linked to a team project) or remove it.
4. Regenerate Supabase types if the project uses generated types.

**Test:** sign up as a student → works; the feed filters still work; `tsc` and `eslint` pass; no `'team'` creator type left (`grep -rn "'team'" src` only finds Part B's team features).

## Part B — Teams: reusable groups of students

A student creates a team once (name, optional logo, members) and can use it for many projects. Team projects show the team name in Explore and link to a team page that builds a track record over time.

**What exists today:** the Publish page already has a "Personal project / Team project" switch (`PublishProjectPage.tsx`, `form.scope`), but it only hides the Open roles step; the choice isn't saved and there is no team name. Project invitations already work (`invitations` table, `inviteUserToProject`, accept RPC in migration 017).

### Database (migration `025_teams`)

| Table / column | Fields | Notes |
| --- | --- | --- |
| `teams` | `id`, `name`, `slug` (unique), `logo_url`, `bio`, `created_by` (profile), `created_at` | Name 2–40 characters |
| `team_members` | `team_id`, `profile_id`, `role` (`owner` / `member`), `status` (`invited` / `active`), `invited_by`, `joined_at` | Unique (`team_id`, `profile_id`) |
| `projects.team_id` | nullable FK → `teams.id` | `null` = personal project |

**Rules (RLS):**

- Anyone can read teams and active members (public pages).
- Only students can create teams or be team members (check `profiles.creator_type = 'student'`).
- Only the team owner can rename the team, change the logo, invite or remove members.
- An invited student can accept or decline their own invite; a member can leave.
- Only the project owner can set `projects.team_id`, and only to a team they are an active member of.

### Publish flow

1. Step "Is it personal or a team project?" (already there) → save the choice.
2. **Team project** → a dropdown: "Choose one of your teams" + "Create a new team".
3. **Create a new team** → team name + search students by name or @handle to invite (optional logo later).
4. Invited students get a notification + an entry in My invitations: "\<Name> invited you to join team \<Team> on project \<Project>". Accept → they become an active team member **and** a project member (reuse the existing invitation accept RPC, extended with `team_id`).
5. The project is saved with `team_id`.

**Rule: a team project needs at least one other person (decided)**

- **New team:** Publish stays disabled until at least 1 student is invited. The invite can still be pending; nobody has to accept first.
- **Existing team:** allowed if the team has at least 1 other member (active or invited).
- **All invites declined / everyone left:** the project stays a team project. The owner sees a note on the project and in Lab: "Your team only has you right now. Invite someone, or switch to a personal project" with both buttons. Never switch to personal automatically.
- **Explore card:** shows only active members' avatars; with only pending invites it shows just the owner until someone accepts.
- Test: try to publish a team project with no invites → blocked with a short message; with 1 pending invite → publishes.

### Where teams show

- **Explore project cards** (`ProjectCard.tsx`): team projects show "by \<Team name>" + up to 4 member avatars instead of the single owner.
- **Team page** `/teams/<slug>`: name, logo, bio, members, all the team's projects, total verified tasks.
- **Student profile**: a "Teams" section listing the teams they are in.
- **Lab (app)**: a "My teams" list (sidebar section or inside Projects) with create/manage team.

### Steps for Claude Code

1. Migration `025_teams` (tables, `projects.team_id`, RLS, indexes on FKs).
2. Extend invitations: add nullable `team_id` to `invitations`; update the accept RPC to also insert into `team_members`.
3. API functions in `services/api.ts`: `createTeam`, `fetchMyTeams`, `fetchTeamBySlug`, `inviteToTeam`, `removeTeamMember`, `leaveTeam`.
4. Publish page: save scope, team picker, create-team form, invites.
5. `ProjectCard.tsx` + project detail page: show the team.
6. New page `pages/TeamPage.tsx` + route `/teams/:slug`.
7. Profile "Teams" section; Lab "My teams".

### Testing checklist

- [ ] Student A creates team "Byte Squad" while publishing and invites B and C.
- [ ] B accepts: B is in the team and the project; C declines: C is in neither.
- [ ] Explore card shows "by Byte Squad" with A and B avatars.
- [ ] A publishes a 2nd project and picks Byte Squad from the dropdown (no retyping).
- [ ] `/teams/byte-squad` lists members and both projects.
- [ ] A company or Independent account cannot create or join a team (UI hidden and blocked by RLS).
- [ ] B can leave the team; only A can rename it or remove members.
- [ ] Personal projects look exactly as before.

## Part C — Independent accounts

Independent is a new account type for people who aren't students, companies or universities: freelancers, alumni, industry professionals, independent researchers. They bring projects, research and advice to students, but they never join or work on projects themselves.

### What an Independent can and can't do

| Can | Can't |
| --- | --- |
| Publish projects and research (types "Independent project", "Research project") | Join, apply to or work on any project |
| Let students and their teams join their projects; assign tasks and review submissions | Let other Independents, companies or universities join their projects |
| Comment on and recommend projects | Offer paid projects (never) |
| Post in the Feed | Create or join teams |
| Recommend a project to a student; recommend a student to a company (referral) | Make approved tasks count as "verified" until WebLoop approves them |
| Endorse skills on student profiles | — |

### WebLoop approval ("Verified Independent")

- New profile fields: `independent_verified_at` (timestamp, null = not approved) and `independent_verified_by`.
- To ask for approval the Independent adds a LinkedIn **or** ORCID link and a short "who I am" note → a request appears in the admin Moderation queue (reuse `is_admin()` from migration 021). Admin approves or declines.
- Approved Independents get a "Verified Independent" badge on profile and project cards.
- **Verified tasks:** today a task counts as verified when `tasks.status = 'approved'` (contribution RPC in migration 011, contribution grid in 015). Change both so a task on a project owned by an Independent counts only if that Independent has `independent_verified_at` set. Unapproved Independents' approvals still show on the task, labelled "Approved by the project owner — not WebLoop-verified".

### Safety limits

- Email must be confirmed before publishing a project.
- LinkedIn or ORCID link required before publishing (not only for approval).
- Max 3 open projects at a time until approved.
- "Report" button on Independent projects and profiles → Moderation queue.
- Compensation options for Independents: `unpaid_educational`, `open_source` only (`ALLOWED_COMPENSATIONS` in `roles.ts` + a database check).

### Database (migration `026_independent_accounts`)

- `creator_type` already allows `independent` (Part A, migration 024).
- Profile fields above; `projects.project_type` gains `independent` and `research`.
- RLS: block `applications` and `project_members` inserts where the joining profile is `independent`; for projects owned by an Independent, only `student` profiles may apply or join.
- RLS/check: projects owned by an Independent can't use `compensation = 'paid'`.
- New tables: `recommendations` (`from_profile`, `to_profile`, `project_id` nullable, `kind` `project_to_student` / `student_to_company`, `note`, `created_at`) and `skill_endorsements` (`from_profile`, `to_profile`, `skill`, unique per pair+skill). Each creates a notification (reuse triggers from migration 022).
- Update the contribution RPC (011) and grid (015) for the verified-task rule.

### App changes

1. **Sign-up page** (`JoinPage.tsx`): 4th card "Independent" — "Share projects and research, guide students, and recommend talent." + its "What you get" list.
2. **Types/roles:** `CreatorType` adds `independent`; `ALLOWED_PROJECT_TYPES.independent = ['independent','research','open_source']`; `ALLOWED_COMPENSATIONS.independent = ['unpaid_educational','open_source']`; dashboard path/label.
3. **Dashboard** `/dashboard/independent`: My projects, Join requests, Tasks to review, Recommendations I made, Endorsements I gave, approval status card ("Get verified").
4. **Project pages:** hide Apply/Join for Independents; show "Recommend to a student" instead.
5. **Student profiles:** "Endorse a skill" and "Recommend to a company" buttons when viewed by an Independent.
6. **Admin:** approval requests in the Moderation queue.

### Testing checklist

- [ ] Sign up as Independent → lands on the Independent dashboard.
- [ ] Independent sees no Apply/Join button anywhere; a direct API insert into `applications` is refused.
- [ ] Independent publishes a research project; only Unpaid and Open-source are offered; a `paid` insert is refused.
- [ ] A student joins it; another Independent and a company cannot.
- [ ] Student finishes a task; Independent approves → shows as approved, but the student's verified count does **not** go up.
- [ ] Admin approves the Independent → that task now counts as verified; badge shows.
- [ ] Recommend a project to a student and a student to a company → both get notifications.
- [ ] Endorse a skill → shows on the student profile; can't endorse the same skill twice.
- [ ] Unapproved Independent can't have more than 3 open projects.

## Part D — Bring back "Add task" in Messages

On the new Messages page the **Add Task** button is still in the code (`ConversationThread.tsx`), but it almost never shows.

**Why:** the button only appears when the chat has a `projectId` **and** you own that project. Chats are now grouped per person (`MessagesPage.tsx`), and `projectId` comes only from that person's **last message** (`selected.projectId`). If the last message wasn't sent "about" a project you own (a plain message, a task, or their project), there is no `projectId`, so no button.

**Fix:**

1. Show **Add task** in a 1-to-1 chat whenever you own **at least one project the other person is a member of** (query `project_members` + `projects.owner_id`), not only when the last message has a project.
2. Clicking it opens the same **New Task** form as the project board (title, description, acceptance criteria, General task / Assign to a member, due date), with:
   - a **Project** dropdown at the top (the shared projects; pre-selected if the chat has a `projectId` or only one project is shared);
   - **Assign to** pre-filled with the person you are chatting with.
3. After creating, the task card is posted into the chat (as today with `task_id`).
4. In **project/team group chats** (Part E) the project owner gets the same button; Assign to = any member, or General task.

**Test:** chat with a member of your project whose last message is plain text → Add task shows; create it → task appears on the project board and as a card in the chat; chat with someone who shares no project with you → no button.

## Part E — Group chats for every project and team

Every project and every team gets its own group chat. Joining the project or team adds you to its group automatically; leaving removes you.

### How it works

| Event | Group chat result |
| --- | --- |
| A project is published | Project group created: "\<Project name>", owner is the first member |
| A student joins a project (application accepted or invite accepted) | Added to the project group |
| Someone leaves / is removed from a project | Removed from the project group (keeps no access to new messages) |
| A team is created | Team group created: "\<Team name>" |
| A student accepts a team invite / leaves the team | Added to / removed from the team group |
| A team project is published | Its project group starts with all active team members |

One-to-one chats stay as they are.

### Messages page

- Conversation list has groups and 1-to-1 chats together, newest first. Groups show the project dot or team logo, name, member count and "Name: last message".
- Group header: name, member avatars, link to the project/team page, **Add task** (owner only, Part D), **Mute**.
- Each message in a group shows the sender's avatar and name.
- Unread dot per group; group unread counts in the bell like 1-to-1 chats (one row per group).
- Works in the pop-out mini window too.

### Database (migration `027_group_chats`)

- `conversations`: `id`, `kind` (`project` / `team`), `project_id` (unique, nullable), `team_id` (unique, nullable), `created_at`.
- `conversation_members`: `conversation_id`, `profile_id`, `joined_at`, `last_read_at`, `muted`; unique pair.
- `messages`: add nullable `conversation_id`; a message has either `recipient_id` (1-to-1) **or** `conversation_id` (group).
- **Triggers** (SECURITY DEFINER, like migration 022): on `projects` insert → create group + owner; on `project_members` insert/delete → add/remove; on `teams` insert → create group; on `team_members` status `active`/delete → add/remove.
- **RLS:** read/send group messages only if you are in `conversation_members`; unread = messages newer than your `last_read_at`.
- **Backfill:** create groups for existing projects and add their current owners + members.
- Realtime: subscribe to the `messages` rows for your conversations (extend `useMessages`).

### Testing checklist

- [ ] Publish a project → its group appears in Messages with only you in it.
- [ ] Accept a student's join request → they see the group and earlier messages.
- [ ] Remove a member → they no longer see new group messages.
- [ ] Create a team with 2 invites; one accepts → team group has 2 members.
- [ ] Team project → project group has all active team members.
- [ ] A user who isn't a member can't read the group (try via API).
- [ ] Unread dot, bell row, Mute and the pop-out window work for groups.
- [ ] Existing projects got groups with their current members (backfill).

## Part F — Two quick design fixes (CSS only)

### F1. Companies page: banner images don't show

**Why:** `src/design-system/styles/pages.css` line 42 has `.cc .banner { … background: var(--g-aqua) !important; }`. The `!important` shorthand overrides the inline style in `CompanyCard.tsx`, so every card shows the same pale aqua strip: uploaded banners (`profiles.banner_url`) and the per-company colour gradient are both hidden.

**Fix:**

1. In `pages.css`, drop `!important` and set only the fallback: `.cc .banner { background-image: var(--g-aqua); background-size: cover; background-position: center; }`.
2. In `CompanyCard.tsx`, when `banner_url` exists set `backgroundImage: url(…)` (already done); when it doesn't, set no inline background so the aqua fallback shows (remove the hsl gradient, it clashes with the new design).
3. Note: most demo companies have no `banner_url`, so they will still show the aqua strip; that is expected. Check that the company **profile/settings** page lets companies upload a banner; if not, add it to Settings → Profile.

**Test:** set a `banner_url` on one company → its card shows the image; companies without one show the aqua strip; NovaAI's logo and badge still sit correctly over the banner.

### F2. Publish page: broken step bar + small scrollbar

**Why:** `index.css` line 1877: `.pub .pub-steps { … overflow-x: auto }`. The blue progress line (`.pub-steps-bar`) is positioned at `bottom: -1px` with `height: 2px`, so it sticks out of the box and the browser adds a tiny scrollbar (the ▲●▼ on the right). The line itself is a progress bar (25% on step 1 of 4), but with no grey track behind it, it looks like a broken underline.

**Fix:**

1. `.pub .pub-steps`: `overflow: visible` on desktop; on phones keep horizontal scroll but hide the scrollbar (`scrollbar-width: none; &::-webkit-scrollbar { display: none }`).
2. `.pub-steps-bar`: `bottom: 0` instead of `-1px`.
3. Make it read as progress: keep the full-width grey line (the existing `border-bottom`) as the track and the blue fill on top, with rounded ends; or, simpler, move the blue line under the **active step only** (like tabs). Recommended: active-step underline, because "29% complete" is already shown on the right.

**Animation (decided):** when the user moves from one step to another, the blue underline **slides** from the old step to the new one, changing width to fit the new step's label (about 350 ms, ease-out, e.g. `cubic-bezier(.2,.8,.2,1)`). Build it like the website navbar's sliding pill (`Navbar.tsx`, `movePill`): measure the active step's `offsetLeft` and `offsetWidth`, then set the bar's `transform: translateX(…)` and `width` (animate `transform` and `width`, not `left`). Also:

- A finished step's number turns into a ✓ with a quick pop (scale 0.6 → 1, \~200 ms).
- Re-measure on window resize and when fonts finish loading, so the bar never sits in the wrong place.
- With "reduce motion" turned on, the bar jumps without sliding.

**Test:** click Basics → Review and back: the line slides smoothly both ways and always ends exactly under the active step's label.

**Test:** no scrollbar on desktop at any step; the line looks intentional on steps 1–4; on a phone the steps scroll sideways without a visible scrollbar.

## Part G — Admins pin posts to the top of the Feed

An admin can pin up to **5 posts** to the top of the Feed, choose their **order** (1–5) and **how long** they stay pinned. When the time is up, the post drops back into the normal order by itself. Not needed for the class demo; do it after.

### How it works for the admin

- On any post, the admin menu (⋯) has **Pin to top…** → a small form: **Position** (1–5) and **Pinned for** (1 day, 3 days, 7 days, 14 days, or a custom end date).
- Pinned posts show a small **📌 Pinned** label and sit above everything else, in position order.
- A **Pinned posts** list in the admin area (next to the Moderation queue) shows the 5 slots with their end dates: drag to reorder, change the end date, or **Unpin** now.
- Pinning a 6th post asks which pinned post to replace.
- Everyone else just sees the pinned posts first; nothing to set up.

### Database (migration `028_pinned_posts`)

- `posts.pinned_rank` (smallint, 1–5, null = not pinned) and `posts.pinned_until` (timestamptz, null = not pinned); unique index on `pinned_rank` where it is not null.
- Admin-only functions, built like `admin_verify_post` in migration 021 (SECURITY DEFINER + `is_admin()` check): `admin_pin_post(p_post_id, p_rank, p_until)`, `admin_unpin_post(p_post_id)`, `admin_reorder_pins(p_post_ids uuid[])`. Normal users can never set these columns.
- "Active" pin = `pinned_rank is not null and pinned_until > now()`. Expired pins simply stop counting, so nothing has to run on a timer; optionally a daily cleanup clears old values.

### Feed changes

- `features/feed/services/feedApi.ts`: the Feed query currently orders by `created_at` (and `like_count` for "Most liked"). Fetch the active pins first (ordered by `pinned_rank`), show them at the top, then the normal list **without** those posts (no duplicates).
- Do the same in the guest feed function `get_guest_feed()` (migration 021) so signed-out visitors see the pins too.
- Pins show on the default view only, not when the user filters by a tag or searches (or show them only if they match the filter).

### Testing checklist

- [ ] Admin pins post A at 1 for 3 days and post B at 2 for 1 day → both on top, A first, with the Pinned label.
- [ ] A normal user can't pin (no menu item; the function refuses).
- [ ] Set B's end date to the past → B drops back to its normal place on refresh.
- [ ] Drag B above A in the Pinned posts list → order changes for everyone.
- [ ] Pinning a 6th post asks which one to replace.
- [ ] Pinned posts don't appear twice; guest feed shows them too.

## How to run it with Claude Code

Parts F, D and G are independent and small: do them first. Then order: **A → B → C → E**, one commit per part. A comes first because it frees the `creator_type` list for Independent; B before C because Part C's join rules also cover teams (students and their teams can join an Independent's project); E last because group chats need the teams from B.

**Before starting:** finish the earlier plan ("Make Open app the main interface") or at least commit it, so the two plans don't mix in one set of changes. Back up the database (Supabase dashboard → Database → Backups) or test the migrations on a Supabase **branch** first.

**Prompt to paste** (save this doc as `docs/PLAN-teams-independent.md` in `webloop/project` first):

```
Read docs/PLAN-teams-independent.md. It has 7 parts: A to G.

Rules:
- Do the parts in order F, D, G, A, B, C, E. Before each part, tell me in 3-4 lines
  what you will change, then do it.
- Database changes only as new migration files in supabase/migrations,
  numbered after the newest one in supabase/migrations. Show me each migration's SQL and wait for my OK
  before applying it. Never edit old migrations.
- Run Part A step 1 (the count query) and tell me the result before
  any change.
- After each part: npx tsc -p tsconfig.app.json --noEmit, npx eslint on
  changed files, go through that part's testing checklist with npm run dev,
  then one git commit for that part.
- Don't push to GitHub until I say so.
```

## Open questions

Add your answer under each one, or leave it and Claude Code uses the suggestion.

- [ ] Should a team keep its own record (verified tasks, page) if the owner leaves? Suggestion: ownership passes to the longest-standing member; if nobody is left, the team is archived but its page stays.
- [ ] Max team size? Suggestion: 8 members.
- [ ] Can universities form teams later (e.g. capstone groups)? Suggestion: not now; revisit after launch.
- [ ] Independent sign-up card text — OK: "Share projects and research, guide students, and recommend talent."?
