import { toKeystrokes, LAYOUTS } from './keymap.js';
import { STRINGS, defaultLang } from './i18n.js';

const $ = (id) => document.getElementById(id);
const DEFAULTS = {
  keyDelay: 15,
  lineDelay: 80,
  startDelay: 1,
  appendEnter: false,
  layout: 'us',
  lang: null,
  keepConnected: true, // side panel only: stay attached between jobs
  idleMinutes: 15, // side panel only: disconnect after this much idle time
};
const SEED_SNIPPETS = [
  { id: 's1', name: 'Linux: disk, memory, load', text: 'df -h; free -m; uptime' },
  { id: 's2', name: 'Linux: IPs and open ports', text: 'ip -br a; ss -tulpn' },
  { id: 's3', name: 'Windows: ipconfig', text: 'ipconfig /all' },
  { id: 's4', name: 'PowerShell: system info', text: 'Get-ComputerInfo | Select-Object CsName,OsName,OsVersion' },
];

let settings = { ...DEFAULTS };
let snippets = [];
let tabId = null;
let winId = null;
let lang = 'en';
// The side panel (sidepanel.html) stays open; the popup closes itself after typing starts.
const IS_PANEL = document.documentElement.classList.contains('panel');
const T = () => STRINGS[lang];

function setStatus(msg, cls = '') {
  const el = $('status');
  el.textContent = msg;
  el.className = 'status ' + cls;
}

function errText(code) {
  const t = T();
  return t[code] || code;
}

function applyLang() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  const t = T();
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t[el.dataset.i18n];
  for (const el of document.querySelectorAll('[data-i18n-ph]')) el.placeholder = t[el.dataset.i18nPh];
  // layout dropdown labels
  const sel = $('layout');
  const cur = sel.value || settings.layout;
  sel.textContent = '';
  for (const [id, l] of Object.entries(LAYOUTS)) {
    const o = document.createElement('option');
    o.value = id;
    o.textContent = l.label + (l.experimental ? ` (${t.experimental})` : '');
    sel.append(o);
  }
  sel.value = cur;
  updateLayoutNote();
  checkText();
}

function updateLayoutNote() {
  const l = LAYOUTS[$('layout').value] || LAYOUTS.us;
  $('layoutNote').textContent = l.experimental ? T().layoutNoteExp : T().layoutNoteUs;
}

function checkText() {
  const { skipped } = toKeystrokes($('text').value, $('layout').value);
  const w = $('warn');
  if (skipped.length) {
    w.hidden = false;
    w.textContent = T().unsupported + skipped.join(' ');
  } else {
    w.hidden = true;
  }
}

async function loadAll() {
  const store = await chrome.storage.local.get(['settings', 'snippets']);
  settings = { ...DEFAULTS, ...(store.settings || {}) };
  if (!LAYOUTS[settings.layout]) settings.layout = 'us';
  lang = settings.lang || defaultLang();
  snippets = store.snippets || SEED_SNIPPETS;
  if (!store.snippets) await chrome.storage.local.set({ snippets });
  $('keyDelay').value = settings.keyDelay;
  $('lineDelay').value = settings.lineDelay;
  $('startDelay').value = settings.startDelay;
  $('appendEnter').checked = settings.appendEnter;
  $('layout').value = settings.layout;
  if ($('keepConnected')) $('keepConnected').checked = settings.keepConnected;
  if ($('idleMinutes')) $('idleMinutes').value = settings.idleMinutes;
  applyLang();
  renderSnippets();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab ? tab.id : null;
  winId = tab ? tab.windowId : null;
}

function readSettings() {
  const num = (id, d) => {
    const v = parseInt($(id).value, 10);
    return Number.isFinite(v) && v >= 0 ? v : d;
  };
  settings = {
    keyDelay: num('keyDelay', DEFAULTS.keyDelay),
    lineDelay: num('lineDelay', DEFAULTS.lineDelay),
    startDelay: num('startDelay', DEFAULTS.startDelay),
    appendEnter: $('appendEnter').checked,
    layout: $('layout').value,
    lang,
    keepConnected: $('keepConnected') ? $('keepConnected').checked : settings.keepConnected,
    idleMinutes: $('idleMinutes') ? Math.max(1, num('idleMinutes', DEFAULTS.idleMinutes)) : settings.idleMinutes,
  };
  return settings;
}

function renderSnippets() {
  const ul = $('snips');
  ul.textContent = '';
  for (const s of snippets) {
    const li = document.createElement('li');
    const name = document.createElement('button');
    name.className = 'name';
    name.textContent = s.name;
    name.title = s.text;
    name.onclick = () => {
      $('text').value = s.text;
      checkText();
      $('text').focus();
    };
    const go = document.createElement('button');
    go.className = 'small';
    go.textContent = '▶';
    go.onclick = () => typeText(s.text);
    const del = document.createElement('button');
    del.className = 'small';
    del.textContent = '×';
    del.onclick = async () => {
      snippets = snippets.filter((x) => x.id !== s.id);
      await chrome.storage.local.set({ snippets });
      renderSnippets();
    };
    li.append(name, go, del);
    ul.append(li);
  }
}

async function typeText(raw) {
  if (IS_PANEL) {
    // The panel stays open while you switch tabs, so find the active tab again each time.
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabId = tab ? tab.id : null;
  }
  if (tabId == null) return setStatus(T().noTab, 'err');
  const opts = readSettings();
  await chrome.storage.local.set({ settings: opts });
  const text = opts.appendEnter ? raw + '\n' : raw;
  if (!raw && !opts.appendEnter) return setStatus(T().noText, 'err');
  setStatus(T().starting);
  // Only the side panel keeps the debugger attached between jobs; the popup attaches per job.
  const sendOpts = { ...opts, session: IS_PANEL && opts.keepConnected };
  const res = await chrome.runtime.sendMessage({ cmd: 'type', tabId, text, opts: sendOpts });
  if (res && res.ok) {
    if (IS_PANEL) refresh();
    else window.close();
  } else setStatus(T().error + errText(res && res.error), 'err');
}

function showStatus(s) {
  if ($('conn')) $('conn').hidden = !s.session;
  $('stop').hidden = !s.running;
  $('type').disabled = s.running;
  if (s.running) return setStatus(T().typing(s.done, s.total));
  const l = s.last;
  if (!l) return;
  if (l.error) setStatus(T().error + errText(l.error), 'err');
  else if (l.stopped) setStatus(T().stopped(l.done, l.total), 'err');
  else setStatus(T().done(l.total, l.skipped), 'ok');
}

async function refresh() {
  const s = await chrome.runtime.sendMessage({ cmd: 'status' });
  if (s) showStatus(s);
}

$('type').onclick = () => typeText($('text').value);
$('stop').onclick = async () => {
  await chrome.runtime.sendMessage({ cmd: 'stop' });
  setStatus(T().stopping);
};
if ($('panel')) {
  // chrome.sidePanel.open must run inside the click handler, so winId is read in advance.
  $('panel').onclick = () => {
    if (winId == null) return setStatus(T().noTab, 'err');
    chrome.sidePanel.open({ windowId: winId });
    window.close();
  };
}
if ($('disconnect')) {
  $('disconnect').onclick = async () => {
    await chrome.runtime.sendMessage({ cmd: 'disconnect' });
    setStatus(T().disconnected, 'ok');
    refresh();
  };
}
$('lang').onclick = async () => {
  lang = lang === 'fa' ? 'en' : 'fa';
  await chrome.storage.local.set({ settings: readSettings() });
  applyLang();
  refresh();
};
$('text').addEventListener('input', checkText);
$('text').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    typeText($('text').value);
  }
});
$('layout').addEventListener('change', () => {
  updateLayoutNote();
  checkText();
});
$('save').onclick = async () => {
  const text = $('text').value;
  const name = $('snipName').value.trim();
  if (!text || !name) return setStatus(T().needBoth, 'err');
  snippets.push({ id: 's' + Date.now(), name, text });
  await chrome.storage.local.set({ snippets });
  $('snipName').value = '';
  renderSnippets();
  setStatus(T().saved, 'ok');
};
for (const id of ['keyDelay', 'lineDelay', 'startDelay', 'appendEnter', 'layout', 'keepConnected', 'idleMinutes']) {
  if ($(id)) $(id).addEventListener('change', () => chrome.storage.local.set({ settings: readSettings() }));
}

if (IS_PANEL) {
  // While this panel is open, tell the background so it can end the session when the panel closes.
  const connect = () => {
    const port = chrome.runtime.connect({ name: 'panel' });
    port.onDisconnect.addListener(() => setTimeout(connect, 500)); // service worker restarted
  };
  connect();
  setInterval(() => chrome.runtime.sendMessage({ cmd: 'ping' }), 15000);
}

await loadAll();
await refresh();
setInterval(refresh, 500);
$('text').focus();
