// Class demo data (docs/PLAN-class-demo.md). All the text lives here so it's easy to edit.
// Dates are 2026 (class on 17 Nov 2026). Times are UTC.
//
// ⚠ Fill in before seeding (marked TODO): last names, university, and the
//   GitHub/LinkedIn links for Muhammed and Ali. Links left as null are simply
//   not shown — better than a made-up URL that could point at a stranger.

export const EMAIL_DOMAIN = 'demo.webloop.app';

// ------------------------------------------------------------------
// People
// ------------------------------------------------------------------
const UNIVERSITY = 'TODO: University name'; // TODO
const GRAD_YEAR = 2027;

export const students = [
  {
    key: 'hamdan',
    email: `hamdan@${EMAIL_DOMAIN}`,
    display_name: 'Hamdan', // TODO: add last name
    handle: 'hamdan',
    color: '#4f7cff',
    headline: 'Team lead · Full-stack',
    bio: 'Computer Science student who likes shipping things. I lead WebHub: planning the work, setting up the stack and handling deployment on Netlify.',
    university: UNIVERSITY,
    major: 'Computer Science',
    education_level: "Bachelor's",
    graduation_year: GRAD_YEAR,
    experience_level: 'Intermediate',
    availability: 'Part-time',
    location: null,
    languages: ['English', 'Arabic'],
    skills: ['React', 'TypeScript', 'Vite', 'Netlify', 'Supabase', 'Project management'],
    preferred_roles: ['Full-stack', 'Team lead'],
    github_url: 'https://github.com/Hamdan-CS',
    linkedin_url: null, // TODO: https://www.linkedin.com/in/...
    website_url: 'https://webhuborg.netlify.app',
    banner: 'webhub-home.png', // falls back to a gradient if the screenshot isn't in assets/
    portfolio: {
      title: 'WebHub live demo',
      description: 'The deployed WebHub business website: responsive, animated, with a working contact form.',
      role: 'Team lead, full-stack',
      contributions: 'Project setup (Vite, React, TypeScript, Tailwind), Netlify deploy pipeline, SEO and Open Graph tags.',
      tech: ['React', 'TypeScript', 'Vite', 'Netlify'],
      demo_url: 'https://webhuborg.netlify.app',
      repo_url: 'https://github.com/Hamdan-CS/webhub',
    },
  },
  {
    key: 'muhammed',
    email: `muhammed@${EMAIL_DOMAIN}`,
    display_name: 'Muhammed', // TODO: add last name
    handle: 'muhammed',
    color: '#ec6a9c',
    headline: 'Frontend developer',
    bio: 'Frontend developer who cares about the details: layouts that hold up on every screen and motion that feels right. Built the WebHub navbar, hero, sections and animations.',
    university: UNIVERSITY,
    major: 'Computer Science',
    education_level: "Bachelor's",
    graduation_year: GRAD_YEAR,
    experience_level: 'Intermediate',
    availability: 'Part-time',
    location: null,
    languages: ['English', 'Arabic'],
    skills: ['React', 'Tailwind CSS', 'CSS animations', 'Responsive design', 'Figma'],
    preferred_roles: ['Frontend', 'UI developer'],
    github_url: null, // TODO
    linkedin_url: null, // TODO
    website_url: null,
    banner: null,
    portfolio: {
      title: 'WebHub landing page',
      description: 'Navbar with mobile menu, hero, services and about sections, and the scroll animations of WebHub.',
      role: 'Frontend developer',
      contributions: 'Responsive navbar, hero with call to action, services/about sections, scroll animations, Lighthouse pass.',
      tech: ['React', 'Tailwind CSS', 'CSS animations'],
      demo_url: 'https://webhuborg.netlify.app',
      repo_url: 'https://github.com/Hamdan-CS/webhub',
    },
  },
  {
    key: 'ali',
    email: `ali@${EMAIL_DOMAIN}`,
    display_name: 'Ali', // TODO: add last name
    handle: 'ali',
    color: '#21b07a',
    headline: 'Backend developer · QA',
    bio: 'Backend developer who likes things that just work. Built the WebHub Express server, the Netlify contact function and the Supabase table behind it, and I test everything twice.',
    university: UNIVERSITY,
    major: 'Computer Science',
    education_level: "Bachelor's",
    graduation_year: GRAD_YEAR,
    experience_level: 'Intermediate',
    availability: 'Part-time',
    location: null,
    languages: ['English', 'Arabic'],
    skills: ['Node.js', 'Express', 'Netlify Functions', 'Supabase', 'PostgreSQL', 'Testing'],
    preferred_roles: ['Backend', 'QA'],
    github_url: null, // TODO
    linkedin_url: null, // TODO
    website_url: null,
    banner: null,
    portfolio: {
      title: 'WebHub contact API',
      description: 'Express server and Netlify function behind the WebHub contact form, storing messages in Supabase.',
      role: 'Backend developer',
      contributions: 'Express server skeleton, contact form function, Supabase table, cross-browser testing.',
      tech: ['Node.js', 'Express', 'Netlify Functions', 'Supabase'],
      demo_url: 'https://webhuborg.netlify.app/contact',
      repo_url: 'https://github.com/Hamdan-CS/webhub',
    },
  },
];

// The existing official account: looked up by email, never created or edited
// (except being added to admin_roles if missing).
export const webloop = { key: 'webloop' };

// ------------------------------------------------------------------
// Project
// ------------------------------------------------------------------
const REPO = 'https://github.com/Hamdan-CS/webhub';
const file = (p) => `${REPO}/blob/main/${p}`;

export const project = {
  title: 'WebHub — Responsive Business Website',
  slug: 'webhub',
  summary: 'A fast, responsive business website with animations, a contact form and a small backend.',
  tagline: 'Responsive business website',
  overview:
    'WebHub is a business website built by three students: a React + TypeScript front end with Tailwind and scroll animations, an Express server and Netlify functions for the contact form, and Supabase to store incoming messages. It is live on Netlify.',
  problem: 'Small businesses need a fast, good-looking site with a contact form that actually reaches them.',
  target_users: 'Small businesses and their customers.',
  category: 'Web App',
  difficulty: 'intermediate',
  status: 'in_progress',
  project_type: 'student',
  compensation: 'unpaid_educational',
  is_remote: true,
  duration_weeks: 10,
  time_commitment_hours: '6–8 hrs/week',
  demo_url: 'https://webhuborg.netlify.app',
  repo_url: REPO,
  cover: 'webhub-home.png',
  started: '2026-09-22T09:00:00Z',
  owner: 'hamdan',
  members: [
    { key: 'muhammed', role: 'Frontend developer', joined: '2026-09-23T10:00:00Z' },
    { key: 'ali', role: 'Backend developer', joined: '2026-09-23T12:00:00Z' },
  ],
  skills: ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Node.js', 'Netlify', 'Supabase'],
  openRole: { title: 'QA tester', description: 'Help us test WebHub on real devices and browsers before each release (1 spot).' },
};

// ------------------------------------------------------------------
// Tasks (15). status: approved | changes_requested | submitted | in_progress | open
// done = approval date; created = when the task was made.
// ------------------------------------------------------------------
export const tasks = [
  { n: 1, title: 'Set up Vite + React + TypeScript + Tailwind', who: 'hamdan', status: 'approved', rating: 5, size: 'medium', created: '2026-09-22', done: '2026-09-24',
    description: 'Create the project skeleton with Vite, React, TypeScript and Tailwind, with lint and a clean folder structure.',
    note: 'Project scaffolded, Tailwind configured, ESLint on.', evidence: file('vite.config.ts'), feedback: 'Clean start, exactly what we needed.' },
  { n: 2, title: 'Responsive navbar with mobile menu', who: 'muhammed', status: 'approved', rating: 5, size: 'medium', created: '2026-09-24', done: '2026-09-30',
    description: 'Navbar with logo, links and a mobile menu that works on phones and tablets.',
    note: 'Navbar + mobile menu, keyboard accessible.', evidence: file('src/components/navigation/Navbar.tsx'), feedback: 'Looks great on every screen size I tried.' },
  { n: 3, title: 'Hero section with call to action', who: 'muhammed', status: 'approved', rating: 4, size: 'small', created: '2026-09-29', done: '2026-10-05',
    description: 'Landing hero with headline, sub-text and a clear call-to-action button.',
    note: 'Hero with CTA button linked to the contact page.', evidence: file('src/pages/HomePage.tsx'), feedback: 'Good. Let\'s tighten the spacing on mobile later.' },
  { n: 4, title: 'Express server skeleton (server/)', who: 'ali', status: 'approved', rating: 5, size: 'medium', created: '2026-09-30', done: '2026-10-07',
    description: 'Express server with routes folder, CORS and a health check.',
    note: 'Server with contact routes and a connection test.', evidence: file('server/server.js'), feedback: 'Solid structure, easy to extend.' },
  { n: 5, title: 'Services and About sections', who: 'muhammed', status: 'approved', rating: 5, size: 'large', created: '2026-10-06', done: '2026-10-13',
    description: 'Services grid and About section from the content in src/data.',
    note: 'Services grid driven by data/services.ts.', evidence: file('src/components/ServicesGrid.tsx'), feedback: 'Data-driven, nice touch.' },
  { n: 6, title: 'Contact form with Netlify function', who: 'ali', status: 'approved', rating: 5, size: 'large', created: '2026-10-09', done: '2026-10-18',
    description: 'Contact form that posts to a Netlify function with validation and a success message.',
    note: 'Form posts to /.netlify/functions/contact with validation.', evidence: file('netlify/functions/contact.js'), feedback: 'Works first time, validation is clear.' },
  { n: 7, title: 'Store contact messages in Supabase', who: 'ali', status: 'approved', rating: 4, size: 'medium', created: '2026-10-19', done: '2026-10-23',
    description: 'Save every contact form message in a Supabase table so no lead is lost.',
    note: 'Messages saved to Supabase; table migration included.', evidence: file('supabase/migrations/20250713021730_damp_ember.sql'), feedback: 'Great. Add an index on created_at next time.' },
  { n: 8, title: 'Scroll animations and transitions', who: 'muhammed', status: 'approved', rating: 5, size: 'medium', created: '2026-10-20', done: '2026-10-29',
    description: 'Subtle scroll-in animations for sections, respecting reduced motion.',
    note: 'Fade/slide on scroll, reduced motion respected.', evidence: file('src/components/ScrollIndicator.tsx'), feedback: 'Small motion, big difference. Love it.' },
  { n: 9, title: 'Netlify deploy pipeline + environment variables', who: 'hamdan', status: 'approved', rating: 5, size: 'medium', created: '2026-10-27', done: '2026-11-02',
    description: 'Deploy from main to Netlify with environment variables for Supabase and the contact function.',
    note: 'Auto deploy from main, env vars set in Netlify.', evidence: file('netlify.toml'), feedback: 'Deploys are one push now.' },
  { n: 10, title: 'SEO meta tags and Open Graph images', who: 'hamdan', status: 'approved', rating: 4, size: 'small', created: '2026-11-02', done: '2026-11-06',
    description: 'Title, description and Open Graph tags so shared links look good.',
    note: 'Meta + OG tags in index.html.', evidence: file('index.html'), feedback: 'Good, a custom OG image per page would be a bonus.' },
  { n: 11, title: 'Cross-browser testing (Chrome, Safari, Firefox)', who: 'ali', status: 'changes_requested', size: 'medium', created: '2026-11-05', submitted: '2026-11-10',
    description: 'Test every page in Chrome, Safari and Firefox on desktop and mobile; fix what breaks.',
    note: 'Tested all pages; report attached.', evidence: `${REPO}/issues`, feedback: 'Safari menu overlaps logo. Can you fix that and re-test?' },
  { n: 12, title: 'Lighthouse performance pass (target 90+)', who: 'muhammed', status: 'submitted', size: 'medium', created: '2026-11-07', submitted: '2026-11-14',
    description: 'Get Lighthouse performance to 90+ on the home page: images, fonts and bundle size.',
    note: 'Performance 94 on mobile: lazy images, font preload, smaller bundle.', evidence: file('vite.config.ts') },
  // Not done yet. acceptance/due fill tasks.acceptance_criteria/due_date (also set on rows that already exist).
  { n: 13, title: 'Dark mode toggle', who: 'muhammed', status: 'in_progress', size: 'small', created: '2026-11-12', due: '2026-11-24',
    description: 'Theme toggle in the navbar that remembers the choice.',
    acceptance: '- Toggle in the navbar switches light/dark instantly\n- Choice is saved and restored on reload\n- Follows the system setting on first visit\n- All text keeps AA contrast in both themes' },
  { n: 14, title: 'Testimonials section', who: null, status: 'open', size: 'small', created: '2026-11-13', due: '2026-11-28',
    description: 'A section with 3 short customer testimonials. General task: open to the team.',
    acceptance: '- 3 testimonial cards with name, company and photo\n- Content comes from src/data, not hard-coded\n- Stacks to one column on phones' },
  { n: 15, title: 'Accessibility audit (keyboard + screen reader)', who: null, status: 'open', size: 'medium', created: '2026-11-13',
    description: 'Check every page with keyboard only and a screen reader; list and fix issues. General task: open to the team.' },
  { n: 16, title: 'Add Arabic translation', who: 'ali', status: 'open', size: 'large', created: '2026-11-14', due: '2026-12-05',
    description: 'Arabic version of every page with a language switch, including right-to-left layout.',
    acceptance: '- EN/AR switch in the navbar, choice remembered\n- All text comes from translation files (no hard-coded strings)\n- Layout flips to right-to-left in Arabic\n- Contact form errors are translated too' },
  { n: 17, title: 'Pricing page cards redesign', who: 'muhammed', status: 'open', size: 'medium', created: '2026-11-14', due: '2026-11-30',
    description: 'Redesign the three pricing cards so the recommended plan stands out and plans are easy to compare.',
    acceptance: '- 3 cards, the middle one highlighted as "Most popular"\n- Same feature rows in the same order on every card\n- Monthly/yearly toggle updates the prices\n- Cards stack on phones without horizontal scroll' },
  { n: 18, title: 'Newsletter signup with Supabase', who: 'ali', status: 'in_progress', size: 'medium', created: '2026-11-12', due: '2026-11-26',
    description: 'Footer newsletter form that saves emails to a Supabase table, with double-submit protection.',
    acceptance: '- Email is validated before sending\n- Saved to a newsletter_subscribers table with a unique email\n- Signing up twice shows a friendly "already subscribed" message\n- Success and error states are clear' },
  { n: 19, title: 'Image optimisation (WebP + lazy loading)', who: 'hamdan', status: 'in_progress', size: 'medium', created: '2026-11-13', due: '2026-11-25',
    description: 'Convert images to WebP, add width/height and lazy-load everything below the fold.',
    acceptance: '- All photos served as WebP with a JPEG fallback\n- Every <img> has width and height (no layout shift)\n- Images below the fold use loading="lazy"\n- Lighthouse "properly size images" passes' },
];

// ------------------------------------------------------------------
// Feed posts (newest first). Student posts were removed before class; WebLoop's stay. tags must come from the app's fixed list:
// Claude, AI tools, React, Supabase, Design, Python, Hackathons, Careers.
// image: file in assets/ (post becomes a text post if the file is missing).
// ------------------------------------------------------------------
export const posts = [
  { id: 'featured', at: '2026-11-14T10:00:00Z', author: 'webloop', tags: ['React', 'Supabase'], image: 'webhub-home.png',
    title: 'Featured project: WebHub',
    body: 'Three students, 10 verified tasks, live on Netlify. See how they built it: /projects/webhub' },
  { id: 'tip', at: '2026-10-20T09:00:00Z', author: 'webloop', tags: ['Careers'], image: null,
    title: 'Tip: approved tasks are proof',
    body: "Every task your project owner approves becomes a verified contribution on your profile. That's proof, not a promise." },
  { id: 'teams', at: '2026-10-02T09:00:00Z', author: 'webloop', tags: ['Careers'], image: null,
    title: 'How teams work on WebLoop',
    body: 'Publish a project, invite teammates, split the work into tasks.' },
  { id: 'welcome', at: '2026-09-22T08:00:00Z', author: 'webloop', tags: ['Careers'], image: 'webloop-banner.png',
    title: 'Welcome to WebLoop',
    body: 'Build real projects, get verified, get hired.' },
];

// The 7 WebLoop guide posts, copied from the plan doc's "WebLoop feed posts" tab.
// terminal slide = { type: 'terminal', title, cmd, out: [lines] }; tip slide = { type: 'tip', title, text }.
const T = (title, cmd, out) => ({ type: 'terminal', title, cmd, out });
const TIP = (title, text) => ({ type: 'tip', title, text });

export const aiGuides = [
  {
    id: 'guide-1', at: '2026-11-13T10:00:00Z', tags: ['Claude', 'AI tools'],
    title: 'Start here: 4 add-ons that make Claude Code better',
    body: 'New to Claude Code? Install these four, one at a time, and keep what you actually use.',
    steps: [
      T('claude-code-setup — install this first', '/plugin install claude-code-setup@claude-plugins-official',
        ['✓ Official plugin from Anthropic', '✓ Scans your project and suggests skills, MCP servers, hooks and subagents', '→ claude.com/plugins/claude-code-setup']),
      T('claude-mem — Claude remembers your project', 'npx claude-mem install',
        ['✓ Remembers your project and past fixes between sessions', '✓ Or inside Claude Code: /plugin marketplace add thedotmack/claude-mem then /plugin install claude-mem', '→ github.com/thedotmack/claude-mem']),
      T('Headroom — same answers, fewer tokens', 'headroom wrap claude',
        ['First install: pip install "headroom-ai[all]"', '✓ Compresses tool output and logs before Claude reads them', '→ github.com/chopratejas/headroom']),
      T('Task Observer — learns from your corrections', 'npx -y skills add rebelytics/one-skill-to-rule-them-all --skill task-observer --agent claude-code',
        ['✓ Logs every time you correct Claude', '✓ Suggests better skills from the patterns; you approve each change', '→ github.com/rebelytics/one-skill-to-rule-them-all']),
      TIP('Good habit', 'Start with claude-code-setup, then add the others one by one. These are free tools from other developers: read the GitHub page before you install anything.'),
    ],
  },
  {
    id: 'guide-2', at: '2026-11-10T10:00:00Z', tags: ['AI tools', 'Claude'],
    title: '5 GitHub repos every AI builder should bookmark',
    body: 'Real examples and reusable skills you can learn from and build on.',
    steps: [
      T('Awesome LLM Apps — build real AI projects', 'git clone https://github.com/Shubhamsaboo/awesome-llm-apps',
        ['✓ 100+ open-source AI app examples: agents, RAG, multi-agent, MCP', '✓ Pick one as the starting point for your own project']),
      T('Security Audit Skill — by Cloudflare', 'npx skills add https://github.com/cloudflare/security-audit-skill --skill security-audit',
        ['✓ Your coding agent runs a step-by-step security audit of your code', '✓ Then ask: "security audit this codebase"', '→ github.com/cloudflare/security-audit-skill']),
      T('Awesome Agent Skills — a huge skill library', 'git clone https://github.com/VoltAgent/awesome-agent-skills',
        ['✓ Curated skills for coding, testing, UI/UX, security, docs and DevOps', '✓ Find one, then install it with the command on its page']),
      T('Anthropic Agent Skills — the official examples', '/plugin marketplace add anthropics/skills',
        ['✓ Example skills built with SKILL.md: frontend design, web app testing, MCP servers, documents', '✓ Best way to learn how skills work', '→ github.com/anthropics/skills']),
      T('Superpowers — a real engineering process', '/plugin install superpowers@claude-plugins-official',
        ['✓ Brainstorm → plan → test-first coding → debugging → code review', '→ github.com/obra/superpowers']),
    ],
  },
  {
    id: 'guide-3', at: '2026-11-08T10:00:00Z', tags: ['Claude', 'AI tools'],
    title: 'Build & Test: 4 add-ons for shipping code',
    body: 'Plan it, ship it, then test it before your users do.',
    steps: [
      T('Superpowers — the lead planner', '/plugin install superpowers@claude-plugins-official',
        ['✓ Plans the whole job before it writes any code', '→ github.com/obra/superpowers']),
      T('gstack — a full dev team in one install', 'git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup',
        ['✓ By Garry Tan (Y Combinator): roles for planning, review, QA and shipping', '✓ Needs Git and Bun', 'start with /office-hours', '→ github.com/garrytan/gstack']),
      T('graphify — a map of your project', 'pip install graphifyy && graphify install',
        ['✓ Turns your code and docs into a knowledge graph Claude can read', '✓ Then in Claude Code: /graphify .', "Note: the package name has two y's", '→ graphify.com']),
      T('GitHub CLI — your release manager', 'winget install --id GitHub.cli',
        ['✓ Mac: brew install gh', 'then run: gh auth login', '✓ Lets Claude open pull requests and ship code', '→ cli.github.com']),
    ],
  },
  {
    id: 'guide-4', at: '2026-11-06T10:00:00Z', tags: ['Design', 'Claude'],
    title: 'Design & Animate: stop it looking AI-made',
    body: 'Four add-ons that give Claude real design taste.',
    steps: [
      T('Figma — your design partner', 'claude plugin install figma@claude-plugins-official',
        ['✓ Claude reads your real Figma files: components, variables, layout', '✓ MCP only: claude mcp add --transport http figma https://mcp.figma.com/mcp', '→ help.figma.com']),
      T('UI/UX Pro Max — your UX lead', '/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill',
        ['Then: /plugin install ui-ux-pro-max@ui-ux-pro-max-skill', '✓ Ready-made UI styles, colour palettes, font pairings and UX rules', '✓ Needs Python 3', '→ github.com/nextlevelbuilder/ui-ux-pro-max-skill']),
      T('Impeccable — one design language everywhere', 'npx skills add pbakaus/impeccable',
        ['✓ Commands like /audit, /polish, /typeset and /animate', '→ impeccable.style']),
      T('Taste Skill — kills the generic look', 'npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"',
        ['✓ Better layout, typography and motion than default AI output', '→ github.com/Leonxlnx/taste-skill']),
    ],
  },
  {
    id: 'guide-5', at: '2026-11-05T10:00:00Z', tags: ['AI tools', 'Claude'],
    title: 'Research: give Claude eyes on the web',
    body: 'Four tools for live answers, browsing, and turning websites into data.',
    steps: [
      T('Perplexity — the fact finder', 'claude mcp add perplexity --env PERPLEXITY_API_KEY="your_key" -- npx -y @perplexity-ai/mcp-server',
        ['✓ Live web answers with sources', '✓ Needs a Perplexity API key', '→ docs.perplexity.ai']),
      TIP('Claude in Chrome — the web assistant', 'Claude works inside your own Chrome: it browses, clicks and fills in forms for you. Add the Claude extension from the Chrome Web Store and sign in.'),
      T('Firecrawl — the site reader', 'claude plugin install firecrawl@claude-plugins-official',
        ['✓ Turns any website into clean text Claude can use', '✓ Then run /firecrawl:setup to add your API key', '→ firecrawl.dev']),
      T('Apify — the data scraper', 'claude mcp add apify "https://mcp.apify.com" -t http',
        ['✓ Thousands of ready-made scrapers: social media, maps, shops', '✓ Signs in with your Apify account the first time', '→ mcp.apify.com']),
    ],
  },
  {
    id: 'guide-6', at: '2026-11-04T10:00:00Z', tags: ['AI tools'],
    title: 'Make the posts: images, voice and graphics',
    body: 'Four tools for the visuals and audio behind your content.',
    steps: [
      TIP('GPT Image — the image maker', "OpenAI's image model: makes images that keep one consistent look. Use it with an OpenAI API key from platform.openai.com."),
      TIP('Nano Banana — the photo retoucher', "Google's Gemini image model: edit a photo by describing the change in one sentence. Try it in Google AI Studio (aistudio.google.com)."),
      TIP('ElevenLabs — the voice artist', 'Turns a script into a natural voiceover in many voices and languages. Needs an ElevenLabs account and API key (elevenlabs.io).'),
      T('Puppeteer — the graphics renderer', 'npm i puppeteer',
        ['✓ Opens a real browser from code and saves any HTML page as an image or PDF', '→ pptr.dev']),
    ],
  },
  {
    id: 'guide-7', at: '2026-11-03T10:00:00Z', tags: ['Design'],
    title: '3 design websites worth bookmarking',
    body: 'Research, test and save design ideas.',
    steps: [
      TIP('Refero — design research', 'Real screens and user flows from real products, so you can see how others solved the same problem. refero.design'),
      TIP('Useberry — user testing', 'Give real people tasks on your prototype, then see where they get stuck with surveys and recordings. useberry.com'),
      TIP('Bookmarkify — save inspiration', 'Save websites as visual bookmarks with tags and folders, instead of messy screenshots. bookmarkify.io'),
    ],
  },
];

// WebLoop pictures posts: each image can carry its own caption, terminal command and link
// (migration 031). Images: scripts/demo/assets/<dir>/<file>.png|.jpg|.webp (the seed tries all
// three). A post is skipped until at least one of its images exists. New images are appended to
// an existing post; existing images only get their caption/command/link refreshed.
export const picturePosts = [
  {
    id: 'repos', dir: 'repos', at: '2026-11-16T09:00:00Z', tags: ['AI tools', 'Python'],
    title: 'Repos worth knowing',
    body: 'Open-source repos you can run today. Open the terminal under each picture to copy the commands.',
    images: [
      { file: 'ragflow', caption: 'RAGFlow: build document-based RAG apps with visual knowledge retrieval.',
        command: 'git clone https://github.com/infiniflow/ragflow.git\ncd ragflow/docker && docker compose up -d',
        link_url: 'https://github.com/infiniflow/ragflow', link_label: 'github.com' },
      { file: 'dify', caption: 'Dify: build and run LLM apps and agents with a visual workflow editor.',
        command: 'git clone https://github.com/langgenius/dify.git\ncd dify/docker && cp .env.example .env\ndocker compose up -d',
        link_url: 'https://github.com/langgenius/dify', link_label: 'github.com' },
      { file: 'open-webui', caption: 'Open WebUI: a self-hosted chat interface for local and cloud models.',
        command: 'pip install open-webui\nopen-webui serve',
        link_url: 'https://github.com/open-webui/open-webui', link_label: 'github.com' },
      { file: 'firecrawl', caption: 'Firecrawl: turn websites into data that AI agents can search and process.',
        command: 'pip install firecrawl-py',
        link_url: 'https://github.com/firecrawl/firecrawl', link_label: 'github.com' },
    ],
  },
  {
    id: 'artcraft', dir: 'artcraft', at: '2026-11-17T08:00:00Z', tags: ['Design', 'AI tools'],
    title: 'Free alternatives to paid creative apps',
    body: 'ArtCraft\'s free apps next to the subscriptions they replace: audio, UI design, 3D texturing, CAD, office and more. Many are still in development or early alpha, so check each one before you switch.',
    images: [
      { file: '01-audio', caption: 'Audio: SoundCraft (free, in development) instead of Audition.',
        link_url: 'https://getartcraft.com/apps/soundcraft', link_label: 'getartcraft.com' },
      { file: '02-ui-design', caption: 'UI design: FigCraft (free, early alpha) instead of Figma Pro.',
        link_url: 'https://getartcraft.com/apps/figcraft', link_label: 'getartcraft.com' },
      { file: '03-3d-texturing', caption: '3D texturing: TextureCraft + MaterialCraft (free, in development) instead of Substance 3D.',
        link_url: 'https://getartcraft.com/apps', link_label: 'getartcraft.com' },
      { file: '04-cad', caption: 'CAD: CADCraft (free, in development) instead of AutoCAD LT.',
        link_url: 'https://getartcraft.com/apps/cadcraft', link_label: 'getartcraft.com' },
      { file: '05-office', caption: 'Office: WordCraft + DeckCraft + GridCraft (free, in development) instead of Microsoft 365.',
        link_url: 'https://getartcraft.com/apps', link_label: 'getartcraft.com' },
      { file: '06-anything', caption: 'Anything: Craft Anything (free, early alpha) builds the app you describe.',
        link_url: 'https://getartcraft.com/apps/craft-anything', link_label: 'getartcraft.com' },
      { file: '08-three-steps', caption: 'How to get it: go to getartcraft.com, download the Launcher, and it installs the apps.',
        link_url: 'https://getartcraft.com', link_label: 'getartcraft.com' },
    ],
  },
  {
    id: 'mcp-ui', dir: 'mcp', at: '2026-11-17T09:00:00Z', tags: ['Claude', 'Design'],
    title: 'Claude MCP tools for better UI',
    body: 'Plug these into Claude so it can see, test and match real designs. Open the terminal under each tool for the install command.',
    images: [
      { file: '01-cover', caption: 'Stop getting generic, broken UI: give Claude tools to see, test and match real designs.' },
      { file: '02-what-is-mcp', caption: 'What is MCP? A standard way to plug tools into Claude, like USB-C for AI.',
        link_url: 'https://github.com/modelcontextprotocol', link_label: 'github.com' },
      { file: '03-figma', caption: 'Figma MCP: brings real Figma designs, components and variables into Claude.',
        command: 'claude mcp add --transport http figma https://mcp.figma.com/mcp',
        link_url: 'https://developers.figma.com', link_label: 'developers.figma.com' },
      { file: '04-playwright', caption: 'Playwright MCP: Claude opens your site, clicks around and checks the rendered UI.',
        command: 'claude mcp add playwright -- npx @playwright/mcp@latest',
        link_url: 'https://github.com/microsoft/playwright-mcp', link_label: 'github.com' },
      { file: '05-chrome-devtools', caption: 'Chrome DevTools MCP: console, network, CSS and Lighthouse audits for Claude.',
        command: 'claude mcp add chrome-devtools -- npx chrome-devtools-mcp@latest',
        link_url: 'https://github.com/ChromeDevTools/chrome-devtools-mcp', link_label: 'github.com' },
      { file: '06-21st-magic', caption: '21st.dev Magic MCP: generates React UI components from a prompt. Needs a free API key from 21st.dev.',
        command: 'npx @21st-dev/cli@latest install claude --api-key <your-api-key>',
        link_url: 'https://21st.dev/magic', link_label: '21st.dev' },
    ],
  },
];

// comments: { post, author, body, at, replyTo? } — replyTo is shown as "@name" in the text
export const comments = [
  { post: 'featured', author: 'hamdan', at: '2026-11-14T11:00:00Z', body: 'Thank you WebLoop! Next up: dark mode and an accessibility audit.' },
];

// likes: post -> who liked it
export const likes = {
  featured: ['hamdan', 'muhammed', 'ali'],
  tip: ['hamdan', 'ali'],
  teams: ['muhammed', 'ali'],
  welcome: ['hamdan', 'muhammed', 'ali'],
};

// ------------------------------------------------------------------
// Messages (last 2 weeks). task: task number → shown as a task card.
// unread: true only matters for messages to Hamdan.
// ------------------------------------------------------------------
export const messages = [
  // Hamdan ↔ Ali: Safari bug (task 11)
  { from: 'hamdan', to: 'ali', at: '2026-11-10T13:05:00Z', body: 'Checked your cross-browser report. On Safari the menu overlaps the logo, I marked it as changes requested.' },
  { from: 'ali', to: 'hamdan', at: '2026-11-10T13:20:00Z', body: 'Ah, I see it on iPhone too. Probably the flex gap. I\'ll fix it and re-test.' },
  { from: 'hamdan', to: 'ali', at: '2026-11-10T13:22:00Z', body: 'Thanks! Send it back when it\'s ready.', task: 11 },
  { from: 'ali', to: 'hamdan', at: '2026-11-15T17:45:00Z', body: 'Fixed the overlap locally, testing on Firefox now. Will resubmit tonight.' },
  // Hamdan ↔ Muhammed: Lighthouse (task 12)
  { from: 'hamdan', to: 'muhammed', at: '2026-11-07T10:00:00Z', body: 'New task for you: Lighthouse pass, target 90+.', task: 12 },
  { from: 'muhammed', to: 'hamdan', at: '2026-11-07T10:30:00Z', body: 'On it. Images are the biggest problem, I\'ll lazy-load them.' },
  { from: 'muhammed', to: 'hamdan', at: '2026-11-14T19:10:00Z', body: 'Submitted! 94 on mobile. Can you review it?' },
  // Muhammed ↔ Ali: contact form styles
  { from: 'muhammed', to: 'ali', at: '2026-11-06T18:00:00Z', body: 'Your contact form works great. Mind if I restyle the success message?' },
  { from: 'ali', to: 'muhammed', at: '2026-11-06T18:12:00Z', body: 'Go for it, just keep the error states red please 😄' },
  { from: 'muhammed', to: 'ali', at: '2026-11-06T18:13:00Z', body: 'Deal.' },
  // WebLoop → Hamdan
  { from: 'webloop', to: 'hamdan', at: '2026-11-14T10:05:00Z', body: 'Congrats, WebHub is this week\'s featured project!', unread: true },

  // Last 5 days. Hamdan <-> Muhammed: dark mode (13) + pricing cards (17)
  { from: 'hamdan', to: 'muhammed', at: '2026-11-12T09:15:00Z', body: 'Started the dark mode toggle? Let\'s keep it small: navbar button + remember the choice.', task: 13 },
  { from: 'muhammed', to: 'hamdan', at: '2026-11-12T09:40:00Z', body: 'Yes, using a class on <html> and localStorage. It will also follow the system setting on first visit.' },
  { from: 'hamdan', to: 'muhammed', at: '2026-11-14T11:20:00Z', body: 'Next one after that: the pricing cards. The middle plan should stand out.', task: 17 },
  { from: 'muhammed', to: 'hamdan', at: '2026-11-14T12:05:00Z', body: 'Nice. Monthly/yearly toggle too? I already sketched it in Figma.' },
  { from: 'hamdan', to: 'muhammed', at: '2026-11-14T12:10:00Z', body: 'Yes please, with the yearly price showing the saving.' },
  { from: 'muhammed', to: 'hamdan', at: '2026-11-16T08:45:00Z', body: 'Dark mode works, fixing contrast on the footer links. I\'ll share the pricing sketch in the group later today.', unread: true },
  // Hamdan <-> Ali: newsletter (18) + Arabic translation (16)
  { from: 'hamdan', to: 'ali', at: '2026-11-12T14:00:00Z', body: 'Can you take the newsletter signup? Same Supabase project as the contact form.', task: 18 },
  { from: 'ali', to: 'hamdan', at: '2026-11-12T14:25:00Z', body: 'On it. I\'ll add a unique index on email so double signups fail nicely.' },
  { from: 'hamdan', to: 'ali', at: '2026-11-14T16:30:00Z', body: 'After that: the Arabic translation. You know right-to-left layouts better than any of us.', task: 16 },
  { from: 'ali', to: 'hamdan', at: '2026-11-14T16:50:00Z', body: 'Happy to. I\'ll set up the translation files first so the new pricing text is ready for it.' },
  { from: 'ali', to: 'hamdan', at: '2026-11-15T20:10:00Z', body: 'Newsletter form saves to Supabase now, just the "already subscribed" message left.' },
  { from: 'ali', to: 'hamdan', at: '2026-11-16T10:30:00Z', body: 'Quick one: should the Arabic switch go in the navbar or the footer?', unread: true },
  // WebLoop -> Muhammed / Ali: congrats on their verified tasks
  { from: 'webloop', to: 'muhammed', at: '2026-11-13T09:00:00Z', body: 'Congrats Muhammed! Your 4 verified WebHub tasks (navbar, hero, services, scroll animations) are on your profile now.' },
  { from: 'webloop', to: 'ali', at: '2026-11-13T09:05:00Z', body: 'Congrats Ali! Your verified WebHub tasks (server, contact form, Supabase storage) are on your profile now.' },
];

// WebHub group chat (the project's group conversation): a short stand-up.
// Hamdan writes last, so the group counts as read for him.
export const groupMessages = [
  { from: 'muhammed', at: '2026-11-15T09:00:00Z', body: 'Stand-up. Done: dark mode toggle mostly working. Next: footer contrast, then the pricing cards.' },
  { from: 'ali', at: '2026-11-15T09:12:00Z', body: 'Done: newsletter form saves to Supabase. Next: the "already subscribed" message, then Arabic translation files.' },
  { from: 'hamdan', at: '2026-11-15T09:30:00Z', body: 'Done: reviewed the Lighthouse pass. Next: WebP + lazy loading for all images. Shout if anything blocks you.' },
];

// ------------------------------------------------------------------
// Reviews (there is no review form in the app yet, so all four are seeded)
// ------------------------------------------------------------------
export const reviews = [
  { from: 'hamdan', to: 'muhammed', rating: 5, at: '2026-11-08T12:00:00Z',
    comment: 'Muhammed turned rough ideas into a polished, responsive UI and always delivered on time.' },
  { from: 'hamdan', to: 'ali', rating: 5, at: '2026-11-08T12:10:00Z',
    comment: 'Ali built a backend that just works, and his testing caught bugs before users did.' },
  { from: 'muhammed', to: 'hamdan', rating: 5, at: '2026-11-09T09:00:00Z',
    comment: 'Clear plans, fast reviews and always there when we were stuck. A great team lead.' },
  { from: 'ali', to: 'hamdan', rating: 4, at: '2026-11-09T09:30:00Z',
    comment: 'Well organised and easy to work with. Deploys were smooth thanks to his setup.' },
];

// Notifications left unread for Hamdan after seeding (newest N); everything else is marked read.
export const UNREAD_NOTIFICATIONS_FOR_HAMDAN = 3;
