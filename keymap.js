// Layout-aware mapping: character -> physical key (+ Shift / AltGr).
//
// The extension sends PHYSICAL keys (KeyboardEvent.code). The remote machine's
// own keyboard layout then turns those keys into characters, so the layout you
// pick here must match the layout configured INSIDE the target machine.
// (In the vSphere web console the "Enforce US Keyboard Layout" button forces US.)
//
// Row format: [code, normal, shift, altgr]  (use null for "no character").
// Dead keys (e.g. ^ and ´ on German, ^ and ¨ on French) are intentionally left out.

const VK = {
  Minus: 189, Equal: 187, BracketLeft: 219, BracketRight: 221, Backslash: 220,
  Semicolon: 186, Quote: 222, Comma: 188, Period: 190, Slash: 191, Backquote: 192,
  IntlBackslash: 226, Space: 32,
};
function vkOf(code) {
  if (code.startsWith('Key')) return code.charCodeAt(3);
  if (code.startsWith('Digit')) return code.charCodeAt(5);
  return VK[code];
}

const letters = (swap = {}, alt = {}) =>
  [...'abcdefghijklmnopqrstuvwxyz']
    .map((c) => {
      const code = 'Key' + c.toUpperCase();
      const ch = code in swap ? swap[code] : c;
      return ch === null ? null : [code, ch, ch.toUpperCase(), alt[code] || null];
    })
    .filter(Boolean);

const override = (base, rows) => {
  const codes = new Set(rows.map((r) => r[0]));
  return [...base.filter((r) => !codes.has(r[0])), ...rows];
};

const US = [
  ...letters(),
  ['Digit1', '1', '!'], ['Digit2', '2', '@'], ['Digit3', '3', '#'], ['Digit4', '4', '$'],
  ['Digit5', '5', '%'], ['Digit6', '6', '^'], ['Digit7', '7', '&'], ['Digit8', '8', '*'],
  ['Digit9', '9', '('], ['Digit0', '0', ')'],
  ['Backquote', '`', '~'], ['Minus', '-', '_'], ['Equal', '=', '+'],
  ['BracketLeft', '[', '{'], ['BracketRight', ']', '}'], ['Backslash', '\\', '|'],
  ['Semicolon', ';', ':'], ['Quote', "'", '"'], ['Comma', ',', '<'], ['Period', '.', '>'],
  ['Slash', '/', '?'], ['Space', ' ', ' '],
];

const UK = override(US, [
  ['Digit2', '2', '"'], ['Digit3', '3', '£'], ['Digit4', '4', '$', '€'],
  ['Backquote', '`', '¬'], ['Quote', "'", '@'], ['Backslash', '#', '~'],
  ['IntlBackslash', '\\', '|'],
]);

const DE = [
  ...letters({ KeyY: 'z', KeyZ: 'y' }, { KeyQ: '@', KeyE: '€' }),
  ['Digit1', '1', '!'], ['Digit2', '2', '"', '²'], ['Digit3', '3', '§', '³'],
  ['Digit4', '4', '$'], ['Digit5', '5', '%'], ['Digit6', '6', '&'],
  ['Digit7', '7', '/', '{'], ['Digit8', '8', '(', '['], ['Digit9', '9', ')', ']'],
  ['Digit0', '0', '=', '}'],
  ['Minus', 'ß', '?', '\\'], ['BracketLeft', 'ü', 'Ü'], ['BracketRight', '+', '*', '~'],
  ['Semicolon', 'ö', 'Ö'], ['Quote', 'ä', 'Ä'], ['Backslash', '#', "'"],
  ['IntlBackslash', '<', '>', '|'], ['Comma', ',', ';'], ['Period', '.', ':'],
  ['Slash', '-', '_'], ['Space', ' ', ' '],
];

const FR = [
  ...letters({ KeyQ: 'a', KeyW: 'z', KeyA: 'q', KeyZ: 'w', KeyM: null }, { KeyE: '€' }),
  ['KeyM', ',', '?'], ['Semicolon', 'm', 'M'], ['Comma', ';', '.'], ['Period', ':', '/'],
  ['Slash', '!', '§'],
  ['Digit1', '&', '1'], ['Digit2', 'é', '2', '~'], ['Digit3', '"', '3', '#'],
  ['Digit4', "'", '4', '{'], ['Digit5', '(', '5', '['], ['Digit6', '-', '6', '|'],
  ['Digit7', 'è', '7', '`'], ['Digit8', '_', '8', '\\'], ['Digit9', 'ç', '9', '^'],
  ['Digit0', 'à', '0', '@'],
  ['Minus', ')', '°', ']'], ['Equal', '=', '+', '}'], ['BracketRight', '$', '£', '¤'],
  ['Quote', 'ù', '%'], ['Backslash', '*', 'µ'], ['IntlBackslash', '<', '>'],
  ['Backquote', '²'], ['Space', ' ', ' '],
];

export const LAYOUTS = {
  us: { label: 'US (QWERTY)', experimental: false, rows: US },
  uk: { label: 'UK (QWERTY)', experimental: true, rows: UK },
  de: { label: 'German (QWERTZ)', experimental: true, rows: DE },
  fr: { label: 'French (AZERTY)', experimental: true, rows: FR },
};

const cache = new Map();
function table(id) {
  if (cache.has(id)) return cache.get(id);
  const rows = (LAYOUTS[id] || LAYOUTS.us).rows;
  const map = new Map();
  const put = (ch, row, shift, altgr) => {
    if (!ch || map.has(ch)) return;
    map.set(ch, { key: ch, base: row[1], code: row[0], vk: vkOf(row[0]), shift, altgr });
  };
  for (const r of rows) put(r[1], r, false, false); // unshifted first
  for (const r of rows) put(r[2], r, true, false);
  for (const r of rows) put(r[3], r, false, true);
  cache.set(id, map);
  return map;
}

const ENTER = { key: 'Enter', base: '\r', code: 'Enter', vk: 13, shift: false, altgr: false, text: '\r' };
const TAB = { key: 'Tab', base: '\t', code: 'Tab', vk: 9, shift: false, altgr: false, text: '\t' };

/** Convert text to keystrokes for a layout. Characters the layout cannot type go to `skipped`. */
export function toKeystrokes(text, layout = 'us') {
  const map = table(layout);
  const keys = [];
  const skipped = new Set();
  for (const ch of String(text).replace(/\r\n?/g, '\n')) {
    if (ch === '\n') keys.push(ENTER);
    else if (ch === '\t') keys.push(TAB);
    else if (map.has(ch)) keys.push(map.get(ch));
    else skipped.add(ch);
  }
  return { keys, skipped: [...skipped] };
}
