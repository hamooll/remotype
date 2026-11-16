import { toKeystrokes } from './keymap.js';

let job = null; // { tabId, total, done, stop }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = (tabId, method, params) => chrome.debugger.sendCommand({ tabId }, method, params);

function badge(text, color) {
  chrome.action.setBadgeText({ text });
  if (color) chrome.action.setBadgeBackgroundColor({ color });
}

// Errors are returned as codes; the popup translates them.
function errCode(e) {
  const m = String(e && e.message ? e.message : e);
  if (/^ERR_/.test(m)) return m;
  if (/Another debugger/i.test(m)) return 'ERR_DEVTOOLS';
  if (/Cannot access|chrome:\/\//i.test(m)) return 'ERR_INTERNAL_PAGE';
  return m;
}

async function start({ tabId, text, opts }) {
  if (job) throw new Error('ERR_BUSY');
  const { keys, skipped } = toKeystrokes(text, opts.layout);
  if (!keys.length) throw new Error('ERR_EMPTY');
  await chrome.debugger.attach({ tabId }, '1.3');
  job = { tabId, total: keys.length, done: 0, stop: false, skipped };
  try {
    // Make the page believe it has focus even while the popup is open.
    await cdp(tabId, 'Emulation.setFocusEmulationEnabled', { enabled: true });
  } catch {}
  run(keys, opts); // intentionally not awaited
}

async function run(keys, opts) {
  const j = job;
  const { tabId } = j;
  const down = { shift: false, altgr: false };
  const mods = () => (down.shift ? 8 : 0) | (down.altgr ? 1 : 0);
  const MOD_KEYS = {
    shift: { key: 'Shift', code: 'ShiftLeft', vk: 16 },
    altgr: { key: 'AltGraph', code: 'AltRight', vk: 18 },
  };
  const key = (type, k, m, extra = {}) =>
    cdp(tabId, 'Input.dispatchKeyEvent', {
      type,
      key: k.key,
      code: k.code,
      windowsVirtualKeyCode: k.vk,
      nativeVirtualKeyCode: k.vk,
      modifiers: m,
      ...extra,
    });
  const setMod = async (name, want) => {
    if (down[name] === want) return;
    down[name] = want;
    if (want) await key('rawKeyDown', MOD_KEYS[name], mods());
    else await key('keyUp', MOD_KEYS[name], mods());
  };

  try {
    for (let s = opts.startDelay; s > 0 && !j.stop; s--) {
      badge(String(s), '#f59e0b');
      await sleep(1000);
    }
    badge('...', '#2563eb');
    for (const k of keys) {
      if (j.stop) break;
      // release modifiers first, then press what this key needs
      if (!k.shift) await setMod('shift', false);
      if (!k.altgr) await setMod('altgr', false);
      if (k.altgr) await setMod('altgr', true);
      if (k.shift) await setMod('shift', true);
      await key('keyDown', k, mods(), { text: k.text ?? k.key, unmodifiedText: k.base });
      await key('keyUp', k, mods());
      j.done++;
      await sleep(k.code === 'Enter' ? opts.lineDelay : opts.keyDelay);
    }
  } catch (e) {
    j.error = errCode(e);
  } finally {
    job = null;
    try {
      await setMod('shift', false);
      await setMod('altgr', false);
    } catch {}
    try {
      await cdp(tabId, 'Emulation.setFocusEmulationEnabled', { enabled: false });
    } catch {}
    try {
      await chrome.debugger.detach({ tabId });
    } catch {}
    const ok = !j.error && !j.stop;
    await chrome.storage.session.set({
      last: {
        ok,
        stopped: j.stop,
        error: j.error || null,
        done: j.done,
        total: j.total,
        skipped: j.skipped,
        at: Date.now(),
      },
    });
    badge(ok ? '✓' : '!', ok ? '#16a34a' : '#dc2626');
    setTimeout(() => badge(''), 4000);
  }
}

// Keyboard shortcut opens the side panel (a shortcut counts as a user gesture).
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'open-side-panel' && tab) chrome.sidePanel.open({ windowId: tab.windowId });
});

// If the user presses "Cancel" on Chrome's debugging infobar, stop typing.
chrome.debugger.onDetach.addListener((source) => {
  if (job && source.tabId === job.tabId) job.stop = true;
});

chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  if (msg.cmd === 'type') {
    start(msg).then(
      () => respond({ ok: true }),
      (e) => respond({ ok: false, error: errCode(e) })
    );
    return true;
  }
  if (msg.cmd === 'stop') {
    if (job) job.stop = true;
    respond({ ok: true });
    return false;
  }
  if (msg.cmd === 'status') {
    chrome.storage.session.get('last').then(({ last }) =>
      respond({
        running: !!job,
        done: job ? job.done : 0,
        total: job ? job.total : 0,
        last: last || null,
      })
    );
    return true;
  }
  return false;
});
