// Tests the session / attach / detach logic of background.js against a mocked `chrome` API.
// This does not replace trying the extension in a real browser.

const attached = new Set();
const log = [];
const store = {};
let onMessage, onDetach, onAlarm, onConnect;

globalThis.chrome = {
  debugger: {
    attach: async ({ tabId }) => {
      if (attached.has(tabId)) throw new Error('Another debugger is already attached to the tab');
      attached.add(tabId);
      log.push(`attach:${tabId}`);
    },
    detach: async ({ tabId }) => {
      if (!attached.has(tabId)) throw new Error('Debugger is not attached to the tab with id: ' + tabId);
      attached.delete(tabId);
      log.push(`detach:${tabId}`);
    },
    sendCommand: async ({ tabId }, method) => {
      if (!attached.has(tabId)) throw new Error('Debugger is not attached to the tab with id: ' + tabId);
      log.push(`cmd:${method}`);
    },
    onDetach: { addListener: (f) => (onDetach = f) },
  },
  storage: {
    session: {
      get: async (k) => (typeof k === 'string' ? { [k]: structuredClone(store[k]) } : {}),
      set: async (o) => Object.assign(store, structuredClone(o)),
      remove: async (k) => delete store[k],
    },
  },
  action: { setBadgeText() {}, setBadgeBackgroundColor() {} },
  runtime: {
    onMessage: { addListener: (f) => (onMessage = f) },
    onConnect: { addListener: (f) => (onConnect = f) },
  },
  commands: { onCommand: { addListener() {} } },
  sidePanel: { open() {} },
  alarms: { create() {}, clear() {}, onAlarm: { addListener: (f) => (onAlarm = f) } },
};

await import('./background.js');

let failed = 0;
const check = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg);
    failed++;
  }
};
const send = (msg) => new Promise((res) => onMessage(msg, {}, res));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const status = () => send({ cmd: 'status' });
async function done() {
  for (let i = 0; i < 200; i++) {
    const s = await status();
    if (!s.running) return s;
    await sleep(5);
  }
  throw new Error('job did not finish');
}
const base = { keyDelay: 0, lineDelay: 0, startDelay: 0, layout: 'us' };
const type = (tabId, opts = {}, text = 'ab') =>
  send({ cmd: 'type', tabId, text, opts: { ...base, ...opts } });
const count = (s) => log.filter((x) => x === s).length;
const reset = () => (log.length = 0);

// 1. session mode: attaches once and stays attached
let r = await type(1, { session: true });
check(r.ok, '1: type should start');
let s = await done();
check(s.session === true, '1: session should be active');
check(attached.has(1), '1: debugger should stay attached after the job');
check(s.last && s.last.ok && s.last.done === 2, '1: job result');

// 2. second job on the same tab reuses the attachment
reset();
r = await type(1, { session: true });
await done();
check(r.ok && count('attach:1') === 0, '2: must not attach again');
check(attached.has(1), '2: still attached');

// 3. ping keeps the session; disconnect detaches
await send({ cmd: 'ping' });
await send({ cmd: 'disconnect' });
s = await status();
check(!s.session && !attached.has(1), '3: disconnect detaches and clears the session');

// 4. popup mode attaches per job and detaches afterwards
reset();
r = await type(2, { session: false });
await done();
check(r.ok && count('attach:2') === 1 && count('detach:2') === 1, '4: popup job attaches and detaches');
check(!attached.has(2), '4: nothing left attached');

// 5. a popup job while a session is open ends the session first
await type(3, { session: true });
await done();
reset();
r = await type(3, { session: false });
await done();
check(r.ok, '5: popup job after a session must work');
check(!attached.has(3), '5: nothing left attached');
check((await status()).session === false, '5: session cleared');

// 6. session on another tab moves the attachment
await type(4, { session: true });
await done();
r = await type(5, { session: true });
await done();
check(r.ok && !attached.has(4) && attached.has(5), '6: old tab detached, new tab attached');
await send({ cmd: 'disconnect' });

// 7. idle timeout ends the session
await type(6, { session: true, idleMinutes: 0.0001 });
await done();
await sleep(30);
await onAlarm({ name: 'remotype-tick' });
check(!attached.has(6) && (await status()).session === false, '7: idle session is ended by the alarm');

// 8. the user pressing Cancel on Chrome's bar ends the session; next job re-attaches
await type(7, { session: true });
await done();
attached.delete(7); // Chrome detached it
await onDetach({ tabId: 7 });
check((await status()).session === false, '8: onDetach clears the session');
r = await type(7, { session: true });
await done();
check(r.ok && attached.has(7), '8: a new job attaches again');
await send({ cmd: 'disconnect' });

// 9. session record exists but debugger is gone (service worker restart): recovers
await type(8, { session: true });
await done();
attached.delete(8); // lost without onDetach
r = await type(8, { session: true });
const s9 = await done();
check(r.ok && attached.has(8) && s9.last.ok, '9: recovers when the debugger was lost');
await send({ cmd: 'disconnect' });

// 10. closing the panel (port disconnect) ends the session
await type(9, { session: true });
await done();
let portClosed;
onConnect({ name: 'panel', onDisconnect: { addListener: (f) => (portClosed = f) } });
await portClosed();
check(!attached.has(9) && (await status()).session === false, '10: panel close ends the session');

// 11. DevTools already attached: clear error code
attached.add(10); // someone else
r = await type(10, { session: true });
check(r.ok === false && r.error === 'ERR_DEVTOOLS', '11: DevTools conflict is reported as ERR_DEVTOOLS');
attached.delete(10);

// 12. empty / unsupported text
r = await type(11, { session: true }, 'é');
check(r.ok === false && r.error === 'ERR_EMPTY', '12: nothing typable is reported');

console.log(failed ? `${failed} check(s) failed` : 'all background checks passed');
process.exit(failed ? 1 : 0);
