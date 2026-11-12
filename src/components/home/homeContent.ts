/**
 * Copy and sample data for the redesigned homepage, taken verbatim from the
 * approved demo (docs/redesign/webloop-genie-demo.html). All of it is
 * illustrative demo content and is labelled as such on the page.
 */
import type { ActivityItem } from '@/components/shared/ui/ActivityFeed';

export const TONES = ['#cce7ff', '#ffd1b8', '#d3f6e3', '#e4ccff', '#fff2be'];

export const HERO_WORDS = ['students', 'companies', 'universities'];
export const FACE_SETS = [
  ['#ffd1b8', '#cce7ff', '#d3f6e3'],
  ['#3d8ef5', '#12996a', '#7c3aed'],
  ['#e4ccff', '#fff2be', '#cce7ff'],
];

const ROWS: [string, string, string, 'v' | 'r'][] = [
  ['MK', 'Merged “session timer” API', 'studyflow · a91f3c2', 'v'],
  ['LN', 'Map layer for bus routes', 'citymind · 7d02e1b', 'r'],
  ['SR', 'Onboarding flow, 6 screens', 'studyflow · figma', 'v'],
  ['AH', 'Sprite batching renderer', 'pixel-realm · c44a90e', 'v'],
  ['MP', 'Emissions export to CSV', 'carbon-ledger · 3be81f0', 'v'],
  ['DK', 'Design review: settings', 'studyflow · figma', 'v'],
  ['SA', 'Model eval on 2k samples', 'novaai-brief · e10c7d2', 'v'],
];
export const FEED_ITEMS: ActivityItem[] = ROWS.map((r, i) => ({
  id: `row-${i}`,
  initials: r[0],
  title: r[1],
  meta: r[2],
  status: r[3] === 'v' ? 'verified' : 'review',
  tone: TONES[r[0].charCodeAt(0) % 5],
}));

/** Deterministic pseudo-random, so the graphs look the same on every visit. */
export const seeded = (s: number) => () => (s = (s * 9301 + 49297) % 233280) / 233280;
export const level = (r: () => number, bias: number) => {
  const v = r() + bias;
  return v > 1.2 ? 4 : v > 1 ? 3 : v > 0.8 ? 2 : v > 0.6 ? 1 : 0;
};

export type RingTone = 'aqua' | 'peach' | 'lav' | 'solar' | 'mint';
export const RING_PROJECTS: [string, string, string, RingTone][] = [
  ['Carbon Ledger', 'Company brief · 4 students · in progress', 'Web app', 'aqua'],
  ['Studyflow', 'Student project · 3 students · shipped', 'Mobile', 'peach'],
  ['CityMind', 'University lab · 5 students · in progress', 'Data', 'lav'],
  ['Pixel Realm', 'Student project · 2 students · shipped', 'Game', 'solar'],
  ['NovaAI eval', 'Company brief · 3 students · recruiting', 'ML', 'mint'],
  ['TrailMate', 'Student project · 4 students · in progress', 'Mobile', 'aqua'],
  ['GreenTrack', 'Company brief · 3 students · shipped', 'Web app', 'mint'],
  ['Atlas', 'University lab · 6 students · in progress', 'Research', 'lav'],
  ['ChainVote', 'Student project · 2 students · recruiting', 'Web3', 'peach'],
  ['BioMatch', 'University lab · 4 students · in progress', 'Health', 'solar'],
];
export const RING_BG: Record<RingTone, string> = {
  aqua: 'var(--g-aqua)', peach: 'var(--g-peach)', lav: 'var(--g-violet)', solar: 'var(--g-solar)', mint: 'linear-gradient(#ecfbf3,#c9f1dc)',
};

export const LOGOS = ['GreenLeaf', 'Fennel', 'NovaAI', 'CloudSync', 'Arcade', 'PixelForge', 'Rivermouth', 'Stellar Uni'];

export const QUOTES: [string, string, string][] = [
  ['I joined a company brief in week two of term. By the end I had three merged PRs a recruiter could click on.', 'Tomás Rivera', 'Student, Software Eng.'],
  ['We stopped reading CVs for our internship. We read verified contributions instead.', 'Lena Novak', 'CTO, GreenLeaf Studios'],
  ['Grading group work finally shows who did what, without the awkward peer reviews.', 'Dr. Amira Haddad', 'Lecturer, Stellar University'],
  ['The team matching found a designer two time zones away who was free exactly when we were.', 'Kofi Mensah', 'Student, CS'],
  ['Our briefs get shipped by students who actually want them. It beats a hackathon.', 'Jonas Weber', 'Founder, Fennel Labs'],
  ['My portfolio updates itself. I just keep building.', 'Yuki Tanaka', 'Student, Design'],
];

export const FAQ = [
  { q: 'Is WebLoop free for students?', a: 'Yes. Students join, team up and build their portfolio for free. Companies and universities pay to post briefs at scale.' },
  { q: 'Who verifies a contribution?', a: 'Whoever owns the brief: the company, the lecturer or the project owner. Each check links to the commit, file or review behind it.' },
  { q: 'Can my university run a course on WebLoop?', a: 'Yes. Lecturers post briefs, form teams and grade sprints, and students keep the verified work afterwards.' },
  { q: 'What happens to my work after a project ends?', a: 'It stays on your portfolio with its verification, and you can link it anywhere.' },
];
