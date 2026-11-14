# Webi

Webi is WebLoop's guide character: a small liquid blue "8" that lives on the **home page only**.
The approved reference (`webi-reference.html`) is the source of truth. Everything here is a 1:1 port of it.

## How he works

- **Body.** 84 beads sit on a figure-8 curve (`form(i, m)`), plus 3 "thought" beads used by the `think` mood.
  - `m = 0` is the standing 8 (vertical, width ratio 0.58).
  - `m = 1` is the lying ∞ (the logo, horizontal, ratio 0.42).
  - Each bead springs toward its spot every frame, which gives the liquid wobble, the bob and the drag while scrolling.
- **Goo.** The beads are drawn on one canvas (`.webi-goo`). The SVG filter `#webi-goo` blurs them (stdDeviation 3.6) and then sharpens the alpha (`20 -8`), which merges them into one body.
- **Face.** A second canvas (`.webi-face`) draws crisp eyes, mouth and mood props on top. The eyes blink and look toward the cursor.
- **Placement.** Each frame, Webi finds the `[data-webi-spot]` element closest to the middle of the viewport and glides to its side on a soft spring (k 0.016, damping 0.86, speed capped at 11). He does not follow the cursor.
- **Intro.** This runs only when the page is near the top.
  - The nav ∞ pops and switches to a pale watermark with a running light.
  - Webi drips 70px out of the logo as a small ∞, then glides to his spot and stands up into the 8.
  - At 2.2 s he greets the visitor.
  - On the first visit of a session, the intro waits for the cloud curtain to finish (the `ready` prop).
- **Logo.** Before Webi leaves, the logo is solid. While he's out, it's the watermark plus the running light. When `<Webi />` unmounts, the engine removes `out`, so every other page shows the normal logo.

## Guided tour (desktop only)

The tour only runs where `(hover: hover) and (pointer: fine) and (min-width: 900px)` matches. Phones and tablets don't get it.

- **Hover Webi.** The cursor becomes a pointer and the bubble says "Need an explanation? Click me."
- **Click Webi.** He switches to his teacher look: the `teach` mood, which is a teal body with round glasses and a graduation cap, and a mouth that moves while he talks. Then he explains, **starting from the section the visitor is already in**, not from the top.
- **Beats.** Each step in `WEBI.tour.steps` has one or more beats. At each beat Webi:
  1. scrolls slowly to that stop (eased, about 380 px/s), so scroll animations play visibly;
  2. walks to the beat's `pos`;
  3. explains it in the bubble. How long the line stays up depends on its length.
- **Pinned scenes.** In the How It Works story, the Project Stack and the others, `at` is the pinned scroll progress, so the stops follow the animation. The stack has one beat per layer at 0, .24, .49, .74 and 1, matching its active layer. Webi waits `settleMs` for the scrubbed animation to land before he speaks.
- **While the tour runs**, wheel and scroll keys are blocked, so Webi controls the page. His bubble stays fully opaque.
- **Cancel.** Any click (on Webi or anywhere else) or Esc stops the tour. Webi says "Okay, I'll stop here.", goes back to his normal look, and the page stays where it is. A click on Webi never reaches the element underneath him.
- **Edit the tour.** Lines, stops, positions and speed are all in `webi.config.ts` under `tour`. Missing targets are skipped.
- **Outside the tour**, a bubble that covers page text fades to 62% opacity.

## Hide and bring back

- **Hide.** A small red × sits on Webi's shoulder, on the side away from his bubble. Clicking it:
  1. ends any tour;
  2. Webi says "Thank you! If you need me, click on the loop." and shrinks back into the nav ∞;
  3. the logo turns solid again.
- **Bring back.** While he's hidden, clicking the nav logo (on the home page) brings him back out. The click is caught, so the page doesn't navigate. He drips out to his spot and says he's back.
- **Session.** The hidden state lasts for the browser session (`sessionStorage` `webi_parked`). Everything is in `webi.config.ts` under `dismiss`.
- **Clicks.** The × is the only Webi layer that takes clicks. It's a real `<button aria-label="Hide Webi">`, hidden from the tab order whenever it isn't shown.

## Files

| File | What it holds |
|---|---|
| `webi.config.ts` | Every tunable number: sizes, beads, springs, spot positions, intro timings, palettes, bubble lines |
| `webiEngine.ts` | Framework-agnostic engine: physics, moods, `form()`, `drawFace()`, bubble, logo state. One rAF loop. No React |
| `Webi.tsx` | React component. Portals the goo filter, both canvases, the bubble and the dev mood bar to `<body>`, and creates/destroys the engine |
| `useWebi.ts` | `useWebi().setMood(...)` and `setWebiMood(...)` |
| `WebiLogoLoop.tsx` | The nav ∞ as inline SVG with `.wm`, `.run` and `.main` paths plus `data-webi-logo` |
| `webi.css` | Layers, bubble, logo states, dev mood bar |

## Public API

```ts
import { useWebi } from '@/design-system/webi';
const { setMood } = useWebi();
setMood('error', 2800, "That didn't work."); // mood, duration in ms, optional bubble line
```

From code outside React:

```ts
window.dispatchEvent(new CustomEvent('webi:mood', { detail: { mood: 'success', ms: 2500, say: 'Saved!' } }));
```

Both do nothing when Webi isn't mounted.

**Mood priority:** tour (`teach`) > forced (`setMood`) > hovered element's `data-webi-mood` > `dizzy` (scrolling faster than 70px per frame) > `sleep` (12 s with no input) > `idle`.

**Moods:** `idle`, `happy`, `think`, `error`, `bug`, `sleep`, `dizzy`, `success`, and `teach` (used by the tour).

## Markup hooks

- `data-webi-spot="r" | "l" | "m"` on a section sets which side Webi stands on while that section is centred. `m` means right and higher.
- `data-webi-mood="happy"` on an element sets the mood while it's hovered.
- `data-webi-say="…"` on an element sets the bubble text while it's hovered.

For a protected component (the 3D Project Stack, the How It Works scene, the Companies city), put the attribute on a **wrapper outside** it. Never put it on the component itself.

## How to…

- **Add a spot.** Put `data-webi-spot` on an existing home section. Pick the side where Webi won't cover important content.
- **Add a mood.**
  1. Add it to `WebiMood` and `WEBI.moods` (palette and default line) in `webi.config.ts`.
  2. Add its body tweak in the "shape per mood" block of `webiEngine.ts`.
  3. Add its eyes, mouth and props in `drawFace()`.
- **Tune him.** Change numbers in `webi.config.ts`, not in the engine. Canvas and bubble opacity and z-index live in `webi.css`.

## Rules

- Mount `<Webi />` only on the home page, and only once.
- All layers except the × use `pointer-events: none` and `aria-hidden`. Clicks on Webi are detected with a window `pointerdown` distance check.
- Never give an element the id `webi-goo`. It is the filter id, and a clash breaks `getContext`.
- z-index: the goo canvas is 30, the face 31, the bubble 32 and the × 33. All are below the nav (90), modals and toasts.
- **Reduced motion:** no intro drip, no wobble, bob, hops or drag. Webi appears at his spot. Only blinking and mood colours remain.
- **Debug:** the mood preview bar renders only when `import.meta.env.DEV` is on **and** the URL has `?webi-debug`. It's never in production builds.
