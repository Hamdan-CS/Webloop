# Architecture

High-level shape of the app, how the pieces fit together, and where to look
for each concern. For the literal folder listing see
[PROJECT-STRUCTURE.md](PROJECT-STRUCTURE.md); for theming/visual-preset
details see [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md); for Supabase/schema
details see [ADMIN.md](ADMIN.md).

## Stack

Vite + React 18 + TypeScript, React Router 7 (client-side, `BrowserRouter`),
Tailwind CSS 3, Supabase (Postgres + Auth + Storage + Realtime), GSAP 3 +
Framer Motion + three.js/@react-three/fiber for marketing-page motion/3D.

## Provider composition (`App.tsx`)

```
BrowserRouter
└─ DesignProvider        theme + visual preset + background (design-system/)
   └─ AuthProvider        Supabase session/profile (contexts/AuthContext.tsx)
      └─ AuthPromptProvider   "sign in to continue" modal state
         └─ FloatingPanelProvider   Messages/Tasks slide-out panel state
            └─ <routes>
```

Each provider owns one concern and nothing else. `DesignProvider` has no
knowledge of auth; `AuthProvider` has no knowledge of theme. Adding a new
cross-cutting concern should follow the same pattern — a new provider
composed in `App.tsx`, not new state threaded through an existing one.

## Data flow

Pages and components never call `supabase` directly for queries — they call
functions in `services/api.ts` (or `services/storage.ts`,
`services/contributions.ts`), which wrap the Supabase client
(`integrations/supabase/client.ts`) and return typed results
(`types/index.ts`). `contexts/AuthContext.tsx` is the one place that calls
`supabase.auth.*` and `supabase.rpc('get_profile_by_user_id', ...)`
directly, since session state has to be the source other data depends on.

Route guards (`components/auth/RoleRoute.tsx`, `GuestOnlyRoute.tsx`) read
`useAuth()` and redirect based on `profile.creator_type` — see
`utils/roles.ts` for the role→dashboard-path mapping.

## Routing

All routes are declared in `App.tsx` and lazy-loaded (`React.lazy`) so each
page ships as its own chunk. Three dashboard routes
(`/dashboard/student|company|university`) are wrapped in `RoleRoute` with an
`allowed` role list; `/how-it-works` is wrapped in `GuestOnlyRoute` (signed-in
users are redirected away from it).

## Styling layers

1. **Tokens** (`design-system/tokens/tokens.css`) — CSS variables for every
   color/surface/shadow value, swapped by the `.dark`/`.light` class on
   `<html>`.
2. **Tailwind** (`tailwind.config.js`) — reads the token CSS variables
   directly for `colors.slate/ink/accent/signal`, so Tailwind utility
   classes are theme-aware with no extra wiring.
3. **Shared component classes** (`index.css`'s `@layer components`) —
   `.surface`, `.surface-raised`, `.btn-primary`, `.chip`, etc. Used across
   many pages; these are what the `glass`/`minimal` visual presets retarget
   (`design-system/themes/presets.css`).
4. **Page-specific bespoke CSS** (the rest of `index.css`) — large blocks
   scoped to one page or scene (`.home-redesign`, `.how-*`, `.eco-*`,
   `.stack-*`, etc.), ported 1:1 from approved HTML reference designs. Not
   currently preset-aware; see DESIGN-SYSTEM.md's "Known limitations".

## Marketing/motion scenes

`components/scenes/*` are canvas- and GSAP-driven illustrations used on the
home, how-it-works, and companies pages (project stacks, team formation,
live dashboards, an "infinity" scroll scene, etc.). Each has its own
`engine.ts` managing an imperative render loop with its own setup/cleanup.
These predate the design system and are not wired into
`design-system/animations` — see DESIGN-SYSTEM.md for why that migration
was deferred rather than attempted in the same pass.

## What this refactor did not touch

- Database schema, RLS policies, grants (`supabase/migrations/`).
- Auth behavior (`contexts/AuthContext.tsx`'s logic — only its file location
  changed).
- Any page's actual content, copy, routes, or business logic.
- The 9 scene engines' rendering/animation code (only their import paths,
  where they referenced moved files).
