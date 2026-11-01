/* ──────────────────────────────────────────────────────────────────────
 * Demonstration data — home page only.
 *
 * Ported 1:1 from the approved prototype (webloop-home-demo_3.html)'s
 * PEOPLE / PROJECTS / WORKS / COMPANIES fixtures — same names, same art,
 * same every field. Fictional showcase content used ONLY by the home
 * page's scroll sections. Never touches Supabase — every other page keeps
 * using real data via src/lib/api.ts.
 * ────────────────────────────────────────────────────────────────────── */
import type { ArtKind, LogoKind } from './homeArt';

export interface DemoPerson {
  key: string;
  name: string;
  role: string;
  female: boolean;
  skills?: string[];
  discipline?: string;
}

export const PEOPLE: Record<string, DemoPerson> = {
  alex: { key: 'alex', name: 'Alex Chen', role: 'Frontend Developer', female: false, skills: ['React', 'TS'], discipline: 'Frontend' },
  maya: { key: 'maya', name: 'Maya Patel', role: 'Backend Developer', female: true, skills: ['Node', 'SQL'], discipline: 'Backend' },
  daniel: { key: 'daniel', name: 'Daniel Kim', role: 'UI/UX Designer', female: false, skills: ['Figma', 'UI'], discipline: 'Design' },
  sara: { key: 'sara', name: 'Sara Ali', role: 'AI Developer', female: true, skills: ['Python', 'ML'], discipline: 'AI / Data' },
  adam: { key: 'adam', name: 'Adam Okafor', role: 'DevOps Engineer', female: false, skills: ['Docker', 'AWS'], discipline: 'DevOps' },
  emma: { key: 'emma', name: 'Emma Park', role: 'Product Designer', female: true, skills: ['Figma', 'UX'], discipline: 'Design' },
  noah: { key: 'noah', name: 'Noah Wilson', role: 'QA Engineer', female: false, skills: ['Testing', 'CI'], discipline: 'QA' },
  otis: { key: 'otis', name: 'Otis King', role: 'Software Engineering Student', female: false },
  alexk: { key: 'alexk', name: 'Alex Kim', role: 'Student', female: false },
  mayac: { key: 'mayac', name: 'Maya Chen', role: 'Computer Science Student', female: true },
  sarac: { key: 'sarac', name: 'Sara Ali', role: 'CS & Design Student', female: true },
  danielk: { key: 'danielk', name: 'Daniel Kim', role: 'Computer Science Student', female: false },
  emmap: { key: 'emmap', name: 'Emma Park', role: 'Design Student', female: true },
  lena: { key: 'lena', name: 'Lena Novak', role: 'Data Student', female: true },
  tomas: { key: 'tomas', name: 'Tomás Rivera', role: 'Student', female: false },
  priya: { key: 'priya', name: 'Priya Nair', role: 'Student', female: true },
  jonas: { key: 'jonas', name: 'Jonas Weber', role: 'Mobile Student', female: false },
  amira: { key: 'amira', name: 'Amira Haddad', role: 'Student', female: true },
  kofi: { key: 'kofi', name: 'Kofi Mensah', role: 'Student', female: false },
  yuki: { key: 'yuki', name: 'Yuki Tanaka', role: 'Student', female: true },
};

export function personOf(key: string): DemoPerson {
  return PEOPLE[key] ?? { key, name: key, role: 'Contributor', female: false };
}

export const CREW = ['alex', 'maya', 'daniel', 'sara', 'adam', 'emma', 'noah'];

export type DemoProjectStatus = 'rec' | 'prog' | 'done';
export const STATUS_LABEL: Record<DemoProjectStatus, string> = { rec: 'Recruiting', prog: 'In Progress', done: 'Completed' };

export interface DemoProject {
  id: string;
  name: string;
  tagline: string;
  desc: string;
  type: 'student' | 'company' | 'university';
  owner: string; // PEOPLE key (student) or display name (company/university)
  co?: string; // COMPANIES key, when type === 'company'
  status: DemoProjectStatus;
  category: string;
  tech: string[];
  team: string[];
  reviews: number;
  stars: number;
  date: string;
  progress: number;
  recruiting?: boolean;
  beginner?: boolean;
  art: [ArtKind, number];
}

export const PROJECTS: DemoProject[] = [
  { id: 'carbon', name: 'Carbon Ledger', tagline: 'A sustainability data platform', desc: 'Helping businesses track, reduce and report their carbon footprint with real-time data and clear insights.', type: 'company', owner: 'GreenLeaf Studios', co: 'greenleaf', status: 'prog', category: 'Web App', tech: ['React', 'TypeScript', 'Supabase', 'Tailwind'], team: ['alex', 'maya', 'daniel', 'sara'], reviews: 7, stars: 64, date: '2026-06-12', progress: 75, recruiting: true, art: ['mountain', 1] },
  { id: 'pixel', name: 'Pixel Realm', tagline: 'A 2D pixel-art game engine for the web', desc: 'A tiny WebAssembly game engine for 2D pixel-art games in the browser, no plugins needed.', type: 'student', owner: 'otis', status: 'prog', category: 'Game / Engine', tech: ['Rust', 'WebAssembly', 'Canvas API', 'TypeScript'], team: ['otis', 'alex', 'daniel'], reviews: 8, stars: 124, date: '2026-09-02', progress: 75, recruiting: true, art: ['sunset', 1] },
  { id: 'studyflow', name: 'StudyFlow', tagline: 'AI study planner', desc: 'An AI study planner that turns your syllabus into a spaced-repetition schedule with weekly goals.', type: 'student', owner: 'mayac', status: 'rec', category: 'AI / ML', tech: ['React', 'Node.js', 'Python', 'TypeScript'], team: ['mayac', 'lena', 'sara', 'tomas'], reviews: 5, stars: 89, date: '2026-10-05', progress: 40, beginner: true, recruiting: true, art: ['notes', 2] },
  { id: 'skillsync', name: 'SkillSync', tagline: 'Match students with real projects', desc: 'A platform to match students with real-world projects based on skills and interests.', type: 'student', owner: 'alexk', status: 'rec', category: 'Web App', tech: ['React', 'TypeScript', 'Supabase', 'Tailwind'], team: ['alexk', 'priya', 'jonas'], reviews: 4, stars: 32, date: '2026-10-18', progress: 25, beginner: true, art: ['dash', 2] },
  { id: 'campus', name: 'CampusConnect', tagline: 'University event and club platform', desc: 'A central hub for students to discover events, clubs, and opportunities across campus.', type: 'university', owner: 'Rivermouth University', status: 'done', category: 'Web App', tech: ['Next.js', 'PostgreSQL', 'Tailwind'], team: ['emmap', 'kofi', 'yuki', 'tomas'], reviews: 4, stars: 41, date: '2026-03-21', progress: 100, art: ['campus', 1] },
  { id: 'greentrack', name: 'GreenTrack', tagline: 'Sustainability analytics dashboard', desc: 'Help businesses track, reduce, and report their carbon footprint with real-time data.', type: 'company', owner: 'GreenLeaf Studios', co: 'greenleaf', status: 'rec', category: 'Web App', tech: ['React', 'TypeScript', 'Supabase'], team: ['alex', 'noah', 'amira', 'kofi', 'yuki'], reviews: 5, stars: 28, date: '2026-10-11', progress: 35, art: ['dash', 5] },
  { id: 'stellar', name: 'Stellar Learn', tagline: 'AI-powered learning paths', desc: 'Adaptive learning paths that adjust to how each student studies, built with open models.', type: 'company', owner: 'NovaAI', co: 'novaai', status: 'rec', category: 'AI / ML', tech: ['Next.js', 'Python', 'PostgreSQL'], team: ['sara', 'lena', 'priya', 'otis'], reviews: 6, stars: 57, date: '2026-09-24', progress: 30, recruiting: true, art: ['neural', 3] },
  { id: 'biomatch', name: 'BioMatch', tagline: 'Connecting research opportunities', desc: 'Matches student researchers with lab openings and open datasets across partner universities.', type: 'university', owner: 'Rivermouth University', status: 'prog', category: 'AI / ML', tech: ['Next.js', 'Prisma', 'MySQL'], team: ['lena', 'amira', 'tomas'], reviews: 4, stars: 36, date: '2026-08-14', progress: 55, art: ['neural', 9] },
  { id: 'citymind', name: 'CityMind', tagline: 'Urban data visualisation', desc: 'Interactive maps and charts that turn open city data into stories residents can explore.', type: 'student', owner: 'tomas', status: 'done', category: 'Web App', tech: ['Vue', 'D3.js', 'Firebase'], team: ['tomas', 'priya', 'jonas'], reviews: 8, stars: 73, date: '2026-04-30', progress: 100, art: ['city', 2] },
  { id: 'devconnect', name: 'DevConnect', tagline: 'A developer collaboration tool', desc: 'Pair-programming rooms with shared terminals, comments and a lightweight task board.', type: 'company', owner: 'Fennel Labs', co: 'fennel', status: 'rec', category: 'Web App', tech: ['React', 'Socket.io', 'MongoDB'], team: ['alex', 'adam', 'noah', 'jonas'], reviews: 7, stars: 51, date: '2026-10-02', progress: 45, recruiting: true, art: ['code', 4] },
  { id: 'trailmate', name: 'TrailMate', tagline: 'Offline hiking companion', desc: 'A React Native app with offline maps, trail conditions and safety check-ins for hikers.', type: 'student', owner: 'jonas', status: 'rec', category: 'Mobile App', tech: ['React Native', 'TypeScript', 'Firebase'], team: ['jonas', 'amira', 'emmap'], reviews: 3, stars: 22, date: '2026-10-22', progress: 20, beginner: true, art: ['phones', 1] },
  { id: 'chainvote', name: 'ChainVote', tagline: 'Verifiable student elections', desc: 'Transparent, auditable voting for student unions, with receipts anyone can check.', type: 'university', owner: 'Rivermouth University', status: 'prog', category: 'Blockchain', tech: ['Solidity', 'Hardhat', 'React'], team: ['kofi', 'yuki', 'adam'], reviews: 5, stars: 19, date: '2026-07-09', progress: 60, art: ['cubes', 3] },
  { id: 'atlas', name: 'Atlas Design System', tagline: 'Components for consumer apps', desc: "An accessible component library and Figma kit shared across the studio's products.", type: 'company', owner: 'Arcade Labs', co: 'arcade', status: 'rec', category: 'Design', tech: ['Figma', 'Storybook', 'React'], team: ['daniel', 'emma', 'alex'], reviews: 6, stars: 47, date: '2026-09-30', progress: 50, beginner: true, recruiting: true, art: ['dash', 8] },
];
export const BY_ID: Record<string, DemoProject> = Object.fromEntries(PROJECTS.map((p) => [p.id, p]));
export function projectOwnerName(p: DemoProject) { return p.type === 'student' ? personOf(p.owner).name : p.owner; }
export function projectOwnerRole(p: DemoProject) { return p.type === 'student' ? 'Student' : p.type === 'company' ? 'Company' : 'University'; }

export interface DemoWork {
  id: string;
  title: string;
  desc: string;
  category: string;
  tech: string[];
  by: string;
  art: [ArtKind, number];
  date: string;
  activity: number; // 0..1, matches the prototype's `act` — drives the "top activity" preview sort
}

export const WORKS: DemoWork[] = [
  { id: 'notetrace', title: 'Notetrace — markdown notes with backlinks', desc: 'A local-first markdown notes app with bidirectional links and a graph view. My first full-stack project.', category: 'Web App', tech: ['React', 'TypeScript', 'Supabase', 'Tailwind'], by: 'mayac', art: ['dash', 11], date: '2026-10-01', activity: 0.8 },
  { id: 'tinygrads', title: 'Tinygrads — MNIST from scratch', desc: 'Implemented a tiny autograd engine and trained it on MNIST. Wrote up the math and code as a blog post.', category: 'ML', tech: ['Python', 'PyTorch', 'Jupyter'], by: 'mayac', art: ['neural', 6], date: '2026-09-14', activity: 0.6 },
  { id: 'raycaster', title: 'Raycaster demo in Rust+WASM', desc: 'A Wolfenstein-style raycaster compiled to WebAssembly, rendered to a canvas. 60fps in the browser.', category: 'Game / Engine', tech: ['Rust', 'WebAssembly', 'Canvas'], by: 'otis', art: ['rays', 1], date: '2026-08-30', activity: 0.5 },
  { id: 'devsync', title: 'DevSync — real-time collaboration backend', desc: 'A scalable backend for collaborative projects with real-time updates and presence.', category: 'Backend / Infra', tech: ['Node.js', 'PostgreSQL', 'WebSocket', 'Docker'], by: 'danielk', art: ['cubes', 7], date: '2026-10-12', activity: 0.9 },
  { id: 'fitloop', title: 'FitLoop — fitness habit tracker', desc: 'A minimal and clean fitness tracker with progress charts, reminders, and streaks.', category: 'Mobile App', tech: ['React Native', 'TypeScript', 'Firebase', 'Health API'], by: 'sarac', art: ['phones', 2], date: '2026-07-19', activity: 0.7 },
  { id: 'travelly', title: 'Travelly — UI/UX concept', desc: 'A modern travel website concept with smooth animations and responsive design.', category: 'Design', tech: ['Figma', 'UI/UX', 'Prototyping'], by: 'emmap', art: ['mountain', 6], date: '2026-06-03', activity: 0.4 },
  { id: 'chessy', title: 'Pocket Chess Engine', desc: 'Alpha-beta search with transposition tables, tuned against open game databases. Plays in the browser.', category: 'Game / Engine', tech: ['TypeScript', 'Web Workers', 'Algorithms'], by: 'kofi', art: ['code', 9], date: '2026-05-22', activity: 0.55 },
  { id: 'bikemap', title: 'Campus Bike Map', desc: 'Crowd-sourced bike lanes and repair stations for the university, with offline-friendly tiles.', category: 'Mobile App', tech: ['Flutter', 'OpenStreetMap', 'Dart'], by: 'yuki', art: ['city', 8], date: '2026-04-11', activity: 0.35 },
  { id: 'palette', title: 'Palette Lab — colour tooling', desc: 'A colour-system generator that checks contrast, builds light and dark themes and exports tokens.', category: 'Design', tech: ['Figma', 'TypeScript', 'Accessibility'], by: 'priya', art: ['notes', 14], date: '2026-09-02', activity: 0.65 },
];
export const CATCOL: Record<string, string> = { 'Web App': '#3b82f6', ML: '#2563eb', 'Game / Engine': '#8b5cf6', 'Backend / Infra': '#10b981', 'Mobile App': '#ec4899', Design: '#f59e0b' };

export interface DemoCompany {
  id: string;
  name: string;
  location: string;
  remote: boolean;
  size: string;
  industry: string;
  url: string;
  desc: string;
  tag?: string;
  logo: LogoKind;
  hue: number;
  people: string[];
  more: number;
}

export const COMPANIES: DemoCompany[] = [
  { id: 'greenleaf', name: 'GreenLeaf Studios', location: 'Remote / Berlin', remote: true, size: '11-50', industry: 'Climate', url: 'greenleaf.studio', desc: 'Small product studio building climate-tech tools. We mentor student contributors on real shippable software.', tag: 'Featured', logo: 'leaf', hue: 140, people: ['alex', 'maya', 'daniel', 'sara'], more: 5 },
  { id: 'fennel', name: 'Fennel Labs', location: 'Remote', remote: true, size: '1-10', industry: 'Developer tools', url: 'fennel.dev', desc: 'Seed-stage startup building developer infrastructure. We hire from our student contributors.', logo: 'f', hue: 275, people: ['alex', 'adam', 'noah'], more: 3 },
  { id: 'pixelforge', name: 'PixelForge', location: 'San Francisco, US', remote: false, size: '11-50', industry: 'Gaming', url: 'pixelforge.gg', desc: 'Indie game studio creating immersive experiences. We work with students on gameplay, design, and tools.', logo: 'p', hue: 30, people: ['otis', 'jonas', 'emma'], more: 8 },
  { id: 'cloudsync', name: 'CloudSync', location: 'Remote', remote: true, size: '51-200', industry: 'Productivity', url: 'cloudsync.io', desc: 'Collaborative productivity tools for modern teams. Open to student contributors and internship opportunities.', tag: 'Hiring', logo: 'cloud', hue: 300, people: ['maya', 'tomas', 'priya', 'noah'], more: 12 },
  { id: 'novaai', name: 'NovaAI', location: 'London, UK', remote: false, size: '11-50', industry: 'AI', url: 'novaai.co', desc: 'AI research and product studio. We collaborate with students on open-source and real-world AI projects.', tag: 'New', logo: 'hex', hue: 175, people: ['sara', 'lena', 'amira'], more: 7 },
  { id: 'arcade', name: 'Arcade Labs', location: 'New York, US', remote: false, size: '51-200', industry: 'Consumer apps', url: 'arcadelabs.com', desc: "Design and build consumer apps used by millions. We're always looking for talented student contributors.", logo: 'a', hue: 215, people: ['daniel', 'emma', 'alex'], more: 9 },
];
export function companyProjectCount(companyId: string): number {
  return PROJECTS.filter((p) => p.co === companyId).length;
}
