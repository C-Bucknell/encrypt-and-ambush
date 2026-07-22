# Encrypt & Ambush — Visual Studio–Only Guide

This is an alternate path through the same setup covered in `BUILD_GUIDE.md`,
written for doing **everything inside Visual Studio** — no separate Command
Prompt or PowerShell window. The one exception: a handful of Firebase-specific
commands have no Visual Studio button for them, so those run in Visual
Studio's own **built-in Terminal** (`View → Terminal`), which lives inside
the IDE rather than being a separate app. Everywhere else — Git, editing,
publishing — uses Visual Studio's own menus and windows.

---

## 0. One-time prerequisites

These happen once, outside Visual Studio, before any of the steps below:

| What | Why |
|---|---|
| **Visual Studio 2022** (any edition) with the "Git for Windows" component | Comes bundled by default in most installs — Visual Studio's Git tools need it under the hood, even though you'll never type a `git` command yourself |
| **Node.js** (from https://nodejs.org, the LTS version) | Needed once, so the Firebase command-line tool exists to run from Visual Studio's Terminal |
| A **Google account** | For creating the free Firebase project (console.firebase.google.com) |
| A **GitHub account** | For storing the project and enabling auto-deploy |

Installing Node.js is a normal Windows installer wizard (Next → Next →
Install) — not a command-line step, just a one-time program install like
any other.

---

## 1. Get the project into Visual Studio

Pick whichever matches your situation:

### If you already have a GitHub repo for this project
1. Open Visual Studio → start screen → **Clone a repository**
2. Sign in with your GitHub account if prompted
3. Paste your repo URL (e.g. `https://github.com/YOUR-USERNAME/encrypt-and-ambush`)
4. Choose a local folder to clone into → **Clone**

### If you're starting completely fresh (no repo yet)
1. Save `index.html` and the other project files into a new folder on your
   PC (e.g. `C:\Source\encrypt-and-ambush`)
2. Open Visual Studio → **File → Open → Folder...** → select that folder
3. In the menu bar: **Git → Create Git Repository...**
4. In the dialog, tick **"Add to GitHub"** (or similar wording depending on
   your Visual Studio version), sign in with your GitHub account, choose a
   repository name, Public or Private, and confirm.

That last step does the equivalent of `git init`, creating the GitHub repo,
and the first push — entirely through the dialog, no terminal involved.

Either way, you should now see your files in **Solution Explorer**.

---

## 2. Create your Firebase project (one-time, in a browser)

This part happens on Google's website, not in Visual Studio — there's no
way around that, since it's a one-time account/project setup step.

1. Go to https://console.firebase.google.com and sign in
2. **Add project** → name it (e.g. `encrypt-and-ambush`) → skip Analytics →
   **Create project**
3. Left sidebar → **Build → Realtime Database** → **Create Database** → any
   location → **Start in test mode**
4. Gear icon (top-left) → **Project settings** → **General** tab → scroll to
   **Your apps** → click **`</>`** → register a nickname → **Register app**
5. Copy the `firebaseConfig` object it shows you — you'll paste this into
   Visual Studio in the next step

---

## 3. Connect the app to Firebase (in Visual Studio's editor)

1. In **Solution Explorer**, double-click `index.html` to open it
2. Use **Ctrl+F** (Find) to jump to `const firebaseConfig = {`
3. Replace the placeholder block with the real values you copied in Step 2
4. Save the file (**Ctrl+S**)

No terminal needed for this part — it's a plain text edit.

---

## 4. Install and log into the Firebase CLI (Visual Studio's Terminal)

This is the first point where a command is genuinely required — Firebase
doesn't have a Visual Studio extension, so its own command-line tool is the
only way to deploy. We'll run it from Visual Studio's **built-in** terminal
rather than a separate window.

1. In Visual Studio: **View → Terminal**. A terminal panel opens at the
   bottom, already pointed at your project folder.
2. Run:
   ```
   npm install -g firebase-tools
   ```
3. Run:
   ```
   firebase login
   ```
   This opens a browser window asking you to sign into the same Google
   account you used in Step 2 — sign in there, then return to Visual Studio.

If this is the very first time running anything through npm on this PC and
you see a message about PowerShell script execution being blocked, switch
the terminal's shell to **Command Prompt** instead of PowerShell: click the
dropdown arrow next to the **+** in the terminal panel and choose
**Command Prompt**, then retry the two commands above.

---

## 5. First deploy (Visual Studio's Terminal)

Still in the same terminal panel, from your project folder:

```
firebase init hosting
```

Answer the prompts as they appear:
- **"Please select an option"** → **Use an existing project** → pick the
  Firebase project from Step 2
- **"What do you want to use as your public directory?"** → type a single
  dot: `.`
- **"Configure as a single-page app?"** → **No**
- **"Set up automatic builds and deploys with GitHub?"** → **No** for now
  (Part 7 below covers this properly, with the correct answers)
- If asked about overwriting `index.html` → **No**

Then deploy:
```
firebase deploy
```

Firebase prints a **Hosting URL** when it finishes (e.g.
`https://encrypt-and-ambush.web.app`) — that's your live game link.

---

## 6. Everyday editing (no terminal needed for this part)

From now on, day-to-day changes look like this:

1. Edit `index.html` directly in Visual Studio's editor
2. Open **View → Git Changes** — this panel shows what's changed
3. Type a commit message, click **Commit All**, then **Push**

That's the entire edit cycle for version control — no `git` commands typed
anywhere. Whether this also auto-deploys the live site depends on whether
you've set up Part 7 below.

---

## 7. Optional — auto-deploy whenever you push (Visual Studio's Terminal, once)

Without this step, publishing a change means re-running `firebase deploy`
yourself each time (Step 5's command, from the Terminal panel). This step
makes that automatic: push in Visual Studio → the live site updates on its
own within a minute or two.

Back in **View → Terminal**:

```
firebase init hosting:github
```

Answer the prompts:
- **"For which GitHub repository..."** → type `YOUR-USERNAME/encrypt-and-ambush`
- A browser window opens asking you to authorise Firebase's GitHub App —
  approve it
- **"Set up the workflow to run a build script before every deploy?"** →
  **No** (this is a plain static file, no build step)
- **"Set up automatic deployment to your site's live channel when a PR is
  merged?"** → **Yes**, branch `main`

This creates two files inside a new `.github/workflows/` folder. Commit and
push them the normal way — **View → Git Changes → Commit All → Push**.

**One thing worth checking:** open the newly created
`.github/workflows/firebase-hosting-merge.yml` in Visual Studio's editor and
make sure it does **not** contain a line like `npm ci && npm run build`.
Firebase's generator sometimes adds this by default; this project has no
build step (no `package.json`), so delete that line if present, or the
automated deploy will fail looking for a build script that doesn't exist.

From this point on: edit → commit → push (all in Visual Studio) → the live
site updates itself. You can check progress under your repo's **Actions**
tab on github.com, and `firebase deploy` from the Terminal panel still works
any time you want to skip GitHub and push a change immediately.

---

## 8. Quick troubleshooting

- **"npm is not recognized" or similar in the Terminal panel** — Node.js
  probably isn't installed yet, or Visual Studio was open before you
  installed it. Close and reopen Visual Studio after installing Node.js
  from https://nodejs.org.
- **PowerShell blocks the npm/firebase commands with a script-execution
  error** — switch the terminal panel to Command Prompt (dropdown next to
  the **+** in the Terminal panel) and re-run the command.
- **Git Changes panel doesn't show your edits** — confirm you're editing
  the file inside the folder Visual Studio opened/cloned, not a separate
  copy elsewhere (e.g. a Downloads folder from earlier testing).
- **Pushed but the live site didn't update** — this only happens
  automatically if Part 7 is set up. Otherwise, run `firebase deploy` from
  **View → Terminal** to publish manually.
- Everything else (Firebase database rules, running the game in class,
  known limitations) is unchanged from `BUILD_GUIDE.md` — this guide only
  covers the *tooling* path, not how the game itself works.
