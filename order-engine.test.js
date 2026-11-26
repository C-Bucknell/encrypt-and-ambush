// Unit tests for the order engine in index.html (MOVE / AMBUSH / DEFEND).
// Run with: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

/** Loads the board constants and the ORDER ENGINE block from index.html into a sandbox. */
function loadEngine() {
  const html = fs.readFileSync('index.html', 'utf8');
  const start = html.indexOf("const COLS = ['A'");
  const end = html.indexOf('/* ---------------- END ORDER ENGINE');
  assert.ok(start !== -1 && end !== -1, 'order engine block should be extractable from index.html');
  // `const` declarations don't attach to the sandbox, so expose what the tests need explicitly.
  const source = html.slice(start, end) + `
    ;this.api = { BASES, BASE_OF, CODE_OF, normalizeOrder, expandOrder, parseOrder, validateOrderText, applyOrder, crackerOptions, resolveOutcome, scoreChanges, teamTotal };`;
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.api;
}

const E = loadEngine();
// Bases: red A1, blue A3, green A5, yellow F1, purple F3, orange F5. Codenames: RUBY, AQUA, LIME, GOLD, PLUM, RUST.
const startGrid = () => ({ A1: 'red', A3: 'blue', A5: 'green', F1: 'yellow' });
const ctx = (colour, extra = {}) => ({ colour, defended: {}, round: 1, ...extra });

test('expandOrder appends the sender codename to a bare DEFEND', () => {
  assert.equal(E.expandOrder('defend', 'red'), 'DEFEND RUBY');
  assert.equal(E.expandOrder('  Defend ', 'blue'), 'DEFEND AQUA');
  assert.equal(E.expandOrder('move a1  a2', 'red'), 'MOVE A1 A2');
});

test('DEFEND and AMBUSH are transmitted at the same length', () => {
  assert.equal(E.expandOrder('DEFEND', 'red').length, 'AMBUSH AQUA'.length);
});

test('parseOrder recognises each order type', () => {
  assert.deepEqual({ ...E.parseOrder('MOVE A1 A2') }, { type: 'MOVE', from: 'A1', to: 'A2' });
  assert.deepEqual({ ...E.parseOrder('AMBUSH AQUA') }, { type: 'AMBUSH', target: 'blue' });
  assert.deepEqual({ ...E.parseOrder('DEFEND RUBY') }, { type: 'DEFEND', team: 'red' });
  assert.equal(E.parseOrder('AMBUSH BLUE'), null);
  assert.equal(E.parseOrder('STEAL AQUA'), null);
});

test('validateOrderText gives typing-time feedback', () => {
  assert.equal(E.validateOrderText('', 'red').valid, null);
  assert.equal(E.validateOrderText('MOVE A1 A2', 'red').valid, true);
  assert.equal(E.validateOrderText('MOVE A1 A1', 'red').valid, false);
  assert.equal(E.validateOrderText('AMBUSH AQUA', 'red').valid, true);
  assert.equal(E.validateOrderText('AMBUSH RUBY', 'red').valid, false, 'cannot ambush yourself');
  assert.equal(E.validateOrderText('DEFEND', 'red').valid, true);
  assert.match(E.validateOrderText('DEFEND', 'red').message, /DEFEND RUBY/);
  assert.equal(E.validateOrderText('DEFEND AQUA', 'red').valid, false, 'cannot DEFEND another team');
  assert.equal(E.validateOrderText('ATTACK AQUA', 'red').valid, false);
});

test('MOVE claims an adjacent empty square only', () => {
  const ok = E.applyOrder(startGrid(), 'MOVE A1 A2', ctx('red'));
  assert.equal(ok.valid, true);
  assert.equal(ok.grid.A2, 'red');
  assert.equal(E.applyOrder(startGrid(), 'MOVE A1 B2', ctx('red')).valid, false, 'diagonal');
  assert.equal(E.applyOrder(startGrid(), 'MOVE A3 A2', ctx('red')).valid, false, 'from square not owned');
  const g = { ...startGrid(), A2: 'blue' };
  assert.equal(E.applyOrder(g, 'MOVE A1 A2', ctx('red')).valid, false, 'enemy-held square');
});

test('a standing AMBUSH captures the target base for the attacker', () => {
  const r = E.applyOrder(startGrid(), 'AMBUSH AQUA', ctx('red'));
  assert.equal(r.valid, true);
  assert.equal(r.grid.A3, 'red');
});

test('AMBUSH takes the base from whoever holds it now', () => {
  const g = { ...startGrid(), A3: 'green' }; // green captured blue's base earlier
  const r = E.applyOrder(g, 'AMBUSH AQUA', ctx('red'));
  assert.equal(r.valid, true);
  assert.equal(r.grid.A3, 'red');
});

test('AMBUSH fails against a base defended this round', () => {
  const r = E.applyOrder(startGrid(), 'AMBUSH AQUA', ctx('red', { defended: { blue: 1 }, round: 1 }));
  assert.equal(r.valid, false);
  assert.equal(r.grid.A3, 'blue');
  // A defence from an earlier round no longer protects.
  const later = E.applyOrder(startGrid(), 'AMBUSH AQUA', ctx('red', { defended: { blue: 1 }, round: 2 }));
  assert.equal(later.valid, true);
});

test('DEFEND gives a lost base back and flags the defence', () => {
  const g = { ...startGrid(), A3: 'red' }; // red took blue's base in an earlier round
  const r = E.applyOrder(g, 'DEFEND AQUA', ctx('blue'));
  assert.equal(r.valid, true);
  assert.equal(r.grid.A3, 'blue');
  assert.equal(r.defended, 'blue');
});

test('applyOrder never mutates the grid it is given', () => {
  const g = startGrid();
  E.applyOrder(g, 'AMBUSH AQUA', ctx('red'));
  assert.deepEqual({ ...g }, startGrid());
});

// ---------------- Cracker's choice ----------------
const ALL = ['red', 'blue', 'green', 'yellow'];

test('crackerOptions: CHANGE and targets only for an AMBUSH', () => {
  const move = E.crackerOptions('MOVE A1 A2', 'blue', ALL);
  assert.deepEqual([...move.actions], ['block', 'steal']);
  assert.equal(move.targets.length, 0);
  const amb = E.crackerOptions('AMBUSH LIME', 'blue', ALL); // red's ambush on green, cracked by blue
  assert.deepEqual([...amb.actions], ['block', 'steal', 'change']);
  assert.deepEqual([...amb.targets], ['red', 'yellow'], 'never the cracker or the original target');
});

test('resolveOutcome: BLOCK leaves the board alone', () => {
  const r = E.resolveOutcome(startGrid(), 'AMBUSH AQUA', 'block', ctx('red', { crackerColour: 'green' }));
  assert.deepEqual({ ...r.grid }, startGrid());
});

test('resolveOutcome: STEAL still lets the sender\'s order go ahead', () => {
  const r = E.resolveOutcome(startGrid(), 'AMBUSH AQUA', 'steal', ctx('red', { crackerColour: 'green' }));
  assert.equal(r.valid, true);
  assert.equal(r.grid.A3, 'red');
});

test('AMBUSH on a codename no team is using is rejected', () => {
  assert.equal(E.validateOrderText('AMBUSH PLUM', 'red', ['red', 'blue']).valid, false);
  assert.equal(E.validateOrderText('AMBUSH AQUA', 'red', ['red', 'blue']).valid, true);
  const r = E.applyOrder(startGrid(), 'AMBUSH PLUM', ctx('red', { joined: ['red', 'blue'] }));
  assert.equal(r.valid, false);
  assert.equal(r.grid.F3, undefined, 'vacant base stays empty');
});

test('resolveOutcome: CHANGE captures the new target base for the cracker', () => {
  // red ambushed blue; green cracked it and redirected it at yellow
  const r = E.resolveOutcome(startGrid(), 'AMBUSH AQUA', 'change', ctx('red', { crackerColour: 'green', changeTarget: 'yellow' }));
  assert.equal(r.valid, true);
  assert.equal(r.grid.F1, 'green');
  assert.equal(r.grid.A3, 'blue', 'original target untouched');
});

test('resolveOutcome: CHANGE fails against a defended base', () => {
  const r = E.resolveOutcome(startGrid(), 'AMBUSH AQUA', 'change',
    ctx('red', { crackerColour: 'green', changeTarget: 'yellow', defended: { yellow: 1 }, round: 1 }));
  assert.equal(r.valid, false);
  assert.equal(r.grid.F1, 'yellow');
});

test('scoreChanges: +1 interception always, STEAL moves one more point', () => {
  assert.deepEqual({ ...E.scoreChanges('block', true) }, { interception: 1, stolen: 0, lost: 0 });
  assert.deepEqual({ ...E.scoreChanges('steal', true) }, { interception: 1, stolen: 1, lost: 1 });
  assert.deepEqual({ ...E.scoreChanges('change', true) }, { interception: 1, stolen: 0, lost: 0 });
  assert.deepEqual({ ...E.scoreChanges('stand', true) }, { interception: 0, stolen: 0, lost: 0 });
  assert.deepEqual({ ...E.scoreChanges('steal', false) }, { interception: 0, stolen: 0, lost: 0 });
});

test('teamTotal: squares + interceptions + stolen - lost', () => {
  const grid = { A1: 'red', A2: 'red', A3: 'blue' };
  assert.equal(E.teamTotal({ colour: 'red', score: 2, stolen: 1, lost: 0 }, grid), 5);
  assert.equal(E.teamTotal({ colour: 'blue', score: 0, lost: 1 }, grid), 0);
});
