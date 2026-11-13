/**
 * Webi — every tunable number in one place.
 * Values are ported 1:1 from the approved reference (webi-reference.html).
 * Change them here, not in the engine.
 */

export type WebiMood = 'idle' | 'happy' | 'think' | 'error' | 'bug' | 'sleep' | 'dizzy' | 'success';
export type WebiSpot = 'r' | 'l' | 'm';

export interface WebiMoodDef {
  /** palette: light → dark, eased toward while the mood is active */
  c: [string, string];
  /** default bubble line when the mood is forced without one */
  say?: string;
}

export const WEBI = {
  /** body: 84 beads on a figure-8 + 3 thought-bubble beads, merged by the goo filter */
  beads: { count: 84, thought: 3, radius: 7.5 },

  /** size of the 8 (scale of the unit-space body) */
  scale: { desktop: 0.6, mobile: 0.48, mobileBelow: 700, logoStart: 0.42 },

  /** goo filter: feGaussianBlur stdDeviation and the alpha row of the colour matrix */
  goo: { id: 'webi-goo', blur: 3.6, alphaMul: 20, alphaOff: -8 },

  /** movement toward the current spot */
  spring: { k: 0.016, damping: 0.86, maxSpeed: 11 },

  /** where Webi stands for each data-webi-spot value (fractions of the viewport) */
  spots: {
    desktopX: { r: 0.86, l: 0.1, m: 0.86 } as Record<WebiSpot, number>,
    mobileX: { r: 0.82, l: 0.18, m: 0.82 } as Record<WebiSpot, number>,
    y: 0.6,
    yHigh: 0.42, // used by "m"
    /** a section counts as centred when it spans this band of the viewport */
    band: [0.4, 0.6] as [number, number],
    margin: { x: 60, top: 100, bottom: 80 },
    sway: { x: 10, xSpeed: 0.5, y: 8, ySpeed: 0.8 },
    /** while gliding in after the intro, stay an ∞ until this close */
    standUpWithin: 120,
  },

  /** intro: drip out of the nav logo (only when scrollY < nearTop) */
  intro: {
    nearTop: 40,
    popAt: 0.6, // s — logo switches to watermark, Webi appears
    dripFor: 1, // s
    dripDistance: 70, // px
    endsAt: 1.6, // s
    faceAt: 0.9, // s
    sayAt: 2.2, // s
    standUpWindow: 4, // s
    line: "Hi! I'm Webi, your WebLoop guide. Scroll, and I'll show you around.",
    lineMs: 4800,
  },

  /** logo watermark while Webi is out */
  logo: { watermark: '#d3e4fb', run: '#0069e0', runFraction: 0.16, runSeconds: 2.4 },

  /** mood triggers */
  triggers: {
    dizzyScrollPx: 70, // per frame
    dizzyMs: 1300,
    sleepAfterMs: 12000,
    forcedDefaultMs: 2500,
    tickle: { ms: 1400, line: 'Hehe, that tickles!', radius: 70, pad: 30 },
  },

  /** bubble placement relative to Webi (multiplied by the current scale) */
  bubble: { gapRight: 40, gapFlip: 44, above: 60, edge: 12, minTop: 70, bottomPad: 10 },

  /**
   * Guided tour (desktop only). Hovering Webi shows `hoverLine`; clicking him
   * starts the tour: Webi takes over the scroll and stops at each step to
   * explain it. Any click (on him or anywhere), or Esc, cancels it.
   * Steps are matched by selector, in order; missing ones are skipped.
   */
  tour: {
    desktopQuery: '(hover: hover) and (pointer: fine) and (min-width: 900px)',
    hoverLine: 'Need an explanation? Click me.',
    startLine: "Okay! I'll walk you through it. Click anywhere to stop.",
    startMs: 2600,
    cancelLine: "Okay, I'll stop here.",
    cancelMs: 1800,
    scrollSeconds: 1.6,
    /** how long each step's line stays up: base + per character, clamped */
    read: { baseMs: 1800, msPerChar: 45, minMs: 3200, maxMs: 6500 },
    steps: [
      { target: '#top', line: 'This is WebLoop. Students, companies and universities build real projects here, together.' },
      { target: '#how', line: 'Here is how it works: a brief, a team and a mentor turn your idea into verified proof.' },
      { target: '.gh-stack-slot', line: 'Every project has an overview, a team, tasks, contributions and a final result.' },
      { target: '#words', line: 'Team up, build in the open, and prove what you actually did.' },
      { target: '#projects', line: 'These tools take a brief all the way to proof. Hover a card to open it.' },
      { target: '#explore', line: 'Projects from every field. Hover to peek, click to open one.' },
      { target: '#companies', line: 'Companies post real briefs, and review what student teams ship.' },
      { target: '.gh-tst', line: "Here's what builders and teams say about WebLoop." },
      { target: '#faq', line: 'Still curious? The answers to common questions are right here.' },
      { target: '#end', line: "That's the tour! Join WebLoop whenever you're ready." },
    ],
  },

  /** debug mood bar duration */
  debugMs: 3500,

  moods: {
    idle: { c: ['#6aaeff', '#0057c8'] },
    happy: { c: ['#7fd4ff', '#127ff0'], say: 'Yay! That made my day.' },
    think: { c: ['#b9a8ff', '#5b3fd8'], say: 'Hmm… let me think about that.' },
    error: { c: ['#ff8d8d', '#d9213a'], say: 'Uh-oh. Something went wrong.' },
    bug: { c: ['#c9ec6e', '#4f8f0e'], say: 'I f-f-found a b-bug. Squashing it…' },
    sleep: { c: ['#c3cedd', '#6c7d97'], say: 'zzz… scroll to wake me up.' },
    dizzy: { c: ['#ffd27a', '#ec7d12'], say: "Whoa, slow down! I'm dizzy." },
    success: { c: ['#8fe9c4', '#0aa774'], say: "Done! You're all set." },
  } as Record<WebiMood, WebiMoodDef>,
} as const;

export const WEBI_MOODS = Object.keys(WEBI.moods) as WebiMood[];
