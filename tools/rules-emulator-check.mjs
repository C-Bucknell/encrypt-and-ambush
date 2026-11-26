// Database rules test — runs against the Firebase Realtime Database emulator, not the live database.
// Setup (once): npm i -D firebase-tools @firebase/rules-unit-testing firebase --legacy-peer-deps
// Run from the repo root:
//   npx firebase emulators:exec --only database --project demo-ea "node --test tools/rules-emulator-check.mjs"
// (Not named *.test.js on purpose, so the plain 'node --test' unit tests don't need the emulator.)
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { ref, get, set, update, remove, runTransaction } from 'firebase/database';

const P = 'RZNJbGMHzNYT6bGfl8LxgJbXnby2';
let env;
const MS = { firebase: { sign_in_provider: 'microsoft.com' } };
const AN = { firebase: { sign_in_provider: 'anonymous' } };
const db = (uid, tok) => (uid ? env.authenticatedContext(uid, tok).database() : env.unauthenticatedContext().database());
const chris = () => db(P, MS), owner2 = () => db('owner2', MS), admin = () => db('admin1', MS);
const teach = () => db('teach1', MS), newT = () => db('newT', MS), deact = () => db('deact1', MS);
const stu = (n) => db('stu' + n, AN);

before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-ea', database: { rules: readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8'), host: '127.0.0.1', port: 9000 } });
});
after(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearDatabase();
  await env.withSecurityRulesDisabled(async c => {
    await set(ref(c.database()), {
      config: { primaryOwner: P },
      roles: { owners: { owner2: { name: 'O2' } }, admins: { admin1: { name: 'A1' } } },
      teachers: { teach1: { status: 'active', name: 'T1' }, deact1: { status: 'deactivated', name: 'D1' }, pend1: { status: 'pending', name: 'P1' } },
      games: {
        GAME: { code: 'GAME', ownerUid: 'teach1', status: 'open', phase: 'lobby', round: 1,
          teams: { stu1: { name: 'S1', colour: 'red', shift: 3, score: 0 } }, colours: { red: 'stu1' } }
      }
    });
  });
});

// ---- reading
test('anyone signed in can read a game; signed-out cannot', async () => {
  await assertSucceeds(get(ref(stu(9), 'games/GAME')));
  await assertFails(get(ref(db(null), 'games/GAME')));
});
test('only owners can list all games', async () => {
  await assertSucceeds(get(ref(chris(), 'games')));
  await assertSucceeds(get(ref(owner2(), 'games')));
  await assertFails(get(ref(admin(), 'games')));
  await assertFails(get(ref(teach(), 'games')));
});
test('teacher list readable by admins only; own record by self', async () => {
  await assertSucceeds(get(ref(admin(), 'teachers')));
  await assertFails(get(ref(teach(), 'teachers')));
  await assertSucceeds(get(ref(teach(), 'teachers/teach1')));
  await assertFails(get(ref(teach(), 'teachers/pend1')));
  await assertSucceeds(get(ref(stu(1), 'config/primaryOwner')));
});

// ---- access requests
test('a new Microsoft user can request access (pending only)', async () => {
  await assertSucceeds(set(ref(newT(), 'teachers/newT'), { status: 'pending', name: 'N' }));
  await assertFails(set(ref(db('newT2', MS), 'teachers/newT2'), { status: 'active', name: 'N' }));
});
test('students (anonymous) cannot request access', async () => {
  await assertFails(set(ref(stu(5), 'teachers/stu5'), { status: 'pending', name: 'x' }));
});
test('a teacher cannot approve themselves or edit others', async () => {
  await assertFails(update(ref(db('pend1', MS), 'teachers/pend1'), { status: 'active' }));
  await assertFails(update(ref(teach(), 'teachers/pend1'), { status: 'active' }));
  await assertFails(update(ref(deact(), 'teachers/deact1'), { status: 'active' }));
});
test('admins and owners can approve, reject, deactivate', async () => {
  await assertSucceeds(update(ref(admin(), 'teachers/pend1'), { status: 'active' }));
  await assertSucceeds(update(ref(owner2(), 'teachers/teach1'), { status: 'deactivated' }));
  await assertSucceeds(update(ref(chris(), 'teachers/deact1'), { status: 'rejected' }));
});

// ---- roles
test('admins can add admins but not remove them', async () => {
  await assertSucceeds(set(ref(admin(), 'roles/admins/teach1'), { name: 'T1' }));
  await assertFails(remove(ref(admin(), 'roles/admins/admin1')));
});
test('admins cannot make owners', async () => {
  await assertFails(set(ref(admin(), 'roles/owners/admin1'), { name: 'A1' }));
});
test('owners can add and remove owners and admins', async () => {
  await assertSucceeds(set(ref(owner2(), 'roles/owners/teach1'), { name: 'T1' }));
  await assertSucceeds(remove(ref(owner2(), 'roles/admins/admin1')));
  await assertSucceeds(remove(ref(chris(), 'roles/owners/owner2')));
});
test('nobody can make or remove the primary owner via roles, or change config', async () => {
  await assertFails(set(ref(owner2(), 'roles/owners/' + P), { name: 'x' }));
  await assertFails(set(ref(chris(), 'config/primaryOwner'), 'owner2'));
  await assertFails(set(ref(owner2(), 'config/primaryOwner'), 'owner2'));
});
test('teachers and students cannot add admins', async () => {
  await assertFails(set(ref(teach(), 'roles/admins/teach1'), { name: 'T1' }));
  await assertFails(set(ref(stu(1), 'roles/admins/stu1'), { name: 'S' }));
});

// ---- games
test('active teachers and admins can create games they own; others cannot', async () => {
  await assertSucceeds(set(ref(teach(), 'games/NEW1'), { ownerUid: 'teach1', status: 'open', phase: 'lobby' }));
  await assertSucceeds(set(ref(admin(), 'games/NEW2'), { ownerUid: 'admin1', status: 'open', phase: 'lobby' }));
  await assertFails(set(ref(deact(), 'games/NEW3'), { ownerUid: 'deact1', status: 'open', phase: 'lobby' }));
  await assertFails(set(ref(db('pend1', MS), 'games/NEW4'), { ownerUid: 'pend1', status: 'open', phase: 'lobby' }));
  await assertFails(set(ref(stu(1), 'games/NEW5'), { ownerUid: 'stu1', status: 'open', phase: 'lobby' }));
  await assertFails(set(ref(teach(), 'games/NEW6'), { ownerUid: 'someoneElse', status: 'open', phase: 'lobby' }));
});
test("a teacher cannot overwrite or delete another teacher's game", async () => {
  await env.withSecurityRulesDisabled(c => set(ref(c.database(), 'teachers/teach2'), { status: 'active', name: 'T2' }));
  await assertFails(update(ref(db('teach2', MS), 'games/GAME'), { phase: 'ended' }));
  await assertFails(remove(ref(db('teach2', MS), 'games/GAME')));
  await assertFails(set(ref(db('teach2', MS), 'games/GAME'), { ownerUid: 'teach2' }));
});
test('the game owner controls it; ownership cannot be transferred', async () => {
  await assertSucceeds(update(ref(teach(), 'games/GAME'), { phase: 'submitting', status: 'locked' }));
  await assertFails(update(ref(teach(), 'games/GAME'), { ownerUid: 'admin1' }));
  await assertSucceeds(remove(ref(teach(), 'games/GAME')));
});
test('site owners can delete any game (clean-up)', async () => {
  await assertSucceeds(remove(ref(owner2(), 'games/GAME')));
});
test('a deactivated teacher loses control of their games', async () => {
  await env.withSecurityRulesDisabled(c => set(ref(c.database(), 'games/G2'), { ownerUid: 'deact1', phase: 'lobby', status: 'open' }));
  await assertFails(update(ref(deact(), 'games/G2'), { phase: 'submitting' }));
});

// ---- students joining
test('a student can claim a free colour and create their own team in an open lobby', async () => {
  const s = stu(2);
  await assertSucceeds(runTransaction(ref(s, 'games/GAME/colours/blue'), cur => (cur === null ? 'stu2' : undefined)));
  await assertSucceeds(set(ref(s, 'games/GAME/teams/stu2'), { name: 'S2', colour: 'blue', shift: 5, score: 0 }));
});
test('a student cannot take a claimed colour or join with a colour they did not claim', async () => {
  await assertFails(set(ref(stu(3), 'games/GAME/colours/red'), 'stu3'));
  await assertFails(set(ref(stu(3), 'games/GAME/teams/stu3'), { name: 'S3', colour: 'green', shift: 5, score: 0 }));
});
test('no joining when locked, closed or started', async () => {
  for (const patch of [{ status: 'locked' }, { status: 'closed' }, { phase: 'submitting' }]) {
    await env.withSecurityRulesDisabled(c => update(ref(c.database(), 'games/GAME'), { status: 'open', phase: 'lobby', ...patch }));
    await assertFails(set(ref(stu(4), 'games/GAME/colours/green'), 'stu4'));
  }
});
test("a student cannot write another team's record or give themselves points", async () => {
  await assertFails(update(ref(stu(9), 'games/GAME/teams/stu1'), { name: 'hacked' }));
  await assertFails(update(ref(stu(1), 'games/GAME/teams/stu1'), { score: 10 }));
  await assertFails(update(ref(stu(1), 'games/GAME/teams/stu1'), { stolen: 3 }));
  await assertFails(update(ref(stu(1), 'games/GAME/teams/stu1'), { colour: 'blue' }));
  await assertFails(remove(ref(stu(1), 'games/GAME/teams/stu1')));
});
test('a student can change name/shift in the lobby, but not the shift once the game starts', async () => {
  await assertSucceeds(update(ref(stu(1), 'games/GAME/teams/stu1'), { name: 'New name', shift: 9, setupSaved: true }));
  await env.withSecurityRulesDisabled(c => update(ref(c.database(), 'games/GAME'), { phase: 'submitting' }));
  await assertFails(update(ref(stu(1), 'games/GAME/teams/stu1'), { shift: 12 }));
});
test('a student cannot change game-level state', async () => {
  await assertFails(update(ref(stu(1), 'games/GAME'), { phase: 'ended' }));
  await assertFails(set(ref(stu(1), 'games/GAME/grid/A2'), 'red'));
  await assertFails(set(ref(stu(1), 'games/GAME/status'), 'open'));
});

// ---- orders, guesses, choices
async function submittingPhase(extra = {}) {
  await env.withSecurityRulesDisabled(c => update(ref(c.database(), 'games/GAME'), { phase: 'submitting', entryClosed: false, ...extra }));
}
test('a team submits one order while entry is open', async () => {
  await submittingPhase();
  await assertSucceeds(set(ref(stu(1), 'games/GAME/submissions/stu1'), { plaintext: 'DEFEND RUBY', ciphertext: 'X' }));
  await assertFails(set(ref(stu(1), 'games/GAME/submissions/stu1'), { plaintext: 'MOVE A1 A2', ciphertext: 'Y' }));
});
test('no order after entry closes, for someone else, or from a non-team', async () => {
  await submittingPhase({ entryClosed: true });
  await assertFails(set(ref(stu(1), 'games/GAME/submissions/stu1'), { plaintext: 'x' }));
  await submittingPhase();
  await assertFails(set(ref(stu(9), 'games/GAME/submissions/stu1'), { plaintext: 'x' }));
  await assertFails(set(ref(stu(9), 'games/GAME/submissions/stu9'), { plaintext: 'x' }));
});
test('crack attempts: one per team, not on own message, not after the timer', async () => {
  await env.withSecurityRulesDisabled(c => update(ref(c.database(), 'games/GAME'), {
    phase: 'revealing', 'teams/stu2': { name: 'S2', colour: 'blue', shift: 4, score: 0 }, currentReveal: { team: 'stu2', timerEnded: false } }));
  await assertSucceeds(set(ref(stu(1), 'games/GAME/crackAttempts/stu1'), { guess: 'X', correct: true, at: 1 }));
  await assertFails(set(ref(stu(1), 'games/GAME/crackAttempts/stu1'), { guess: 'Y', correct: true, at: 2 }));
  await assertFails(set(ref(stu(2), 'games/GAME/crackAttempts/stu2'), { guess: 'X', correct: true, at: 1 }));
  await env.withSecurityRulesDisabled(c => update(ref(c.database(), 'games/GAME/currentReveal'), { timerEnded: true }));
  await env.withSecurityRulesDisabled(c => set(ref(c.database(), 'games/GAME/crackAttempts'), null));
  await assertFails(set(ref(stu(1), 'games/GAME/crackAttempts/stu1'), { guess: 'X', correct: true, at: 3 }));
});
test("only the cracker makes the choice, once, and can't extend the deadline", async () => {
  await env.withSecurityRulesDisabled(c => update(ref(c.database(), 'games/GAME'), {
    phase: 'revealing', currentReveal: { team: 'stu2', timerEnded: true, choice: { by: 'stu1', deadline: 100, actions: ['block', 'steal'] } } }));
  await assertFails(runTransaction(ref(stu(3), 'games/GAME/currentReveal/choice'), c => ({ ...c, action: 'block' })));
  await assertFails(runTransaction(ref(stu(1), 'games/GAME/currentReveal/choice'), c => ({ ...c, deadline: 999, action: 'steal' })));
  await assertFails(runTransaction(ref(stu(1), 'games/GAME/currentReveal/choice'), c => ({ ...c, action: 'win' })));
  await assertSucceeds(runTransaction(ref(stu(1), 'games/GAME/currentReveal/choice'), c => ({ ...c, action: 'steal' })));
  await assertFails(runTransaction(ref(stu(1), 'games/GAME/currentReveal/choice'), c => ({ ...c, action: 'block' })));
  // the game owner (console) can still write it, e.g. automatic BLOCK
  await env.withSecurityRulesDisabled(c => update(ref(c.database(), 'games/GAME/currentReveal/choice'), { action: null }));
  await assertSucceeds(update(ref(teach(), 'games/GAME/currentReveal/choice'), { action: 'block', auto: true }));
});

// ---- my games index
test('teachers manage their own games list only', async () => {
  await assertSucceeds(set(ref(teach(), 'teacherGames/teach1/GAME'), { createdAt: 1 }));
  await assertFails(set(ref(teach(), 'teacherGames/admin1/GAME'), { createdAt: 1 }));
  await assertFails(get(ref(teach(), 'teacherGames/admin1')));
  await assertFails(set(ref(stu(1), 'teacherGames/stu1/X'), { createdAt: 1 }));
  await assertSucceeds(remove(ref(owner2(), 'teacherGames/teach1/GAME')));
});
