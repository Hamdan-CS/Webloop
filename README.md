# WebLoop

A student project collaboration & talent marketplace: students ship real
software, find teammates, build verified portfolios, and get discovered by
companies/universities based on reviewed contributions rather than resumes.

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

## Docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — how the pieces fit together: provider
  composition, data flow, routing, styling layers.
- [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) — the centralized theme/preset/
  background/animation system in `src/design-system/`, and how to change the
  app's look from one place.
- [PROJECT-STRUCTURE.md](PROJECT-STRUCTURE.md) — the full `src/` folder
  layout.
- [ADMIN.md](ADMIN.md) — Supabase setup, schema/RLS notes, and operational
  details.

## Stack

Vite + React 18 + TypeScript, Tailwind CSS, React Router, Supabase
(Postgres + Auth + Storage + Realtime), GSAP/Framer Motion/three.js for
marketing-page motion.
