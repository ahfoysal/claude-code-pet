// ── State Mapping ────────────────────────────────────
// Every state has:
//   stateId   – sprite key looked up in the active theme
//   kind      – idle | working | waiting | error | done  (drives dot color + aggregation)
//   label     – short human status text
//   animClass – CSS motion class
//   emoji     – fallback when theme has no sprite

const S = (stateId, kind, label, animClass, emoji) => ({ stateId, kind, label, animClass, emoji });

// Official Codex priority: waiting > failed > review > running > idle
export const KIND_PRIORITY = { waiting: 5, error: 4, done: 3, working: 2, idle: 0 };

export const TOOL_STATES = {
  Read:         S("read",   "working", "Reading",    "anim-bob",   "📖"),
  Edit:         S("write",  "working", "Editing",    "anim-bob",   "✍️"),
  MultiEdit:    S("write",  "working", "Editing",    "anim-bob",   "✍️"),
  Write:        S("write",  "working", "Writing",    "anim-bob",   "✍️"),
  NotebookEdit: S("write",  "working", "Editing",    "anim-bob",   "📓"),
  Bash:         S("bash",   "working", "Running",    "anim-pulse", "⚡"),
  BashOutput:   S("bash",   "working", "Running",    "anim-pulse", "⚡"),
  KillShell:    S("bash",   "working", "Running",    "anim-pulse", "⚡"),
  Grep:         S("search", "working", "Searching",  "anim-bob",   "🔍"),
  Glob:         S("search", "working", "Searching",  "anim-bob",   "🔍"),
  Task:         S("task",   "working", "Delegating", "anim-bob",   "🤖"),
  Agent:        S("task",   "working", "Delegating", "anim-bob",   "🤖"),
  WebFetch:     S("web",    "working", "Browsing",   "anim-bob",   "🌐"),
  WebSearch:    S("web",    "working", "Browsing",   "anim-bob",   "🌐"),
};

export const STATE_IDLE     = S("idle",         "idle",    "Idle",             "anim-float",  "🐱");
export const STATE_SLEEP    = S("stop",         "idle",    "Sleeping",         "anim-sleepy", "😴");
export const STATE_THINKING = S("thinking",     "working", "Thinking",         "anim-bob",    "💭");
export const STATE_WAITING  = S("notification", "waiting", "Needs your input", "anim-bounce", "🙋");
export const STATE_ERROR    = S("error",        "error",   "Hit an error",     "anim-shake",  "😰");
export const STATE_DONE     = S("taskDone",     "done",    "Ready for review", "anim-pop",    "🎉");
export const STATE_HELLO    = S("sessionStart", "working", "Starting",         "anim-pop",    "👋");
export const STATE_BYE      = S("sessionEnd",   "idle",    "Session ended",    "anim-sleepy", "👋");
export const STATE_SUBAGENT = S("subagent",     "working", "Subagent working", "anim-bob",    "🔀");
export const STATE_LIMITED  = S("error",        "waiting", "Usage limit reached", "anim-shake", "🚧");

// When a theme lacks a sprite for a stateId, try these before falling back to emoji.
export const SPRITE_FALLBACK = {
  thinking: "task",
  waiting: "notification",
  success: "taskDone",
};

// A stalled "working" session (no events this long) drops from the panel.
export const WORKING_STALL_MS = 3 * 60 * 1000;
// Idle sessions drop off the list after this (keeps the panel to what's live).
export const IDLE_EXPIRE_MS = 2 * 60 * 1000;
// Hard cap: any session disappears after this much total inactivity.
export const SESSION_EXPIRE_MS = 30 * 60 * 1000;
// Pet falls asleep when everything has been idle for this long.
export const SLEEP_AFTER_MS = 2 * 60 * 1000;

export function stateForEvent(event) {
  const hookEvent = event.hook_event_name || event.event || event.type || "";
  const tool = event.tool_name || "";

  switch (hookEvent) {
    case "ClaudeSessionSnapshot":
      // Metadata-only event; absorbed before state mapping. Safety fallback.
      return STATE_IDLE;

    case "UserPromptSubmit":
    case "turn.started":
      return STATE_THINKING;

    case "PreToolUse":
      if (TOOL_STATES[tool]) return TOOL_STATES[tool];
      return S("unknown", "working", `Using ${tool || "tools"}`, "anim-bob", "🔧");

    case "PostToolUse": {
      const resp = event.tool_response;
      const failed = resp && typeof resp === "object" && resp.success === false;
      return failed ? STATE_ERROR : STATE_THINKING;
    }

    case "PostToolUseFailure":
    case "turn.failed":
    case "error":
      return STATE_ERROR;

    case "Notification":
    case "PermissionRequest": {
      const msg = String(event.message || "").toLowerCase();
      if (msg.includes("limit") || msg.includes("too many requests") || msg.includes("rate")) {
        return STATE_LIMITED;
      }
      return STATE_WAITING;
    }

    case "Stop":
    case "turn.completed":
      return STATE_DONE;

    case "TaskCompleted":
      return STATE_DONE;

    case "SessionStart":
      return STATE_HELLO;
    case "SessionEnd":
      return STATE_BYE;

    case "SubagentStart":
      return STATE_SUBAGENT;
    case "SubagentStop":
      return STATE_THINKING;

    default:
      return STATE_IDLE;
  }
}

// ── Human detail line ("Running npm test", "Editing App.tsx") ──
export function detailForEvent(event) {
  const hookEvent = event.hook_event_name || event.event || event.type || "";
  const tool = event.tool_name || "";
  const ti = event.tool_input || {};

  const clip = (s, n = 46) => {
    if (typeof s !== "string") return "";
    const clean = s.replace(/\s+/g, " ").trim();
    return clean.length > n ? clean.slice(0, n - 1).trimEnd() + "…" : clean;
  };
  const basename = (p) => {
    if (typeof p !== "string" || !p.trim()) return "";
    const parts = p.split(/[\\/]/).filter(Boolean);
    return parts[parts.length - 1] || "";
  };

  switch (hookEvent) {
    case "UserPromptSubmit":
      return clip(event.prompt || event.user_prompt || "");

    case "PreToolUse":
      switch (tool) {
        case "Bash":
        case "BashOutput":
          return clip(ti.command || ti.description || "command");
        case "Read":
        case "Edit":
        case "MultiEdit":
        case "Write":
        case "NotebookEdit":
          return basename(ti.file_path || ti.notebook_path);
        case "Grep":
        case "Glob":
          return clip(ti.pattern || "");
        case "Task":
        case "Agent":
          return clip(ti.description || ti.prompt || "");
        case "WebFetch":
          try { return new URL(ti.url).hostname; } catch { return clip(ti.url || ""); }
        case "WebSearch":
          return clip(ti.query || "");
        default:
          return "";
      }

    case "PostToolUse":
    case "SubagentStop":
      return "thinking…";

    case "Notification":
      return clip(event.message || "waiting for you", 60);

    case "Stop":
    case "turn.completed":
    case "TaskCompleted":
      return "";

    case "PostToolUseFailure":
      return clip(event.error || event.message || "a tool call failed", 60);

    case "SessionStart":
      return "session started";
    case "SessionEnd":
      return "session ended";

    default:
      return "";
  }
}

export function projectForEvent(event) {
  const path = event.cwd || event.workspace || event.project_path || event.path || "";
  if (typeof path === "string" && path.trim()) {
    const segs = path.split(/[\\/]/).filter(Boolean);
    // A home directory (/Users/<user>, /home/<user>, C:\Users\<user>) is not a
    // project — using its leaf would show the username (e.g. "apple").
    const isHome =
      (segs.length === 2 && /^(Users|home)$/i.test(segs[0])) ||
      (segs.length === 3 && /^Users$/i.test(segs[1]));
    const leaf = segs[segs.length - 1];
    if (!isHome && leaf) return leaf;
  }
  const title = event.thread_title || event.task_title || event.title;
  if (typeof title === "string" && title.trim()) return title.trim().slice(0, 28);
  return "Claude";
}
