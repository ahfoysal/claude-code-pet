#!/usr/bin/env node
// Generates the built-in pet roster — original pixel creatures inspired by
// the same *concepts* as Codex's lineup (duck, flame, owl, rock, sprout,
// stack, crash gremlin, void ghost). Run: node tools/gen-pet-pack.mjs
//
// Each creature: one 24x20 ASCII grid (body on rows 2-18, row 0-1/19 free).
// Frame 2 = body shifted down 1px (breathing). State overlays (laptop, !,
// Zzz, stars…) are shared and drawn at fixed coordinates AFTER the shift.
// Uppercase letters = shared overlay palette; lowercase = per-creature.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "themes");
const W = 24, H = 20;

const OVERLAY_PALETTE = {
  K: "#2a2028", // outline
  W: "#ffffff",
  G: "#6e7686", // laptop body
  L: "#9ce7ff", // screen glow
  Y: "#ffd666", // star / spark
  R: "#ff6b6b", // alert
  B: "#7fb5ff", // sweat / blue accents
  Z: "#bfc7d6", // zzz
  P: "#f2a18c",
};

// ── Shared state overlays (same coordinates as the Clawd theme) ──
const LAPTOP = [
  [5, 14, "KKKKKKKKK"],
  [5, 15, "KLLLLLLLK"],
  [5, 16, "KLLLLLLLK"],
  [4, 17, "KKKKKKKKKKK"],
  [4, 18, "KGGGGGGGGGK"],
  [4, 19, "KKKKKKKKKKK"],
];
const LAPTOP_TYPE = [[7, 15, "W"], [11, 16, "W"], [6, 18, "W"]];
const BANG_A = [[19, 1, "RR"], [19, 2, "RR"], [19, 3, "RR"], [19, 5, "RR"]];
const BANG_B = [[19, 1, "YY"], [19, 2, "YY"], [19, 3, "YY"], [19, 5, "YY"]];
const ZZZ_A = [
  [18, 2, "ZZZ"], [19, 3, "Z"], [18, 4, "ZZZ"],
  [21, 6, "ZZ"], [22, 7, "Z"], [21, 8, "ZZ"],
];
const ZZZ_B = [
  [18, 1, "ZZZ"], [19, 2, "Z"], [18, 3, "ZZZ"],
  [21, 5, "ZZ"], [22, 6, "Z"], [21, 7, "ZZ"],
];
const STARS_A = [[2, 1, "Y"], [19, 3, "Y"], [21, 10, "Y"], [0, 8, "Y"]];
const STARS_B = [[1, 3, "Y"], [20, 1, "Y"], [22, 8, "Y"], [0, 12, "Y"]];
const CONFETTI_A = [[2, 1, "Y"], [6, 0, "R"], [19, 2, "B"], [21, 6, "P"], [0, 6, "B"], [22, 12, "Y"]];
const CONFETTI_B = [[3, 2, "B"], [7, 1, "Y"], [20, 4, "R"], [22, 8, "Y"], [0, 9, "P"], [21, 13, "B"]];
const SWEAT_A = [[17, 5, "B"]];
const SWEAT_B = [[17, 6, "B"], [16, 3, "B"]];
const WAVE_A = [[18, 6, "KK"], [18, 7, "KWK"], [18, 8, "KK"]];
const WAVE_B = [[18, 7, "KK"], [18, 8, "KWK"], [18, 9, "KK"]];

// ── The roster ───────────────────────────────────────
// Concepts parallel to the Codex lineup; art + names + text are original.
const CREATURES = {
  quacks: {
    name: "Quacks",
    description: "A tidy duck for calm workspace days.",
    palette: { y: "#f2cf4e", d: "#d9ab27", o: "#f08c3a", w: "#fff7e6" },
    grid: [
      "......KKKKK.............",
      ".....KyyyyyK............",
      "....KyyyyyyyK...........",
      "....KyKyyyKyK...........",
      "....KyyyyyyyK...........",
      "....Kyyoooyyk...........",
      ".....KyooooK............",
      ".....KyyyyyK............",
      "....KyyyyyyyK...........",
      "...KyywwwwyyyK..........",
      "..KyyywwwwyyyyK.........",
      "..KyyywwwwyyyyK.........",
      "..KdyyywwyyyydK.........",
      "...KdyyyyyyyydK.........",
      "....KdyyyyyydK..........",
      ".....KKKKKKKK...........",
      "......oo..oo............",
      ".....Koo..ooK...........",
    ],
  },
  embyr: {
    name: "Embyr",
    description: "Hot-path energy for fast iteration.",
    palette: { r: "#e8543a", o: "#f28c3a", y: "#ffd35c", w: "#fff2c9" },
    grid: [
      "........r...............",
      ".......ryr..............",
      "......rryrr.............",
      ".....Kroyorr............",
      "....KrooyoorK...........",
      "....KroyyyorK...........",
      "...KrooyyyoorK..........",
      "...KroKyyyKorK..........",
      "...KrooyyyoorK..........",
      "..KrrooyyyoorrK.........",
      "..KrooyywwyoorK.........",
      "..KrooyywwyoorK.........",
      "..KrrooyyyyorrK.........",
      "...KrroooooorK..........",
      "....KrrooorrK...........",
      ".....KrrrrrK............",
      "......KKKKK.............",
      "........................",
    ],
  },
  owlbert: {
    name: "Owlbert",
    description: "Sharp eyes for polished work in a blink.",
    palette: { b: "#8a6144", t: "#6b4a33", c: "#e8cfa8", o: "#f0a03a" },
    grid: [
      "...KK.......KK..........",
      "...KbK.....KbK..........",
      "...KbbKKKKKbbK..........",
      "..KbbbbbbbbbbbK.........",
      "..KbccccbccccbK.........",
      "..KbcKWcbcWKcbK.........",
      "..KbccccbccccbK.........",
      "..KbbccoooccbbK.........",
      "..KbbbbooobbbbK.........",
      "..KbbbbbbbbbbbK.........",
      "..KbtcccccccbtK.........",
      "..KbtcccccccbtK.........",
      "..KbtcccccccbtK.........",
      "..KbbtcccccbbtK.........",
      "...KbbtcccbbtK..........",
      "....KbbbbbbbK...........",
      ".....ooo.ooo............",
      ".....K.K.K.K............",
    ],
  },
  boulder: {
    name: "Boulder",
    description: "A steady rock when the diff gets large.",
    palette: { g: "#9aa0ab", s: "#7c828d", m: "#6a707b", w: "#c9cfd8" },
    grid: [
      "........................",
      "......KKKKKKK...........",
      ".....KggggggsK..........",
      "....KggwwggggsK.........",
      "...KggwggggggssK........",
      "...KggggggggggsK........",
      "..KggKgggggKgggsK.......",
      "..KggggggggggggsK.......",
      "..Kggggmmmgggggsk.......",
      "..KgggggggggggssK.......",
      "..KsgggggggggsssK.......",
      "..KsggwggggggsssK.......",
      "..KssgggggmgsssmK.......",
      "..KssssggggssssmK.......",
      "...KsssssssssmmK........",
      "....KssmmmmmmmK.........",
      ".....KKKKKKKKK..........",
      "........................",
    ],
  },
  sprout: {
    name: "Sprout",
    description: "Small green shoots for new ideas.",
    palette: { g: "#63b85b", n: "#3f8f42", t: "#8a5a3a", w: "#f2e9d8" },
    grid: [
      "........gg..............",
      ".......gngg.............",
      "....gg.gng..............",
      "...gnggKnK..............",
      "....ggnKnK..............",
      "......KnnK..............",
      ".....KtttttK............",
      "....KtwwwwwtK...........",
      "...KtwwwwwwwtK..........",
      "...KtwKwwwKwtK..........",
      "...KtwwwwwwwtK..........",
      "...KtwwnnwwwtK..........",
      "...KttwwwwwttK..........",
      "....KtttttttK...........",
      "....KttttttttK..........",
      "....KttttttttK..........",
      ".....KKKKKKKK...........",
      "........................",
    ],
  },
  stax: {
    name: "Stax",
    description: "A balanced stack for deep work.",
    palette: { a: "#7fb5f0", b: "#f2a04e", c: "#63b85b", w: "#ffffff" },
    grid: [
      "........................",
      "....KKKKKKKKKK..........",
      "...KaaaaaaaaaaK.........",
      "...KaKaaaaKaaaK.........",
      "...KaaaaaaaaaaK.........",
      "...KaawwwwaaaaK.........",
      "...KKKKKKKKKKKK.........",
      "...KbbbbbbbbbbK.........",
      "...KbbbbbbbbbbK.........",
      "...KbbbbbbbbbbK.........",
      "...KKKKKKKKKKKK.........",
      "...KccccccccccK.........",
      "...KccccccccccK.........",
      "...KccccccccccK.........",
      "...KKKKKKKKKKKK.........",
      "........................",
      "........................",
      "........................",
    ],
  },
  oops: {
    name: "Oops",
    description: "A tiny crash-screen gremlin with a soft heart.",
    palette: { b: "#3b6fd4", n: "#2c55a8", w: "#ffffff" },
    grid: [
      "........................",
      "...KKKKKKKKKKKK.........",
      "..KbbbbbbbbbbbbK........",
      "..KbwbbbbbbbbbbK........",
      "..KbbbbbbbbbbbbK........",
      "..KbbWKbbbKWbbbK........",
      "..KbbbbbbbbbbbbK........",
      "..KbbbWbbbWbbbbK........",
      "..KbbbbWWWbbbbbK........",
      "..KbbbbbbbbbbbbK........",
      "..KnbbbbbbbbbbnK........",
      "..KnnbbbbbbbbnnK........",
      "..KKKKKKKKKKKKKK........",
      "....Knn....nnK..........",
      "....KnnK..KnnK..........",
      ".....KK....KK...........",
      "........................",
      "........................",
    ],
  },
  voidling: {
    name: "Voidling",
    description: "A quiet signal from the void.",
    palette: { v: "#4a3f66", d: "#332b47", w: "#e8e4f2" },
    grid: [
      "........................",
      "......KKKKKK............",
      ".....KvvvvvvK...........",
      "....KvvvvvvvvK..........",
      "...KvvvvvvvvvvK.........",
      "...KvvWWvvvvvvK.........",
      "...KvvWWvvvdvvK.........",
      "...KvvvvvvdvdvK.........",
      "...KvvvvvvvdvvK.........",
      "...KvvdvvvvvvvK.........",
      "...KvdvdvvvvvvK.........",
      "...KvvdvvvvdvvK.........",
      "...KvvvvvvdvdvK.........",
      "...KvvvvvvvvvvK.........",
      "....KvvKvvKvvK..........",
      ".....Kv.Kv.KvK..........",
      "......K..K..K...........",
      "........................",
    ],
  },
};

// state → overlays per frame (applied after the breathing shift)
const STATE_OVERLAYS = {
  idle:         [[], []],
  work:         [[LAPTOP], [LAPTOP, LAPTOP_TYPE]],
  success:      [[STARS_A], [STARS_B]],
  taskDone:     [[CONFETTI_A], [CONFETTI_B]],
  error:        [[SWEAT_A], [SWEAT_B]],
  notification: [[BANG_A], [BANG_B]],
  stop:         [[ZZZ_A], [ZZZ_B]],
  sessionStart: [[WAVE_A], [WAVE_B]],
  sessionEnd:   [[ZZZ_A], [ZZZ_B]],
};
const FPS = { idle: 1.6, work: 3, success: 3, taskDone: 3, error: 2.5, notification: 3, stop: 1.2, sessionStart: 3, sessionEnd: 1.2 };
const ALIASES = {
  read: "work", write: "work", bash: "work", search: "work", web: "work",
  task: "work", subagent: "work", thinking: "work", unknown: "work",
};

// ── Rendering ────────────────────────────────────────
function padGrid(rows) {
  // Body rows start at row 2; pad top and bottom to H.
  const out = [];
  out.push(".".repeat(W), ".".repeat(W));
  for (const r of rows) {
    if (r.length > W) throw new Error(`Row too long (${r.length}): "${r}"`);
    out.push(r + ".".repeat(W - r.length));
  }
  while (out.length < H) out.push(".".repeat(W));
  if (out.length > H) throw new Error(`Too many rows: ${out.length}`);
  return out;
}

function toCells(rows) { return rows.map(r => r.split("")); }

function shiftDown(cells) {
  const blank = Array(W).fill(".");
  return [blank, ...cells.slice(0, H - 1).map(r => [...r])];
}

function applyOverlays(cells, overlays) {
  const g = cells.map(r => [...r]);
  for (const patches of overlays) {
    for (const [x, y, s] of patches) {
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === " ") continue;
        const px = x + i;
        if (y >= 0 && y < H && px >= 0 && px < W) g[y][px] = ch;
      }
    }
  }
  return g;
}

function toSVG(cells, palette) {
  const rects = [];
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      const ch = cells[y][x];
      const color = palette[ch];
      if (!color) { x++; continue; }
      let run = 1;
      while (x + run < W && cells[y][x + run] === ch) run++;
      rects.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${color}"/>`);
      x += run;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">\n${rects.join("\n")}\n</svg>\n`;
}

// ── Generate ─────────────────────────────────────────
for (const [id, c] of Object.entries(CREATURES)) {
  const dir = join(ROOT, id);
  mkdirSync(dir, { recursive: true });
  const palette = { ...OVERLAY_PALETTE, ...c.palette };
  const base = toCells(padGrid(c.grid));
  const breathe = shiftDown(base);

  const configStates = {};
  for (const [state, [ov1, ov2]] of Object.entries(STATE_OVERLAYS)) {
    const f1 = toSVG(applyOverlays(base, ov1), palette);
    const f2 = toSVG(applyOverlays(breathe, ov2), palette);
    const file1 = `${state}-1.svg`, file2 = `${state}-2.svg`;
    writeFileSync(join(dir, file1), f1);
    writeFileSync(join(dir, file2), f2);
    configStates[state] = { frames: [file1, file2], fps: FPS[state], src: file1 };
  }
  for (const [alias, target] of Object.entries(ALIASES)) {
    configStates[alias] = configStates[target];
  }

  writeFileSync(
    join(dir, "config.json"),
    JSON.stringify({ name: c.name, description: c.description, type: "image", states: configStates }, null, 2) + "\n"
  );
  console.log(`✓ ${c.name} → ${dir}`);
}
console.log("Pet pack generated.");
