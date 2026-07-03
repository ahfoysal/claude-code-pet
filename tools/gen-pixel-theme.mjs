#!/usr/bin/env node
// Generates the "clawd" pixel-art theme: per-state 2-frame SVG sprites
// drawn from ASCII grids. Run: node tools/gen-pixel-theme.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "themes", "clawd");
const W = 24, H = 20;

const PALETTE = {
  K: "#2a1d14", // outline / eyes
  O: "#e08155", // body orange
  D: "#c05f3c", // stripes / shading
  W: "#fff3e4", // belly / muzzle cream
  P: "#f2a18c", // inner ear pink
  G: "#6e7686", // laptop body
  L: "#9ce7ff", // screen glow
  Y: "#ffd666", // spark / star
  R: "#ff6b6b", // alert red
  B: "#7fb5ff", // book / globe blue
  M: "#c9cfdc", // metal / magnifier
  Z: "#bfc7d6", // zzz / thought dots
};

// Base sitting cat, no tail (tail is a patch so it can sway between frames).
const BASE = [
  "........................",
  "...KK.........KK........",
  "..KOOK.......KOOK.......",
  "..KOPOK.....KOPOK.......",
  "..KOOOOKKKKKOOOOK.......",
  ".KOOOOOOOOOOOOOOOK......",
  ".KOOOOOOOOOOOOOOOK......",
  ".KOOKKOOOOOOKKOOOK......",
  ".KOOKKOOOOOOKKOOOK......",
  ".KOOOOOWKWOOOOOOOK......",
  ".KOOOOOWWWOOOOOOOK......",
  "..KOOOOOOOOOOOOOK.......",
  "..KOOWWWWWWWOOOOK.......",
  ".KOODWWWWWWWWOOOOK......",
  ".KOODWWWWWWWWOOOOK......",
  ".KOOOWWWWWWWWOOOOK......",
  ".KOOOOWWWWWWOOOOOK......",
  ".KOOOOOOOOOOOOOOOK......",
  "..KWWKOOOOOOOKWWK.......",
  "..KKKKKKKKKKKKKKK.......",
];

// Patches: [x, y, string]. "." writes transparent, " " skips (keeps what's under).
const TAIL_UP = [
  [19, 11, "KK"],
  [18, 12, "KOK"],
  [18, 13, "KOK"],
  [18, 14, "KOK"],
  [18, 15, "KOK"],
  [17, 16, "KOK"],
  [17, 17, "KK"],
];
const TAIL_DOWN = [
  [19, 13, "KK"],
  [19, 14, "KOK"],
  [18, 15, "KOOK"],
  [17, 16, "KOK"],
  [17, 17, "KK"],
];
const BLINK = [
  [4, 7, "OO"], [12, 7, "OO"],
  [4, 8, "KK"], [12, 8, "KK"],
];
const EYES_DOWN = [
  [4, 7, "OO"], [12, 7, "OO"],
];
const HAPPY_EYES = [ // ^ ^
  [4, 7, "KK"], [12, 7, "KK"],
  [4, 8, "OO"], [12, 8, "OO"],
];
const X_EYES = [
  [4, 7, "KO"], [12, 7, "OK"],
  [4, 8, "OK"], [12, 8, "KO"],
];
const WORRY_MOUTH = [[7, 10, "KKK"]];

const LAPTOP = [
  [5, 14, "KKKKKKKKK"],
  [5, 15, "KLLLLLLLK"],
  [5, 16, "KLLLLLLLK"],
  [4, 17, "KKKKKKKKKKK"],
  [4, 18, "KGGGGGGGGGK"],
  [4, 19, "KKKKKKKKKKK"],
];
const LAPTOP_TYPE = [ // paw + key flicker, frame 2
  [7, 15, "W"],
  [11, 16, "W"],
  [6, 18, "W"],
];
const SPARK_A = [[16, 12, "Y"], [18, 10, "Y"]];
const SPARK_B = [[17, 11, "Y"], [19, 13, "Y"], [15, 9, "Y"]];

const BOOK = [
  [5, 15, "KKKKKKKKK"],
  [5, 16, "KWWWKWWWK"],
  [5, 17, "KWWWKWWWK"],
  [5, 18, "KKKKKKKKK"],
];
const BOOK_MARK = [[10, 16, "B"], [7, 17, "B"]];

const MAGNIFIER_A = [
  [19, 4, "KK"],
  [18, 5, "KLLK"],
  [18, 6, "KLLK"],
  [19, 7, "KK"],
  [20, 8, "K"],
  [21, 9, "K"],
];
const MAGNIFIER_B = [
  [19, 5, "KK"],
  [18, 6, "KLLK"],
  [18, 7, "KLLK"],
  [19, 8, "KK"],
  [20, 9, "K"],
  [21, 10, "K"],
];

const GLOBE_A = [
  [19, 2, "BB"],
  [18, 3, "BWBB"],
  [18, 4, "BBWB"],
  [19, 5, "BB"],
];
const GLOBE_B = [
  [19, 3, "BB"],
  [18, 4, "BBWB"],
  [18, 5, "BWBB"],
  [19, 6, "BB"],
];

const MINI_CAT_A = [
  [19, 14, "K K"],
  [19, 15, "KOOK"],
  [19, 16, "KOOK"],
  [19, 17, "KOOK"],
  [19, 18, "KKKK"],
];
const MINI_CAT_B = [
  [19, 13, "K K"],
  [19, 14, "KOOK"],
  [19, 15, "KOOK"],
  [19, 16, "KOOK"],
  [19, 17, "KKKK"],
  [19, 18, "...."],
];

const STARS_A = [[2, 1, "Y"], [19, 3, "Y"], [21, 10, "Y"], [0, 8, "Y"]];
const STARS_B = [[1, 3, "Y"], [20, 1, "Y"], [22, 8, "Y"], [0, 12, "Y"]];
const CONFETTI_A = [[2, 1, "Y"], [6, 0, "R"], [19, 2, "B"], [21, 6, "P"], [0, 6, "B"], [22, 12, "Y"]];
const CONFETTI_B = [[3, 2, "B"], [7, 1, "Y"], [20, 4, "R"], [22, 8, "Y"], [0, 9, "P"], [21, 13, "B"]];

const BANG_A = [
  [19, 1, "RR"],
  [19, 2, "RR"],
  [19, 3, "RR"],
  [19, 5, "RR"],
];
const BANG_B = [
  [19, 1, "YY"],
  [19, 2, "YY"],
  [19, 3, "YY"],
  [19, 5, "YY"],
];

const SWEAT_A = [[17, 5, "B"]];
const SWEAT_B = [[17, 6, "B"], [16, 3, "B"]];

const ZZZ_A = [
  [18, 2, "ZZZ"], [19, 3, "Z"], [18, 4, "ZZZ"],
  [21, 6, "ZZ"], [22, 7, "Z"], [21, 8, "ZZ"],
];
const ZZZ_B = [
  [18, 1, "ZZZ"], [19, 2, "Z"], [18, 3, "ZZZ"],
  [21, 5, "ZZ"], [22, 6, "Z"], [21, 7, "ZZ"],
];

const THINK_A = [[17, 4, "Z"], [19, 2, "ZZ"]];
const THINK_B = [[17, 3, "Z"], [19, 1, "ZZ"], [21, 0, "Z"]];

const WAVE_A = [
  [18, 6, "KK"],
  [18, 7, "KWK"],
  [18, 8, "KOK"],
  [17, 9, " KOK"],
  [17, 10, " KK"],
];
const WAVE_B = [
  [18, 7, "KK"],
  [18, 8, "KWK"],
  [18, 9, "KOK"],
  [17, 10, " KK"],
];

// state → [frame1 patches, frame2 patches]
// Codex-style: ONE uniform "working on the laptop" animation for every
// working state (the bubble text says what kind of work it is); idle is the
// plain sitting cat, exactly as-is.
const STATES = {
  idle:         { fps: 1.6, frames: [[TAIL_UP], [TAIL_DOWN, BLINK]] },
  work:         { fps: 3,   frames: [[TAIL_UP, EYES_DOWN, LAPTOP], [TAIL_DOWN, EYES_DOWN, LAPTOP, LAPTOP_TYPE]] },
  success:      { fps: 3,   frames: [[TAIL_UP, HAPPY_EYES, STARS_A], [TAIL_DOWN, HAPPY_EYES, STARS_B]] },
  taskDone:     { fps: 3,   frames: [[TAIL_UP, HAPPY_EYES, CONFETTI_A], [TAIL_DOWN, HAPPY_EYES, CONFETTI_B]] },
  error:        { fps: 2.5, frames: [[TAIL_DOWN, X_EYES, WORRY_MOUTH, SWEAT_A], [TAIL_UP, X_EYES, WORRY_MOUTH, SWEAT_B]] },
  notification: { fps: 3,   frames: [[TAIL_UP, BANG_A], [TAIL_DOWN, BANG_B]] },
  stop:         { fps: 1.2, frames: [[TAIL_DOWN, BLINK, ZZZ_A], [TAIL_DOWN, BLINK, ZZZ_B]] },
  sessionStart: { fps: 3,   frames: [[TAIL_UP, WAVE_A], [TAIL_DOWN, WAVE_B]] },
  sessionEnd:   { fps: 1.2, frames: [[TAIL_DOWN, BLINK, ZZZ_A], [TAIL_DOWN, BLINK, ZZZ_B]] },
};

// Every working state uses the same laptop animation, like Codex's "run".
const ALIASES = {
  read: "work", write: "work", bash: "work", search: "work", web: "work",
  task: "work", subagent: "work", thinking: "work", unknown: "work",
};

// ── Rendering ────────────────────────────────────────
function makeGrid() {
  const rows = BASE.map(r => {
    if (r.length > W) throw new Error(`Base row too long: "${r}" (${r.length})`);
    return (r + ".".repeat(W - r.length)).split("");
  });
  if (rows.length !== H) throw new Error(`Base must have ${H} rows, has ${rows.length}`);
  return rows;
}

function applyPatches(grid, patchSets) {
  for (const patches of patchSets) {
    for (const [x, y, s] of patches) {
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === " ") continue;
        const px = x + i;
        if (y >= 0 && y < H && px >= 0 && px < W) grid[y][px] = ch;
      }
    }
  }
  return grid;
}

function toSVG(grid) {
  const rects = [];
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      const ch = grid[y][x];
      if (ch === "." || !PALETTE[ch]) { x++; continue; }
      let run = 1;
      while (x + run < W && grid[y][x + run] === ch) run++;
      rects.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${PALETTE[ch]}"/>`);
      x += run;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">\n${rects.join("\n")}\n</svg>\n`;
}

// ── Generate ─────────────────────────────────────────
mkdirSync(OUT, { recursive: true });

const configStates = {};
for (const [state, def] of Object.entries(STATES)) {
  const files = [];
  def.frames.forEach((patchSets, i) => {
    const svg = toSVG(applyPatches(makeGrid(), patchSets));
    const file = `${state}-${i + 1}.svg`;
    writeFileSync(join(OUT, file), svg);
    files.push(file);
  });
  configStates[state] = { frames: files, fps: def.fps, src: files[0] };
}
for (const [alias, target] of Object.entries(ALIASES)) {
  configStates[alias] = configStates[target];
}

const config = {
  name: "Clawd (Pixel Cat)",
  type: "image",
  states: configStates,
};
writeFileSync(join(OUT, "config.json"), JSON.stringify(config, null, 2) + "\n");

console.log(`Generated ${Object.keys(STATES).length} states → ${OUT}`);
