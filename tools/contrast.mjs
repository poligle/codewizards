// WCAG 2.2 contrast of the room's panel colours, in the light and the dark theme (step 5).
// Text pairs need 4.5:1 (AA, normal text). Exits with 1 if any pair fails.
//   node tools/contrast.mjs
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../apps/room/src/style.css', import.meta.url), 'utf8');
const block = re => Object.fromEntries([...(css.match(re) || [''])[0].matchAll(/--([a-z]+):(#[0-9a-f]{6})/gi)].map(m => [m[1], m[2]]));
const themes = { light: block(/^:root\{[^}]*\}/m), dark: block(/:root\[data-theme="dark"\]\{[^}]*\}/) };
for (const t of Object.values(themes)) t.dark = '#181020';   // the fixed text colour of the spell book's buttons
const lum = hex => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// Text colour on background colour, as the room uses them.
const PAIRS = [['ink', 'panel'], ['muted', 'panel'], ['ink', 'bg'], ['muted', 'bg'], ['ink', 'code'], ['muted', 'code'],
  ['add', 'code'], ['del', 'code'], ['hunk', 'code'], ['warn', 'panel'], ['add', 'panel'], ['del', 'panel'], ['dark', 'accent'], ['panel', 'add']];
let bad = 0;
for (const [name, v] of Object.entries(themes)) {
  for (const [fg, bg] of PAIRS) {
    if (!v[fg] || !v[bg]) continue;
    const r = ratio(v[fg], v[bg]);
    const ok = r >= 4.5;
    if (!ok) bad++;
    console.log(`${ok ? '✓' : '✗'} ${name.padEnd(5)} ${fg.padEnd(6)} on ${bg.padEnd(6)} ${r.toFixed(2)}:1`);
  }
}
console.log(bad ? `${bad} pairs below 4.5:1` : 'every pair reaches 4.5:1 (WCAG 2.2 AA, normal text)');
process.exit(bad ? 1 : 0);
