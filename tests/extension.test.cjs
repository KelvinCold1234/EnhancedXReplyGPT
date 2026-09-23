const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

function worker(fetch = async () => ({ ok: true, json: async () => ({ output: [] }) })) {
  const storage = { 'open-ai-key': 'test-key' };
  let listener;
  const context = vm.createContext({ URL, AbortSignal, console, fetch, chrome: {
    runtime: { id: 'test-extension', onMessage: { addListener(fn) { listener = fn; } }, onInstalled: { addListener() {} } },
    commands: { onCommand: { addListener() {} } },
    storage: { local: {
      async get(key) { await new Promise(setImmediate); return structuredClone({ [key]: storage[key] }); },
      async set(values) { await new Promise(setImmediate); Object.assign(storage, structuredClone(values)); }
    } }
  } });
  vm.runInContext(read('src/service-worker.js'), context);
  return { storage, send: (message, url = 'https://x.com/home') => new Promise((resolve) => {
    listener(message, { id: 'test-extension', url }, resolve);
  }) };
}

test('all extension JavaScript parses and manifest assets exist', () => {
  for (const name of fs.readdirSync(path.join(root, 'src')).filter((name) => name.endsWith('.js'))) {
    new vm.Script(read(`src/${name}`), { filename: name });
  }
  const manifest = JSON.parse(read('manifest.json'));
  const assets = [manifest.background.service_worker, manifest.action.default_popup,
    manifest.action.default_icon, ...Object.values(manifest.icons),
    ...manifest.content_scripts.flatMap((script) => script.js)];
  for (const asset of assets) assert.ok(fs.existsSync(path.join(root, asset)), asset);
});

test('parallel history saves preserve every reply and merge submitted state', async () => {
  const { storage, send } = worker();
  await Promise.all(Array.from({ length: 30 }, (_, i) => send({ type: 'VICTOR_SAVE_HISTORY', tweetKey: String(i), patch: { replyText: `Reply ${i}` } })));
  assert.equal(Object.keys(storage['victor-reply-history-v1']).length, 30);
  await send({ type: 'VICTOR_SAVE_HISTORY', tweetKey: '2', patch: { replied: true } });
  assert.equal(storage['victor-reply-history-v1']['2'].replyText, 'Reply 2');
  assert.equal(storage['victor-reply-history-v1']['2'].replied, true);
});

test('history queue recovers after an invalid update', async () => {
  const { send } = worker();
  assert.ok((await send({ type: 'VICTOR_SAVE_HISTORY', tweetKey: '__proto__', patch: {} })).error);
  assert.equal((await send({ type: 'VICTOR_SAVE_HISTORY', tweetKey: '123', patch: { replyText: 'OK' } })).data.replyText, 'OK');
});

test('API uses fixed endpoint, stored key and model defaults, and rejects foreign origins', async () => {
  let captured;
  const { send } = worker(async (url, options) => {
    captured = { url, ...options };
    return { ok: true, json: async () => ({ status: 'completed', output: [] }) };
  });
  const message = { type: 'VICTOR_OPENAI_REPLY', model: 'gpt-5.6-luna', instructions: 'Write a reply', input: 'Hello', maxOutputTokens: 120 };
  assert.ok((await send(message, 'https://example.com/home')).error);
  assert.equal(captured, undefined);
  assert.ok((await send(message)).data);
  assert.equal(captured.url, 'https://api.openai.com/v1/responses');
  assert.equal(captured.headers.Authorization, 'Bearer test-key');
  const body = JSON.parse(captured.body);
  assert.equal(body.store, false);
  assert.equal(body.reasoning, undefined);
  assert.equal(body.max_output_tokens, 4096);
});

test('incomplete API output is not offered as a finished reply', async () => {
  const { send } = worker(async () => ({ ok: true, json: async () => ({ status: 'incomplete', output: [] }) }));
  const result = await send({ type: 'VICTOR_OPENAI_REPLY', model: 'gpt-5', instructions: '', input: '' });
  assert.match(result.error, /could not finish/);
});

test('punctuation cleanup handles real Unicode without damaging other characters', () => {
  const source = read('src/content.js');
  const start = source.indexOf('function cleanReply(');
  const end = source.indexOf('\nfunction replyNeedsShortening', start);
  const context = vm.createContext({});
  vm.runInContext(source.slice(start, end), context);
  assert.equal(context.cleanReply('\u201cGood\u2014really good\u201d'), 'Good, really good');
  assert.equal(context.cleanReply('Costs \u20ac5. Great \u2013 keep going.'), 'Costs \u20ac5. Great, keep going.');
  assert.equal(context.cleanReply('Reply: "Nice work!"'), 'Nice work!');
});

test('reply navigation crosses shadow roots and wraps without generating requests', () => {
  let focused;
  const buttons = [0, 1, 2].map((id) => ({ focus() { focused = id; } }));
  const hosts = buttons.map((button) => ({ shadowRoot: { querySelector: () => button } }));
  const document = { querySelectorAll: () => hosts, activeElement: { shadowRoot: { activeElement: buttons[2] } } };
  const context = vm.createContext({ document });
  vm.runInContext(read('src/move-to-next-button.js'), context);
  assert.equal(focused, 0);
  document.activeElement = { shadowRoot: { activeElement: buttons[0] } };
  vm.runInContext(read('src/move-to-previous-button.js'), context);
  assert.equal(focused, 2);
  document.activeElement = {};
  vm.runInContext(read('src/move-to-next-button.js'), context);
  assert.equal(focused, 0);
});
