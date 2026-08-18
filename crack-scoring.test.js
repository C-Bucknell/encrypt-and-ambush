const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('chooseCrackingWinner picks earliest correct crack attempt', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const start = html.indexOf('function chooseCrackingWinner');
  assert.notEqual(start, -1, 'chooseCrackingWinner should exist in index.html');

  const end = html.indexOf('/** Interval callback', start);
  assert.notEqual(end, -1, 'chooseCrackingWinner function should be extractable');

  const source = html.slice(start, end);
  const context = { Math, console };
  vm.createContext(context);
  vm.runInContext(source, context);

  const attempts = {
    teamA: { correct: true, at: 200 },
    teamB: { correct: true, at: 100 },
    teamC: { correct: false, at: 50 },
    teamD: { correct: true, at: 150 }
  };

  assert.equal(context.chooseCrackingWinner(attempts), 'teamB');
});
