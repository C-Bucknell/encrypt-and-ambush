const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('random shift helper exists and produces a valid Caesar shift', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const match = html.match(/function\s+generateRandomShift\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\}/);
  assert.ok(match, 'generateRandomShift should exist in index.html');

  const context = { Math, console };
  vm.createContext(context);
  vm.runInContext(match[0], context);
  const value = context.generateRandomShift();
  assert.ok(Number.isInteger(value), 'shift should be an integer');
  assert.ok(value >= 1 && value <= 25, 'shift should be between 1 and 25');
});
