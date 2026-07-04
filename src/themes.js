import { SPRITE_FALLBACK } from "./states.js";

// ── Theme System ─────────────────────────────────────
// Theme config: { name, type: "emoji"|"image", states: { [stateId]: StateConf } }
// StateConf: { emoji } | { src } | { frames: [file, ...], fps }
// `frames` animates by cycling images; `src` is a static single image.

let themes = [];
let currentTheme = null;
let imageCache = {};
let loadedFontFace = null;
let browserMode = false; // running outside Tauri (plain browser preview)

const BUILTIN_THEME_IDS = [
  "clawd", "quacks", "embyr", "owlbert", "boulder", "sprout", "stax", "oops", "voidling",
];

export async function initThemes() {
  try {
    const { invoke } = window.__TAURI__.core;
    themes = await invoke("list_themes");
  } catch {
    // Browser preview fallback: load built-in theme configs over HTTP.
    browserMode = true;
    themes = [];
    for (const id of BUILTIN_THEME_IDS) {
      try {
        const res = await fetch(`themes/${id}/config.json`);
        if (!res.ok) continue;
        const config = await res.json();
        themes.push({
          id,
          name: config.name || id,
          type: config.type || "emoji",
          states: config.states || {},
          colors: config.colors,
          font: config.font,
          builtin: true,
        });
      } catch { /* theme not present */ }
    }
  }

  const savedId = localStorage.getItem("claude-code-pet-theme");
  const found = themes.find(t => t.id === savedId);
  if (found) {
    await setTheme(found.id);
  } else {
    const def = themes.find(t => t.id === "clawd") || themes[0] || null;
    if (def) await setTheme(def.id);
  }
}

export async function setTheme(id) {
  const theme = themes.find(t => t.id === id);
  if (!theme) return;

  currentTheme = theme;
  localStorage.setItem("claude-code-pet-theme", id);

  if (theme.type === "image") {
    await preloadThemeImages(theme);
  }
  await applyThemeFont(theme);
}

// ── Font ─────────────────────────────────────────────
async function applyThemeFont(theme) {
  const root = document.documentElement;

  if (loadedFontFace) {
    document.fonts.delete(loadedFontFace);
    loadedFontFace = null;
  }

  if (!theme.font) {
    root.style.removeProperty("--pet-font");
    return;
  }

  if (typeof theme.font === "string") {
    root.style.setProperty("--pet-font", theme.font);
    return;
  }

  if (theme.font.family && theme.font.src) {
    try {
      const uri = await imageUri(theme.id, theme.font.src);
      const face = new FontFace(theme.font.family, `url(${uri})`);
      await face.load();
      document.fonts.add(face);
      loadedFontFace = face;
      root.style.setProperty("--pet-font", theme.font.family);
    } catch (e) {
      console.warn("[pet] Failed to load theme font:", e);
      root.style.removeProperty("--pet-font");
    }
  }
}

// ── Images ───────────────────────────────────────────
async function imageUri(themeId, filename) {
  if (browserMode) return `themes/${themeId}/${filename}`;
  const { invoke } = window.__TAURI__.core;
  return invoke("get_theme_image", { themeId, filename });
}

function stateFiles(stateConf) {
  if (!stateConf) return [];
  if (Array.isArray(stateConf.frames) && stateConf.frames.length) return stateConf.frames;
  if (stateConf.src) return [stateConf.src];
  return [];
}

async function preloadThemeImages(theme) {
  const states = theme.states || {};
  for (const stateConf of Object.values(states)) {
    for (const file of stateFiles(stateConf)) {
      const cacheKey = `${theme.id}/${file}`;
      if (imageCache[cacheKey]) continue;
      try {
        imageCache[cacheKey] = await imageUri(theme.id, file);
      } catch (e) {
        console.warn(`[pet] Failed to load theme image: ${cacheKey}`, e);
      }
    }
  }
}

function resolveStateConf(theme, stateId) {
  const states = theme.states || {};
  if (states[stateId]) return states[stateId];
  const fallbackId = SPRITE_FALLBACK[stateId];
  if (fallbackId && states[fallbackId]) return states[fallbackId];
  return states["idle"];
}

/**
 * @param {object} stateObj - state from states.js (has stateId, emoji)
 * @returns {{ type: "emoji", content: string } |
 *           { type: "image", content: string, frames: string[], fps: number }}
 */
export function getCharacterForState(stateObj) {
  const stateId = stateObj.stateId || "idle";

  if (currentTheme && currentTheme.type === "image") {
    const stateConf = resolveStateConf(currentTheme, stateId);
    const files = stateFiles(stateConf);
    const frames = files
      .map(f => imageCache[`${currentTheme.id}/${f}`])
      .filter(Boolean);
    if (frames.length) {
      return {
        type: "image",
        content: frames[0],
        frames,
        fps: (stateConf && stateConf.fps) || 2,
      };
    }
  }

  if (currentTheme && currentTheme.type === "emoji") {
    const stateConf = currentTheme.states?.[stateId];
    if (stateConf?.emoji) {
      return { type: "emoji", content: stateConf.emoji };
    }
  }

  return { type: "emoji", content: stateObj.emoji || "🤖" };
}

export function getThemes() {
  return themes;
}

export function getCurrentThemeId() {
  return currentTheme?.id || "clawd";
}

export function getCurrentThemeName() {
  return currentTheme?.name || "";
}
