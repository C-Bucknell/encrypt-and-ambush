# Encrypt & Ambush — Build Guide

A complete, start-to-finish guide to building and running the live classroom
game: teams join on their own devices, encrypt orders with a Caesar cipher,
and try to crack each other's messages while a teacher console runs the
round, the 30-second countdown, and the scoreboard.

---

## 1. How it's built (so the steps below make sense)

- **One file, `index.html`**, contains the entire app — the teacher console
  and every team's screen are the same file, just showing different views
  depending on which button someone clicks first.
- **Firebase Realtime Database** is the free backend that keeps every
  device in sync — when a team submits an order or the teacher starts a
  round, Firebase pushes that update to everyone else's screen instantly.
- **Firebase Hosting** serves the file at a real URL that students can open
  on their own phones/laptops — free, and part of the same Firebase project
  as the database, so everything lives under one login, one dashboard, one
  project.

Nothing is installed on any student or teacher device — it all runs in the
browser. The only thing installed locally is a small free command-line tool
(covered in Step 4) used once to publish updates to the site.

---

## 2. Resources you'll need

| What | Cost | Needed for |
|---|---|---|
| A Google account (yours, or a colleague's just for setup) | Free | Creating the Firebase project — backend and hosting both live here |
| Node.js (includes `npm`) | Free | Installing the Firebase command-line tool used to publish the site |
| A text editor (Notepad, VS Code, etc.) | Free | Pasting your Firebase config into the file |
| A modern browser on your device and each team's device | Free | Playing the game |

You do **not** need: a server, a paid hosting plan, a Netlify account, a
GitHub account, or an app store account. Everything runs under the one
Firebase project.

---

## 3. Files in this project

| File | Purpose |
|---|---|
| `index.html` | The whole app — teacher console + team screens. This is the file that gets hosted. |
| `firebase.json` | Created during setup (Step 4) — tells Firebase Hosting which folder to publish. |
| `.firebaserc` | Created during setup (Step 4) — records which Firebase project this folder deploys to. |
| `BUILD_GUIDE.md` (this file) | Instructions — not needed by the deployed site, keep it for your own reference. |

---

## 4. Step-by-step build

### Step 1 — Get the file
Save `index.html` into its own folder (e.g. a folder called
`encrypt-and-ambush`) somewhere easy to find — this is the folder you'll
point the Firebase CLI at in Step 4.

### Step 2 — Create your free Firebase backend (~5 min)

**No Google account yourself?** This whole step can be done once by a
colleague — you only need their login for these 5 minutes to create the
project and hand you the six config values below. Nothing about running
the game afterwards touches their account again.

1. Go to https://console.firebase.google.com and sign in with any Google
   account.
2. Click **Add project** → give it any name (e.g. `encrypt-and-ambush`) →
   turn off Google Analytics (not needed) → **Create project**.
3. In the left sidebar: **Build → Realtime Database**.
4. Click **Create Database**. Pick any location close to you. When asked
   about security rules, choose **Start in test mode** (see the security
   note below — this is fine for a classroom game).
5. Click the **gear icon → Project settings** in the left sidebar.
6. Scroll to **Your apps** → click the **`</>` (web)** icon → give it any
   nickname → **Register app**. Firebase now shows a `firebaseConfig`
   object like this:

   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "encrypt-and-ambush.firebaseapp.com",
     databaseURL: "https://encrypt-and-ambush-default-rtdb.firebaseio.com",
     projectId: "encrypt-and-ambush",
     storageBucket: "encrypt-and-ambush.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```

7. Copy that whole object — you'll need it in Step 3.

**Security note:** test mode leaves the database open to anyone with the
URL for 30 days, then Firebase locks it automatically. That's a reasonable
trade-off here — nothing sensitive is stored, just team names, colours,
cipher shifts, and grid squares. If you're still using it after 30 days,
open **Realtime Database → Rules** and extend the window (a minute's job).
If a colleague set the project up, that means asking them (or whoever holds
the Google login) to do that extension.

### Step 3 — Connect the app to your Firebase project

1. Open `index.html` in a text editor.
2. Find this block near the top of the `<script>` section:

   ```js
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT.firebaseapp.com",
     databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
     projectId: "YOUR_PROJECT",
     storageBucket: "YOUR_PROJECT.appspot.com",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

3. Replace it entirely with the object you copied in Step 2.7.
4. Save the file.

The app now talks to your database. This is the only code change needed —
everything else works as-is.

### Step 4 — Deploy with Firebase Hosting

**Worth knowing first:** unlike the Netlify approach from earlier, deploying
with the Firebase CLI means whoever runs `firebase deploy` needs to be
logged into a Google account that has access to the Firebase project — so
if you don't have a Google account yourself, this step (and any future
redeploys) needs to be run by whoever does, each time something changes.
That's the one thing consolidating everything into Firebase costs you
compared to the earlier Netlify setup, where you could deploy independently
of the Google account entirely. If you expect to make frequent tweaks
yourself, it may be worth reconsidering a Google account signed up with
your existing school email (no Gmail required) — see the earlier note on
this. If occasional redeploys via a colleague are fine, carry on below.

This uses a small free command-line tool from Firebase, run once to set up
and again each time you want to publish an update.

1. **Install Node.js** if you don't already have it: https://nodejs.org
   (choose the LTS version). This gives you `npm`, needed for the next step.
2. **Install the Firebase CLI.** Open a terminal (Command Prompt, PowerShell,
   or Terminal) and run:
   ```
   npm install -g firebase-tools
   ```
3. **Log in** — this opens a browser window to sign into the same Google
   account you used to create the Firebase project:
   ```
   firebase login
   ```
4. **Navigate to your project folder** in the terminal (the folder
   containing your edited `index.html`):
   ```
   cd path/to/encrypt-and-ambush
   ```
5. **Initialize Hosting:**
   ```
   firebase init hosting
   ```
   When prompted:
   - "Please select an option" → **Use an existing project** → pick the
     Firebase project you created in Step 2.
   - "What do you want to use as your public directory?" → type `.`
     (a single dot — this means "this folder").
   - "Configure as a single-page app?" → **No**.
   - "Set up automatic builds and deploys with GitHub?" → **No** (unless you
     want that later — not needed to get started).
   - If asked about overwriting `index.html` → **No** (keep your file as-is).
6. **Deploy:**
   ```
   firebase deploy
   ```
   Firebase prints a **Hosting URL** when this finishes, e.g.
   `https://encrypt-and-ambush.web.app` — that's your permanent link.
7. **To publish any future changes** (e.g. if you ever tweak the file),
   just run `firebase deploy` again from the same folder — no need to
   repeat the earlier steps.

### Step 5 — Test it yourself before class

Open the live URL in two or three browser tabs (or your phone plus your
laptop):
- Tab 1: click **Run the game** — this is your console.
- Tabs 2–3: click **Join a team** in each — each gets an auto-generated
  codename and colour.
- Set a shift on each team tab, click **Start game** on the console, submit
  an order from each team tab, then **Begin intercepts** on the console and
  play through one full round.

If that works end-to-end, you're ready to run it live.

---

## 5. Running it in class

0. The landing page has a **third option** alongside "Run the game" and
   "Join a team": **Decoder wheel**. It's a standalone Caesar-cipher helper
   — a visual wheel plus a shift box, a ciphertext box, and a live decoded
   result. It has no connection to any live game, team, or score, so it's
   safe to point any student at it any time — including a spare team member
   who wants to help crack a message without needing to be "on the clock"
   for their own team's submission.
1. Open the live URL yourself, click **Run the game**, and project that
   screen.
2. Give students the URL. Each team opens it and clicks **Join a team** —
   the game instantly assigns a random 4-letter **codename** (e.g. `RUBY`)
   and the next available colour, no choice involved. Up to 6 teams can
   join; a 7th sees a "game is full" message.
3. Each team fills in the **Setup** panel on their screen — their codename
   (auto-filled, editable any time) and a **Caesar shift (1–25)** — then
   clicks the single **Save** button, which saves both together. The shift
   locks automatically the moment you start the game (same cipher all
   game is the rule); the codename stays editable throughout, in case a
   team wants to personalise it.
4. Every team's screen also shows a live **"How to play"** panel (goal and
   round flow) and a **Commands** reference sitting right next to the Setup
   fields — full `MOVE`/`AMBUSH` syntax, so you shouldn't need to explain
   the commands verbally at all.
5. Your console's team list fills in live as teams join, colour and
   codename already attached — no action needed from you. An optional
   **Reshuffle colours** button is there if you want to remix before
   starting (lobby-only).
6. Click **Start game** (enabled once at least 2 teams have joined).
7. Each round: every team types one order into their free-text box
   (e.g. `MOVE A1 A2` or `AMBUSH RUBY`). The box validates as they type —
   a green ✓ or red ✗ message tells them immediately if the order doesn't
   match a real square, a real codename, or the right format, and **Submit
   is blocked** until it's valid. Once everyone's in, **Begin intercepts**
   unlocks on the console.
8. The console reveals one team's ciphertext at a time, in random order,
   with a 30-second countdown. On every other team's screen, this appears
   as a live **"Incoming message"** alert the instant it starts — they type
   their decryption attempt there. After the clock stops, you **Resolve &
   apply**. The map auto-suggests the outcome, but `MOVE` orders are now
   validated first: the order must start from a square the team actually
   controls and land on an adjacent square that isn't already enemy-held,
   or you'll see an amber warning explaining why nothing was auto-applied.
   Every square on the resolve screen is still click-to-override regardless.
9. Repeat for all 4 rounds, or click **End game** in the top bar at any
   point to stop early and show the final scoreboard.

---

## 6. If something goes wrong mid-lesson

- **End game** (top bar) works any time after the game starts — freezes the
  scoreboard as final results immediately.
- **Reset game** wipes everyone — names, colours, shifts, scores, the whole
  board — back to an empty lobby. Safe to use between classes.
- The resolve screen's map is always manually clickable (cycles through
  no-owner → red → blue → green → yellow → purple → orange) so you can
  hand-correct the board regardless of what a team typed or what the
  auto-suggestion guessed.
- Team identity is tied to the device's browser, not a login — if a team's
  device refreshes, reopening the link and clicking **Join a team** on the
  *same device* restores their existing name/colour automatically, as long
  as the game hasn't been reset.
- Orders are validated **before they can even be submitted**, not just at
  resolve time: the text box checks live as a team types, and `Submit` is
  blocked until it matches `MOVE <square> <square>` (two different, valid
  board squares) or `AMBUSH <codename>` (one of the six real codenames).
  Because of that, the resolve-time `MOVE` checks below mostly catch
  *strategically* invalid moves (wrong owner, non-adjacent, enemy-held)
  rather than typos — those are stopped earlier.
- `MOVE` is validated again at resolve time before anything is
  auto-applied: it must start from a square the team currently controls,
  land on a square directly adjacent (no diagonals), and that destination
  can't already belong to another team (only `AMBUSH` can contest enemy
  squares). If an order fails any of these checks, the resolve screen shows
  an amber warning explaining why and leaves the board untouched — you can
  still apply something manually via the map if you want to allow it
  anyway. There's also a warning if you set the outcome to "stand" after
  someone legitimately cracked the code, since that would silently cost
  them their interception point.
- The cipher shift lock is enforced in the save function itself, not just
  by disabling the input visually — so it can't be re-triggered by
  accident once the game has started. It isn't proof against a student
  deliberately using their browser's developer console to bypass the app
  entirely (there's no server-side login system in this build to stop
  that) — a reasonable line for a classroom activity, but worth knowing.
- Every team's own screen now shows a live **Tactical map** with a colour
  legend, so they can see who controls what before choosing a `MOVE` or
  `AMBUSH` — this updates in real time and persists across rounds exactly
  like the console's map does.

---

## 7. Known limitations (kept deliberately simple)

- Fixed 6×5 grid (30 squares) with six team bases, up to six teams, two
  order types (`MOVE`, `AMBUSH`) — matches the simplified game structure
  this was built around, sized for a class of ~25–30 students in teams of 4.
  Bigger boards or more commands (`DEFEND BASE`, `STEAL`, `CHANGE`) are a
  bigger build — ask if you want those added back in.
- `AMBUSH` has no adjacency requirement by design — any team can strike any
  other team's territory regardless of board position. `MOVE` is the only
  order that's spatially constrained.
- `AMBUSH` targets a fixed 4-letter **codename** rather than the colour word
  itself (RUBY=red, AQUA=blue, LIME=green, GOLD=yellow, PLUM=purple,
  RUST=orange) — every codename is the same length, so ciphertext length
  alone never gives away which agency is being targeted. Codenames are
  shown on every team's own screen (legend under the tactical map) and on
  the console's team list and scoreboard.
- One game running at a time (per Firebase project) — fine for a single
  class, but don't run two classes simultaneously on the same deployed link
  without resetting between them.
- No profanity filter or moderation on auto-generated or renamed team
  names — worth a quick glance once names come in, given the age group.
- The **Decoder wheel** is genuinely independent of Firebase — its code is
  guarded so that even if the database fails to load entirely (no internet,
  a school firewall blocking Google domains, etc.), the wheel still works,
  while only the game-console/team screens would be affected. Worth knowing
  if you ever troubleshoot a "nothing's loading" report — check whether it's
  the whole page or just the parts that need the live database.
