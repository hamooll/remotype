import { toKeystrokes } from './keymap.js';

const TICK = 'remotype-tick';
const PANEL_STALE_MS = 60000; // panel heartbeat older than this means the panel is closed

let job = null; // running typing job: { tabId, total, done, stop, session, endAfter }
let session = null; // side-panel session: { tabId, lastActive, panelSeen, idleMs }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = (tabId, method, params) => chrome.debugger.sendCommand({ tabId }, method, params);

function badge(text, color) {
  chrome.action.setBadgeText({ text });
  if (color) chrome.action.setBadgeBackgroundColor({ color });
}

// Errors are returned as codes; the popup/panel translates them.
function errCode(e) {
  const m = String(e && e.message ? e.message : e);
  if (/^ERR_/.test(m)) return m;
  if (/Another debugger/i.test(m)) return 'ERR_DEVTOOLS';
  if (/Cannot access|chrome:\/\//i.test(m)) return 'ERR_INTERNAL_PAGE';
  if (/not attached|Detached while|No tab with given id|Target closed/i.test(m)) return 'ERR_DETACHED';
  return m;
}

// ---- session state (kept in storage.session so it survives service-worker restarts) ----

async function loadSession() {
  if (!session) {
    const stored = await chrome.storage.session.get('session');
    session = stored.session || null;
  }
  return session;
}
const saveSession = () => chrome.storage.session.set({ session });

async function forgetSession() {
  session = null;
  await chrome.storage.session.remove('session');
  chrome.alarms.clear(TICK);
  if (!job) badge('');
}

/** Detach the debugger and forget the session. */
async function endSession() {
  await loadSession();
  if (!session) return;
  const { tabId } = session;
  await forgetSession();
  try {
    await chrome.debugger.detach({ tabId });
  } catch {}
}

// ---- typing ----

async function start({ tabId, text, opts }) {
  if (job) throw new Error('ERR_BUSY');
  const { keys, skipped } = toKeystrokes(text, opts.layout);
  if (!keys.length) throw new Error('ERR_EMPTY');

  await loadSession();
  const wantSession = !!opts.session;
  // A popup job, or a different tab, needs a clean slate: one debugger per extension per tab.
  if (session && (!wantSession || session.tabId !== tabId)) await endSession();

  if (session) {
    // Reuse the attached debugger, but make sure it is still there.
    try {
      await cdp(tabId, 'Emulation.setFocusEmulationEnabled', { enabled: true });
    } catch {
      await forgetSession();
    }
  }
  if (!session) {
    await chrome.debugger.attach({ tabId }, '1.3');
    try {
      // Make the page believe it has focus even while the popup/panel is focused.
      await cdp(tabId, 'Emulation.setFocusEmulationEnabled', { enabled: true });
    } catch {}
    if (wantSession) {
      const now = Date.now();
      session = { tabId, lastActive: now, panelSeen: now, idleMs: 0 };
      chrome.alarms.create(TICK, { periodInMinutes: 1 });
    }
  }
  if (session) {
    session.lastActive = Date.now();
    session.idleMs = (Number(opts.idleMinutes) > 0 ? Number(opts.idleMinutes) : 15) * 60000;
    await saveSession();
    badge('ON', '#2563eb');
  }

  job = { tabId, total: keys.length, done: 0, stop: false, skipped, session: wantSession };
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

    if (!j.session) {
      try {
        await chrome.debugger.detach({ tabId });
      } catch {}
    } else if (j.error === 'ERR_DETACHED') {
      await forgetSession();
    } else if (j.endAfter) {
      await endSession();
    } else if (session) {
      session.lastActive = Date.now();
      await saveSession();
    }

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
    setTimeout(() => {
      if (session) badge('ON', '#2563eb');
      else badge('');
    }, 4000);
  }
}

// ---- events ----

// Keyboard shortcut opens the side panel (a shortcut counts as a user gesture).
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'open-side-panel' && tab) chrome.sidePanel.open({ windowId: tab.windowId });
});

// Chrome's "Cancel" on the debugging bar, tab closed, or any other detach.
chrome.debugger.onDetach.addListener(async (source) => {
  if (job && source.tabId === job.tabId) job.stop = true;
  await loadSession();
  if (session && source.tabId === session.tabId) await forgetSession();
});

// The side panel keeps a port open; closing the panel ends the session.
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'panel') return;
  port.onDisconnect.addListener(async () => {
    await loadSession();
    if (job && job.session) job.endAfter = true;
    else await endSession();
  });
});

// Backstop: end the session when it has been idle too long or the panel stopped sending heartbeats.
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== TICK) return;
  await loadSession();
  if (!session) {
    chrome.alarms.clear(TICK);
    return;
  }
  if (job) return;
  const now = Date.now();
  if (now - session.panelSeen > PANEL_STALE_MS || now - session.lastActive > session.idleMs) {
    await endSession();
  }
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
  if (msg.cmd === 'disconnect') {
    (async () => {
      if (job) job.stop = true;
      await endSession();
      respond({ ok: true });
    })();
    return true;
  }
  if (msg.cmd === 'ping') {
    (async () => {
      await loadSession();
      if (session) {
        session.panelSeen = Date.now();
        await saveSession();
      }
      respond({ ok: true });
    })();
    return true;
  }
  if (msg.cmd === 'status') {
    (async () => {
      await loadSession();
      const { last } = await chrome.storage.session.get('last');
      respond({
        running: !!job,
        done: job ? job.done : 0,
        total: job ? job.total : 0,
        session: !!session,
        last: last || null,
      });
    })();
    return true;
  }
  return false;
});
