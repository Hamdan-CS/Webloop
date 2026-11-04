# Project structure

This reflects the actual `src/` layout after the `refactor/centralized-design-system`
migration. It's a reorganization of the existing app, not a rewrite — every
page, route, and feature that existed before still exists; only file
locations and import paths changed (plus the new `design-system/` folder).

```
src/
├── design-system/        Centralized theme/preset/background/animation system.
│   ├── tokens/             colors.ts, typography.ts, spacing.ts, shadows.ts,
│   │                       radius.ts, tokens.css (the actual CSS variables)
│   ├── themes/              dark.ts, light.ts, glass.ts, minimal.ts, presets.css
│   ├── backgrounds/         backgrounds.ts, AmbientBackground.tsx, BackgroundEffects.tsx
│   ├── animations/          gsap.config.ts, transitions.ts, motion-presets.ts
│   ├── components/          ThemeProvider.tsx, PresetProvider.tsx,
│   │                       BackgroundProvider.tsx, GlassCard.tsx
│   └── DesignProvider.tsx   composes all of the above; wrapped once in App.tsx
│                           → see DESIGN-SYSTEM.md for how to use/extend this
│
├── components/
│   ├── shared/ui/          Small presentational primitives: Button, Badge, Avatar,
│   │                       Rating, Select, Reveal, GlobalTip, GoogleIcon
│   ├── navigation/          Navbar, Wordmark
│   ├── layout/               Footer
│   ├── auth/                 AuthPrompt, RoleRoute, GuestOnlyRoute (AuthContext
│   │                       itself lives in contexts/, see below)
│   ├── projects/              ProjectCard, EditProjectModal, TaskManagementPanel,
│   │                       MyTasksPanel, ProjectProgressDashboard, ConversationModal
│   ├── companies/              CompanyCard
│   ├── gallery/                 WorkCard, GalleryOverlays, MiniHeat
│   ├── contributions/            GitHub-style contribution grid — 2D/3D (WebGL)
│   │                       renderer, engine, palette (a real product feature,
│   │                       not part of the design system)
│   ├── FloatingPanel/             Messages/Tasks slide-out panel + its context
│   ├── scenes/                     9 marketing-page canvas/GSAP "scenes"
│   │                       (A-ProjectStack, B-TeamFormation, C-LiveDashboard,
│   │                       C-LiveProjects, D-Infinity, F-ProjectShowcase,
│   │                       H-ExplorePreview, Home-Ecosystem, Companies-City)
│   ├── home/                        ParticleStage (canvas hero)
│   └── theme/                        ThemeToggle (UI control; the provider
│                                itself moved into design-system/components/)
│
├── pages/                 One component per route (see App.tsx for the route
│                         table), plus pages/dashboards/ for the three
│                         role-specific dashboards (student/company/university)
│
├── contexts/               AuthContext — Supabase session/profile state
├── services/                 api.ts (all Supabase queries), storage.ts
│                         (profile image uploads), contributions.ts
│                         (contribution-grid RPCs)
├── integrations/supabase/     client.ts — the Supabase client instance
├── types/                        index.ts — shared domain types mirroring
│                         the Postgres schema
├── utils/                           roles.ts, labels.ts, heat.ts, cn.ts —
│                         pure helpers with no React/Supabase dependency
├── hooks/                             useMessages.ts, useTasks.ts, useTilt.ts
├── data/                                 Static demo content for marketing scenes
│
├── App.tsx               Routes + provider composition
├── main.tsx
└── index.css              Tailwind directives + the shared `@layer components`
                          classes (.surface, .btn-*, .chip, etc.) + per-page
                          bespoke CSS (home-redesign, how-it-works, scenes).
                          Tokens now live in design-system/tokens/tokens.css,
                          imported from the top of this file.

supabase/migrations/      Numbered SQL migrations — the source of truth for
                          schema, RLS policies and grants. Untouched by this
                          migration; see ADMIN.md.
```

## What did NOT move

- `pages/` stays flat (plus the existing `dashboards/` subfolder) rather than
  being split into `pages/Student/`, `pages/Company/`, etc. This app's real
  routes don't group that way — forcing a split would scatter files without
  a reuse benefit. See DESIGN-SYSTEM.md / the migration report for why.
- `components/scenes/*` engines were **not** rewritten to consume the new
  `design-system/animations` presets. They're high-risk, hand-rolled
  canvas/GSAP code; centralizing their config is a real follow-up, not
  something to do in the same pass as a structural reorg.
- `supabase/migrations/`, RLS policies, and auth behavior are untouched.

## Import alias

`@/` → `src/` (configured in `vite.config.ts` and mirrored in
`tsconfig.app.json`'s `paths`). Always import with `@/...`, not relative
`../../` paths, regardless of how deep a file lives.
