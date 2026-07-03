#!/usr/bin/env node
// Captures README screenshots + an animated demo GIF using Playwright.
// Requires the static server on :5599 (npx serve src) and dev deps:
//   npm i -D playwright pngjs gifenc && npx playwright install chromium
// Run: node tools/capture-docs.mjs
import { chromium } from "playwright";
import { PNG } from "pngjs";
import gifenc from "gifenc";
const { GIFEncoder, quantize, applyPalette } = gifenc;
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DOCS = join(dirname(fileURLToPath(import.meta.url)), "..", "docs");
mkdirSync(DOCS, { recursive: true });

const BASE = "http://localhost:5599";
const VIEW = { width: 900, height: 600 };
const CLIP = { x: VIEW.width - 480, y: VIEW.height - 360, width: 480, height: 360 };

const DESK_BG = `
  html, body { background: linear-gradient(160deg, #e8ebf1 0%, #d5dae3 100%) !important; }
`;

const S1 = "sess-hallo";
const S2 = "sess-distill";
const S3 = "sess-artistly";

const ev = (o) => o;
const SCRIPT = {
  snapshot: ev({ source: "claude-desktop-session-listener", hook_event_name: "ClaudeSessionSnapshot", session_id: S1, thread_title: "Hallo", cwd: "/Users/apple/Documents/Foysal", archived: false, last_activity_at: Date.now() }),
  prompt: ev({ hook_event_name: "UserPromptSubmit", session_id: S1, cwd: "/Users/apple/Documents/Foysal", prompt: "add rate limiting to the extraction API and run the tests" }),
  read: ev({ hook_event_name: "PreToolUse", session_id: S1, cwd: "/Users/apple/Documents/Foysal", tool_name: "Read", tool_input: { file_path: "/x/api/route.ts" } }),
  edit: ev({ hook_event_name: "PreToolUse", session_id: S1, cwd: "/Users/apple/Documents/Foysal", tool_name: "Edit", tool_input: { file_path: "/x/api/route.ts" } }),
  bash: ev({ hook_event_name: "PreToolUse", session_id: S1, cwd: "/Users/apple/Documents/Foysal", tool_name: "Bash", tool_input: { command: "npm run test" } }),
  waiting: ev({ hook_event_name: "Notification", session_id: S1, cwd: "/Users/apple/Documents/Foysal", message: "Claude needs your permission to use Bash" }),
  reply: ev({ source: "claude-project-log-listener", hook_event_name: "TaskCompleted", session_id: S1, cwd: "/Users/apple/Documents/Foysal", reply: "Rate limiting added and all 34 tests pass — ready for review." }),
  stop: ev({ hook_event_name: "Stop", session_id: S1, cwd: "/Users/apple/Documents/Foysal" }),
  s2: ev({ hook_event_name: "PreToolUse", session_id: S2, cwd: "/x/distill-saas", tool_name: "Grep", tool_input: { pattern: "extractor" } }),
  s2snap: ev({ source: "claude-desktop-session-listener", hook_event_name: "ClaudeSessionSnapshot", session_id: S2, thread_title: "Distill engine tuning", cwd: "/x/distill-saas", archived: false, last_activity_at: Date.now() }),
  s3: ev({ hook_event_name: "PreToolUse", session_id: S3, cwd: "/x/artistly-staging", tool_name: "Bash", tool_input: { command: "php artisan migrate" } }),
  s3snap: ev({ source: "claude-desktop-session-listener", hook_event_name: "ClaudeSessionSnapshot", session_id: S3, thread_title: "Artistly staging setup", cwd: "/x/artistly-staging", archived: false, last_activity_at: Date.now() }),
};

async function newPetPage(browser) {
  const page = await browser.newPage({ viewport: VIEW });
  await page.goto(`${BASE}/index.html`);
  await page.addStyleTag({ content: DESK_BG });
  await page.waitForFunction(() => !!window.__petDebug, null, { timeout: 10000 });
  await page.evaluate(() => localStorage.clear());
  return page;
}

const send = (page, event) => page.evaluate((e) => window.__petDebug.handleEvent(e), event);

async function shots(browser) {
  // 1. Working
  let page = await newPetPage(browser);
  await send(page, SCRIPT.snapshot);
  await send(page, SCRIPT.prompt);
  await send(page, SCRIPT.reply);
  await send(page, SCRIPT.bash);
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(DOCS, "shot-working.png"), clip: CLIP });

  // 2. Waiting
  await send(page, SCRIPT.waiting);
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(DOCS, "shot-waiting.png"), clip: CLIP });

  // 3. Review
  await send(page, SCRIPT.stop);
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(DOCS, "shot-review.png"), clip: CLIP });

  // 4. Panel with three sessions
  await send(page, SCRIPT.s2snap); await send(page, SCRIPT.s2);
  await send(page, SCRIPT.s3snap); await send(page, SCRIPT.s3);
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(DOCS, "shot-panel.png"), clip: CLIP });
  await page.close();

  // 5. Roster
  page = await browser.newPage({ viewport: { width: 1100, height: 2400 } });
  await page.goto(`${BASE}/sprites.html`);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(DOCS, "shot-roster.png"), fullPage: true });
  await page.close();

  // 6. Hero close-up — the pet typing on its laptop (crisp @2x, no bubble)
  page = await browser.newPage({ viewport: VIEW, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/index.html`);
  await page.addStyleTag({ content: DESK_BG + "\n#bubble,#panel{display:none !important}" });
  await page.waitForFunction(() => !!window.__petDebug, null, { timeout: 10000 });
  await page.evaluate(() => localStorage.clear());
  await send(page, SCRIPT.snapshot);
  await send(page, SCRIPT.bash);
  await page.waitForTimeout(500);
  const box = await page.locator("#character-area").boundingBox();
  const pad = 20;
  await page.screenshot({
    path: join(DOCS, "shot-hero.png"),
    clip: { x: box.x - pad, y: box.y - pad, width: box.width + pad * 2, height: box.height + pad * 2 },
  });
  await page.close();

  console.log("✓ screenshots");
}

async function demoGif(browser) {
  const page = await newPetPage(browser);
  const FRAME_MS = 220;
  const gif = GIFEncoder();
  // event timeline keyed by frame index
  const timeline = {
    0: [SCRIPT.snapshot],
    2: [SCRIPT.prompt],
    5: [SCRIPT.read],
    8: [SCRIPT.edit],
    11: [SCRIPT.bash],
    15: [SCRIPT.waiting],
    21: [SCRIPT.bash],
    24: [SCRIPT.reply, SCRIPT.stop],
  };
  const FRAMES = 30;
  for (let i = 0; i < FRAMES; i++) {
    for (const e of timeline[i] || []) await send(page, e);
    const buf = await page.screenshot({ clip: CLIP });
    const png = PNG.sync.read(buf);
    const palette = quantize(png.data, 256);
    const index = applyPalette(png.data, palette);
    gif.writeFrame(index, png.width, png.height, { palette, delay: FRAME_MS });
    await page.waitForTimeout(FRAME_MS);
  }
  gif.finish();
  writeFileSync(join(DOCS, "demo.gif"), Buffer.from(gif.bytes()));
  await page.close();
  console.log("✓ demo.gif");
}

const browser = await chromium.launch();
await shots(browser);
await demoGif(browser);
await browser.close();
console.log(`Done → ${DOCS}`);
