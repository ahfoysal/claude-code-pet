#!/usr/bin/env node
// Event pipeline checker — one file, zero deps.
// Serves a live dashboard that answers: "is the pet event system working?"
// Run: node tools/event-check/server.mjs   → http://localhost:5600
import http from "node:http";
import { spawn } from "node:child_process";
import { existsSync, statSync, openSync, readSync, closeSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { connect } from "node:net";
import { join } from "node:path";

const PORT = 5600;
const HOME = homedir();
const LOG = join(HOME, ".claude-code-pet", "events.jsonl");
const BIN = join(HOME, ".claude-code-pet", "claude-code-pet");
const SETTINGS = join(HOME, ".claude", "settings.json");

// ── helpers ──────────────────────────────────────────
function checkPetApp() {
  return new Promise((resolve) => {
    const sock = connect({ port: 19876, host: "127.0.0.1", timeout: 500 });
    sock.on("connect", () => { sock.destroy(); resolve(true); });
    sock.on("error", () => resolve(false));
    sock.on("timeout", () => { sock.destroy(); resolve(false); });
  });
}

function checkHooks() {
  try {
    const s = JSON.parse(readFileSync(SETTINGS, "utf8"));
    const groups = s.hooks?.PreToolUse || [];
    return groups.some(g => (g.hooks || []).some(h => String(h.command).includes("claude-code-pet") && String(h.command).includes("--hook")));
  } catch { return false; }
}

// Read appended bytes since `offset`; return { lines, offset } consuming whole lines only.
function readLog(offset) {
  if (!existsSync(LOG)) return { lines: [], offset: 0, size: 0 };
  const size = statSync(LOG).size;
  if (offset < 0 || offset > size) offset = Math.max(0, size - 8192); // first call / truncated: tail ~8KB
  if (size === offset) return { lines: [], offset, size };
  const fd = openSync(LOG, "r");
  const buf = Buffer.alloc(size - offset);
  readSync(fd, buf, 0, buf.length, offset);
  closeSync(fd);
  const text = buf.toString("utf8");
  const lastNl = text.lastIndexOf("\n");
  if (lastNl === -1) return { lines: [], offset, size };
  const consumed = Buffer.byteLength(text.slice(0, lastNl + 1), "utf8");
  const lines = text.slice(0, lastNl).split("\n").filter(Boolean).map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
  return { lines, offset: offset + consumed, size };
}

function sendTestEvent(kind) {
  const cwd = "/tmp/event-check-demo";
  const payloads = {
    working: { hook_event_name: "PreToolUse", session_id: "web-check", cwd, tool_name: "Bash", tool_input: { command: "npm run build" } },
    waiting: { hook_event_name: "Notification", session_id: "web-check", cwd, message: "Claude needs your permission (test from webpage)" },
    done:    { hook_event_name: "Stop", session_id: "web-check", cwd },
    error:   { hook_event_name: "PostToolUseFailure", session_id: "web-check", cwd, error: "test failure from webpage" },
  };
  const payload = payloads[kind];
  if (!payload) return Promise.resolve({ ok: false, error: "unknown kind" });
  return new Promise((resolve) => {
    if (!existsSync(BIN)) return resolve({ ok: false, error: "claude-code-pet binary not installed" });
    const p = spawn(BIN, ["--hook"], { stdio: ["pipe", "ignore", "ignore"] });
    p.on("close", (code) => resolve({ ok: code === 0, code }));
    p.on("error", (e) => resolve({ ok: false, error: String(e) }));
    p.stdin.write(JSON.stringify(payload));
    p.stdin.end();
  });
}

// ── the page ─────────────────────────────────────────
const PAGE = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pet Event Check</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body { background: #16181f; color: #edeef2; font: 14px/1.5 ui-sans-serif, system-ui; padding: 28px; max-width: 880px; margin: 0 auto; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .sub { color: #9aa0af; font-size: 12.5px; margin-bottom: 18px; }
  #verdict { border-radius: 14px; padding: 18px 22px; font-size: 20px; font-weight: 800; margin-bottom: 16px;
             display: flex; align-items: center; gap: 12px; border: 1px solid transparent; }
  #verdict.ok   { background: #10331f; color: #5ee39a; border-color: #1d5c38; }
  #verdict.wait { background: #2a2410; color: #f0c04c; border-color: #59491c; }
  #verdict.bad  { background: #331416; color: #f27878; border-color: #5c2326; }
  #verdict small { font-weight: 500; font-size: 12.5px; opacity: .8; }
  .pills { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
  .pill { padding: 6px 12px; border-radius: 999px; font-size: 12.5px; font-weight: 650; background: #23262f; border: 1px solid #33374233; }
  .pill b { font-weight: 800; }
  .pill.on b  { color: #5ee39a; }
  .pill.off b { color: #f27878; }
  .btns { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
  button { background: #2b2f3a; color: #edeef2; border: 1px solid #3a3f4d; border-radius: 10px;
           padding: 9px 14px; font: 600 13px ui-sans-serif, system-ui; cursor: pointer; }
  button:hover { background: #343947; }
  button.primary { background: #3d5afe22; border-color: #3d5afe66; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th { text-align: left; color: #9aa0af; font-weight: 650; padding: 6px 8px; border-bottom: 1px solid #2b2f3a; }
  td { padding: 6px 8px; border-bottom: 1px solid #22252e; vertical-align: top; }
  td.ev { font-weight: 700; white-space: nowrap; }
  .k-working { color: #5ee39a; } .k-waiting { color: #f0c04c; } .k-done { color: #7ea6ff; }
  .k-error { color: #f27878; } .k-other { color: #b7bcc9; }
  td.t { color: #9aa0af; white-space: nowrap; }
  td.d { color: #c4c9d4; word-break: break-all; }
  .flash { animation: flash 1.2s ease-out 1; }
  @keyframes flash { 0% { background: #3d5afe33; } 100% { background: transparent; } }
  #empty { color: #9aa0af; padding: 18px 8px; }
</style>
</head>
<body>
  <h1>🐾 Claude Code Pet — event pipeline check</h1>
  <div class="sub">Watches <code>~/.claude-code-pet/events.jsonl</code> live. Any Claude Code session on this Mac should appear here the moment it does anything.</div>

  <div id="verdict" class="wait">⏳ Waiting for events…</div>

  <div class="pills" id="pills"></div>

  <div class="btns">
    <button class="primary" onclick="send('working')">Send test: Working ⚡</button>
    <button class="primary" onclick="send('waiting')">Send test: Needs input 🙋</button>
    <button class="primary" onclick="send('done')">Send test: Done 🎉</button>
    <button class="primary" onclick="send('error')">Send test: Error 😰</button>
  </div>

  <table>
    <thead><tr><th>time</th><th>event</th><th>session</th><th>project</th><th>detail</th></tr></thead>
    <tbody id="rows"></tbody>
  </table>
  <div id="empty">No events yet — run any Claude session, or click a test button above.</div>

<script>
let offset = -1;
let lastEventAt = 0;

const KINDS = {
  PreToolUse: "k-working", PostToolUse: "k-working", UserPromptSubmit: "k-working",
  SubagentStart: "k-working", SubagentStop: "k-working", SessionStart: "k-other",
  SessionEnd: "k-other", Notification: "k-waiting", PermissionRequest: "k-waiting",
  Stop: "k-done", TaskCompleted: "k-done", PostToolUseFailure: "k-error",
};

function detail(p) {
  const ti = p.tool_input || {};
  return p.message || ti.command || ti.file_path || ti.pattern || ti.query || p.prompt || p.error || "";
}

function project(p) {
  const c = p.cwd || "";
  return c ? c.split("/").filter(Boolean).pop() : "";
}

function addRow(rec) {
  const p = rec.payload || {};
  const tr = document.createElement("tr");
  tr.className = "flash";
  const t = new Date(rec.received_at_ms || Date.now());
  const ev = p.hook_event_name || "?";
  tr.innerHTML =
    '<td class="t">' + t.toLocaleTimeString() + '</td>' +
    '<td class="ev ' + (KINDS[ev] || "k-other") + '">' + ev + '</td>' +
    '<td class="t">' + String(p.session_id || "?").slice(0, 8) + '</td>' +
    '<td>' + project(p) + '</td>' +
    '<td class="d">' + detail(p).slice(0, 90) + '</td>';
  const rows = document.getElementById("rows");
  rows.insertBefore(tr, rows.firstChild);
  while (rows.children.length > 40) rows.removeChild(rows.lastChild);
  document.getElementById("empty").style.display = "none";
  lastEventAt = rec.received_at_ms || Date.now();
}

function setVerdict() {
  const v = document.getElementById("verdict");
  const age = (Date.now() - lastEventAt) / 1000;
  if (!lastEventAt) { v.className = "wait"; v.innerHTML = "⏳ Waiting for events…"; return; }
  if (age < 120) {
    v.className = "ok";
    v.innerHTML = "✅ IT WORKS — events are flowing <small>last event " + (age < 2 ? "just now" : Math.round(age) + "s ago") + "</small>";
  } else {
    v.className = "wait";
    v.innerHTML = "😴 Quiet — pipeline OK, no recent activity <small>last event " + Math.round(age / 60) + "m ago</small>";
  }
}

async function poll() {
  try {
    const r = await fetch("/api/events?offset=" + offset).then(r => r.json());
    offset = r.offset;
    r.lines.forEach(addRow);
  } catch {}
  setVerdict();
}

async function status() {
  try {
    const s = await fetch("/api/status").then(r => r.json());
    const pill = (label, on, extra) =>
      '<span class="pill ' + (on ? "on" : "off") + '">' + label + ': <b>' + (on ? (extra || "OK") : "NOT FOUND") + '</b></span>';
    document.getElementById("pills").innerHTML =
      pill("Pet app (port 19876)", s.app, "running") +
      pill("Hooks in settings.json", s.hooks, "installed") +
      pill("Hook binary", s.binary, "installed") +
      pill("Event log", s.log, s.logSize);
    if (!s.app) {
      const v = document.getElementById("verdict");
      v.className = "bad";
      v.innerHTML = "❌ Pet app is not running — start it: <small><code>~/.claude-code-pet/claude-code-pet &</code></small>";
    }
  } catch {}
}

async function send(kind) {
  await fetch("/api/send?kind=" + kind, { method: "POST" });
}

poll(); status();
setInterval(poll, 1000);
setInterval(status, 5000);
</script>
</body>
</html>`;

// ── server ───────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(PAGE);
  }

  if (url.pathname === "/api/status") {
    const app = await checkPetApp();
    const log = existsSync(LOG);
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      app,
      hooks: checkHooks(),
      binary: existsSync(BIN),
      log,
      logSize: log ? Math.round(statSync(LOG).size / 1024) + " KB" : "",
    }));
  }

  if (url.pathname === "/api/events") {
    const offset = parseInt(url.searchParams.get("offset") ?? "-1", 10);
    const out = readLog(Number.isFinite(offset) ? offset : -1);
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify(out));
  }

  if (url.pathname === "/api/send" && req.method === "POST") {
    const result = await sendTestEvent(url.searchParams.get("kind"));
    res.writeHead(result.ok ? 200 : 500, { "content-type": "application/json" });
    return res.end(JSON.stringify(result));
  }

  res.writeHead(404);
  res.end("not found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[event-check] http://localhost:${PORT}`);
});
