// ── Sound Alerts ─────────────────────────────────────
// Tiny WebAudio chimes, no assets. Plays when Claude needs input or finishes.

let ctx = null;
let enabled = localStorage.getItem("claude-code-pet-sounds") !== "false";

export function isSoundsEnabled() { return enabled; }
export function setSoundsEnabled(val) {
  enabled = val;
  localStorage.setItem("claude-code-pet-sounds", String(val));
}

function ensureCtx() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

// Resume audio on first user gesture (autoplay policies).
window.addEventListener("pointerdown", () => { ensureCtx(); }, { once: true });

function tone(freq, startAt, duration, volume, type = "sine") {
  const c = ensureCtx();
  if (!c || c.state !== "running") return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = c.currentTime + startAt;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export function playChime(kind) {
  if (!enabled) return;
  switch (kind) {
    case "waiting": // needs your input — two ascending notes
      tone(660, 0, 0.14, 0.12);
      tone(880, 0.13, 0.20, 0.12);
      break;
    case "done": // finished — soft single ding
      tone(523.25, 0, 0.28, 0.10);
      tone(783.99, 0.02, 0.22, 0.05);
      break;
    case "error": // low buzz
      tone(196, 0, 0.16, 0.10, "triangle");
      tone(165, 0.14, 0.16, 0.08, "triangle");
      break;
  }
}
