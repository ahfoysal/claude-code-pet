import { t, getLang, setLang, getAvailableLangs, initI18n } from "./i18n.js";
import {
  handleEvent, cleanupSessions, refreshDisplay, resetSessions,
  isQuietMode, setQuietMode, isTucked, setTucked, pokePet, togglePanel,
} from "./sessions.js";
import { initThemes, setTheme, getThemes, getCurrentThemeId } from "./themes.js";
import { isSoundsEnabled, setSoundsEnabled } from "./audio.js";

// ── Tauri Event Listener ─────────────────────────────
async function initTauriListener() {
  try {
    const { listen } = window.__TAURI__.event;
    await listen("pet-event", (e) => {
      handleEvent(e.payload);
    });
    // Deep-link pet install (claude-code-pet://pets/install?…) finished — switch.
    await listen("theme-installed", async (e) => {
      await initThemes();
      if (e.payload && e.payload.id) await setTheme(e.payload.id);
      refreshDisplay();
    });
    console.log("[pet] Tauri event listener ready");
  } catch (err) {
    console.warn("[pet] Tauri API not available (browser preview mode)");
  }
}

// ── Window Position (default bottom-right, persisted) ─
// Saved positions are clamped to a real monitor so the pet can never end up
// half off-screen (e.g. after unplugging a display).
async function clampToMonitors(win, x, y) {
  const { availableMonitors } = window.__TAURI__.window;
  const size = await win.outerSize();
  const monitors = await availableMonitors();
  if (!monitors.length) return { x, y };
  const contains = (m) =>
    x + size.width / 2 >= m.position.x &&
    x + size.width / 2 < m.position.x + m.size.width &&
    y + size.height / 2 >= m.position.y &&
    y + size.height / 2 < m.position.y + m.size.height;
  const m = monitors.find(contains) || monitors[0];
  const maxX = m.position.x + m.size.width - size.width;
  const maxY = m.position.y + m.size.height - size.height;
  return {
    x: Math.min(Math.max(x, m.position.x), Math.max(m.position.x, maxX)),
    y: Math.min(Math.max(y, m.position.y), Math.max(m.position.y, maxY)),
  };
}

// Flip the pet/bubble to the LEFT of the window (content extends right) when
// the window sits in the left part of the screen — so the bubble never renders
// off the left edge.
async function updateAnchor(win) {
  try {
    const { currentMonitor } = window.__TAURI__.window;
    const pos = await win.outerPosition();
    const mon = await currentMonitor();
    if (!mon) return;
    const relLeft = pos.x - mon.position.x;
    const anchorLeft = relLeft < mon.size.width * 0.3;
    document.body.classList.toggle("anchor-left", anchorLeft);
  } catch { /* ignore */ }
}

async function initPosition() {
  try {
    const { getCurrentWindow, currentMonitor, PhysicalPosition } = window.__TAURI__.window;
    const win = getCurrentWindow();

    const saved = localStorage.getItem("claude-code-pet-pos");
    if (saved) {
      const { x, y } = JSON.parse(saved);
      const safe = await clampToMonitors(win, x, y);
      await win.setPosition(new PhysicalPosition(safe.x, safe.y));
    } else {
      const mon = await currentMonitor();
      if (mon) {
        const size = await win.outerSize();
        const x = mon.position.x + mon.size.width - size.width - 18;
        const y = mon.position.y + mon.size.height - size.height - 46;
        await win.setPosition(new PhysicalPosition(x, y));
      }
    }
    await updateAnchor(win);

    let saveTimer = null;
    let walkTimer = null;
    await win.onMoved(({ payload }) => {
      // Walking animation while the window is being dragged around.
      document.body.classList.add("is-dragging");
      clearTimeout(walkTimer);
      walkTimer = setTimeout(() => document.body.classList.remove("is-dragging"), 260);

      clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        // Drag settled: snap fully on-screen and choose the anchor side.
        const safe = await clampToMonitors(win, payload.x, payload.y);
        if (safe.x !== payload.x || safe.y !== payload.y) {
          await win.setPosition(new PhysicalPosition(safe.x, safe.y));
        }
        await updateAnchor(win);
        localStorage.setItem("claude-code-pet-pos", JSON.stringify({ x: safe.x, y: safe.y }));
      }, 300);
    });
  } catch { /* browser preview mode */ }
}

// ── Drag vs. Click on the pet ────────────────────────
// Codex-style: click the pet → jump to the Claude app. Click the bubble or
// panel → expand/collapse sessions. Drag anywhere moves the pet;
// double-click tucks it away.
const charArea = document.getElementById("character-area");
let downPos = null;
let dragged = false;
let clickTimer = null;

async function focusClaude() {
  try {
    await window.__TAURI__.core.invoke("focus_claude");
  } catch { /* browser preview mode */ }
}

charArea.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  downPos = [e.screenX, e.screenY];
  dragged = false;
});

charArea.addEventListener("mousemove", async (e) => {
  if (!downPos || dragged) return;
  if (Math.hypot(e.screenX - downPos[0], e.screenY - downPos[1]) > 8) {
    dragged = true;
    try {
      const { getCurrentWindow } = window.__TAURI__.window;
      await getCurrentWindow().startDragging();
    } catch {}
  }
});

// Click = mouseup without real movement (more reliable than click events
// on a non-activating overlay). Short delay distinguishes double-click.
charArea.addEventListener("mouseup", (e) => {
  if (e.button !== 0 || !downPos || dragged) return;
  const moved = Math.hypot(e.screenX - downPos[0], e.screenY - downPos[1]);
  if (moved > 8) return;
  if (e.target.closest("#pet-badge")) return; // badge has its own action
  clearTimeout(clickTimer);
  clickTimer = setTimeout(() => {
    const awake = pokePet();
    if (awake) focusClaude();
  }, 200);
});

// ⌄ under the bubble = tuck away, exactly like double-click.
// Clicking the small tucked pet wakes it again.
document.getElementById("bubble-toggle").addEventListener("click", (e) => {
  e.stopPropagation();
  setTucked(true);
});

window.addEventListener("mouseup", () => { downPos = null; });

charArea.addEventListener("dblclick", (e) => {
  if (e.button !== 0) return;
  clearTimeout(clickTimer);
  setTucked(!isTucked());
});

// Badge → session panel; bubble & panel rows → jump to Claude.
const badgeEl = document.getElementById("pet-badge");
badgeEl.addEventListener("mouseup", (e) => e.stopPropagation());
badgeEl.addEventListener("click", (e) => {
  e.stopPropagation();
  togglePanel();
});

document.getElementById("bubble").addEventListener("click", (e) => {
  if (e.button !== 0) return;
  focusClaude();
});

document.getElementById("panel").addEventListener("click", (e) => {
  if (e.button !== 0) return;
  if (e.target.closest(".panel-row")) focusClaude();
});

// Anywhere else on the overlay drags the window.
document.getElementById("pet-container").addEventListener("mousedown", async (e) => {
  if (e.button !== 0) return;
  if (e.target.closest("#character-area")) return;
  try {
    const { getCurrentWindow } = window.__TAURI__.window;
    await getCurrentWindow().startDragging();
  } catch {}
});

// ── Context Menu (Native) ────────────────────────────
document.addEventListener("contextmenu", async (e) => {
  e.preventDefault();
  try {
    const { Menu, MenuItem, Submenu, PredefinedMenuItem } = window.__TAURI__.menu;

    // Language submenu
    const langs = getAvailableLangs();
    const curLang = getLang();
    const langItems = [];
    for (const lang of langs) {
      const prefix = lang.code === curLang ? "* " : "  ";
      const item = await MenuItem.new({
        id: `lang-${lang.code}`,
        text: `${prefix}${lang.name}`,
        action: () => {
          setLang(lang.code);
          refreshDisplay();
        },
      });
      langItems.push(item);
    }

    const langMenu = await Submenu.new({
      id: "lang-menu",
      text: t("selectLang"),
      items: langItems,
    });

    // Theme submenu
    const themeList = getThemes();
    const currentThemeId = getCurrentThemeId();
    const themeItems = [];
    for (const theme of themeList) {
      const prefix = theme.id === currentThemeId ? "* " : "  ";
      const item = await MenuItem.new({
        id: `theme-${theme.id}`,
        text: `${prefix}${theme.name}`,
        action: async () => {
          await setTheme(theme.id);
          refreshDisplay();
        },
      });
      themeItems.push(item);
    }

    let themeMenu = null;
    if (themeItems.length > 0) {
      themeMenu = await Submenu.new({
        id: "theme-menu",
        text: t("selectTheme"),
        items: themeItems,
      });
    }

    const quietPrefix = isQuietMode() ? "* " : "  ";
    const quietItem = await MenuItem.new({
      id: "quiet-mode",
      text: `${quietPrefix}${t("focusMode")}`,
      action: () => {
        setQuietMode(!isQuietMode());
        if (isQuietMode()) {
          resetSessions();
        }
      },
    });

    const soundPrefix = isSoundsEnabled() ? "* " : "  ";
    const soundItem = await MenuItem.new({
      id: "sound-alerts",
      text: `${soundPrefix}${t("soundAlerts")}`,
      action: () => {
        setSoundsEnabled(!isSoundsEnabled());
      },
    });

    const refreshPetsItem = await MenuItem.new({
      id: "refresh-pets",
      text: t("refreshPets"),
      action: async () => {
        await initThemes();
        refreshDisplay();
      },
    });

    const resetItem = await MenuItem.new({
      id: "reset-sessions",
      text: t("resetSessions"),
      action: () => {
        resetSessions();
      },
    });

    const resetPosItem = await MenuItem.new({
      id: "reset-position",
      text: t("resetPosition"),
      action: async () => {
        localStorage.removeItem("claude-code-pet-pos");
        await initPosition();
      },
    });

    const tuckPrefix = isTucked() ? "* " : "  ";
    const tuckItem = await MenuItem.new({
      id: "tuck-pet",
      text: `${tuckPrefix}${isTucked() ? t("wakePet") : t("tuckPet")}`,
      action: () => {
        setTucked(!isTucked());
      },
    });

    const separator = await PredefinedMenuItem.new({ item: "Separator" });

    const quitItem = await MenuItem.new({
      id: "quit",
      text: t("quit"),
      action: async () => {
        try {
          const { exit } = window.__TAURI__.process;
          await exit(0);
        } catch {
          window.close();
        }
      },
    });

    const items = [langMenu];
    if (themeMenu) items.push(themeMenu);
    items.push(quietItem, soundItem, tuckItem, refreshPetsItem, resetItem, resetPosItem, separator, quitItem);

    const menu = await Menu.new({ items });
    await menu.popup();
  } catch (err) {
    console.warn("[pet] Native menu failed:", err);
  }
});

// ── Debug hook (browser preview / manual testing) ────
window.__petDebug = { handleEvent, refreshDisplay, resetSessions, setTheme };

// ── Init ─────────────────────────────────────────────
async function init() {
  await initI18n();
  await initThemes();
  refreshDisplay();
  initTauriListener();
  initPosition();
  setInterval(cleanupSessions, 10000);
}

init();
