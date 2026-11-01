/* Fallback-only fictional content for the scroll scenes — used only while
 * real Supabase data is loading or if a scene has nothing real to show yet. */

export interface ShowcaseProject {
  id: string;
  name: string;
  category: string;
  desc: string;
  stack: string[];
  status: string;
  cols: [string, string];
  stats: string;
  team: { name: string; role: string; initials: string; cols: [string, string] }[];
  demo: boolean;
}

export const DEMO_PROJECTS: ShowcaseProject[] = [
  {
    id: 'demo-carbon-ledger', name: 'Carbon Ledger', category: 'Sustainability platform',
    desc: 'Track and report emissions across suppliers with auditable data.',
    stack: ['React', 'TypeScript', 'Supabase', 'D3'], status: 'In progress', cols: ['#0e7490', '#22d3ee'],
    stats: '24 tasks · 142 commits', demo: true,
    team: [
      { name: 'Lina Park', role: 'Frontend Developer', initials: 'LP', cols: ['#0e7490', '#22d3ee'] },
      { name: 'Omar Reyes', role: 'Backend Developer', initials: 'OR', cols: ['#2563eb', '#22d3ee'] },
      { name: 'Priya Nair', role: 'UI/UX Designer', initials: 'PN', cols: ['#0f766e', '#2563eb'] },
    ],
  },
  {
    id: 'demo-studyflow', name: 'StudyFlow', category: 'Learning management app',
    desc: 'Plan courses, track progress, and review with spaced repetition.',
    stack: ['React', 'Node.js', 'PostgreSQL', 'Tailwind'], status: 'Beta', cols: ['#2563eb', '#22d3ee'],
    stats: '31 tasks · 210 commits', demo: true,
    team: [
      { name: 'Maya Chen', role: 'Backend Developer', initials: 'MC', cols: ['#2563eb', '#22d3ee'] },
      { name: 'Alex Novak', role: 'Frontend Developer', initials: 'AN', cols: ['#0e7490', '#22d3ee'] },
      { name: 'Sara Ito', role: 'Product Designer', initials: 'SI', cols: ['#0f766e', '#2563eb'] },
    ],
  },
  {
    id: 'demo-devconnect', name: 'DevConnect', category: 'Collaboration tool',
    desc: 'Match contributors to open projects and ship together in shared sprints.',
    stack: ['Next.js', 'Go', 'Redis', 'Docker'], status: 'Launched', cols: ['#0f766e', '#2563eb'],
    stats: '18 tasks · 96 commits', demo: true,
    team: [
      { name: 'Adam Cole', role: 'DevOps Engineer', initials: 'AC', cols: ['#0f766e', '#22d3ee'] },
      { name: 'Emma Rossi', role: 'Product Designer', initials: 'ER', cols: ['#2563eb', '#22d3ee'] },
      { name: 'Daniel Ruiz', role: 'Full-stack Developer', initials: 'DR', cols: ['#0e7490', '#2563eb'] },
    ],
  },
];

export interface ShowcaseMember { name: string; role: string; initials: string; cols: [string, string] }

export const DEMO_TEAM: ShowcaseMember[] = [
  { name: 'Alex', role: 'Frontend Developer', initials: 'A', cols: ['#0e7490', '#22d3ee'] },
  { name: 'Maya', role: 'Backend Developer', initials: 'M', cols: ['#2563eb', '#22d3ee'] },
  { name: 'Daniel', role: 'UI/UX Designer', initials: 'D', cols: ['#0f766e', '#2563eb'] },
  { name: 'Sara', role: 'AI Developer', initials: 'S', cols: ['#164e63', '#06b6d4'] },
  { name: 'Adam', role: 'DevOps Engineer', initials: 'A', cols: ['#0e7490', '#2563eb'] },
  { name: 'Emma', role: 'Product Designer', initials: 'E', cols: ['#0f766e', '#22d3ee'] },
  { name: 'Noah', role: 'QA Engineer', initials: 'N', cols: ['#2563eb', '#06b6d4'] },
];

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || name.slice(0, 2).toUpperCase();
}

const PALETTE: [string, string][] = [
  ['#0e7490', '#22d3ee'], ['#2563eb', '#22d3ee'], ['#0f766e', '#2563eb'], ['#164e63', '#06b6d4'],
];
export function paletteFor(i: number): [string, string] { return PALETTE[i % PALETTE.length]; }
