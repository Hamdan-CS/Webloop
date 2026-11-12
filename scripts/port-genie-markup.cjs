// Extracts static markup segments from the v4 demo into a TS module of raw
// HTML strings (classes/ids gh- prefixed; sprite ids like #cloudW kept).
// Interactive parts are written as React; these are decorative/static.
const fs = require('fs');
const [,, demo, out] = process.argv;
const html = fs.readFileSync(demo, 'utf8');
const between = (start, end, from = 0) => { const a = html.indexOf(start, from); const b = html.indexOf(end, a + start.length); if (a < 0 || b < 0) throw new Error('marker not found: ' + start); return html.slice(a + start.length, b); };
const prefix = (s) => s
  .replace(/class="([^"]*)"/g, (_, c) => `class="${c.split(/\s+/).filter(Boolean).map((x) => 'gh-' + x).join(' ')}"`)
  .replace(/\sid="([^"]+)"/g, (_, id) => ` id="gh-${id}"`)
  .replace(/url\(#(fp|fl|fy|fb|stW|cbT|cbL|cbR|bub|shd|fdB|fdF)\)/g, 'url(#gh-$1)')
  .replace(/\n\s*/g, '\n');
const seg = {
  sprite: between('<svg width="0" height="0" style="position:absolute" aria-hidden="true">', '</svg>\n\n<!-- 0'),
  heroDecor: between('<section class="hero" id="top">', '<h1 '),
  storyClouds: between('<section class="story" id="how">', '<div class="story-in">'),
  storySentence: between('<p class="sentence" id="sentence" data-orb-fade aria-label="WebLoop turns your idea, a team, a brief and a mentor into verified proof.">', '</p>'),
  storyStage: between('<div class="stage">', '\n  </div>\n</section>', html.indexOf('<section class="story"')),
  words: between('<section class="words" id="words">', '</section>'),
  xcCards: between('<div class="xc reveal" id="xc" role="list">', '\n    </div>\n  </div>\n</section>'),
  endBack: between('<div class="back l" id="endL">', '<canvas'),
  endFront: between('<div class="front l" id="frontL">', '<div class="end-fade">'),
};
seg.sprite = seg.sprite; // sprite keeps its own ids (#cloudW, #cloudB, #loop, #check, #loopG, #cgW, #cgB)
const body = Object.entries(seg).map(([k, v]) => {
  const t = k === 'sprite' ? v.replace(/\n\s*/g, '\n') : prefix(k === 'endBack' ? '<div class="back l" id="endL">' + v : k === 'endFront' ? '<div class="front l" id="frontL">' + v : v);
  return `export const ${k} = ${JSON.stringify(t.trim())};`;
}).join('\n\n');
fs.writeFileSync(out, `/* GENERATED from docs/redesign/webloop-genie-demo.html (v4) by scripts/port-genie-markup.cjs.\n * Static, decorative markup only (no links, no user data); classes and ids carry\n * the gh- prefix used by genie-home.css. Re-run the script instead of editing. */\n${body}\n`);
console.log(Object.fromEntries(Object.entries(seg).map(([k, v]) => [k, v.length])));
