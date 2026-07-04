import {
  STATE_IDLE, STATE_SLEEP, STATE_WAITING, STATE_DONE, STATE_ERROR,
  KIND_PRIORITY, WORKING_STALL_MS, IDLE_EXPIRE_MS, SESSION_EXPIRE_MS, SLEEP_AFTER_MS,
  stateForEvent, detailForEvent, projectForEvent,
} from "./states.js";
import { getCharacterForState, getCurrentThemeName } from "./themes.js";
import { playChime } from "./audio.js";

// ── App State ────────────────────────────────────────
let sessions = {};
let transientTimers = {};
let quietMode = localStorage.getItem("claude-code-pet-quiet") === "true";
let tucked = localStorage.getItem("claude-code-pet-tucked") === "true";

let panelPinned = false;
let panelDismissed = false;
let pokeUntil = 0;
const bootTime = Date.now();

export function isQuietMode() { return quietMode; }
export function setQuietMode(val) {
  quietMode = val;
  localStorage.setItem("claude-code-pet-quiet", String(val));
}

export function isTucked() { return tucked; }
export function setTucked(val) {
  tucked = val;
  localStorage.setItem("claude-code-pet-tucked", String(val));
  document.body.classList.toggle("is-tucked", tucked);
  refreshDisplay();
}

// ── DOM Refs ─────────────────────────────────────────
const emojiEl = document.getElementById("emoji");
const badgeEl = document.getElementById("pet-badge");
const bubbleEl = document.getElementById("bubble");
const bubbleStatusEl = document.getElementById("bubble-status");
const bubbleProjectEl = document.getElementById("bubble-project");
const bubbleReplyEl = document.getElementById("bubble-reply");
const bubbleDetailEl = document.getElementById("bubble-detail");
const bubbleMetaEl = document.getElementById("bubble-meta");
const panelEl = document.getElementById("panel");
const panelRowsEl = document.getElementById("panel-rows");

const clip = (s, n) => {
  const clean = String(s || "").replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n - 1).trimEnd() + "…" : clean;
};

// ── Session Management ───────────────────────────────
function getOrCreateSession(sessionId) {
  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      id: sessionId,
      project: "Claude",
      cwd: "",
      title: "",
      prompt: "",
      reply: "",
      tokens: 0,
      tasks: 0,
      turnStart: 0,
      state: STATE_IDLE,
      detail: "",
      lastSeen: Date.now(),
      hookManaged: false,
    };
  }
  return sessions[sessionId];
}

// Desktop-app session metadata (chat title, archived flag) — merged into
// sessions as labels only, never touching live hook-driven state.
function absorbSnapshot(event) {
  const sid = event.session_id;
  if (!sid) return;

  let ts = Number(event.last_activity_at) || 0;
  if (ts > 0 && ts < 1e12) ts *= 1000; // seconds → ms
  const archived = event.archived === true || event.archived === "True";
  // Only surface desktop sessions that are genuinely current (active in the
  // last couple of minutes). Old idle chats must not fill the panel.
  const stale = ts > 0 && Date.now() - ts > IDLE_EXPIRE_MS;

  let s = sessions[sid];
  if (!s) {
    if (stale || archived) return;
    s = getOrCreateSession(sid);
    s.lastSeen = ts || Date.now();
  }

  // Chat title always refreshes (even for live hook-driven sessions).
  if (event.thread_title) s.title = String(event.thread_title).slice(0, 60);
  if (!s.cwd && typeof event.cwd === "string" && event.cwd) {
    s.cwd = event.cwd;
    s.project = projectForEvent(event) || s.project;
  }
  // Keep an idle session alive only while its snapshot is still recent.
  if (!stale && ts > s.lastSeen && s.state.kind === "idle") s.lastSeen = ts;
  if ((archived || stale) && s.state.kind === "idle") {
    delete sessions[sid];
  }

  refreshDisplay();
}

// How long a session stays in the panel after its LAST real event, by state.
// This is housekeeping keyed on real activity — not a state-faking timer.
function quietLimit(kind) {
  if (kind === "waiting" || kind === "error") return SESSION_EXPIRE_MS; // needs you → linger
  if (kind === "working") return WORKING_STALL_MS;                      // long generations
  return IDLE_EXPIRE_MS;                                                // finished / idle
}

export function cleanupSessions() {
  const now = Date.now();
  for (const [id, s] of Object.entries(sessions)) {
    if (now - s.lastSeen > quietLimit(s.state.kind)) {
      delete sessions[id];
    }
  }
  // Refresh: relative times + the sleep transition read the clock.
  refreshDisplay();
}

// ── Event Processing ─────────────────────────────────
export function handleEvent(event) {
  const sessionId = event.session_id || event.thread_id || event.conversation_id || "unknown";
  // Transcript records without a session id produce one junk bucket — skip.
  if (sessionId === "claude-log" || sessionId === "unknown") return;
  const hookEvent = event.hook_event_name || event.event || event.type || "";
  const source = typeof event.source === "string" ? event.source : "";
  const fromListener = source.includes("listener");

  // Desktop-app session snapshots carry chat titles — metadata only.
  if (hookEvent === "ClaudeSessionSnapshot" || source.includes("session-listener")) {
    absorbSnapshot(event);
    return;
  }

  // Filesystem listeners are a fallback for sessions without hooks.
  // Once real hook events flow for a session, their state stays hook-driven —
  // but still absorb Claude's latest reply text, which only transcripts have.
  const existing = sessions[sessionId];
  if (fromListener && existing && existing.hookManaged) {
    let touched = false;
    if (typeof event.reply === "string" && event.reply.trim()) {
      existing.reply = clip(event.reply, 160);
      touched = true;
    }
    if (typeof event.tokens === "number" && event.tokens > 0) {
      existing.tokens = event.tokens;
      touched = true;
    }
    if (touched) refreshDisplay();
    return;
  }

  // Ignore listener "discoveries" of stale sessions (e.g. flood at app start).
  if (fromListener && hookEvent === "SessionStart") {
    let ts = Number(event.last_activity_at) || 0;
    if (ts > 0 && ts < 1e12) ts *= 1000; // seconds → ms
    if (ts > 0 && Date.now() - ts > 10 * 60 * 1000) return;
  }

  // Quiet mode: only completion / errors / notifications.
  if (quietMode) {
    if (hookEvent === "PreToolUse") return;
    if (hookEvent === "PostToolUse") {
      const resp = event.tool_response;
      const isError = resp && typeof resp === "object" && resp.success === false;
      if (!isError) return;
    }
    if (["SessionStart", "SubagentStart", "SubagentStop", "UserPromptSubmit"].includes(hookEvent)) return;
  }

  const session = getOrCreateSession(sessionId);
  if (!fromListener) session.hookManaged = true;

  const prevKind = session.state.kind;
  session.state = stateForEvent(event);
  const detail = detailForEvent(event);
  const kindNow = session.state.kind;
  if (detail || kindNow === "done" || kindNow === "idle") session.detail = detail;
  session.project = projectForEvent(event) || session.project;
  if (typeof event.cwd === "string" && event.cwd) session.cwd = event.cwd;
  // Codex-style: remember the first part of the latest user message.
  if (hookEvent === "UserPromptSubmit") {
    const p = clip(event.prompt || event.user_prompt || "", 90);
    if (p) session.prompt = p;
  }
  if (typeof event.reply === "string" && event.reply.trim()) {
    session.reply = clip(event.reply, 160);
  }
  if (typeof event.tokens === "number" && event.tokens > 0) {
    session.tokens = event.tokens;
  }
  // Running-task count = live subagents (mirrors Claude's "N running tasks").
  if (hookEvent === "SubagentStart") session.tasks = (session.tasks || 0) + 1;
  else if (hookEvent === "SubagentStop") session.tasks = Math.max(0, (session.tasks || 0) - 1);
  else if (hookEvent === "Stop" || hookEvent === "SessionEnd") session.tasks = 0;

  // Turn timer: starts when a prompt begins, freezes when the turn ends.
  if (hookEvent === "UserPromptSubmit") {
    session.turnStart = Date.now();
    session.tokens = 0;
  } else if (kindNow === "working" && !session.turnStart) {
    session.turnStart = Date.now();
  } else if (kindNow === "done" || kindNow === "idle") {
    session.turnStart = 0;
  }
  session.lastSeen = Date.now();

  // Sound alerts on meaningful transitions.
  const kind = session.state.kind;
  if (kind !== prevKind) {
    if (kind === "waiting") playChime("waiting");
    else if (kind === "done") playChime("done");
    else if (kind === "error") playChime("error");
  }

  // Fully event-driven: a session holds its last real state (working /
  // waiting / review / error) until the next event changes it — no timer
  // ever flips the state. The only scheduled action is clearing a session a
  // few seconds after it actually ends, so the goodbye is visible.
  if (transientTimers[sessionId]) {
    clearTimeout(transientTimers[sessionId]);
    delete transientTimers[sessionId];
  }
  if (hookEvent === "SessionEnd") {
    transientTimers[sessionId] = setTimeout(() => {
      delete transientTimers[sessionId];
      delete sessions[sessionId];
      refreshDisplay();
    }, 3000);
  }

  refreshDisplay();
}

// ── Aggregation ──────────────────────────────────────
function sortedSessions() {
  const now = Date.now();
  return Object.values(sessions)
    .filter(s => now - s.lastSeen <= SESSION_EXPIRE_MS)
    .sort((a, b) =>
      (KIND_PRIORITY[b.state.kind] - KIND_PRIORITY[a.state.kind]) || (b.lastSeen - a.lastSeen)
    );
}

function aggregate() {
  const list = sortedSessions();
  const nonIdle = list.filter(s => s.state.kind !== "idle");
  const top = list[0] || null;
  let petState;
  if (!top || top.state.kind === "idle") {
    const newest = list.reduce((m, s) => Math.max(m, s.lastSeen), 0);
    petState = (!list.length || Date.now() - newest > SLEEP_AFTER_MS) ? STATE_SLEEP : STATE_IDLE;
  } else {
    petState = top.state;
  }
  return { list, nonIdle, top, petState };
}

// ── Interactions ─────────────────────────────────────
// Codex-style: clicking the pet wiggles it and jumps to the Claude app
// (main.js invokes focus_claude); the bubble/panel handle expansion.
export function pokePet() {
  if (tucked) { setTucked(false); return false; }
  pokeUntil = Date.now() + 900;
  refreshDisplay();
  setTimeout(refreshDisplay, 950);
  return true;
}

export function wakePet() {
  setTucked(false);
}

export function togglePanel() {
  const { nonIdle } = aggregate();
  const autoOpen = nonIdle.length >= 2 && !panelDismissed;
  const currentlyOpen = panelPinned || autoOpen;
  if (currentlyOpen) {
    panelPinned = false;
    panelDismissed = true;
  } else {
    panelPinned = true;
    panelDismissed = false;
  }
  refreshDisplay();
}

// ── Rendering ────────────────────────────────────────
let currentFrames = null;
let currentFps = 2;

function renderCharacter(el, stateObj) {
  const char = getCharacterForState(stateObj);
  if (char.type === "image") {
    el.textContent = "";
    let img = el.querySelector("img");
    if (!img) {
      img = document.createElement("img");
      el.appendChild(img);
    }
    currentFrames = char.frames && char.frames.length ? char.frames : [char.content];
    currentFps = char.fps || 2;
    img.src = frameAt(currentFrames, currentFps);
    img.alt = stateObj.stateId || "";
  } else {
    const img = el.querySelector("img");
    if (img) img.remove();
    currentFrames = null;
    el.textContent = char.content;
  }
}

function frameAt(frames, fps) {
  const idx = Math.floor(Date.now() / (1000 / fps)) % frames.length;
  return frames[idx];
}

// Sprite frame ticker — only touches img.src, cheap.
setInterval(() => {
  if (!currentFrames || currentFrames.length < 2) return;
  const img = emojiEl.querySelector("img");
  if (img) {
    const src = frameAt(currentFrames, currentFps);
    if (img.src !== src) img.src = src;
  }
}, 120);

// Turn-timer ticker — keeps the "1m 41s" elapsed time counting up live while
// any session is actively working. Cheap, and only refreshes when needed.
setInterval(() => {
  if (tucked) return;
  const ticking = Object.values(sessions).some(
    (s) => s.turnStart > 0 && s.state.kind === "working"
  );
  if (ticking) refreshDisplay();
}, 1000);

function relTime(ts) {
  const d = Math.max(0, Date.now() - ts);
  if (d < 60000) return "now";
  if (d < 3600000) return `${Math.floor(d / 60000)}m`;
  return `${Math.floor(d / 3600000)}h`;
}

function rowText(s) {
  const label = s.state.label;
  const detail = (s.detail || "").replace(/…$/, "");
  return detail && detail !== label.toLowerCase() ? `${label} · ${s.detail}` : label;
}

function fmtTokens(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtElapsed(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

// "1m 41s · 232 tokens · 1 running task" — matches Claude Code's status line.
function metaText(s) {
  const parts = [];
  if (s.turnStart > 0 && s.state.kind === "working") {
    parts.push(fmtElapsed(Date.now() - s.turnStart));
  }
  if (s.tokens > 0) parts.push(`${fmtTokens(s.tokens)} tokens`);
  if (s.tasks > 0) parts.push(`${s.tasks} running task${s.tasks > 1 ? "s" : ""}`);
  return parts.join(" · ");
}

export function refreshDisplay() {
  const { list, nonIdle, top, petState } = aggregate();
  const poking = Date.now() < pokeUntil;

  // Pet sprite + motion
  renderCharacter(emojiEl, petState);
  emojiEl.className = poking ? "anim-wiggle" : petState.animClass;

  // Badge: how many sessions are doing something
  if (nonIdle.length > 1) {
    badgeEl.textContent = String(nonIdle.length);
    badgeEl.classList.remove("hidden");
  } else {
    badgeEl.classList.add("hidden");
  }

  // Panel visibility
  if (nonIdle.length < 2) panelDismissed = false;
  const panelOpen = !tucked && (panelPinned || (nonIdle.length >= 2 && !panelDismissed));

  // Bubble: always visible while a session exists (Codex-style) —
  // session name, Claude's latest reply beneath, live activity when busy.
  // The ⌄ button tucks the whole pet away, same as double-click.
  const greeting = !top && Date.now() - bootTime < 8000;
  const showBubble = !tucked && !panelOpen && (top || greeting);

  if (showBubble && !top && greeting) {
    // First wake: "Hi, I'm {petName}"
    const petName = (getCurrentThemeName() || "your pet").split(" (")[0];
    bubbleProjectEl.textContent = `Hi, I’m ${petName}!`;
    bubbleStatusEl.className = "st-idle";
    bubbleReplyEl.textContent = "I’m here to keep your Claude sessions moving.";
    bubbleReplyEl.style.display = "";
    bubbleDetailEl.style.display = "none";
    bubbleMetaEl.style.display = "none";
    bubbleEl.classList.remove("hidden");
  } else if (showBubble) {
    bubbleProjectEl.textContent = top.title || top.project;
    bubbleStatusEl.className = "st-" + top.state.kind;

    const replyText = top.reply || top.prompt;
    if (replyText) {
      bubbleReplyEl.textContent = replyText;
      bubbleReplyEl.style.display = "";
    } else {
      bubbleReplyEl.style.display = "none";
    }

    const busy = ["working", "waiting", "error"].includes(top.state.kind);
    if (busy) {
      bubbleDetailEl.textContent = rowText(top);
      bubbleDetailEl.style.display = "";
    } else if (!replyText) {
      // Codex shows plain state text like "Idle" when nothing else to say.
      bubbleDetailEl.textContent = top.state.label;
      bubbleDetailEl.style.display = "";
    } else {
      bubbleDetailEl.style.display = "none";
    }

    const meta = metaText(top);
    if (meta) {
      bubbleMetaEl.textContent = meta;
      bubbleMetaEl.style.display = "";
    } else {
      bubbleMetaEl.style.display = "none";
    }
    bubbleEl.classList.remove("hidden");
  } else {
    bubbleEl.classList.add("hidden");
  }

  // Panel: every session Claude has open (no header, Codex-style rows)
  if (panelOpen) {
    panelRowsEl.innerHTML = "";
    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "panel-empty";
      empty.textContent = "No Claude sessions yet";
      panelRowsEl.appendChild(empty);
    }
    for (const s of list.slice(0, 6)) {
      const row = document.createElement("div");
      row.className = "panel-row";

      const icon = document.createElement("span");
      icon.className = "st-" + s.state.kind;

      const main = document.createElement("div");
      main.className = "row-main";
      const proj = document.createElement("div");
      proj.className = "row-project";
      proj.textContent = s.title || s.project;
      const status = document.createElement("div");
      status.className = "row-status";
      const busy = ["working", "waiting", "error"].includes(s.state.kind);
      status.textContent = busy ? rowText(s) : (s.reply || s.prompt || s.state.label);
      main.appendChild(proj);
      main.appendChild(status);
      const meta = metaText(s);
      if (meta) {
        const metaEl = document.createElement("div");
        metaEl.className = "row-meta";
        metaEl.textContent = meta;
        main.appendChild(metaEl);
      }

      const time = document.createElement("span");
      time.className = "row-time";
      time.textContent = relTime(s.lastSeen);

      row.appendChild(icon);
      row.appendChild(main);
      row.appendChild(time);
      panelRowsEl.appendChild(row);
    }
    if (list.length > 6) {
      const more = document.createElement("div");
      more.className = "panel-empty";
      more.textContent = `+${list.length - 6} more`;
      panelRowsEl.appendChild(more);
    }
    panelEl.classList.remove("hidden");
  } else {
    panelEl.classList.add("hidden");
  }

  reportHitRegions();
}

// Tell the Rust side exactly which pixels are the pet (so the rest of the
// transparent window lets clicks through to the app underneath).
let hitRaf = 0;
function reportHitRegions() {
  if (!window.__TAURI__) return;
  cancelAnimationFrame(hitRaf);
  hitRaf = requestAnimationFrame(() => {
    const dpr = window.devicePixelRatio || 1;
    const pad = 6; // CSS px of slack around each element
    const regions = [];
    for (const id of ["character-area", "bubble", "panel"]) {
      const el = document.getElementById(id);
      if (!el || el.classList.contains("hidden")) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      regions.push([
        (r.left - pad) * dpr,
        (r.top - pad) * dpr,
        (r.width + pad * 2) * dpr,
        (r.height + pad * 2) * dpr,
      ]);
    }
    window.__TAURI__.core.invoke("set_hit_regions", { regions }).catch(() => {});
  });
}

export function resetSessions() {
  sessions = {};
  for (const id of Object.keys(transientTimers)) clearTimeout(transientTimers[id]);
  transientTimers = {};
  panelPinned = false;
  panelDismissed = false;
  refreshDisplay();
}

setTucked(tucked);
