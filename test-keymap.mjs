import { toKeystrokes, LAYOUTS } from './keymap.js';
import { STRINGS } from './i18n.js';

let failed = 0;
const check = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg);
    failed++;
  }
};
// helper: describe one typed char as "code[+Shift][+AltGr]"
const k = (layout, ch) => {
  const r = toKeystrokes(ch, layout);
  if (r.skipped.length) return 'SKIPPED';
  const x = r.keys[0];
  return x.code + (x.shift ? '+Shift' : '') + (x.altgr ? '+AltGr' : '');
};

// ---- US ----
const t = toKeystrokes('Ab1!|\\~"\n\té');
check(t.skipped.length === 1 && t.skipped[0] === 'é', 'US: non-ASCII must be skipped');
check(t.keys[0].shift && t.keys[0].code === 'KeyA', 'US: A is Shift+KeyA');
check(!t.keys[1].shift && t.keys[1].vk === 66, 'US: b is unshifted vk 66');
check(k('us', '!') === 'Digit1+Shift', 'US: !');
check(k('us', '|') === 'Backslash+Shift', 'US: |');
check(k('us', '"') === 'Quote+Shift', 'US: "');
check(t.keys[8].key === 'Enter' && t.keys[9].key === 'Tab', 'newline/tab -> Enter/Tab');
check(toKeystrokes('a\r\nb').keys.length === 3, 'CRLF is one Enter');
let missing = '';
for (let i = 32; i < 127; i++) {
  const ch = String.fromCharCode(i);
  if (toKeystrokes(ch).skipped.length) missing += ch;
}
check(missing === '', 'US: printable ASCII not mapped: ' + missing);

// ---- UK ----
check(k('uk', '"') === 'Digit2+Shift', 'UK: " is Shift+2');
check(k('uk', '@') === 'Quote+Shift', 'UK: @ is Shift+Quote');
check(k('uk', '#') === 'Backslash', 'UK: # key');
check(k('uk', '~') === 'Backslash+Shift', 'UK: ~');
check(k('uk', '\\') === 'IntlBackslash', 'UK: backslash on IntlBackslash');
check(k('uk', '£') === 'Digit3+Shift', 'UK: pound sign');

// ---- DE ----
check(k('de', 'z') === 'KeyY', 'DE: z is on KeyY');
check(k('de', 'y') === 'KeyZ', 'DE: y is on KeyZ');
check(k('de', '@') === 'KeyQ+AltGr', 'DE: @ AltGr+Q');
check(k('de', '|') === 'IntlBackslash+AltGr', 'DE: | AltGr+<');
check(k('de', '\\') === 'Minus+AltGr', 'DE: backslash AltGr+ß');
check(k('de', '/') === 'Digit7+Shift', 'DE: / Shift+7');
check(k('de', '-') === 'Slash', 'DE: - on Slash');
check(k('de', 'ü') === 'BracketLeft', 'DE: ü');
check(k('de', '^') === 'SKIPPED', 'DE: dead key ^ is skipped');

// ---- FR ----
check(k('fr', 'a') === 'KeyQ', 'FR: a on KeyQ');
check(k('fr', 'q') === 'KeyA', 'FR: q on KeyA');
check(k('fr', 'm') === 'Semicolon', 'FR: m on Semicolon');
check(k('fr', ',') === 'KeyM', 'FR: comma on KeyM');
check(k('fr', '1') === 'Digit1+Shift', 'FR: digits need Shift');
check(k('fr', '&') === 'Digit1', 'FR: & is unshifted Digit1');
check(k('fr', '@') === 'Digit0+AltGr', 'FR: @ AltGr+0');
check(k('fr', '#') === 'Digit3+AltGr', 'FR: # AltGr+3');
check(k('fr', '|') === 'Digit6+AltGr', 'FR: | AltGr+6');
check(k('fr', '\\') === 'Digit8+AltGr', 'FR: backslash AltGr+8');

// ---- each layout: no two characters share the same (code, shift, altgr) ----
for (const id of Object.keys(LAYOUTS)) {
  const seen = new Map();
  for (let i = 32; i < 0x250; i++) {
    const ch = String.fromCodePoint(i);
    const r = toKeystrokes(ch, id);
    if (r.skipped.length) continue;
    const x = r.keys[0];
    const sig = `${x.code}|${x.shift}|${x.altgr}`;
    if (seen.has(sig)) check(false, `${id}: ${JSON.stringify(ch)} and ${JSON.stringify(seen.get(sig))} share ${sig}`);
    seen.set(sig, ch);
  }
}

// ---- i18n: both languages define the same keys ----
const enKeys = Object.keys(STRINGS.en).sort().join();
const faKeys = Object.keys(STRINGS.fa).sort().join();
check(enKeys === faKeys, 'i18n: en and fa keys differ');

// ---- HTML pages only reference strings that exist, and element ids popup.js needs ----
import { readFileSync } from 'node:fs';
for (const page of ['popup.html', 'sidepanel.html']) {
  const html = readFileSync(new URL('./' + page, import.meta.url), 'utf8');
  for (const m of html.matchAll(/data-i18n(?:-ph)?="([^"]+)"/g)) {
    check(m[1] in STRINGS.en, `${page}: unknown i18n key ${m[1]}`);
  }
  for (const id of ['text', 'type', 'stop', 'status', 'snips', 'layout', 'keyDelay', 'lineDelay', 'startDelay', 'appendEnter', 'save', 'snipName', 'lang', 'warn', 'layoutNote']) {
    check(html.includes(`id="${id}"`), `${page}: missing element #${id}`);
  }
}
check(readFileSync(new URL('./sidepanel.html', import.meta.url), 'utf8').includes('class="panel"'), 'sidepanel.html must have class="panel"');
const manifest = JSON.parse(readFileSync(new URL('./manifest.json', import.meta.url), 'utf8'));
check(manifest.side_panel.default_path === 'sidepanel.html', 'manifest side_panel path');
check(manifest.permissions.includes('sidePanel'), 'manifest sidePanel permission');
check(manifest.name === 'Remotype', 'manifest name is Remotype');
for (const f of ['README.md', 'README.fa.md', 'LICENSE', 'SECURITY.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'docs/compatibility.md', 'docs/troubleshooting.md']) {
  try { readFileSync(new URL('./' + f, import.meta.url)); } catch { check(false, `missing file ${f}`); }
}
check(!manifest.host_permissions && !manifest.content_scripts, 'no host permissions / content scripts');

console.log(failed ?`${failed} check(s) failed` : 'all keymap checks passed');
process.exit(failed ? 1 : 0);
