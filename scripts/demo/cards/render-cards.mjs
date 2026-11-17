// Renders the WebLoop picture-post cards (1080×1080 PNG, sharp text) into scripts/demo/assets/.
// Run from the project folder:  node scripts/demo/cards/render-cards.mjs
// Then `npm run seed:demo` swaps any changed image into its post.
//
// Three layouts share one look (light gradient, bold title, mono labels, dark terminal):
//   repo    — an open-source repo with its install commands
//   compare — a paid app vs its free alternative (+ a "steps" variant)
//   mcp     — MCP explainer cards (cover, what-is, tool)
// No brand logos are drawn: apps get an emoji or initials tile.
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(HERE, '..', 'assets');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const BASE = (accent, soft) => `
*{box-sizing:border-box;margin:0;padding:0}
body{width:1080px;height:1080px;overflow:hidden;font-family:'Segoe UI Variable Display','Segoe UI',system-ui,sans-serif;color:#0f172a;
  background:radial-gradient(1100px 700px at 0% 0%, ${soft} 0%, rgba(255,255,255,0) 60%),linear-gradient(160deg,#ffffff 30%,#eef3fb 100%);
  padding:64px 72px;display:flex;flex-direction:column;-webkit-font-smoothing:antialiased}
.mono{font-family:'Cascadia Code','Cascadia Mono',Consolas,monospace}
.top{display:flex;justify-content:space-between;align-items:center;font:700 24px 'Cascadia Code',Consolas,monospace;letter-spacing:.14em;color:#64748b;text-transform:uppercase}
.top .k{color:${accent}}
.badge{display:inline-flex;align-items:center;padding:8px 16px;border-radius:999px;background:${accent};color:#fff;font:700 20px 'Cascadia Code',Consolas,monospace;letter-spacing:.08em;text-transform:uppercase}
h1{font-weight:800;letter-spacing:-.035em;line-height:1.02}
.pill{display:inline-flex;align-items:center;gap:12px;padding:12px 22px;border-radius:999px;background:#fff;box-shadow:0 0 0 2px #e2e8f0;font-size:28px;font-weight:700;color:#0f172a}
.pill.link{font:600 26px 'Cascadia Code',Consolas,monospace;color:#334155}
.pill.link b{color:${accent};font-weight:800}
.dot{width:18px;height:18px;border-radius:50%;background:${accent}}
.term{background:#0b1220;border-radius:24px;padding:28px 34px;font:600 27px/1.6 'Cascadia Code',Consolas,monospace;color:#e2e8f0;box-shadow:0 18px 40px rgba(15,23,42,.18)}
.term div{white-space:pre-wrap;overflow-wrap:normal;word-break:normal}
.term b{color:#f59e0b;margin-right:14px}
.foot{margin-top:auto;display:flex;justify-content:space-between;align-items:center;font:700 22px 'Cascadia Code',Consolas,monospace;color:#94a3b8;letter-spacing:.08em}
.bar{display:flex;gap:8px}.bar i{width:34px;height:6px;border-radius:3px;background:#e2e8f0}.bar i.on{background:${accent}}
`;

// Cascadia/Consolas glyphs are ~0.6em wide; fit the longest line into the terminal's inner width
const fitMono = (lines, inner = 868, max = 27, min = 18) =>
  Math.max(min, Math.min(max, Math.floor(inner / (Math.max(...lines.map((l) => l.length + 2)) * 0.6))));

const progress = (n, total) => `<div class="bar">${Array.from({ length: total }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>`;

// ---------------------------------------------------------------- repo card
function repoCard(r, i, total, accent, soft) {
  return `<style>${BASE(accent, soft)}
.id{display:flex;align-items:center;gap:30px;margin-top:46px}
.ic{width:132px;height:132px;border-radius:32px;background:${r.color};display:grid;place-items:center;font-size:72px;box-shadow:0 14px 34px rgba(15,23,42,.18)}
h1{font-size:${r.name.length > 10 ? 84 : 100}px}
.tag{margin-top:30px;font-size:40px;line-height:1.35;color:#334155;max-width:920px}
.row{display:flex;flex-wrap:wrap;gap:16px;margin-top:30px}
.term{margin-top:auto;font-size:${fitMono(r.cmd)}px}
</style>
<div class="top"><span>Repo <span class="k">${String(i).padStart(2, '0')}</span></span><span>${String(i).padStart(2, '0')}/${String(total).padStart(2, '0')}</span></div>
<div class="id"><div class="ic">${r.icon}</div><h1>${esc(r.name)}</h1></div>
<p class="tag">${esc(r.tag)}</p>
<div class="row"><span class="pill link"><span>github.com/<b>${esc(r.repo)}</b></span></span></div>
<div class="row"><span class="pill">Open source</span><span class="pill"><i class="dot" style="background:${r.dot}"></i>${esc(r.install)}</span></div>
<div class="term">${r.cmd.map((c) => `<div><b>$</b>${esc(c)}</div>`).join('')}</div>`;
}

// ---------------------------------------------------------------- compare card (paid vs free)
function compareCard(c, i, total, accent, soft) {
  return `<style>${BASE(accent, soft)}
h1{font-size:96px;margin-top:22px}
.cols{display:grid;grid-template-columns:330px 1fr;gap:26px;margin:auto 0;padding:34px 0;position:relative}
.col{border-radius:30px;padding:30px 30px 34px;display:flex;flex-direction:column;align-items:center;text-align:center}
.paid{background:#f1f5f9;box-shadow:inset 0 0 0 2px #e2e8f0;color:#64748b}
.free{background:#fff;box-shadow:0 0 0 3px ${accent},0 24px 50px rgba(249,115,22,.16)}
.lab{font:800 20px 'Cascadia Code',Consolas,monospace;letter-spacing:.14em;padding:7px 16px;border-radius:999px}
.paid .lab{background:#e2e8f0;color:#64748b}
.free .lab{background:${accent};color:#fff}
.tile{width:104px;height:104px;border-radius:26px;display:grid;place-items:center;margin:24px 0 18px;font-size:58px}
.paid .tile{background:#cbd5e1;color:#475569;font:800 40px 'Segoe UI',sans-serif;position:relative;overflow:hidden}
.paid .tile:after{content:'';position:absolute;left:-10px;right:-10px;top:50%;height:8px;background:${accent};transform:rotate(-22deg);border-radius:4px}
.icons{display:flex;gap:14px;margin:24px 0 18px}
.free .tile{margin:0;background:${soft};box-shadow:inset 0 0 0 2px #fed7aa}
.name{font-size:34px;font-weight:800;line-height:1.15;color:#0f172a}
.paid .name{color:#475569;font-size:30px}
.price{font-size:30px;font-weight:800;margin-top:8px}
.paid .price{text-decoration:line-through;text-decoration-thickness:3px;color:#94a3b8}
.free .price{color:${accent};font-size:44px}
.status{margin-top:12px;font:700 19px 'Cascadia Code',Consolas,monospace;letter-spacing:.1em;color:#9a3412;background:#ffedd5;padding:6px 14px;border-radius:999px}
.x{margin-top:22px;display:grid;gap:12px;font-size:24px;color:#64748b;text-align:left}
.x div:before{content:'✕';margin-right:10px;color:#94a3b8}
.ok{margin-top:24px;display:grid;gap:14px;text-align:left;width:100%}
.ok div{display:flex;gap:14px;align-items:flex-start;font-size:27px;line-height:1.3;color:#1e293b}
.ok div:before{content:'✓';flex:none;width:34px;height:34px;border-radius:50%;background:${accent};color:#fff;display:grid;place-items:center;font-size:20px;font-weight:900;margin-top:1px}
.vs{position:absolute;left:330px;top:50%;transform:translate(-50%,-50%);width:66px;height:66px;border-radius:50%;background:#0f172a;color:#fff;display:grid;place-items:center;font:800 22px 'Segoe UI',sans-serif;margin-left:13px;box-shadow:0 0 0 6px #fff}
.link{align-self:flex-start}
</style>
<div class="top"><span><span class="k">${String(i).padStart(2, '0')}</span> · ${esc(c.kicker)}</span><span>${String(i).padStart(2, '0')}/${String(total).padStart(2, '0')}</span></div>
<h1>${esc(c.title)}</h1>
<div class="cols">
  <div class="col paid">
    <span class="lab">PAID</span>
    <div class="tile">${esc(c.paid.initials)}</div>
    <div class="name">${esc(c.paid.name)}</div>
    ${c.paid.price ? `<div class="price">${esc(c.paid.price)}</div>` : ''}
    <div class="x"><div>Subscription</div><div>Account required</div></div>
  </div>
  <div class="col free">
    <span class="lab">FREE</span>
    <div class="icons">${c.free.icons.map((e) => `<div class="tile">${e}</div>`).join('')}</div>
    <div class="name">${esc(c.free.name)}</div>
    <div class="price">$0</div>
    <div class="status">${esc(c.free.status)}</div>
    <div class="ok">${c.free.points.map((p) => `<div>${esc(p)}</div>`).join('')}</div>
  </div>
  <div class="vs">VS</div>
</div>
<span class="pill link">↗ <b>${esc(c.link)}</b></span>`;
}

function stepsCard(s, i, total, accent, soft) {
  return `<style>${BASE(accent, soft)}
h1{font-size:110px;margin-top:26px}
.sub{margin-top:18px;font-size:36px;color:#475569}
.steps{display:grid;gap:22px;margin-top:46px}
.st{display:flex;gap:28px;align-items:center;background:#fff;border-radius:28px;padding:30px 34px;box-shadow:0 0 0 2px #e2e8f0,0 14px 30px rgba(15,23,42,.06)}
.n{flex:none;width:76px;height:76px;border-radius:50%;background:${accent};color:#fff;display:grid;place-items:center;font:800 36px 'Segoe UI',sans-serif;box-shadow:0 10px 24px rgba(249,115,22,.35)}
.st b{display:block;font-size:38px;font-weight:800;letter-spacing:-.01em}
.st small{display:block;margin-top:6px;font-size:28px;color:#64748b}
.link{margin-top:auto;align-self:flex-start}
</style>
<div class="top"><span><span class="k">${String(i).padStart(2, '0')}</span> · How to get it</span><span>${String(i).padStart(2, '0')}/${String(total).padStart(2, '0')}</span></div>
<h1>${esc(s.title)}</h1>
<p class="sub">${esc(s.sub)}</p>
<div class="steps">${s.steps.map((x, k) => `<div class="st"><span class="n">${k + 1}</span><span><b>${esc(x.t)}</b><small>${esc(x.d)}</small></span></div>`).join('')}</div>
<span class="pill link">↗ <b>${esc(s.link)}</b></span>`;
}

// ---------------------------------------------------------------- MCP cards
function mcpCover(m, i, total, accent, soft) {
  return `<style>${BASE(accent, soft)}
h1{font-size:92px;margin-top:30px}
h1 em{font-style:normal;color:${accent}}
.sub{margin-top:24px;font-size:36px;line-height:1.4;color:#334155}
.grid{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:44px}
.cell{background:#fff;border-radius:26px;padding:28px 30px;box-shadow:0 0 0 2px #e2e8f0}
.cell .e{font-size:44px}
.cell b{display:block;margin-top:12px;font-size:34px;font-weight:800}
.cell small{display:block;margin-top:6px;font:600 22px 'Cascadia Code',Consolas,monospace;color:${accent}}
.cell:nth-child(odd){padding-right:80px}.cell:nth-child(even){padding-left:84px}
.hub{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:124px;height:124px;border-radius:50%;background:${accent};color:#fff;display:grid;place-items:center;text-align:center;font:800 25px/1.15 'Segoe UI',sans-serif;box-shadow:0 0 0 10px #fff,0 18px 40px rgba(109,91,208,.35)}
.hub small{display:block;font-size:18px;font-weight:600;opacity:.85}
</style>
<div class="top"><span class="badge">Claude Code · UI upgrade</span><span>${String(i).padStart(2, '0')}/${String(total).padStart(2, '0')}</span></div>
<h1>Claude <em>MCP tools</em><br>for better UI</h1>
<p class="sub">${esc(m.sub)}</p>
<div class="grid">${m.cells.map((c) => `<div class="cell"><span class="e">${c.e}</span><b>${esc(c.t)}</b><small>${esc(c.s)}</small></div>`).join('')}
<div class="hub"><span>Claude<small>+ MCP</small></span></div></div>
<div class="foot" style="margin-top:auto;padding-top:24px"><span>SWIPE →</span>${progress(i, total)}</div>`;
}

function mcpWhat(m, i, total, accent, soft) {
  return `<style>${BASE(accent, soft)}
h1{font-size:98px;margin-top:26px}
.sub{margin-top:22px;font-size:36px;line-height:1.4;color:#334155}
.sub b{color:#0f172a}
.vs2{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:auto}
.box{border-radius:26px;padding:28px 30px}
.box b{display:block;font-size:32px;font-weight:800}
.box p{margin-top:12px;font-size:28px;line-height:1.4}
.without{background:#f1f5f9;color:#64748b;box-shadow:inset 0 0 0 2px #e2e8f0}
.without b{color:#475569}
.with{background:#fff;box-shadow:0 0 0 3px ${accent};color:#334155}
.with b{color:${accent}}
.flow{display:flex;align-items:center;gap:16px;margin:34px 0 auto}
.node{flex:1;background:#fff;border-radius:22px;padding:28px 18px;text-align:center;box-shadow:0 0 0 2px #e2e8f0}
.node b{display:block;font-size:33px;font-weight:800}
.node small{display:block;margin-top:4px;font-size:21px;color:#64748b}
.node.hi{background:${accent};box-shadow:none;color:#fff}.node.hi small{color:rgba(255,255,255,.85)}
.arr{font-size:34px;color:#94a3b8;font-weight:800}
</style>
<div class="top"><span><span class="k">Start here</span> · 20-second explainer</span><span>${String(i).padStart(2, '0')}/${String(total).padStart(2, '0')}</span></div>
<h1>What is MCP?</h1>
<p class="sub"><b>Model Context Protocol</b> is a standard way to plug tools into Claude. Think of it like <b>USB-C for AI</b>: one connector, many tools.</p>
<div class="vs2">
  <div class="box without"><b>Without MCP</b><p>Claude guesses what your design looks like, can't see the page it built, and may use outdated docs.</p></div>
  <div class="box with"><b>With MCP</b><p>Claude reads your Figma file, opens the real page, checks the console and uses the latest docs.</p></div>
</div>
<div class="flow"><div class="node"><b>Claude</b><small>Code / Desktop</small></div><span class="arr">→</span><div class="node hi"><b>MCP server</b><small>the plug</small></div><span class="arr">→</span><div class="node"><b>Tool</b><small>Figma · browser · docs</small></div></div>
<div class="foot" style="margin-top:auto;padding-top:24px"><span>WORKS WITH CLAUDE CODE + DESKTOP</span>${progress(i, total)}</div>`;
}

function mcpTool(t, i, total, accent, soft) {
  return `<style>${BASE(accent, soft)}
.head{display:flex;justify-content:space-between;align-items:center}
h1{font-size:${t.name.length > 16 ? 76 : 88}px;margin-top:22px}
.link{margin-top:22px;align-self:flex-start}
.desc{margin-top:24px;font-size:33px;line-height:1.4;color:#334155}
.flow{display:flex;align-items:stretch;gap:12px;margin:auto 0;min-height:150px}
.node{flex:1;background:#fff;border-radius:20px;padding:18px 12px;text-align:center;box-shadow:0 0 0 2px #e2e8f0;display:flex;flex-direction:column;justify-content:center}
.node b{display:block;font-size:27px;font-weight:800;line-height:1.15}
.node small{display:block;margin-top:6px;font-size:19px;color:#64748b}
.node.hi{background:${accent};box-shadow:none;color:#fff}.node.hi small{color:rgba(255,255,255,.85)}
.stack{flex:1;display:grid;gap:8px}
.stack span{background:#fff;border-radius:12px;box-shadow:0 0 0 2px #e2e8f0;font:600 19px 'Cascadia Code',Consolas,monospace;display:grid;place-items:center;color:#334155}
.arr{align-self:center;font-size:28px;color:#94a3b8;font-weight:800}
.try{margin-top:0;border-radius:22px;padding:22px 26px;background:${soft};box-shadow:inset 0 0 0 2px rgba(109,91,208,.25)}
.try small{font:700 18px 'Cascadia Code',Consolas,monospace;letter-spacing:.12em;color:${accent}}
.try p{margin-top:8px;font-size:29px;line-height:1.35;font-style:italic;color:#1e293b}
.term{margin-top:28px;font-size:${fitMono([t.cmd])}px}
</style>
<div class="head top"><span><span class="k">${String(t.n).padStart(2, '0')}</span> · MCP tool</span><span class="badge">${esc(t.badge)}</span></div>
<h1>${esc(t.name)}</h1>
<span class="pill link">↗ <b>${esc(t.link)}</b></span>
<p class="desc">${esc(t.desc)}</p>
<div class="flow">${t.flow.map((f, k) => {
    const node = Array.isArray(f)
      ? `<div class="stack">${f.map((x) => `<span>${esc(x)}</span>`).join('')}</div>`
      : `<div class="node${f.hi ? ' hi' : ''}"><b>${esc(f.t)}</b>${f.s ? `<small>${esc(f.s)}</small>` : ''}</div>`;
    return (k ? '<span class="arr">→</span>' : '') + node;
  }).join('')}</div>
<div class="try"><small>TRY THIS PROMPT</small><p>“${esc(t.prompt)}”</p></div>
<div class="term"><div><b>$</b>${esc(t.cmd)}</div></div>`;
}

// ---------------------------------------------------------------- content
const REPOS = { accent: '#ea580c', soft: '#ffedd5', dir: 'repos', cards: [
  { file: 'ragflow', name: 'RAGFlow', icon: '📄', color: '#f59e0b', repo: 'infiniflow/ragflow', dot: '#1d63ed', install: 'Docker',
    tag: 'Build document-based RAG apps with visual knowledge retrieval.',
    cmd: ['git clone https://github.com/infiniflow/ragflow.git', 'cd ragflow/docker && docker compose up -d'] },
  { file: 'dify', name: 'Dify', icon: '🧩', color: '#2563eb', repo: 'langgenius/dify', dot: '#1d63ed', install: 'Docker',
    tag: 'Build and run LLM apps and agents with a visual workflow editor.',
    cmd: ['git clone https://github.com/langgenius/dify.git', 'cd dify/docker && cp .env.example .env', 'docker compose up -d'] },
  { file: 'open-webui', name: 'Open WebUI', icon: '💬', color: '#111827', repo: 'open-webui/open-webui', dot: '#3776ab', install: 'pip install',
    tag: 'A self-hosted chat interface for local and cloud models.',
    cmd: ['pip install open-webui', 'open-webui serve'] },
  { file: 'firecrawl', name: 'Firecrawl', icon: '🔥', color: '#f97316', repo: 'firecrawl/firecrawl', dot: '#3776ab', install: 'pip install',
    tag: 'Turn websites into data that AI agents can search and process.',
    cmd: ['pip install firecrawl-py'] },
] };

const ARTCRAFT = { accent: '#f97316', soft: '#fff1e6', dir: 'artcraft', cards: [
  { file: '01-audio', kind: 'compare', kicker: 'Audio', title: 'Audio',
    paid: { name: 'Audition', initials: 'Au', price: '$22.99/mo' },
    free: { name: 'SoundCraft', icons: ['🐦'], status: 'IN DEVELOPMENT', points: ['Record, edit and mix audio', 'Multi-track with MIDI', 'A free DAW, basically'] },
    link: 'getartcraft.com/apps/soundcraft' },
  { file: '02-ui-design', kind: 'compare', kicker: 'UI design', title: 'UI design',
    paid: { name: 'Figma Pro', initials: 'F', price: '$16/mo' },
    free: { name: 'FigCraft', icons: ['🦎'], status: 'EARLY ALPHA', points: ['Interface design and prototyping', 'Runs on your PC, no account', 'Also runs in your browser'] },
    link: 'getartcraft.com/apps/figcraft' },
  { file: '03-3d-texturing', kind: 'compare', kicker: '3D texturing', title: '3D texturing',
    paid: { name: 'Substance 3D', initials: 'S3', price: '$24.99/mo' },
    free: { name: 'TextureCraft + MaterialCraft', icons: ['🦓', '🦏'], status: 'IN DEVELOPMENT', points: ['Paint textures on 3D models', 'Node-based procedural materials', 'For game and 3D artists'] },
    link: 'getartcraft.com/apps' },
  { file: '04-cad', kind: 'compare', kicker: 'CAD', title: 'CAD',
    paid: { name: 'AutoCAD LT', initials: 'A', price: '$60/mo' },
    free: { name: 'CADCraft', icons: ['📐'], status: 'IN DEVELOPMENT', points: ['2D drafting and CAD drawings', 'Plans, layouts, technical docs', 'The biggest money saver here'] },
    link: 'getartcraft.com/apps/cadcraft' },
  { file: '05-office', kind: 'compare', kicker: 'Office', title: 'Office',
    paid: { name: 'Microsoft 365', initials: '365', price: '$9.99/mo' },
    free: { name: 'WordCraft + DeckCraft + GridCraft', icons: ['📝', '📊', '📗'], status: 'IN DEVELOPMENT', points: ['WordCraft: documents', 'DeckCraft: slides. GridCraft: sheets', 'Office, but open source'] },
    link: 'getartcraft.com/apps' },
  { file: '06-anything', kind: 'compare', kicker: 'Anything', title: 'Anything',
    paid: { name: 'Any app you pay for', initials: '$', price: '' },
    free: { name: 'Craft Anything', icons: ['🪶'], status: 'EARLY ALPHA', points: ['Pick any software, describe it', 'It plans, you approve, it builds yours', 'Wild. Still early'] },
    link: 'getartcraft.com/apps/craft-anything' },
  { file: '08-three-steps', kind: 'steps', title: 'Three steps.', sub: 'Get all the free apps in a few minutes.',
    steps: [
      { t: 'Go to getartcraft.com', d: 'No account. No email. No card.' },
      { t: 'Download the Launcher', d: 'Windows, Mac and Linux.' },
      { t: 'It installs all 16 apps', d: 'And keeps them updated. Most also run in your browser.' },
    ], link: 'getartcraft.com' },
] };

const MCP = { accent: '#6d5bd0', soft: '#ede9fe', dir: 'mcp', cards: [
  { file: '01-cover', kind: 'cover', sub: 'Stop getting generic, broken UI. Plug these into Claude and it can see, test and match real designs.',
    cells: [
      { e: '🎨', t: 'Design → Code', s: 'Figma MCP' },
      { e: '🧩', t: 'UI Components', s: '21st.dev Magic' },
      { e: '🔍', t: 'Test + Debug', s: 'Playwright · DevTools' },
      { e: '🧠', t: 'What is MCP?', s: 'start here →' },
    ] },
  { file: '02-what-is-mcp', kind: 'what' },
  { file: '03-figma', kind: 'tool', n: 1, name: 'Figma MCP', badge: 'Design → Code', link: 'developers.figma.com',
    desc: 'Brings real Figma designs, components, variables and layout details into Claude for accurate design-to-code.',
    flow: [{ t: '🎨 Figma frame', s: 'your design' }, { t: 'Figma MCP', s: 'reads layout', hi: true }, { t: 'Claude', s: 'writes code' }, { t: '⚛️ React UI', s: 'matches design' }],
    prompt: 'Build this Figma frame as a React component using our design tokens.',
    cmd: 'claude mcp add --transport http figma https://mcp.figma.com/mcp' },
  { file: '04-playwright', kind: 'tool', n: 2, name: 'Playwright MCP', badge: 'See the real UI', link: 'github.com/microsoft/playwright-mcp',
    desc: 'Lets Claude open your website, interact with it, take screenshots and check the actual rendered UI.',
    flow: [{ t: 'Claude' }, { t: 'Opens site', s: 'real browser', hi: true }, { t: 'Clicks + types', s: 'like a user' }, { t: '📸 Screenshot', s: 'sees the UI' }],
    prompt: 'Open localhost:3000 on a phone-sized screen and fix anything that overflows.',
    cmd: 'claude mcp add playwright -- npx @playwright/mcp@latest' },
  { file: '05-chrome-devtools', kind: 'tool', n: 3, name: 'Chrome DevTools MCP', badge: 'Debugging', link: 'github.com/ChromeDevTools/chrome-devtools-mcp',
    desc: 'Debug UI issues with console logs, network requests, CSS inspection, performance traces and Lighthouse audits.',
    flow: [{ t: '🌐 Your site', s: 'in Chrome' }, { t: 'DevTools MCP', s: 'inspects', hi: true }, ['Console', 'Network', 'CSS', 'Lighthouse'], { t: 'Claude', s: 'fixes it' }],
    prompt: 'Run a Lighthouse audit on my homepage and fix the top 3 performance issues.',
    cmd: 'claude mcp add chrome-devtools -- npx chrome-devtools-mcp@latest' },
  { file: '06-21st-magic', kind: 'tool', n: 4, name: '21st.dev Magic MCP', badge: 'Generate UI', link: '21st.dev/magic',
    desc: 'Generates React UI components from natural-language prompts and adds them directly to your project.',
    flow: [{ t: '/ui prompt', s: '"pricing table"' }, { t: 'Magic MCP', s: '21st.dev', hi: true }, ['Variant A', 'Variant B', 'Variant C'], { t: '➕ Added', s: 'to your project' }],
    prompt: '/ui a modern pricing table with 3 plans and a monthly/yearly toggle',
    cmd: 'npx @21st-dev/cli@latest install claude --api-key <your-api-key>' },
] };

// ---------------------------------------------------------------- render
const jobs = [];
for (const [set, fn] of [[REPOS, 'repo'], [ARTCRAFT, null], [MCP, null]]) {
  set.cards.forEach((c, k) => {
    const i = k + 1, total = set.cards.length, a = set.accent, s = set.soft;
    let html;
    if (fn === 'repo') html = repoCard(c, i, total, a, s);
    else if (c.kind === 'compare') html = compareCard(c, i, total, a, s);
    else if (c.kind === 'steps') html = stepsCard(c, i, total, a, s);
    else if (c.kind === 'cover') html = mcpCover(c, i, total, a, s);
    else if (c.kind === 'what') html = mcpWhat(c, i, total, a, s);
    else html = mcpTool(c, i, total, a, s);
    jobs.push({ out: join(ASSETS, set.dir, `${c.file}.png`), html });
  });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });
for (const j of jobs) {
  mkdirSync(dirname(j.out), { recursive: true });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body>${j.html}</body></html>`, { waitUntil: 'load' });
  // flag anything that spills past the 1080px card so it can be fixed
  const overflow = await page.evaluate(() => document.body.scrollHeight > 1080 || [...document.querySelectorAll('body *')].some((e) => e.getBoundingClientRect().bottom > 1081));
  await page.screenshot({ path: j.out, type: 'png' });
  console.log(`${overflow ? '! OVERFLOW ' : ''}${j.out.split(/[\\/]assets[\\/]/)[1]}`);
}
await browser.close();
