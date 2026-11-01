const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadCore() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const match = html.match(/<script id="core-logic">([\s\S]*?)<\/script>/);
  assert.ok(match, 'index.html should contain the core-logic script');
  const context = { window: {} };
  vm.runInNewContext(match[1], context, { filename: 'core-logic.js' });
  return context.window.TypingTestCore;
}

const Core = loadCore();
const target = '今天阳光很好，我来到学校参加打字测试。请认真输入每个字，保持耐心，顺利完成任务。';

function plain(value) {
  return { ...value };
}

function testWhitelist() {
  for (const name of [
    '胡晓锋', '丁鹏', '张刚',
    '林佳林', '林燕漩', '李天鹏', '罗岸榕', '杨宇涛', '莫文希',
    '陈钦宇', '洪佳蕾', '杜宇灿', '郭茹莹', '林柏安', '罗紫涵',
    '李荣盛', '智凯', '黄则瑄', '张荣馨', '李涵钰', '张徐帆'
  ]) {
    assert.deepEqual(plain(Core.validateAllowedName(name)), { ok: true, value: name, message: '' });
  }
  assert.deepEqual(plain(Core.validateAllowedName('  胡晓锋  ')), { ok: true, value: '胡晓锋', message: '' });
  assert.deepEqual(plain(Core.validateAllowedName('李雷')), {
    ok: false, value: '李雷', message: '该姓名不在本次测试名单中'
  });
  assert.equal(Core.validateAllowedName('').message, '请输入姓名');
}

function testAttemptCounting() {
  const records = JSON.stringify([
    { name: '丁鹏', score: 88 },
    { name: '胡晓锋', score: 92 },
    { name: '张刚', score: 90 },
    { name: '胡晓锋', score: 98 }
  ]);
  assert.equal(Core.countStoredAttempts(records, '胡晓锋'), 2);
  assert.equal(Core.countStoredAttempts(records, '丁鹏'), 1);
  assert.equal(Core.countStoredAttempts('{broken json', '胡晓锋'), 0);
  assert.equal(Core.countStoredAttempts('{}', '胡晓锋'), 0);
  assert.equal(Core.countStoredAttempts('', '胡晓锋'), 0);
}

function testPersistentAttemptMarker() {
  assert.equal(Core.getPreviousAttempts('1', '[]', '胡晓锋'), 1);
  assert.equal(Core.getPreviousAttempts(null, '[{"name":"胡晓锋"}]', '胡晓锋'), 1);
  assert.equal(Core.getPreviousAttempts('invalid', '[]', '胡晓锋'), 0);
}

function expectedHuResult(score, abnormal) {
  if (score === 92) {
    return {
      name: '胡晓锋', seconds: '34.0', speedPerSec: '1.2', speedPerMin: 71,
      accuracy: '100.0', errorRate: '0.0', errors: 0, correct: 40,
      typed: 40, total: 40, score: 92, abnormal
    };
  }
  return {
    name: '胡晓锋', seconds: '31.0', speedPerSec: '1.3', speedPerMin: 77,
    accuracy: '100.0', errorRate: '0.0', errors: 0, correct: 40,
    typed: 40, total: 40, score: 98, abnormal
  };
}

function huResult(previousAttempts, abnormal) {
  return plain(Core.buildResult({
    name: '胡晓锋', target, typed: '任意输入', seconds: 99,
    previousAttempts, abnormal
  }));
}

function testHuResultsByAttempt() {
  assert.deepEqual(huResult(0, false), expectedHuResult(92, false));
  assert.deepEqual(huResult(1, false), expectedHuResult(98, false));
  assert.deepEqual(huResult(2, false), expectedHuResult(98, false));
  assert.deepEqual(huResult(0, true), expectedHuResult(92, true));
  assert.deepEqual(huResult(1, true), expectedHuResult(98, true));
}

function testOtherNamesUseRealResults() {
  const ding = plain(Core.buildResult({
    name: '丁鹏', target: '甲乙', typed: '甲乙', seconds: 32,
    previousAttempts: 99, abnormal: false
  }));
  const zhang = plain(Core.buildResult({
    name: '张刚', target: '甲乙', typed: '甲', seconds: 40,
    previousAttempts: 99, abnormal: false
  }));
  assert.deepEqual(ding, {
    name: '丁鹏', seconds: '32.0', speedPerSec: '0.1', speedPerMin: 4,
    accuracy: '100.0', errorRate: '0.0', errors: 0, correct: 2,
    typed: 2, total: 2, score: 96, abnormal: false
  });
  assert.deepEqual(zhang, {
    name: '张刚', seconds: '40.0', speedPerSec: '0.0', speedPerMin: 2,
    accuracy: '50.0', errorRate: '50.0', errors: 1, correct: 1,
    typed: 1, total: 2, score: 79, abnormal: false
  });
}

testWhitelist();
testAttemptCounting();
testPersistentAttemptMarker();
testHuResultsByAttempt();
testOtherNamesUseRealResults();
console.log('PASS: whitelist, attempt counting, and result policy');
