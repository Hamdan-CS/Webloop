// Ports the v4 demo's public-site CSS into two files with exact values:
//  - shell (site-wide): base pieces + nav + footer + sticker trail, gh- prefixed, unscoped
//  - home: every other public rule, gh- prefixed and scoped under .ghome
const fs = require('fs');
const postcss = require('postcss');
const [,, demo, outShell, outHome] = process.argv;
const lines = fs.readFileSync(demo, 'utf8').split('\n');
const a = lines.findIndex(l => l.startsWith('<style>')), b = lines.findIndex(l => l.startsWith('</style>'));
const css = postcss.parse(lines.slice(a + 1, b).join('\n'));

const APP = /\.(app|sb|sb-[\w-]+|ws|ws-[\w-]+|view|vh|btn-d|btn-l|grid2|col|box|box-h|inner|composer|comp-row|cchip|kpis|kpi|tasks|task|feed2|frow|mini-gh|inv|ph|prog|gtabs|kb3|kcol|kcard|team|mem|filters|pgrid|msgs|threads|thr|chat|bubbles|bub|cmdk|cmdk-in|toast|tabbar|dock|feedg|pc-row|post|post-h|vchip|pmedia|pcode|pfoot|pa|trend|people|tr|ppl|side-col|me|bell|icon-btn|protected|lock)\b/;
const DROP = /^(:root|\*|html|body|a|button|html\.lenis.*|\.lenis.*|html\.no-intro.*|html\.in-app.*)$/;
const SHELL = /^\.gh-(nav|nav-[\w-]+|logo|pill|chip|mono|acc|h-display|lead|wrap|cloud|clay|float|bob|trail|stk|live|ft|ft-[\w-]+)\b|^\.gh-footer\b/;
const keyframes = new Set();
css.walkAtRules('keyframes', k => keyframes.add(k.params));

let appZone = false;
const shell = [], home = [];
const wrap = (node, outer) => { let n = node; for (const at of outer) { const c = at.clone({ nodes: [] }); c.append(n); n = c; } return n; };

css.each(function visit(node, _i, outer = []) {
  if (node.type === 'comment') { if (/Signed-in app shell/.test(node.text)) appZone = true; if (/nav: live dot/.test(node.text)) appZone = false; return; }
  if (node.type === 'atrule' && node.name === 'keyframes') {
    if (appZone && !/^live$/.test(node.params)) return;
    const k = node.clone({ params: 'gh-' + node.params });
    (['live', 'spin', 'bob', 'marq'].includes(node.params) ? shell : home).push(k.toString());
    return;
  }
  if (node.type === 'atrule') { node.each(ch => visit(ch, 0, [node, ...outer])); return; }
  if (node.type !== 'rule') return;
  const keepShell = [], keepHome = [];
  for (let sel of node.selectors) {
    sel = sel.trim();
    if (DROP.test(sel)) continue;
    if (APP.test(sel) && !/^\.nav /.test(sel)) continue;
    if (appZone && !/^\.nav /.test(sel)) continue;
    let rm = false;
    if (sel.startsWith('html.rm ')) { rm = true; sel = sel.slice(8); }
    sel = sel.replace(/\.([a-zA-Z][\w-]*)/g, '.gh-$1')
             .replace(/#([a-zA-Z][\w-]*)/g, '#gh-$1')
             .replace(/(^|[\s,>+~(])footer\b/g, '$1.gh-footer');
    if (rm) keepHome.push('.ghome.gh-rm ' + sel);
    else if (SHELL.test(sel)) keepShell.push(sel);
    else keepHome.push('.ghome ' + sel);
  }
  const fix = r => { r.walkDecls(d => { if (/^animation/.test(d.prop)) for (const k of keyframes) d.value = d.value.replace(new RegExp('(^|[\\s,])' + k + '(?=[\\s,;]|$)'), '$1gh-' + k); }); return r; };
  if (keepShell.length) shell.push(wrap(fix(node.clone({ selector: keepShell.join(',') })), outer.slice().reverse()).toString());
  if (keepHome.length) home.push(wrap(fix(node.clone({ selector: keepHome.join(',') })), outer.slice().reverse()).toString());
});

// the demo's :root tokens, applied on every root that hosts ported markup
const root = [];
css.walkRules(r => { if (r.selector.trim() === ':root') r.walkDecls(d => root.push(`  ${d.prop}:${d.value};`)); });
const vars = (scope) => `${scope}{\n${root.join('\n')}\n}\n`;
const head = (what) => `/* =====================================================================\n   ${what}\n   GENERATED from docs/redesign/webloop-genie-demo.html (v4) by a port\n   script: values are the demo's, classes/ids carry a gh- prefix, keyframes\n   are gh- prefixed. Edit the demo and re-run rather than hand-tuning.\n   ===================================================================== */\n`;
fs.writeFileSync(outShell, head('GENIE SHELL — site-wide base pieces, nav, footer, sticker trail') + vars('.ghome,.gh-nav,.gh-footer,.gh-trail,.gh-auth') + shell.join('\n') + '\n');
fs.writeFileSync(outHome, head('GENIE HOME — public homepage sections, scoped under .ghome') + home.join('\n') + '\n');
console.log('shell rules', shell.length, 'home rules', home.length, 'root vars', root.length);
// Self-hosted Fontsource families are registered as "<Name> Variable"; put them first.
for (const f of [outShell, outHome]) {
  const t = fs.readFileSync(f, 'utf8')
    .replace(/'Geist Mono'/g, "'Geist Mono Variable','Geist Mono'")
    .replace(/'Geist'(?! Mono)/g, "'Geist Variable','Geist'")
    .replace(/'Bricolage Grotesque'/g, "'Bricolage Grotesque Variable','Bricolage Grotesque'");
  fs.writeFileSync(f, t);
}
