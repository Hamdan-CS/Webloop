# WebLoop redesign: implement the approved HTML design across the whole site

You are working in the WebLoop repository (React + TypeScript + Vite + Tailwind, Supabase, deployed on Netlify/Vercel).
Attached is **`webloop-genie-demo.html`**, a single self-contained file. It is the **approved, final design**.

## 0. The one rule

**Follow the HTML file fully and literally.** It is the source of truth for:
- layout
- colours, fonts, spacing, radii and shadows
- components
- copy tone
- animations, their timing and easing
- responsive behaviour

Do not redesign, "improve", simplify or reinterpret it. Specifically:
- Open the file, read its `<style>` and `<script>` blocks, and port them faithfully into React components and CSS.
- Where the demo has an exact value (a hex colour, a px size, a GSAP ease, a duration, a stagger), use that exact value.
- When a page you are building does not exist in the demo, build it from the **same building blocks and rules** used in the demo (see section 3). It must look like it was always part of the file.
- If something in the demo cannot work in the real app, stop and ask me. Do not invent a substitute.

## 1. Hard constraints (do not break)

- **Do not modify:**
  - Supabase: client, queries, RLS, migrations or edge functions
  - authentication logic
  - user roles or permissions
  - route paths
  - data fetching or business logic

  This is a visual and interaction redesign only. Existing data must flow into the new UI unchanged. Replace the sample data in the demo with the real data the current pages already load.
- **Protected 3D sections:**
  - **"A project is more than an idea." 3D Project Stack:** do NOT change its geometry, animation, camera, materials, styling, interactions or behaviour. It mounts where the demo shows the dashed placeholder (`#stack`). Only the section transition into it, the circular "flood" reveal from the demo, may wrap it.
  - **How It Works 3D animation:** keep it. You may only recolour it to the demo palette and add the demo's clouds around it.
  - **Companies 3D buildings:** keep them.
- Keep every existing page and feature working: dashboards for every role, publish flow, build-profile, auth pages, feed, messages, portfolio, settings and admin.
- Keep responsive layouts working at 390px, 768px, 1024px and 1440px.
- Respect `prefers-reduced-motion`. The demo already has a reduced-motion path: copy it.
- **Git:**
  - Work on a new branch `redesign/genie`.
  - Commit locally at the end of each phase with a clear message.
  - **Do not push or open a PR unless I ask.**
- After each phase, run `npm run build` and the type check, fix all errors, then give me a short summary.

## 2. What to port from the HTML (public site)

Port each section of the homepage as its own component, in the same order as the demo:

| # | Demo section | Notes |
|---|---|---|
| 0 | Cloud intro (`#intro`, `INTRO_CL`, `introTL`) | First visit only (store a flag in `sessionStorage`). Three depths of clouds drift outward. |
| – | Floating nav (`.nav`, `.nav-pill`, `.nav-sheet`) | Sliding active pill, scroll-spy, compact + hide on scroll down. Mobile sheet menu. **"Feed" link with the pulsing green dot.** For signed-in users it goes to the existing `/feed` route; for signed-out users it goes to sign-in, then `/feed`. |
| 1 | Hero (`.hero`, `#rot`, `#bubs`) | Rotating word with letter roll animation, and sticker bubbles whose count changes 1 → 2 → 3. |
| – | "Idea" orb traveller (`#orb`, `[data-orb]` anchors) | Moves between anchors on scroll; fades with its resting anchor. Desktop only. |
| 2 | Story (`.story`, `storyjs`) | Pinned scene. Clouds slide in, stickers pop around the screen, then each line forms while its sticker flies home. The check sticker becomes the app icon, then an outline square, then the app window, then a cursor click, then the flood. Mobile: static layout as in the demo. |
| 3 | 🔒 Project Stack | Existing component, untouched. |
| 4 | Three words (Team / Build / Prove) | As in demo. |
| 5 | Expanding feature cards | As in demo. |
| 6 | Curved project arc carousel (`renderArc`) | Same arc maths; use real public projects. |
| 7 | Companies | Keep the existing 3D buildings and restyle the surrounding layout to the demo. |
| 8 | Testimonials | As in demo. |
| 9 | FAQ with cursor sticker trail | The trail container lives at **page level** (`#trail`, page coordinates) so stickers are never clipped at section edges. |
| 10 | Ending | Clouds close in from the sides and a 3D **particle infinity loop** (`createEndLoop`) rises between them. **No wordmark**: loop only. Then the white footer. |

Libraries the demo uses: **GSAP 3 + ScrollTrigger** and **Lenis**. Install them as npm packages (`gsap`, `lenis`), not CDN scripts. Re-create the canvas engines (`createEndLoop`, the sticker trail) as React hooks or components that clean up on unmount. Kill every ScrollTrigger and `matchMedia` context on route change.

Move the design tokens (`:root` variables, fonts Geist / Geist Mono / Instrument Serif, the cloud SVG symbols, the sticker set `STICK`) into the project's token file and Tailwind theme so every page shares them.

## 3. The signed-in app: one layout for EVERY page

The demo's `#app` workspace is the **layout every signed-in page must use**, including pages that are not in the demo. Do not leave any page in the old style.

**AppShell** (port `.app`, `.sb`, `.ws`, `.ws-panel` exactly):
- **Background:** mist `#f6f7f8`, with the content in one white panel with radius 24px, sitting inset 10px.
- **Left sidebar, 248px, collapsible to 76px** (toggle button top-right of the logo):
  - WebLoop logo
  - white **"+ New project"** button with a `⌘K` badge, which opens the command palette
  - main nav with icons: **Home, Feed, Projects (count), Explore, Messages (unread dot), Portfolio**
  - "YOUR PROJECTS" list with coloured dots
  - at the bottom, the user card (avatar, name, role) and a notifications bell with a red dot
  - nav items per role: keep each role's existing destinations, just render them in this style
- **Panel content pattern:** page header (title + one-line subtitle + actions on the right), then content in soft cards:
  - `.box`: background `#fafdff`-ish, radius 20px, 1px hairline ring
  - `.box-h`: bold title, small grey meta on the right
  - `grid2` two-column layouts that collapse to one column under 900px
  - use the same chips (`.cchip`), buttons (`.btn-d` dark pill, `.btn-l` light pill), avatars (`.av`), KPI tiles, contribution heatmap, verified-work list (green check rows), kanban, toast and command palette as the demo
- **Mobile (<860px):** sidebar hidden, bottom floating **tab bar**, and the panel scrolls on its own. Use `grid-template-rows:minmax(0,1fr)` on the shell so it scrolls.
- **Pages to convert, with the mapping:**
  - **Dashboards for every role:** use the demo's Home (greeting, composer, this-week tasks, KPIs, heatmap, team activity, invitations).
  - **Feed:** use the demo's Feed (filter chips, composer, post cards with like/comment/share, trending projects, people to follow).
  - **Project pages:** use the demo's Projects view (header image, progress, underline tabs Tasks / Activity / Team, kanban).
  - **Explore and Search:** use the demo's Explore (filter chips + card grid).
  - **Messages:** use the demo's Messages (thread list + chat bubbles).
  - **Portfolio and Profile:** use the demo's Portfolio (avatar header, "Copy link", Verified work, Contributions heatmap). This is the reference screenshot I liked most; match it exactly.
  - **Publish / new-project flow, build-profile, settings, notifications, company and university admin pages and anything else:** not in the demo, so build them from the same pieces. Same header pattern, same cards, chips, inputs and buttons. Forms are white cards with labelled inputs (radius 12px, hairline border, focus ring `0 0 0 2px #fff, 0 0 0 4px var(--iris)`).
  - **Sign in / sign up:** the public-site look (sky background, clouds, a centred white card), with the same auth logic as today.

## 4. NEW: browser-style tabs in the workspace (like Chrome)

Above the white panel there is a tab strip (`.ws-tabs` in the demo). Turn it into **real browser-like tabs**:

- Every page opened in the app opens as a **tab** showing the page title (and an icon or the project's colour dot). The active tab is the white raised pill from the demo; the others are flat grey text.
- **"+" button after the last tab** opens a **New tab** page (see below). `Ctrl/⌘ + T` does the same.
- **Close:**
  - each tab gets a × on hover (always visible on the active tab)
  - `Ctrl/⌘ + W` closes the active tab
  - middle-click closes a tab
  - closing the last tab opens a New tab
- **Switch and reorder:** clicking a tab switches to its route without reloading data that is already cached. Tabs can be **dragged to reorder**. `Ctrl + Tab` / `Ctrl + Shift + Tab` cycle through them.
- **Links:** ⌘/Ctrl-click or middle-click on any internal link or sidebar item opens it in a **new background tab**. A normal click replaces the current tab's page, as in a browser.
- **Persistence:** tabs and their order are kept per user in `localStorage` (key per user id) and restored on reload. Cap at 12 tabs, after which tabs shrink, then scroll horizontally.
- **Back to site:** "← Back to site" stays on the right end of the strip.
- **Routing:** each tab is just a route; the URL always reflects the active tab. Implement this as a small `TabsProvider` + `useTabs()` around the router. **Do not change route paths or route guards.**

**New tab page** (style it like the reference "Make a Wish" screen, in WebLoop's palette):
- **Centre card:** a large soft rounded card (mist/sky background, radius 28px) with a sparkle icon and a big input saying *"Search projects, people, or type a page…"*. It searches routes, projects and people and opens the result in this tab.
- **Grid / list toggle:** top-right of the card, as in the reference.
- **Quick links below:** Home, Feed, Projects, Explore, Messages, Portfolio, plus "Recently closed" (the last 5 closed tabs, click to reopen) and "Your projects".
- **Sidebar shortcut:** the sidebar's **"+ New project"** button keeps its job. Also add `⌘B` to open a New tab, shown as a small `⌘ B` badge.

## 5. Phases (stop and report after each)

1. **Foundation:**
   - create the branch
   - port tokens, fonts and Tailwind theme
   - install GSAP and Lenis
   - build the shared UI primitives (buttons, chips, cards, avatar, inputs, toast)
2. **Public site:**
   - nav with Feed
   - homepage sections 0–10 exactly as in the HTML
   - footer
   - auth pages
3. **App shell:**
   - sidebar, panel, mobile tab bar and command palette
   - browser-style tabs + New tab page
4. **Signed-in pages:**
   - convert every dashboard and page to the shell (section 3 mapping), role by role
5. **Polish:**
   - reduced motion
   - mobile pass at 390px
   - performance: lazy-load canvases, pause off-screen
   - console clean
   - build passes
   - side-by-side check against the HTML file

At the end of each phase, list:
- files changed
- anything in the HTML you could not reproduce, and why
- any place where you had to touch logic (ideally none)

Start with Phase 1. Before writing code, read the whole HTML file and the current repo structure, then reply with a short mapping:

> demo section/view → existing component/route → new component

Wait for my OK on that mapping, then begin.
