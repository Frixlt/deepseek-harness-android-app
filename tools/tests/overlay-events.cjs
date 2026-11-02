// Exercise the plugin's real event bridge with framed model chunks and a virtual clock.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.resolve(__dirname, '../../plugins/dsh-tool-android/lib/index.js'), 'utf8');
const start = source.indexOf('  {\n    let busy = false;');
const end = source.indexOf('  // ===== App 层工具', start);
assert(start >= 0 && end > start, 'Event bridge not found');
const handlers = new Map(), posts = [], timers = new Map();
let now = 10000, id = 0;
const context = {
    ctx: {on: (name, fn) => handlers.set(name, fn)},
    appPost: (_, data) => posts.push(data),
    Date: {now: () => now},
    setTimeout: (fn, ms) => { const token = {id: ++id, unref() {}}; timers.set(token, {fn, at: now + ms}); return token; },
    clearTimeout: token => timers.delete(token)
};
vm.runInNewContext(source.slice(start, end), context);
function emit(name, value) { assert(handlers.has(name)); handlers.get(name)(value); }
function advance(ms) {
    now += ms;
    for (const [token, timer] of [...timers]) if (timer.at <= now) { timers.delete(token); timer.fn(); }
}
emit('agent/inbox/claimed');
assert.equal(posts.at(-1).state, 'thinking');
advance(100);
emit('agent/assistant-stream', {frame: {type: 'chunk', chunk: {type: 'text-delta', text: 'Hello'}}});
assert.equal(posts.length, 1, 'Token event should be throttled');
advance(1200);
assert.equal(posts.at(-1).state, 'responding', 'Latest throttled state must be delivered');
advance(1300);
emit('agent/assistant-stream', {frame: {type: 'chunk', chunk: {type: 'block-start', content: {type: 'tool-call', name: 'read_file'}}}});
assert.equal(posts.at(-1).state, 'tool');
assert.equal(posts.at(-1).tool, 'read_file');
advance(50);
emit('agent/assistant-stream', {frame: {type: 'chunk', chunk: {type: 'reasoning-delta', text: 'Think'}}});
emit('agent/error');
assert.equal(posts.at(-1).state, 'error');
const afterError = posts.length;
advance(2000);
assert.equal(posts.length, afterError, 'Stale queued state must not replace an error');
emit('agent/status', {status: 'waiting-for-input'});
assert.equal(posts.at(-1).state, 'ask');
emit('agent/status', {status: 'idle'});
assert.equal(posts.at(-1).state, 'ask', 'Waiting for input is not task completion');
emit('agent/status', {status: 'paused'});
assert.equal(posts.at(-1).state, 'paused');
console.log('Overlay events: PASS');
