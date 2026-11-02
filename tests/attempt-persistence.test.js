const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const data = new Map();
function load() {
  const elements = new Map();
  const downloads = [];
  const element = () => ({ value: '', style: {}, classList: { toggle() {}, add() {}, remove() {} }, addEventListener() {} });
  const context = vm.createContext({
    window: { scrollTo() {}, addEventListener() {}, innerWidth: 1200, innerHeight: 800 },
    document: {
      querySelector(selector) { if (!elements.has(selector)) elements.set(selector, element()); return elements.get(selector); },
      addEventListener() {}, body: { appendChild(a) { downloads.push(a); } },
      createElement() { return { click() {}, remove() {} }; }
    },
    localStorage: { getItem(k) { return data.get(k) ?? null; }, setItem(k, v) { data.set(k, String(v)); }, removeItem(k) { data.delete(k); } },
    performance: { now() { return 1000; } }, setTimeout() {}, clearTimeout() {}, setInterval() {}, clearInterval() {}
  });
  scripts.forEach(s => vm.runInContext(s, context));
  return { context, elements, downloads, run: s => vm.runInContext(s, context) };
}
let app = load();
app.run("state.name = '李涵钰'; enterTestPage()");
assert.equal(app.elements.get('#attemptLabel').textContent, '第 1 次测试');
app = load();
assert.equal(app.elements.get('#attemptLabel').textContent, '第 1 次测试');
app.run("saveRecord(computeResult('今天', 5, false))");
assert.equal(data.get('qgjx_completed_attempts_v1_李涵钰'), '1');
app = load();
app.run("state.name = '李涵钰'; enterTestPage()");
assert.equal(app.elements.get('#attemptLabel').textContent, '第 2 次测试');
app = load();
assert.equal(app.elements.get('#attemptLabel').textContent, '第 2 次测试');
app.run("state.name = '丁鹏'; enterTestPage()");
assert.equal(app.elements.get('#attemptLabel').textContent, '第 1 次测试');
data.set('qgjx_typing_records_v1', JSON.stringify([{ name: '张刚', attemptNumber: 8 }]));
assert.equal(app.run("readCompletedAttempts('张刚')"), 8);
data.set('qgjx_typing_records_v1', '[]');
assert.equal(app.run("readCompletedAttempts('李涵钰')"), 1);
app.run("state.name = '李涵钰'; enterTestPage(); lastResult = computeResult('今天', 5, false)");
app.elements.set('#resultCanvas', { toDataURL() { return 'data:image/png;base64,test'; } });
app.run('downloadResult()');
assert.match(app.downloads[0].download, /李涵钰_第2次测试_/);
console.log('PASS: attempt persistence, refresh, per-person counters, history migration, download filename');
