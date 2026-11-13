// Ports the v4 demo's signed-in shell CSS (#app: sidebar, workspace, tab strip,
// panel, mobile tab bar, command palette) into src/components/app/app-shell.css
// with exact values, `w-` prefixed (matching styles/app.css). Workspace content
// primitives (.box, .btn-d …) are hand-ported in styles/app.css.
const fs = require('fs');
const postcss = require('postcss');
const [,, demo, out] = process.argv;
const lines = fs.readFileSync(demo, 'utf8').split('\n');
const a = lines.findIndex((l) => l.startsWith('<style>')), b = lines.findIndex((l) => l.startsWith('</style>'));
const css = postcss.parse(lines.slice(a + 1, b).join('\n'));
const SHELL = /^(html\.in-app\s+)?\.(app|sb|sb-[\w-]+|icon-btn|me|bell|ws|ws-[\w-]+|tabbar|cmdk|cmdk-in|logo)\b/;
const keep = [];
const kf = new Set();
let zone = false;
const wrap = (node, outer) => { let n = node; for (const at of outer) { const c = at.clone({ nodes: [] }); c.append(n); n = c; } return n; };
css.each(function visit(node, _i, outer = []) {
  if (node.type === 'comment') { if (/Signed-in app shell/.test(node.text)) zone = true; if (/demo dock/.test(node.text)) zone = false; return; }
  if (!zone) return;
  if (node.type === 'atrule' && node.name === 'media') { node.each((ch) => visit(ch, 0, [node, ...outer])); return; }
  if (node.type !== 'rule') return;
  const sels = node.selectors.map((s) => s.trim()).filter((s) => SHELL.test(s) || /^\.app\b/.test(s));
  if (!sels.length) return;
  const out = sels.map((s) => s.replace(/^html\.in-app\s+body$/, '').replace(/^html\.in-app\s+/, '').replace(/\.([a-zA-Z][\w-]*)/g, '.w-$1').replace(/#([a-zA-Z][\w-]*)/g, '#w-$1')).filter(Boolean);
  if (!out.length) return;
  keep.push(wrap(node.clone({ selector: out.join(',') }), outer.slice().reverse()).toString());
});
const root = [];
css.walkRules((r) => { if (r.selector.trim() === ':root') r.walkDecls((d) => root.push(`  ${d.prop}:${d.value};`)); });
let text = `/* =====================================================================\n   WORKSPACE SHELL — GENERATED from docs/redesign/webloop-genie-demo.html (v4)\n   by scripts/port-genie-app.cjs. Exact values; demo classes carry a w- prefix.\n   The demo toggles .app with html.in-app; here the shell is only rendered\n   when it should show, so it is always visible (see app-shell-app.css).\n   ===================================================================== */\n.w-app,.w-cmdk{\n${root.join('\n')}\n}\n` + keep.join('\n') + '\n';
text = text.replace(/'Geist Mono'/g, "'Geist Mono Variable','Geist Mono'").replace(/'Geist'(?! Mono)/g, "'Geist Variable','Geist'");
// The demo's `#app button{font:inherit;color:inherit}` reset would otherwise beat every
// page's own classes (Tailwind utilities, .pill, .w-chip …) on buttons inside the panel.
// Zero specificity keeps it a pure reset: any class on a button wins, as in the demo.
text = text.replace(/^\.w-app button\{([^}]*)\}$/m, ':where(.w-app) :where(button){$1}');
fs.writeFileSync(out, text);
console.log('rules', keep.length);
