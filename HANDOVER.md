# Claude Code Pet — Handover

Everything needed to build, run, deploy, release, and maintain this project. Written 2026-07-05.

---

## 1. What it is

A Codex-style pixel desktop pet for **Claude Code**. A Tauri 2 (Rust) overlay window that floats over every app and reacts, in real time, to what Claude Code is doing — showing the active chat name, Claude's latest message, the current tool/activity, live tokens & elapsed time, and needs-input alerts. Free & open source (MIT).

- **Repo (canonical):** https://github.com/ahfoysal/claude-code-pet
- **Live site:** https://claudecodepet.vercel.app
- **Release:** https://github.com/ahfoysal/claude-code-pet/releases/tag/v1.0.0

---

## 2. Accounts & ownership

| Thing | Account / detail |
|---|---|
| GitHub repo | owner **ahfoysal**, MIT © ahfoysal, no co-authors |
| Vercel | account **pewds** (NOT ahfoysal), project name **landing** |
| Commits | authored `ahfoysal <ahfoysal@users.noreply.github.com>` — keep it that way, no co-author trailers |

---

## 3. Full paths

### On this Mac
| Path | What |
|---|---|
| `/Users/apple/Documents/Workflow/claude-code-pet` | **The repo** (only copy; = GitHub `main`). Old divergent worktrees were deleted. |
| `/Users/apple/Documents/Workflow/claude-code-pet/landing` | Next.js landing site |
| `/Applications/Claude Code Pet.app` | Installed macOS app (currently running) |
| `~/.claude-code-pet/claude-code-pet` | Installed binary (the `--hook` sender + GUI) |
| `~/.claude-code-pet/themes/` | Installed pet themes (9 pixel pets) |
| `~/.claude/settings.json` | Where hooks are registered (backed up before edits) |
| `~/.claude-code-pet/events.jsonl` | Event log — **only if** `CLAUDE_CODE_PET_LOG=1` (off by default) |
| `~/Library/Application Support/Claude/claude-code-sessions/*.json` | Desktop session store — source of **chat titles** (numbers are stored as STRINGS) |
| `~/.claude/projects/*.jsonl` | Claude Code transcripts — source of **latest reply + token counts** |
| `/Users/apple/.claude/projects/-Users-apple-Documents-Foysal/memory/agent-pet.md` | The persistent agent memory for this project (see §11) |

### On Windows (once installed)
| Path | What |
|---|---|
| `%LOCALAPPDATA%\claude-code-pet\claude-code-pet.exe` | Installed binary |
| `%LOCALAPPDATA%\claude-code-pet\themes\` | Themes |
| `%USERPROFILE%\.claude\settings.json` | Hooks |

### Runtime constants
- **TCP bridge:** `127.0.0.1:19876` (localhost only)
- **Deep link:** `claude-code-pet://pets/install?name=<n>&imageUrl=<https url>&description=<opt>`

---

## 4. How it works (architecture)

```
Claude Code hooks ──▶ claude-code-pet --hook ──▶ TCP 127.0.0.1:19876 ──▶ Tauri window
  (~/.claude/settings.json)   (fast sender)          (local only)         (pet overlay)

Fallbacks (Rust listener, polled ~2s):
  ~/.claude/projects/*.jsonl        → latest reply text + cumulative turn tokens
  ~/Library/.../claude-code-sessions → chat titles + archived flag
```

- **Hooks** drive real-time state (PreToolUse, PostToolUse, Notification, UserPromptSubmit, Stop, SubagentStart/Stop, SessionStart/End, TaskCompleted).
- **Transcripts** fill in Claude's latest words (any assistant message) and **tokens** (sum of `usage.output_tokens` for the turn, since the last user prompt).
- **Titles** come from the desktop session store (matched by `cliSessionId` ↔ hook `session_id`).
- State is **fully event-driven** — no timer flips a state. Timers only: animation frame ticker, the 1s elapsed-time ticker, and inactivity-based session cleanup.

---

## 5. Key files

### Rust (`src-tauri/src/`)
| File | Responsibility |
|---|---|
| `main.rs` | Window setup, **selective click-through** (Rust cursor poll + `set_ignore_cursor_events` over reported hit-regions), **deep-link pet install** (curl download, raster-only), `focus_claude` (macOS `open -a`, Windows PowerShell AppActivate, Linux wmctrl), single-instance, macOS overlay (objc2: fullScreenAuxiliary + NSStatusWindowLevel) |
| `claude_listener.rs` | Tails transcripts + session store; extracts event, reply, `turn_output_tokens`, titles |
| `hook_sender.rs` | `--hook` mode (stdin JSON → TCP); **auto-open** the GUI on SessionStart/UserPromptSubmit if not running; **opt-in** event logging |
| `hook_setup.rs` | `install-claude-hooks` / `uninstall-claude-hooks` (backs up settings.json). Codex hook commands were removed — Claude-only. |
| `server.rs` | TCP listener on 19876 (read capped at 256 KB) |
| `themes.rs` | Theme discovery + `get_theme_image` (path-traversal guarded) |

### Frontend (`src/`)
| File | Responsibility |
|---|---|
| `states.js` | Event→state mapping, `TOOL_STATES` (Reading/Editing/Running/Searching/Browsing/Planning/Delegating…), token/detail extraction, `projectForEvent` (skips home dirs so it never shows the username) |
| `sessions.js` | **Core model** — session tracking, priority (waiting>error>done-5s>working>idle), one-line status (`activity · time · tokens`), bubble + panel render, walk-on-drag, only-named-sessions filter |
| `themes.js` | Theme loading + frame animation |
| `audio.js` | WebAudio chimes |
| `main.js` | Window position/anchor, drag vs click, native context menu |
| `index.html` / `styles.css` | Overlay markup + styling |

### Tools (`tools/`)
| File | What |
|---|---|
| `gen-pixel-theme.mjs` | **Generates the Clawd pixel cat** from ASCII grids. Edit grids → `node tools/gen-pixel-theme.mjs`. Do NOT hand-edit the SVGs. |
| `gen-pet-pack.mjs` | Generates the 8-pet roster (Quacks, Embyr, Owlbert, Boulder, Sprout, Stax, Oops, Voidling) |
| `capture-docs.mjs` | Playwright → `docs/*.png` + `docs/demo.gif` (needs a static server on :5599) |
| `event-check/server.mjs` | Live event-pipeline checker on :5600 (needs `CLAUDE_CODE_PET_LOG=1`) |

### Landing (`landing/`) — Next.js 14, static export, Tailwind, Framer Motion
- `app/page.tsx` — the whole arcade page. `app/layout.tsx` — SEO metadata + JSON-LD. `app/robots.ts`, `app/sitemap.ts`. `components/` — PetSprite, Logos. `public/pets/` — sprite copies.

### CI
- `.github/workflows/build.yml` — builds **macOS + Windows** on every push (verifies cross-platform); on `v*` tags builds + creates a **draft Release** with installers.

---

## 6. Build / install / run

```bash
git clone https://github.com/ahfoysal/claude-code-pet.git
cd claude-code-pet
npm install
npm run build          # full bundle; or: npx tauri build --bundles app  (app only, faster)
```

Output: `src-tauri/target/release/bundle/macos/Claude Code Pet.app`

**macOS install + connect:**
```bash
./install.sh                                             # binary + themes → ~/.claude-code-pet
~/.claude-code-pet/claude-code-pet install-claude-hooks  # registers hooks (backs up settings.json)
open "src-tauri/target/release/bundle/macos/Claude Code Pet.app"
```

**Windows:** `.\install.ps1` then `& "$env:LOCALAPPDATA\claude-code-pet\claude-code-pet.exe" install-claude-hooks`.

Hooks apply to Claude Code sessions started **after** install. The pet **auto-opens** when a session starts (single-instance prevents duplicates).

**The rebuild-and-reinstall loop I used repeatedly:**
```bash
cd /Users/apple/Documents/Workflow/claude-code-pet
npx tauri build --bundles app
./install.sh > /dev/null
pkill -x "claude-code-pet"; pkill -f "Claude Code Pet.app"; sleep 1
rm -rf "/Applications/Claude Code Pet.app"
cp -R "src-tauri/target/release/bundle/macos/Claude Code Pet.app" /Applications/
open "/Applications/Claude Code Pet.app"
```

---

## 7. Deploy the landing (Vercel)

```bash
cd landing
vercel --prod --yes                      # deploys; prints landing-<hash>-pewds-projects.vercel.app
vercel alias set <that-url> claudecodepet.vercel.app   # ⚠️ REQUIRED after every deploy
```

**Critical gotcha:** the custom alias `claudecodepet.vercel.app` does **NOT** auto-follow `vercel --prod`. You must re-run `vercel alias set` with the new deployment URL after each deploy, or the public URL keeps serving the old build.

Also: Vercel **SSO/deployment protection** was disabled (via API `PATCH .../projects/<id> {"ssoProtection": null}`) — without that, the custom `.vercel.app` alias 302-redirects to a login page. Don't re-enable it.

Landing is a **static export** (`output: 'export'` in `next.config.mjs`, Next 14.2.35) so there's no server runtime.

---

## 8. Cut a release

```bash
git tag -a v1.2.3 -m "Claude Code Pet v1.2.3"
git push origin v1.2.3
# CI builds macOS + Windows and creates a DRAFT release with installers.
gh release edit v1.2.3 --draft=false     # publish when ready
```
Bump the version in **both** `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml` first (keep them in sync).

---

## 9. Platform status

| Platform | Status |
|---|---|
| **macOS** | Fully built, installed, runtime-tested ✅ |
| **Windows** | Compiles + produces `.msi`/`.exe`, CI-verified, installers published in v1.0.0. `focus_claude` is best-effort (PowerShell AppActivate). **Not runtime-tested on real Windows.** |
| **Linux** | Compiles + bundles `.deb`/`.rpm`/`.AppImage`, CI-verified (ubuntu-22.04 leg in `build.yml`). Driven by the Claude Code **CLI** (hooks → TCP `:19876`), not a desktop app — there is no Claude Code desktop app on Linux. `focus_claude` uses `wmctrl -a Claude` to raise the terminal running `claude`. **Not runtime-tested on real Linux.** **Wayland caveat:** transparent always-on-top + click-through are reliable on X11, may not work under Wayland. |

---

## 10. Hard-won gotchas

- **Pixel themes are GENERATED.** Edit the ASCII grids in `tools/gen-*.mjs` and rerun; never hand-edit the SVGs.
- **Hidden overlays need `visibility: hidden`**, not just `opacity: 0` — `backdrop-filter` ghosts at opacity 0.
- **Fullscreen Spaces (macOS)** need `fullScreenAuxiliary` collection behavior + `NSStatusWindowLevel` via objc2 — `alwaysOnTop` alone isn't enough.
- **Click-through** = frontend reports drawn-element rects (`getBoundingClientRect × devicePixelRatio`) via `set_hit_regions`; Rust polls `cursor_position() − inner_position()` every ~45ms and toggles `set_ignore_cursor_events`. Needs `core:window:allow-outer-position/current-monitor/available-monitors` in `capabilities/default.json`.
- **Desktop session files store numbers as STRINGS** (`lastActivityAt`, `isArchived`).
- **Themes dedupe** is required because the installed binary lives in `~/.claude-code-pet` where the builtin and user theme dirs coincide.
- **macOS shell quirks:** `pgrep -E` isn't supported; the tauri build completion string in logs isn't always literally "Finished 1 bundle" — don't gate wait-loops on it too tightly.
- **Tokens** = cumulative `output_tokens` for the current turn; updates per assistant message (~2s), not per streamed token (can't be — that counter is internal to Claude Code). **Running tasks** counts subagents only, not background bash.

---

## 11. Memory (durable facts)

The persistent memory lives at
`/Users/apple/.claude/projects/-Users-apple-Documents-Foysal/memory/agent-pet.md`
(indexed in `MEMORY.md`). Its essence, for anyone without that file:

- One dir only: `/Users/apple/Documents/Workflow/claude-code-pet` = the GitHub repo. The old copies (`claude-pet`, `claude-pet-merged`, `claude-desktop-pet`) were deleted.
- Started from a fork of `IMMINJU/claude-pet` but is now standalone and rewritten; ship it as ahfoysal's own MIT work, no co-authors.
- Live site: **https://claudecodepet.vercel.app** (Vercel account **pewds**). Re-alias after every deploy (see §7).
- Auto-open, single-instance, opt-in logging (`CLAUDE_CODE_PET_LOG=1`), raster-only deep-link downloads, Codex hooks removed (Claude-only).

---

## 12. Open items / next steps

- [x] Add a **Linux CI job** (ubuntu-22.04 + webkit2gtk-4.1 deps → `.deb`/`.rpm`/`.AppImage`). Done in `build.yml`. Build-verified only; Wayland runtime still open (below).
- [ ] **Runtime-test on real Windows and Linux** desktops (the one thing CI can't do) — in particular the transparent always-on-top + click-through overlay and `focus_claude` under both X11 and Wayland.
- [ ] Automate the Vercel **re-alias** (or move to a project rename so the URL is native).
- [ ] Optional: convert `src/` frontend to TypeScript for build-time type safety.
- [ ] Optional: support loading official Codex `spritesheet.webp` pet packs (a converter).
