/**
 * Webi — every tunable number in one place.
 * Values are ported 1:1 from the approved reference (webi-reference.html).
 * Change them here, not in the engine.
 */

export type WebiMood = 'idle' | 'happy' | 'think' | 'error' | 'bug' | 'sleep' | 'dizzy' | 'success' | 'teach';
export type WebiSpot = 'r' | 'l' | 'm';

export interface WebiTourBeat { at?: number; pos?: [number, number]; line: string }
export interface WebiTourStep { target: string; beats: WebiTourBeat[] }

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
    startLine: "Okay! Let me explain it, starting right here. Click anywhere to stop.",
    startMs: 2800,
    cancelLine: "Okay, I'll stop here.",
    cancelMs: 1800,
    endMs: 4200,
    /**
     * Scrolling: slow and eased, so scroll animations visibly play.
     * Duration = distance / pxPerSecond, clamped to [minSeconds, maxSeconds].
     */
    scroll: { pxPerSecond: 380, minSeconds: 1.4, maxSeconds: 9 },
    /** pause after a line before Webi moves on */
    pauseMs: 500,
    /** after scrolling to a stop in a pinned (scrubbed) scene, wait for its animation to catch up */
    settleMs: 1000,
    /** how long each line stays up: base + per character, clamped */
    read: { baseMs: 1600, msPerChar: 50, minMs: 3400, maxMs: 7500 },
    /**
     * Steps, in page order. Missing targets are skipped. Each beat:
     * - `at`: where to stop inside the section, 0 → 1. For a pinned section this is
     *   its pinned scroll progress (so `at` follows its scroll animation); for a normal
     *   section it runs from its top at the viewport top to its bottom at the viewport bottom.
     * - `pos`: where Webi stands, [x, y] as fractions of the viewport (omit → the section's spot).
     */
    steps: [
      { target: '#top', beats: [
        { at: 0, pos: [0.86, 0.6], line: 'This is WebLoop: students, companies and universities build real projects here, together.' },
        { at: 0, pos: [0.14, 0.66], line: 'You can join right here, or let me show you how it all works first.' },
      ] },
      { target: '#how', beats: [
        { at: 0.03, pos: [0.12, 0.7], line: 'Every project starts with a brief, not a blank page. Watch how WebLoop builds one.' },
        { at: 0.2, pos: [0.88, 0.72], line: 'It begins with your idea, the spark for the whole project.' },
        { at: 0.34, pos: [0.12, 0.72], line: 'Then you get a team, and a real brief that says what to build.' },
        { at: 0.5, pos: [0.88, 0.72], line: 'A mentor guides you, and the work turns into verified proof.' },
        { at: 0.72, pos: [0.9, 0.82], line: 'Your project gets its own workspace: a live activity feed and a heatmap of everyone’s work.' },
        { at: 0.9, pos: [0.1, 0.8], line: 'One click on Start, and the project opens up…' },
      ] },
      { target: '.gh-stack-slot', beats: [
        { at: 0, pos: [0.9, 0.78], line: 'A project is more than an idea. It has five layers. Here is the first: the overview, with its goal, status and tech stack.' },
        { at: 0.24, pos: [0.9, 0.62], line: 'Layer 2 is the team: who is building it, and the skills each person brings.' },
        { at: 0.49, pos: [0.9, 0.78], line: 'Layer 3 is tasks: to do, in progress and done, so everyone knows what comes next.' },
        { at: 0.74, pos: [0.9, 0.62], line: 'Layer 4 is contributions. Every commit is tracked, so each person’s work is visible.' },
        { at: 1, pos: [0.9, 0.78], line: 'And layer 5 is the final result: verified proof of what the team built.' },
      ] },
      { target: '#words', beats: [
        { at: 0, line: 'Three words sum up WebLoop. First: team up with people whose skills complement yours.' },
        { at: 0.5, pos: [0.88, 0.6], line: 'Then build it, in the open, step by step.' },
        { at: 1, line: 'And prove it: your real contribution is verified, not just claimed.' },
      ] },
      { target: '#projects', beats: [
        { at: 0, line: 'These are the tools that take a brief all the way to proof.' },
        { at: 1, line: 'Each card is one tool. Hover a card to open it and see how it works.' },
      ] },
      { target: '#explore', beats: [
        { at: 0.04, line: 'Here you can explore projects from every field.' },
        { at: 0.5, pos: [0.88, 0.7], line: 'As you scroll, the projects move past. Hover one to peek at it.' },
        { at: 0.96, line: 'Click a project to see who built it, and how.' },
      ] },
      { target: '#companies', beats: [
        { at: 0, line: 'Companies post real briefs here, and every company is verified.' },
        { at: 1, pos: [0.14, 0.62], line: 'Student teams apply, and the company reviews what they actually ship.' },
      ] },
      { target: '.gh-tst', beats: [{ at: 0, line: 'Here is what builders and teams say about WebLoop.' }] },
      { target: '#faq', beats: [{ at: 0, line: 'Still curious? The common questions are answered right here. Click one to open it.' }] },
      { target: '#end', beats: [
        { at: 0.3, line: 'Ideas, people and proof, all in one loop.' },
        { at: 1, pos: [0.86, 0.66], line: "That's the tour! Join WebLoop whenever you're ready." },
      ] },
    ] as WebiTourStep[],
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
    /** guided tour: teal body, round glasses and a graduation cap */
    teach: { c: ['#7be3ec', '#0a7c96'], say: 'Let me explain.' },
  } as Record<WebiMood, WebiMoodDef>,
} as const;

export const WEBI_MOODS = Object.keys(WEBI.moods) as WebiMood[];
