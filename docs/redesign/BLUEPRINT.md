# WebLoop redesign — implementation blueprint for Claude Code

Nov 12, 2026 · @Abbas

This is the build order for turning the approved demo into the real WebLoop site. Every path below was checked against `Hamdan-CS/Webloop` at commit `19f0dff` (latest `main`, 12 Nov 2026). Claude Code should follow it top to bottom and **stop for approval at the end of each phase**.

## How to use this blueprint

**The visual source of truth** is the approved demo, `webloop-genie-demo.html` (v2). Copy every colour, size, timing and easing from it. When the demo and this document disagree, this document wins only on architecture, file locations and safety rules.

**Ground rules for Claude Code**

1. Never edit `src/components/scenes/A-ProjectStack/*`, `src/data/homeDemo.ts`, `src/data/homeArt.ts` or `src/components/scenes/shared/IllustratedAvatar.tsx`. The protected Project Stack depends on all four.
2. Never edit `src/integrations/supabase/*`, `src/services/*`, `src/contexts/AuthContext.tsx`, `src/components/auth/*`, `src/utils/roles.ts`, `src/utils/authRedirect.ts`, `supabase/*` or any data-fetching hook.
3. Change look and motion only. Every page keeps its JSX logic, handlers, props and data calls. Where markup must change, change class names and wrappers, not behaviour.
4. One commit per checklist item. After each one run `npm run typecheck`, `npm run build`, `npm run lint` and `npm run test:e2e`.
5. Restyle centrally first (tokens → component classes → shared components), then pages. Only add page-level CSS when a page has something no shared class covers.

**Safe branch workflow** (run on the machine that has `C:\Users\HP\Downloads\webloop\project`)

1. Keep the earlier, superseded Phase 1 work without losing it. It sits staged and uncommitted on `redesign/design-system`: `git switch redesign/design-system && git commit -m "WIP: phase 1 paper/teal tokens (superseded by Genie direction)"`.
2. Start clean from `main`: `git switch main && git pull && git switch -c redesign/genie`.
3. Bring over only what is still useful from the WIP commit (step F0 lists the files).
4. Push the branch (`git push -u origin redesign/genie`) and use Vercel preview deployments for review. Merge to `main` only after section F's final checks pass and you approve.
5. Rollback is always `git switch main`. The live site is never touched until the merge.

## A. Repository architecture assessment

The structure is good enough to restyle most of the site centrally. Colours already flow from one token file into Tailwind, and pages mostly use shared classes. The weak spot is one 2,040-line `src/index.css` mixing global rules, page rules, ported scene rules and light-theme patches.

**What the app is.** React 18, Vite 5, TypeScript, Tailwind 3.4, React Router 7 with 24 lazily loaded routes (`src/App.tsx`), Supabase JS 2, GSAP 3.15, Framer Motion 14, Three.js 0.186. `lenis` and `@react-three/fiber` are installed but unused.

| Layer | Where | State | Verdict |
| --- | --- | --- | --- |
| Tokens | `src/design-system/tokens/tokens.css` (`:root/.dark` + `.light` blocks); typed mirrors in `tokens/{colors,radius,shadows,spacing,typography}.ts` | One source; Tailwind reads `--ink-*`, `--slate-*`, `--accent-*`, `--signal-*`, `--content-strong` as RGB channels | **Reuse.** Retheme by rewriting values here. Highest-leverage file in the repo |
| Tailwind | `tailwind.config.js` | Theme-aware colour scales; `white` = strongest text colour, not white | **Reuse.** Add the new semantic names and fonts; keep the old scales mapped |
| Component classes | `src/index.css` `@layer components` (lines 52–141): `.container-page .surface .surface-raised .chip .btn .btn-primary .btn-secondary .btn-ghost .btn-sm .link-accent .label-overline .heading .skeleton` | Used 58× (`btn-*`), 124× (`card`), 44× (`chip`) across pages | **Reuse.** Restyling these reaches most pages at once |
| Light-theme patches | `src/index.css` lines 1809–1966 ("NO SILVER", "WHITE + GRADIENT") | Re-map Tailwind `bg-white/*`, inputs, tabs to light surfaces | **Replace** with the new token values; most of these patches become unnecessary |
| Providers | `src/design-system/DesignProvider.tsx` → `ThemeProvider`, `PresetProvider` (`data-preset`), `BackgroundProvider`; `animations/gsap.config.ts` | Light is already the default theme | **Reuse.** Add smooth scroll and ScrollTrigger registration here |
| Shell | `components/navigation/{Navbar,MobileTabBar,Wordmark}.tsx`, `components/layout/Footer.tsx`, `RouteStage` in `App.tsx` | Shared by every route | **Restyle** once for all pages |
| Shared UI | `components/shared/ui/{Button,Badge,Avatar,Reveal,Select,LoopLoader,Rating,GlobalTip}.tsx` | Thin wrappers over the classes | **Restyle + extend** |
| Domain components | `components/{projects,companies,contributions,gallery,messaging,FloatingPanel}/*`, `features/feed/*` | Logic-heavy, styled with Tailwind + shared classes | **Keep logic**; restyle through tokens and classes |
| Home scenes | `components/scenes/*` + scene CSS in `index.css` (lines 573–1272) | 6 in use, 4 unused | Protected stack stays; others are replaced or rethemed (section C) |
| 3D scenes | `scenes/A-ProjectStack` (CSS 3D + GSAP), `scenes/Companies-City/engine.ts` (WebGL), `how-it-works/howItWorksEngine.ts` (WebGL), `contributions/ContributionGrid3D.tsx` | Independent engines | Stack frozen; City and How It Works recoloured only |

**Needs improvement.**

- **The protected stack is not self-contained.** `ProjectStackScene.tsx` uses about 45 class names styled in `index.css`, some shared with other features (`.sd` is also the student dashboard's scope class), plus the `--hr-*` variables from `.home-redesign` (line 292). Any global restyle leaks into it. Step F1 freezes it.
- **`index.css` is a mix.** Page and scene rules should sit beside their components. Only move a block when you are already restyling that page; no big-bang reshuffle.
- **Dead code:** `pages/HomeOld.tsx`, `scenes/B-TeamFormation/*`, `scenes/C-LiveProjects/*`, `scenes/D-Infinity/*`, `scenes/shared/{PinnedScene.tsx,useScrollEngine.ts,canvasPanel.ts}`, `scenes/Home-Ecosystem/engine.ts`, `components/home/{ParticleStage.tsx,particleEngine.ts}`. None is imported by a live route (the Phase 1 build proved it). Remove them in F0. `scenes/A-ProjectStack/engine.ts` is also unused, but it is in the protected folder, so leave it.
- **Reduced-motion hook lives in a feature folder** (`features/feed/hooks/useReducedMotion.ts`). Re-export it from the design system instead of duplicating it.
- **The homepage is guest-only.** `components/auth/HomeRoute.tsx` sends signed-in users to `/feed`, so test the homepage signed out.

## B. Centralised design-system plan

One change in `tokens.css` or in the component layer must restyle every page that uses it. Pages should never hard-code a colour, radius or font. The rules below make that true.

**Who owns what**

| Concern | Owning file (existing unless marked new) | How pages consume it |
| --- | --- | --- |
| Colours, surfaces, status colours | `src/design-system/tokens/tokens.css` | `var(--x)` in CSS; Tailwind classes via `tailwind.config.js` |
| Fonts | `tokens.css` (`--font-*`) + `src/main.tsx` (Fontsource imports) + `index.html` (remove Google Fonts link) | `font-sans`, `font-display`, `font-serif`, `font-mono` |
| Radius, shadows, spacing, motion durations | `tokens.css` + `tailwind.config.js` `extend` | `rounded-card`, `shadow-float`, `duration-*` |
| Buttons, chips, cards, inputs, tabs, section headers | `src/index.css` `@layer components` (lines 52–141), extended | `.btn-primary`, `.card`, `.chip`, `.input`, `.tabs`, `.section-head` |
| Page frame and section rhythm | new `src/design-system/styles/layout.css` | `.container-page`, `.page`, `.page-hero`, `.section` |
| Theme switching | `ThemeProvider.tsx` (keep); `PresetProvider.tsx` (keep, default preset) | Dark mode switched off for the redesign: `ThemeToggle` returns `null`, Settings → Appearance hidden behind one flag |
| Motion | `src/design-system/animations/*` (extend) + new `src/design-system/motion/*` | `useReducedMotion`, `SmoothScroll`, `easing`, `duration` |
| Illustrations (clouds, clay objects) | new `src/design-system/illustrations/*` | `<Cloud/>`, `<CloudBank/>`, `<ClayObject/>`, `<ClayFace/>` |
| 3D scene colours | `tokens/colors.ts` (typed mirror) | Read by `howItWorksEngine.ts`, `Companies-City/engine.ts`, `contributions/palette.ts` |

**The token set** (replace the values in `tokens.css`; keep the variable names Tailwind already reads)

```css
:root {
  /* fonts */
  --font-sans: 'Geist', ui-sans-serif, system-ui, sans-serif;
  --font-display: 'Geist', ui-sans-serif, system-ui, sans-serif;
  --font-accent: 'Instrument Serif', Georgia, serif;   /* one italic word per headline */
  --font-mono: 'Geist Mono', ui-monospace, monospace;
  /* new semantic tokens (hex) */
  --sky: #ebf5ff; --card: #fafdff; --paper: #ffffff; --mist: #f6f7f8; --stack-bg: #f4f8fd;
  --ink: #0a0d12; --charcoal: #181d27; --graphite: #535862; --fog: #93979f; --line: #dde8f5;
  --iris: #0069e0; --iris-hi: #479dff; --iris-grad: linear-gradient(71deg, #479dff 11%, #0069e0 78%);
  --lav: #f1e6ff; --mint: #d3f6e3; --powder: #cce7ff; --solar: #fff2be; --peach: #ffe2d1;
  --g-aqua: linear-gradient(#e5f6ff, #c2e9ff); --g-violet: linear-gradient(#f4ebff, #e4ccff);
  --g-solar: linear-gradient(#fff9e0, #ffeca3); --g-peach: linear-gradient(#fff2eb, #ffd1b8);
  --ok: #087443; --ok-bg: #e4f6ec; --warn: #a15c07; --warn-bg: #fff3dc; --danger: #b42318; --danger-bg: #fdecea;
  --r-card: 32px; --r-img: 24px; --r-input: 16px; --r-pill: 9999px;
  --shadow-float: 0 14px 20px 4px rgba(4, 69, 144, .08);
  --shadow-btn: 0 1px 2px rgba(10, 13, 18, .8), 0 0 0 1px #0a0d12;
  --ease-out: cubic-bezier(.16, 1, .3, 1); --dur-1: .2s; --dur-2: .35s; --dur-3: .65s;
}
.light, :root {
  /* existing channel tokens re-pointed so every Tailwind class follows */
  --ink-950: 235 245 255;   /* page canvas = sky */
  --ink-900: 250 253 255;   /* cards = card */
  --ink-850: 246 247 248; --ink-800: 221 232 245; --ink-700: 201 216 236;
  --content-strong: 10 13 18;            /* Tailwind `white` = ink */
  --slate-100: 10 13 18; --slate-200: 24 29 39; --slate-300: 83 88 98; --slate-400: 112 118 128; --slate-500: 147 151 159;
  --accent-300: 0 105 224; --accent-400: 0 105 224; --accent-500: 0 96 204;  /* iris */
  --signal-green: 8 116 67; --signal-amber: 161 92 7; --signal-rose: 180 35 24;
  --cyan: #0069e0;                        /* legacy alias used by component CSS */
  --panel: #fafdff; --panel-2: #ffffff; --glass-line: #dde8f5; --glass-line-2: #c9dcf2;
}
```

The conflicts between your Genie reference files are already resolved in this set: solid `--iris` plus a separate gradient; one pill radius; gradient washes as their own tokens; tracking tuned for Geist. Fill in the remaining channel stops (`--slate-50/600–900`, `--accent-50–900`, `--ink-600/500/400`) by interpolating between the values above. Mirror the hex tokens in `tokens/colors.ts`.

**Fonts.** Run `npm i @fontsource-variable/geist @fontsource-variable/geist-mono @fontsource/instrument-serif`, import them in `src/main.tsx`, and delete the Google Fonts `<link>` in `index.html`. Also run `npm i @fontsource-variable/bricolage-grotesque @fontsource-variable/figtree`: only the frozen stack uses them (F1), and they replace what the Google link used to load.

**Component classes** (rewrite inside `@layer components`, same names so the 58 existing button uses update themselves)

| Class | New look |
| --- | --- |
| `.btn` | Pill, 48px high, Geist 500 15–16px, `transition: transform var(--dur-2) var(--ease-out)`, hover `translateY(-2px)` |
| `.btn-primary` | Charcoal fill, white text, `--shadow-btn`. Never iris-filled |
| `.btn-secondary` | White fill, `0 0 0 1px var(--line)` ring |
| `.btn-ghost` | Transparent, graphite text; hover `--sky` fill |
| `.btn-sm` | 36px high, 13.5px |
| `.card` (new rule: 68 elements already carry \`className="card…"\` but no global \`.card\` rule exists) and `.surface-raised` | `--card` fill, `--r-card`, no border, no shadow; `.card-float` adds `--shadow-float` |
| `.surface` | White fill, 1px `--line` ring, 24px radius |
| `.chip` | Pill, 12.5px, pastel fill by modifier: `.chip-sky .chip-lav .chip-mint .chip-solar .chip-peach .chip-ok .chip-warn` |
| `.input`, `.inp`, `select`, `textarea` (new base rule) | White, 16px radius, 48px high, 1px `--line` ring, iris focus ring `0 0 0 3px rgba(0,105,224,.18)` |
| `.tabs` / `.tab` / `.tab[aria-selected=true]` (new) | Mono 12px uppercase labels; active tab gets a 2px iris underline that slides (GitHub pattern) |
| `.section-head` (new) | Mono eyebrow, then display heading (Geist 500, -0.035em) with optional `.acc` italic word, then 18px graphite lead |
| `.acc` (new) and `.hl` | Instrument Serif italic with iris gradient text. `.hl` keeps its old rule *inside the frozen stack scope* only |
| `.label-overline` | Becomes the mono eyebrow style |
| `.heading` | Geist 500, tight tracking, ink |

Together, the tokens and these classes restyle most of every page in phases F2–F3 without opening a single page file. Page work in F5 is limited to layout, wrappers and leftover hard-coded values.

## Reference mapping: what comes from where

Geniestudio supplies the look and the motion everywhere. Baselayer supplies how facts, verification and editorial blocks are laid out. GitHub supplies the developer-activity parts. Each row names the WebLoop component that implements it.

| Source | Pattern | WebLoop component | Used on |
| --- | --- | --- | --- |
| Geniestudio | Sky canvas, bone cards, charcoal pill buttons, weight-500 display type, 32px radius, pastel washes | Tokens + component classes (section B) | Every page |
| Geniestudio | Floating white pill nav inside page margins | `Navbar.tsx` restyle | Every page |
| Geniestudio | Clouds and soft 3D objects floating with no frame | `design-system/illustrations/{Cloud,CloudBank,ClayObject,ClayFace}.tsx` | Home, How It Works, auth pages, 404, empty states |
| Geniestudio | Cloud intro, then a matching ending | `components/home/IntroCurtain.tsx`, `components/home/ClosingLoop.tsx` | Home |
| Geniestudio | Cycling hero word with avatar bubbles | `components/home/HeroGenie.tsx` | Home |
| Geniestudio | Sentence that builds while icons fly in | `components/home/StorySentence.tsx` | Home |
| Geniestudio | Small card grows to fill the screen, then floods into the next section | `components/home/ExpandingCard.tsx` | Home → protected stack |
| Geniestudio | Three oversized words with characters and cloud edges | `components/home/WordBands.tsx` | Home |
| Geniestudio | Curved, scroll-driven image arc | `components/home/ProjectArc.tsx` | Home; optional header on `/explore` |
| Geniestudio | Bento of tiny live UIs, expanding on hover | `components/home/FeatureCards.tsx` | Home |
| Geniestudio | Testimonial marquee, soft FAQ accordion | `components/shared/ui/{Marquee,Accordion}.tsx` | Home, How It Works, Companies |
| Geniestudio | Sticker trail behind the cursor | `components/home/StickerTrail.tsx` | Home FAQ |
| Baselayer | Verification rows (check, source, time, pending) | `components/shared/ui/VerifyRow.tsx` | Home cards, project detail, profiles, dashboards |
| Baselayer | Editorial company card: logo, verified mark, mono fact chips, stat footer | `components/companies/CompanyCard.tsx` restyle (+ `scenes/Companies-City/CompaniesGrid.tsx`) | Companies, home |
| Baselayer | Eyebrow → headline → one-line lead hierarchy; key facts as label/value rows | `components/shared/ui/SectionHeader.tsx`, `.facts` class | Every page header, project detail sidebar |
| GitHub | Contribution graph with legend and hover counts | Existing `components/contributions/ContributionGrid2D.tsx` + `palette.ts` retheme (blue scale) | Profiles, student dashboard, home card |
| GitHub | Activity feed with commit hashes and status pills | `components/shared/ui/ActivityFeed.tsx` | Home app window, dashboards, project detail |
| GitHub | Tabs with a sliding underline | `.tabs` class + `components/shared/ui/Tabs.tsx` | Project detail, profiles, dashboards, settings |
| GitHub | Repo-style chips (project · count), avatar stacks | `.chip` + `components/shared/ui/AvatarStack.tsx` | Cards, profiles, project detail |

## C. Page and component mapping

All 24 routes in `src/App.tsx`, plus the shell. "Central" means the page is restyled by tokens and component classes alone (F2–F3), with no edits to the page file. Files are under `src/`.

| Route | Page file | Current implementation | Redesign | Shared components | Files affected |
| --- | --- | --- | --- | --- | --- |
| shell | `App.tsx` | `Navbar`, `RouteStage` (fade per route), `Footer`, `MobileTabBar`, `FloatingPanel`, `GlobalTip`, `Toaster` | Floating pill nav, white footer with the loop mark, route veil transition | `PageTransition`, `SmoothScroll` | `App.tsx` (wrapper only), `components/navigation/{Navbar,MobileTabBar,Wordmark}.tsx`, `components/layout/Footer.tsx`, `index.css` header block (`.hdr-*`) |
| `/` | `pages/HomePage.tsx` | 6 scenes: `Home-Ecosystem/EcosystemScene` (campus hero), `A-ProjectStack` (protected), `C-LiveDashboard`, `F-ProjectShowcase`, `H-ExplorePreview`, `Companies-City`; `ClosingBand` | The demo, section by section (D) | All `components/home/*`, `FrozenStack` | `pages/HomePage.tsx` (composition only) |
| `/how-it-works` | `pages/HowItWorksPage.tsx` | Fixed WebGL stage `how-it-works/HowItWorksStage.tsx` + `howItWorksEngine.ts`, scroll steps `.how-step` | Same scene recoloured (sky fog, pastel tiles, iris), clouds above and below, steps in Genie cards, FAQ and CTA at the end | `CloudBank`, `SectionHeader`, `Accordion` | `howItWorksEngine.ts` (palette constants only, lines 26–48 and `readPalette()`), `HowItWorksPage.tsx`, `index.css` `.how-*` block |
| `/explore` | `pages/ExplorePage.tsx` | `.ex-hero` fan hero, `.pills` filters, `ProjectCard` grid | Genie page hero with clouds; pill filters; cards with 24px image radius and verified chips | `PageHero`, `ProjectCard`, `.chip` | `ExplorePage.tsx` (hero markup), `components/projects/ProjectCard.tsx`, `index.css` G block (lines 1202–1262) |
| `/gallery` (Student Work) | `pages/GalleryPage.tsx` | `WorkCard`, `GalleryOverlays`, `MiniHeat` | Masonry of work cards, contribution mini-graph in blue scale, overlay as a 32px card sheet | `PageHero`, `ContributionGrid2D` | `components/gallery/{WorkCard,GalleryOverlays,MiniHeat}.tsx`, `index.css` gallery block (1275–1460) |
| `/feed` | `pages/FeedPage.tsx` | `features/feed/*` (posts, composer, sidebar, guide player) | Card-based feed on sky; composer as a floating card; sidebar sections as pastel tiles | `.card`, `.chip`, `Tabs` | Central + `index.css` FEED block (1967–2040); no feed logic |
| `/companies` | `pages/CompaniesPage.tsx` | `CompaniesCityScene` + `CompanyCard` grid, `Select` filters | City recoloured to the new palette; Baselayer company cards | `CompanyCard`, `VerifyRow` | `components/companies/CompanyCard.tsx`, `scenes/Companies-City/engine.ts` (colour constants only), `index.css` I block (1005–1060) |
| `/projects/:slug` | `pages/ProjectDetailPage.tsx` | Tabs, tasks board, progress dashboard, conversation modal | GitHub-style tabs, activity feed, Baselayer fact sidebar with verification rows | `Tabs`, `ActivityFeed`, `VerifyRow`, `.facts` | `ProjectDetailPage.tsx` (class names), `components/projects/{ProjectProgressDashboard,TaskManagementPanel,MyTasksPanel}.tsx` (class names) |
| `/creators/:handle` | `pages/CreatorProfilePage.tsx` | `.pf` scoped profile, year heat grid | Profile hero card, contribution graph, verified work list, pinned projects | `ContributionGrid2D`, `Tabs`, `VerifyRow`, `AvatarStack` | `CreatorProfilePage.tsx` (class names), `index.css` `.pf` block (1546–1600) |
| `/signin`, `/join`, `/forgot-password`, `/reset-password` | `pages/{SignIn,Join,ForgotPassword,ResetPassword}Page.tsx` | `.card-g .auth-fm`, `.inp`, `.roles` role cards | Split layout: form card left; sky panel right with clouds, the loop mark and a sample verified project; role cards as pastel tiles | `AuthLayout`, `CloudBank` | The 4 pages (wrap in `AuthLayout`), `index.css` AUTH block (573–654). Form handlers untouched |
| `/build-profile`, `/settings/profile` (students) | `pages/BuildProfilePage.tsx` + `BuildProfilePage.css` | Own `.bp-*` stylesheet | Wizard as stacked cards, pill steps, Genie inputs | `.input`, `.chip`, `.btn` | `BuildProfilePage.css` only |
| `/settings/profile` (others) | `pages/EditProfilePage.tsx` | Tailwind + shared | Central | `.input` | none |
| `/settings` | `pages/SettingsPage.tsx` | Left nav + sections; Appearance section | Central; hide Appearance while dark mode is off | `Tabs` (vertical) | `SettingsPage.tsx` (one flag) |
| `/publish` | `pages/PublishProjectPage.tsx` | Publish wizard (`index.css` 1653–1753) | Steps as pastel pills, live `ProjectCard` preview in a floating card | `.input`, `ProjectCard` | `index.css` publish block |
| `/my-projects`, `/my-applications`, `/my-invitations` | `pages/My*Page.tsx` | Tailwind + `.pf` | Central | `.card`, `.chip` | none |
| `/dashboard/student` | `pages/dashboards/StudentDashboard.tsx` | `.sd` tabbed workspace | Genie tabs, KPI tiles in pastel washes, `ActivityFeed`, contribution graph | `Tabs`, `KpiTile`, `ActivityFeed`, `ContributionGrid2D` | Class names in the page; `index.css` `.sd` block (1601–1633) |
| `/dashboard/company` | `pages/dashboards/CompanyDashboard.tsx` | `ApplicantsInbox`, `TaskManagementPanel`, tabs | Same dashboard frame as student | Same | Class names; `components/companies/ApplicantsInbox.tsx` class names |
| `/dashboard/university` | `pages/dashboards/UniversityDashboard.tsx` | Tailwind + `surface-raised` | Same dashboard frame | Same | Class names |
| `/admin/moderation` | `pages/AdminModerationPage.tsx` | Tailwind + shared | Central | `.card`, `.chip` | none |
| `*` (404) | `pages/NotFoundPage.tsx` | Simple centred | Cloud scene with the loop and one button | `CloudBank` | `NotFoundPage.tsx` |
| global overlays | `components/FloatingPanel/*`, `components/messaging/*`, `components/projects/*Modal.tsx` | Drawer and modals | White sheets, 32px radius, sky backdrop blur | `.card`, `.btn` | Central |

Redirect-only routes stay as they are in `App.tsx`: `MyProjectsRoute`, `MyApplicationsRoute`, `SettingsRoute`, `HomeRoute`, `GuestOnlyRoute`, `RoleRoute`.

## D. Animation implementation blueprint

GSAP owns everything tied to scroll; Framer Motion owns route transitions and small hover or press states; CSS owns loops (marquees, bobbing, the loop's light pulse). No element is animated by two libraries. All values are copied from the demo's script.

**Shared motion infrastructure (build first, F4)**

- `src/design-system/motion/SmoothScroll.tsx` — `export function SmoothScroll({ children }: { children: ReactNode })`. Creates one `new Lenis({ lerp: 0.1, smoothWheel: true })`, wires `lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker.add(t => lenis.raf(t * 1000))`, `gsap.ticker.lagSmoothing(0)`. Skipped entirely when `useReducedMotion()` is true. Exposes the instance through `useLenis()` (context) so the intro can `stop()`/`start()` it and anchor links can `scrollTo`. Mounted inside `DesignProvider`.
- `src/design-system/motion/useReducedMotion.ts` — re-export of `features/feed/hooks/useReducedMotion.ts` (no copy).
- `src/design-system/motion/useScrollScene.ts` — `useScrollScene(ref, build: (ctx) => void, deps)`: wraps `gsap.context(build, ref)` in `useLayoutEffect`, uses `gsap.matchMedia()` for the 768px split, and returns `ctx.revert()` on unmount. Every scroll component below uses it, so leaving a route kills its triggers and pins.
- `src/design-system/animations/gsap.config.ts` — add `gsap.registerPlugin(ScrollTrigger)` once, plus `easing.genie = 'expo.out'` and `easing.out = 'cubic-bezier(.16,1,.3,1)'`.
- `RouteStage` in `App.tsx` → replaced by `src/components/layout/PageTransition.tsx` (Framer Motion `AnimatePresence`, `mode="wait"`): a sky veil fades over the old page (0.25s), the new page rises 16px and fades in (0.45s, `[0.16,1,0.3,1]`). Scroll-driven pages (`/`, `/how-it-works`) get opacity only, as today. After each route change: `lenis.scrollTo(0, { immediate: true })` and then `ScrollTrigger.refresh()`.

**Homepage animations, top to bottom**

| # | Animation | Component / file | Starts with | Scroll control | Hands off to | Mobile (<768px) | Reduced motion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Cloud intro | `components/home/IntroCurtain.tsx` | Mount, once per session (`sessionStorage['wl_intro_seen']`) | None. Lenis stopped for \~3.2s | Hero reveal (same timeline) | Same, clouds 60% size | Not rendered |
| 2 | Hero reveal + word cycle | `components/home/HeroGenie.tsx` | End of intro (prop `ready`) or mount if the intro was skipped | Clouds and side objects drift apart over the hero's height (scrub) | Orb anchor `spark` | Word gets its own line | Static, first word only |
| 3 | Story sentence | `components/home/StorySentence.tsx` | Section top hits viewport top | Pinned 160%, scrub 0.6 | Orb anchor in the sentence gap | No pin; sentence shown assembled | Assembled |
| 4 | Expanding card → flood | `components/home/ExpandingCard.tsx` | Section top hits top | Pinned 260%, scrub 0.8, `invalidateOnRefresh` | Flood colour `--stack-bg` with the stack's title, straight into `FrozenStack` | Card shown expanded, no pin, no flood | Expanded, no flood |
| 5 | Protected stack | `components/home/FrozenStack.tsx` wraps the untouched `ProjectStackScene` | Its own code | Its own pin | Words section | Its own code | Its own code |
| 6 | Team / Build / Prove | `components/home/WordBands.tsx` | Each band's top at 75% | Scrub 0.7 until the band centre reaches 45% | Orb anchor `badge` under "Prove" | Same, smaller type | Words shown, no motion |
| 7 | Expanding feature cards | `components/home/FeatureCards.tsx` | Hover (fine pointers, 90ms delay), click, focus, Enter/Space | None; CSS transitions | Arc section | Vertical stack, tap opens | Instant open/close |
| 8 | Curved project arc | `components/home/ProjectArc.tsx` | Section enters (`top bottom` → `top top` lifts the arc in) | Pinned 260%, scrub 0.8, per-frame layout | Companies | No pin; scrub through the section | Static arc at progress 0.45 |
| 9 | Companies | existing `CompaniesCityScene` + restyled `CompaniesGrid` | Its own code | Its own code | Marquee + testimonials | Its own code | Its own code |
| 10 | Sticker trail | `components/home/StickerTrail.tsx` inside the FAQ | `pointermove` over the FAQ section | None | — | Off (coarse pointers) | Off |
| 11 | Ending loop | `components/home/ClosingLoop.tsx` | Section top hits top | Pinned 170%, scrub 0.8 | Footer (hills are footer-white) | Final state, no pin | Final state |
| 12 | Idea orb | `components/home/IdeaOrb.tsx` + `useOrbAnchor` | After the intro | Follows anchors on scroll (GSAP ticker) | — | Hidden | Hidden |

**Timelines (exact)**

1. **IntroCurtain** — props `{ onDone(): void }`. Draw the loop path (`pathLength=1`, dashoffset 1→0, 1.0s `power2.inOut`); caption fades in (0.4s, overlapping by 0.5s); mark fades out (0.35s); left and right cloud groups `xPercent ∓/±95, scale 1.25` over 1.4s `power3.inOut`; veil `opacity 0` over 0.9s starting 0.2s later; then `onDone()`, unmount. Total ≈ 3.2s.
2. **HeroGenie** — props `{ ready: boolean }`. On ready: lines `yPercent 110→0` (1.1s, stagger 0.12, `expo.out`); lead, buttons and orb `y 24→0, opacity 0→1` (0.9s, stagger 0.1); nav `yPercent -150→0`. The word box width transitions to the measured width of each word (`width .7s var(--ease-out)`), every 2.6s; under 640px the word takes a full line. Headline `font-size: clamp(44px, 7vw, 108px)`, container `min(1180px, 100%)`.
3. **StorySentence** — five icons start on an ellipse (`x = cos(a)·38vw`, `y = sin(a)·34vh − 40`, rotate ±28°, scale 1.4) and land in their gaps (`power3.inOut`, 1 unit each, staggered 0.25); words go from 0.14 to 1 opacity one by one over 1.6 units; label fades last.
4. **ExpandingCard** — card `240×160 → min(1120px, 90vw) × 78vh`, radius 40→32 (1.2 units); seed fades; app fades in; cursor travels to the Start button (0.8); button presses (0.08 + 0.12); flood `clip-path: circle(0 → hypot(vw,vh)·1.1 at button centre)` (1.0, `power2.in`); flood title rises (0.5). The live feed inside is `ActivityFeed` with `stream` on (a row every 3.8s, flips to Verified 1.6s later).
5. **WordBands** — per band: cloud edge `xPercent ±40→0`; letters `yPercent 115→0`, random rotate ±14°, stagger 0.07, `back.out(1.6)`; sub-line fades; characters `scale 0→1`, `back.out(2.4)`, then float up at `yPercent -40` across the band (separate scrub).
6. **FeatureCards** — active card `flex-grow 1→3.2` over 0.85s `--ease-out`; body fades in after 0.3s; object moves from bottom-centre (150px) to the top-right corner (110px) and its float animation pauses. Inactive objects run `objfloat` (6.5s, staggered).
7. **ProjectArc** — per frame, with progress `p` and entry `e`: radius `R = W·0.44·(1 + 0.7·ease(p))` (mobile `W·1.1`); focal y `H·(0.6 − 0.05·ease(p)) + (1−e)·0.4H`; tile spacing `stepDeg = tileSize·1.18/R` (constant gap along the curve); focal index `c = 3 + 17p`; tile angle `φ = (i − c)·stepDeg`; scale `0.56 + 0.72·smoothstep(1 − |φ|/(32 + 18·ease(p)))`; opacity 1 until 66°, 0 by 90°; transform `rotate(0.85φ) rotateY(−0.5φ)`. `28 tiles; images from art(kind, seed) in src/data/homeArt.ts (read-only import, the same 14 art kinds the demo used).` Hover lifts, click selects, the info bar shows the selected, hovered or focal project.
8. **StickerTrail** — spawn every 30px of pointer travel (64px over a question), cap 44 alive, each a 54px pastel sticker animated with the Web Animations API over 2.3s (pop, drift against the motion, fall 34px, shrink). Layer `z-index` below the questions, `pointer-events: none`.
9. **ClosingLoop** — back clouds `xPercent ±75→0`; copy rises; hills `yPercent 28→0`; loop `yPercent 125→0, scale .72→1, rotate −7→0` with `back.out(1.5)`; sparkles pop (stagger 0.08); caption fades in. The loop's light pulse is CSS (`stroke-dasharray .07 .93`, 3.2s linear loop).
10. **IdeaOrb** — `useOrbAnchor(ref, { form: 'spark' | 'brief' | 'badge' | 'hide', scale?: number, alt?: string })` registers anchors in DOM order. One ScrollTrigger per anchor's section (`start 'top 70%'`, end `'top top'` for pinned sections, else `'top 30%'`). While travelling, the orb flies from its last anchor (held inside 14–86% of the viewport) to the next along a 60px arc; when resting, it scrolls with its anchor and fades out off-screen.

**How It Works page** (`components/how-it-works/howItWorksEngine.ts`, colours only)

- `NEON.light`: `tile '#EEF5FF'`, `levels ['#EEF5FF','#BCD8FF','#7CB5FF','#3D8EF5','#0060CC']`, `indigo '#7C3AED'`. `ACCENT '#0069E0'`, `ACCENT_DEEP '#0050B8'`, `PILL_SOLID '#181D27'`, `CARD_BG_SOFT '#FAFDFF'`, `CARD_LINE '#DDE8F5'`, `CARD_INK '#0A0D12'`, `GRID_SHADES` = the same blue levels.
- `readPalette()`: background from `cssColor('var(--sky)')` instead of `--ink-950`. Fog stays `Fog(bg, 22, 62)` so the scene melts into the sky.
- Add a `CloudBank` above the first step and below the last, and a soft white vignette in `.how-veil`. Do not touch geometry, camera, lights' positions or the scroll logic.

## E. Exact file modification plan

All paths are relative to the repository root and exist at `19f0dff` unless marked **new**.

**Never modify**

- `src/components/scenes/A-ProjectStack/ProjectStackScene.tsx`, `src/components/scenes/A-ProjectStack/engine.ts`
- `src/data/homeDemo.ts`, `src/data/homeArt.ts`, `src/components/scenes/shared/IllustratedAvatar.tsx`, `src/components/scenes/shared/PersonAvatar.tsx`, `src/components/scenes/shared/demoData.ts` (imported by the stack or by kept scenes)
- `src/integrations/supabase/client.ts`, `src/services/{api,contributions,storage}.ts`, `src/contexts/AuthContext.tsx`, `src/components/auth/*`, `src/utils/{roles,authRedirect,labels,heat}.ts`, `src/types/index.ts`, `src/hooks/*`, `src/features/feed/{services,hooks,utils}/*`, `src/features/feed/{types,constants}.ts`, `supabase/*`, `vercel.json`
- Engines' geometry and logic: `components/how-it-works/howItWorksEngine.ts` and `scenes/Companies-City/engine.ts` (colour constants only, as listed in D)

**Modify**

| File | Change |
| --- | --- |
| `index.html` | Remove the Google Fonts `<link>`s; `<meta name="theme-color" content="#ebf5ff">`; keep the theme script but force `light` |
| `package.json` | Add `@fontsource-variable/geist`, `@fontsource-variable/geist-mono`, `@fontsource/instrument-serif`, `@fontsource-variable/bricolage-grotesque`, `@fontsource-variable/figtree` |
| `src/main.tsx` | Import the five font packages |
| `tailwind.config.js` | Fonts → Geist/Geist Mono/Instrument Serif; add colours `sky card paper mist ink charcoal graphite fog line iris lav mint powder solar peach`, `borderRadius.card/img/input`, `boxShadow.float/btn`, `transitionTimingFunction.out`; keep existing scales |
| `src/design-system/tokens/tokens.css` | New values (section B); light = default |
| `src/design-system/tokens/{colors,typography,radius,shadows}.ts` | Mirror the new values |
| `src/design-system/DesignProvider.tsx` | Wrap children in `SmoothScroll` |
| `src/design-system/animations/gsap.config.ts` | Register ScrollTrigger; new easings |
| `src/design-system/index.ts` | Export `motion/*` and `illustrations/*` |
| `src/design-system/components/ThemeProvider.tsx` | `export const DARK_MODE_ENABLED = false`; force light while false |
| `src/components/theme/ThemeToggle.tsx` | Return `null` while dark mode is off |
| `src/index.css` | Rewrite `@layer components` (B); delete the "NO SILVER" and "WHITE + GRADIENT" patch blocks once tokens cover them; restyle `.hdr-*`, AUTH, G, I, `.pf`, `.sd`, publish and FEED blocks; remove the dead particle/infinity/team blocks |
| `src/App.tsx` | Replace `RouteStage` with `PageTransition`. Nothing else in this file |
| `src/components/navigation/{Navbar,MobileTabBar,Wordmark}.tsx` | Markup classes for the pill nav; same links, auth menu and role logic |
| `src/components/layout/Footer.tsx` | Genie footer |
| `src/components/shared/ui/{Button,Badge,Avatar,Select,LoopLoader,Reveal}.tsx` | Variant classes only; same props |
| `src/components/projects/ProjectCard.tsx`, `src/components/companies/CompanyCard.tsx`, `src/components/gallery/{WorkCard,GalleryOverlays,MiniHeat}.tsx` | Class names and wrappers |
| `src/components/contributions/palette.ts` | Blue scale levels |
| `src/pages/HomePage.tsx` | New composition (F6) |
| `src/pages/{HowItWorksPage,ExplorePage,GalleryPage,CompaniesPage,ProjectDetailPage,CreatorProfilePage,SignInPage,JoinPage,ForgotPasswordPage,ResetPasswordPage,PublishProjectPage,SettingsPage,NotFoundPage}.tsx` and `src/pages/dashboards/*.tsx` | Wrapper and class-name changes only (section C) |
| `src/pages/BuildProfilePage.css` | Retheme |

**Delete** (F0, already proven unused): `src/pages/HomeOld.tsx`, `src/components/scenes/B-TeamFormation/*`, `src/components/scenes/C-LiveProjects/*`, `src/components/scenes/D-Infinity/*`, `src/components/scenes/shared/{PinnedScene.tsx,useScrollEngine.ts,canvasPanel.ts}`, `src/components/scenes/Home-Ecosystem/engine.ts`, `src/components/home/{ParticleStage.tsx,particleEngine.ts}`. After F6 also delete `scenes/Home-Ecosystem/*`, `scenes/C-LiveDashboard/*`, `scenes/F-ProjectShowcase/*`, `scenes/H-ExplorePreview/*` once nothing imports them (`git grep` to prove it).

**Create**

| New file | Responsibility | Interface |
| --- | --- | --- |
| `src/design-system/motion/SmoothScroll.tsx` | Lenis + ScrollTrigger wiring | `SmoothScroll({ children })`, `useLenis(): Lenis \| null` |
| `src/design-system/motion/useReducedMotion.ts` | Re-export | `useReducedMotion(): boolean` |
| `src/design-system/motion/useScrollScene.ts` | Scoped GSAP lifecycle | `useScrollScene(ref: RefObject<HTMLElement>, build: (mm: gsap.MatchMedia) => void, deps?: unknown[])` |
| `src/design-system/styles/layout.css` | `.page`, `.page-hero`, `.section`, `.section-head` | imported from `index.css` |
| `src/design-system/illustrations/Cloud.tsx` | One SVG cloud (symbol + `<use>`) | `{ tone?: 'white' \| 'sky'; width: number \| string; className?; style? }` |
| `src/design-system/illustrations/CloudBank.tsx` | Row of layered clouds for edges | `{ side: 'top' \| 'bottom'; density?: 3 \| 5; parallax?: boolean }` |
| `src/design-system/illustrations/ClayObject.tsx` | Badge, note, spark, loop, cubes, bubble, shield, folder | `{ kind: ClayKind; size?: number; float?: boolean }` |
| `src/design-system/illustrations/ClayFace.tsx` | The three word-band characters | `{ tone: 'peach' \| 'lav' \| 'solar' \| 'blue'; mood?: 'smile' \| 'calm'; size?: number }` |
| `src/design-system/illustrations/LoopMark.tsx` | Loop logo: flat (draw-on) and glossy 3D | `{ variant: 'line' \| 'glossy'; draw?: boolean; pulse?: boolean; width: number }` |
| `src/components/layout/PageTransition.tsx` | Route transitions | `{ children }` (reads `useLocation`) |
| `src/components/layout/AuthLayout.tsx` | Split auth layout | `{ title: ReactNode; subtitle?: string; children; aside?: ReactNode }` |
| `src/components/shared/ui/SectionHeader.tsx` | Eyebrow / title / lead | `{ eyebrow?: string; title: ReactNode; lead?: string; align?: 'center' \| 'left' }` |
| `src/components/shared/ui/PageHero.tsx` | Page hero with clouds | `{ eyebrow?; title; lead?; actions?: ReactNode; clouds?: boolean }` |
| `src/components/shared/ui/Tabs.tsx` | GitHub-style tabs, sliding underline, keyboard arrows | `{ items: { id: string; label: string; count?: number }[]; value: string; onChange(id: string): void }` |
| `src/components/shared/ui/VerifyRow.tsx` | Baselayer verification line | `{ status: 'verified' \| 'pending' \| 'rejected'; label: string; source?: string; time?: string }` |
| `src/components/shared/ui/ActivityFeed.tsx` | Commit-style feed | `{ items: ActivityItem[]; stream?: boolean; max?: number }` |
| `src/components/shared/ui/KpiTile.tsx` | Pastel KPI tile | `{ label; value: string \| number; tone?: 'sky' \| 'lav' \| 'mint' \| 'solar'; delta?: string }` |
| `src/components/shared/ui/AvatarStack.tsx` | Overlapping avatars + count | `{ people: { name: string; src?: string }[]; max?: number }` |
| `src/components/shared/ui/Accordion.tsx` | Grid-rows accordion (0.65s) | `{ items: { q: string; a: ReactNode }[]; defaultOpen?: number }` |
| `src/components/shared/ui/Marquee.tsx` | Endless strip, pauses on hover | `{ children; speed?: number; reverse?: boolean }` |
| `src/components/home/IntroCurtain.tsx` … `ClosingLoop.tsx` | The homepage sections in D | `IntroCurtain({ onDone })`, `HeroGenie({ ready })`, `StorySentence()`, `ExpandingCard()`, `FrozenStack()`, `WordBands()`, `FeatureCards()`, `ProjectArc()`, `StickerTrail({ targetRef })`, `ClosingLoop()`, `IdeaOrb()`, `useOrbAnchor(ref, opts)` |
| `src/components/home/home.css` | Styles for the new homepage sections | imported by `HomePage.tsx` |
| `src/components/scenes/A-ProjectStack/stack.frozen.css` (**new file inside the protected folder**, the only addition there) | Frozen copy of every rule the stack uses (F1) | imported by `FrozenStack.tsx` |
| `e2e/visual.spec.ts` | Screenshot tests (bring from the Phase 1 WIP commit) | — |
| `docs/redesign/` | Demo HTML, reference files, this blueprint as Markdown | — |

`src/components/home/` already exists (it holds the two dead particle files deleted in F0), so the new homepage components sit in a folder the repo already uses.

## F. Implementation sequence

Ten phases, each a small group of commits that builds, passes tests and can be reviewed on its own Vercel preview. Each phase depends only on the ones before it. **Stop for approval after F1, F3, F6 and F9.**

Tests after every commit: `npm run typecheck`, `npm run build`, `npm run lint` (no new errors beyond the existing baseline), `npm run test:e2e`.

- [ ] **F0 — Branch and baseline.** Create `redesign/genie` from `main` (section "How to use"). From the WIP commit bring over `e2e/visual.spec.ts` and the dead-file deletions listed in E (not `A-ProjectStack/engine.ts`). Add `docs/redesign/` with the demo, the four reference files and this blueprint. Run the app on `main` and record baseline screenshots at 1440×900 and 390×844 for all 24 routes, plus `#stack` at 0%, 50% and 100% of its pin. *Accept:* build green, baseline images committed under `e2e/__baseline__/`.
- [ ] **F1 — Freeze the protected stack.** Create `scenes/A-ProjectStack/stack.frozen.css`: copy from `src/index.css` at `19f0dff` every rule whose selector contains any class used in `ProjectStackScene.tsx` (≈ lines 292–321, 428–433, 655–816, 1505–1511, 1835–1843, 1933–1934, plus `.hl` at 673). Prefix every selector with ` .stack-frozen  `. At the top, declare on `.stack-frozen` the variables those rules read, with their values at `19f0dff`: `--font-sans` Figtree, `--font-display` Bricolage Grotesque, `--font-accent` Instrument Serif, `--cyan`, `--slab*`, `--edge-b`, `--line*`, `--muted`, `--text*`, `--hr-*`, `--shadow*` (read them from `tokens.css` and `.home-redesign` light values). `FrozenStack.tsx` renders `<div className="stack-frozen" style={{ background: 'var(--stack-bg)' }}><ProjectStackScene /></div>` and imports the CSS. *Accept:* stack screenshots identical to the F0 baseline (pixel diff ≤ 0.1%) on desktop and mobile; drag-rotate and step clicks still work.
- [ ] **F2 — Tokens and fonts.** Section B token set in `tokens.css` and the `.ts` mirrors; Tailwind extension; fonts via Fontsource; `index.html` cleanup; dark mode off. *Accept:* every route renders in the sky/charcoal palette with Geist; stack unchanged vs baseline.
- [ ] **F3 — Component layer.** Rewrite `@layer components` (B); add `.card`, `.input`, `.tabs`, `.section-head`, `.acc`, chip tones; create `design-system/styles/layout.css`; remove the two light-theme patch blocks; restyle `shared/ui/*` variants. *Accept:* the review screenshot sheet shows consistent buttons, inputs, cards and chips on every route; no grey "silver" surfaces left; contrast ≥ 4.5:1 for body text.
- [ ] **F4 — Motion infrastructure.** `SmoothScroll`, `useReducedMotion` re-export, `useScrollScene`, ScrollTrigger registration, `PageTransition` replacing `RouteStage`. *Accept:* smooth wheel scrolling on every page; the stack, Companies city and How It Works scenes still pin and scrub correctly; route changes fade with no scroll jump; with reduced motion on, Lenis is off and transitions are instant.
- [ ] **F5 — Shell and shared components.** Navbar, MobileTabBar, Footer; illustrations (`Cloud`, `CloudBank`, `ClayObject`, `ClayFace`, `LoopMark`); `SectionHeader`, `PageHero`, `Tabs`, `VerifyRow`, `ActivityFeed`, `KpiTile`, `AvatarStack`, `Accordion`, `Marquee`; `AuthLayout` applied to the four auth pages. *Accept:* sign in (email + Google), sign out, join as each role, forgot and reset password all work exactly as before; nav menus show the same items per role.
- [ ] **F6 — Homepage.** Build `components/home/*` in this order, one commit each, checking against the demo after each: `HeroGenie` → `IntroCurtain` → `StorySentence` → `ExpandingCard` + `FrozenStack` hand-off → `WordBands` → `FeatureCards` → `ProjectArc` → companies (kept city + restyled grid) → testimonials → FAQ + `StickerTrail` → `ClosingLoop` → `IdeaOrb` last. Recompose `HomePage.tsx`. *Accept:* side-by-side video of demo vs `/` (signed out) at 1440 and 390 matches in order, timing and look; headline never clips at 1440, 1060, 768, 390; no console errors; Lighthouse mobile performance ≥ 85; CLS < 0.05.
- [ ] **F7 — Content pages.** Explore, Student Work (gallery), Feed, Companies (city recoloured), Project detail, Profiles, How It Works (recolour + clouds). *Accept:* every action on these pages works as on `main` (filters, search, open project, apply, star, comment, post, report, contact); How It Works scene runs with the new colours and unchanged motion.
- [ ] **F8 — Workspace pages.** Student, company and university dashboards; Publish Project; Build Profile; Settings; My Projects / Applications / Invitations; Admin moderation; 404. *Accept:* a test account of each role completes its main task (publish a project, review applicants, accept an invitation, edit profile, moderate a post).
- [ ] **F9 — Polish and release.** Hover/press states, focus rings, empty and loading states (skeletons on card shapes, `LoopLoader` restyled), reduced-motion pass, mobile pass at 360/390/768, cross-browser (Chrome, Safari, Firefox). Update the visual baselines. Open a PR to `main`. *Accept:* all checks green on the PR, your sign-off on the preview, then merge.

## G. Risk and preservation plan

The redesign only touches presentation files, and each risk below has a check that runs before a phase is approved.

| Area | Risk | Prevention | Check |
| --- | --- | --- | --- |
| Supabase and data | A refactor changes a query or a payload | Files in E "Never modify" stay untouched; page edits are limited to `className`, wrappers and new presentational children | `git diff main --stat -- src/services src/integrations src/contexts src/hooks src/features/feed/services supabase` must be empty at every phase |
| Authentication | Auth pages lose a handler while being wrapped in `AuthLayout` | `AuthLayout` only receives existing JSX as `children`; no handler moves | Sign in (email, Google), sign out, join (student, company, university), forgot and reset password, `AuthErrorBanner`, `NewStudentOnboardingRedirect` to `/build-profile` |
| Roles and permissions | Nav or dashboard shows the wrong items | `RoleRoute`, `GuestOnlyRoute`, `HomeRoute`, `utils/roles.ts` untouched; Navbar keeps its item arrays | One account per role: menu items, dashboard redirect, `/admin/moderation` access |
| Routing | Page transitions break lazy loading or scroll position | `PageTransition` keeps `Suspense` with `RouteLoading`; `ScrollToTop` stays; Lenis `scrollTo(0)` plus `ScrollTrigger.refresh()` after each route change | Visit all 24 routes in sequence, use back/forward, deep-link `/projects/:slug` and `/creators/:handle` |
| Protected stack | Global CSS or Lenis changes its look or pin | `stack.frozen.css` scope (F1); dashboard rules renamed from `.sd` to `.sdash` in F8 because the stack also uses `.sd`; stack files never edited | Pixel diff against the F0 baseline after every phase |
| Other 3D scenes | Recolouring breaks WebGL or the scroll logic | Only colour constants change in `howItWorksEngine.ts` and `Companies-City/engine.ts`; `supportsWebGL()` fallbacks kept | Scenes run on Chrome, Safari, a mid-range Android; fallback with WebGL off |
| Scroll animations | Pins from different sections collide, or triggers outlive their page | Every scene uses `useScrollScene` (`gsap.context` + `revert` on unmount); pins created in DOM order; `ScrollTrigger.refresh()` after fonts load | Scroll `/` top to bottom and back; leave mid-pin and return; no warnings |
| Mobile | Pins and heavy effects jank on phones | `gsap.matchMedia('(min-width: 768px)')` for every pin; orb and sticker trail off on touch; clouds 60% size | 360, 390 and 768px widths; no horizontal scrollbar on any route |
| Accessibility | Motion sickness, lost focus, unreadable text | `prefers-reduced-motion` path for every animation; Lenis off; visible focus rings; cards keyboard-operable; the headline has an `aria-label` | Keyboard-only pass of home and auth; axe check shows no new violations |
| Performance | Bundle grows; slow first paint | Homepage components lazy-loaded below the hero; one cloud symbol reused; fonts self-hosted with `font-display: swap` | Lighthouse mobile ≥ 85 on `/`, CLS < 0.05, JS for `/` within +60 KB gzip of `main` |
| Rollback | A bad merge reaches the live site | Work only on `redesign/genie`; review on Vercel previews; merge by PR | `main` remains deployable at every point |

## H. Attachments and assets checklist

Claude Code works best running inside your local project folder, so most of this goes into `docs/redesign/` in the repo. Nothing secret is ever committed.

**Essential**

- [ ] **Repository access**: run Claude Code in `C:\Users\HP\Downloads\webloop\project` with Node 18+, `npm install` done, and permission to push branches to `Hamdan-CS/Webloop`.
- [ ] **Approved demo v2**: `webloop-genie-demo.html` (in your Downloads folder `WebLoop — Homepage mock-up (Geniestudio direction)`) copied to `docs/redesign/webloop-genie-demo.html`. It runs offline and is the visual reference.
- [ ] **Reference files**: `DESIGN.md`, `tokens.json`, `variables.css`, `theme.css` copied to `docs/redesign/reference/`.
- [ ] **This blueprint**: export it as Markdown and save it to `docs/redesign/BLUEPRINT.md`, then tell Claude Code: "Follow docs/redesign/BLUEPRINT.md starting at F0 and stop at each approval point."
- [ ] **Local environment**: `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (never committed; already git-ignored).
- [ ] **Test accounts**: one each for student, company, university and admin, with their emails and passwords kept in your password manager. You sign in during testing; Claude Code should not store them.

**Optional, but helpful**

- [ ] Screen recordings (10–20s each) of Geniestudio's clouds, curved image arc, FAQ trail and ending, for side-by-side motion checks.
- [ ] A screen recording of the current homepage stack section on `main`, as a human-visible baseline next to the pixel baseline.
- [ ] The earlier plan doc ([WebLoop × Geniestudio plan](https://claude.ai/artifact/EC2pJJYst2EqQPKFJ6va65)) exported to `docs/redesign/PLAN-v2.md` for background.
- [ ] Any official WebLoop logo source (SVG). Without one, `LoopMark.tsx` uses the loop path already in the demo.
- [ ] Vercel project access, so preview deployments appear on each push.

**Not needed**: Geniestudio's own files, Rive animations or illustrations (none are used), Aeonik font files, or database changes.

**What to approve before coding starts**: this blueprint; the two open choices below.

- The 3D Companies city stays on the homepage under the new companies section (assumed yes).
- Dark mode is switched off for the redesign and can return later as a token set (assumed yes).
