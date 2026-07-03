// Prevents additional console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod claude_listener;
mod hook_sender;
mod hook_setup;
mod server;
mod themes;

use std::sync::Mutex;

/// Interactive rectangles (physical px, relative to the window content) that
/// the pet occupies. Everything else is transparent → clicks pass through.
#[derive(Default)]
struct HitRegions(Mutex<Vec<[f64; 4]>>);

/// The frontend reports which parts of the overlay are actually drawn
/// (pet, bubble, panel). Used to decide when to let clicks through.
#[tauri::command]
fn set_hit_regions(regions: Vec<[f64; 4]>, state: tauri::State<HitRegions>) {
    if let Ok(mut guard) = state.0.lock() {
        *guard = regions;
    }
}

fn main() {
    // --hook mode: lightweight stdin->TCP sender for agent hooks.
    if std::env::args().any(|a| a == "--hook") {
        hook_sender::run_hook_sender();
        return;
    }

    if std::env::args().any(|a| a == "install-hooks") {
        if let Err(e) = hook_setup::install_hooks() {
            eprintln!("[pet] Failed to install hooks: {e}");
            std::process::exit(1);
        }
        return;
    }

    if std::env::args().any(|a| a == "uninstall-hooks") {
        if let Err(e) = hook_setup::uninstall_hooks() {
            eprintln!("[pet] Failed to uninstall hooks: {e}");
            std::process::exit(1);
        }
        return;
    }

    if std::env::args().any(|a| a == "install-claude-hooks") {
        if let Err(e) = hook_setup::install_claude_hooks() {
            eprintln!("[pet] Failed to install Claude hooks: {e}");
            std::process::exit(1);
        }
        return;
    }

    if std::env::args().any(|a| a == "uninstall-claude-hooks") {
        if let Err(e) = hook_setup::uninstall_claude_hooks() {
            eprintln!("[pet] Failed to uninstall Claude hooks: {e}");
            std::process::exit(1);
        }
        return;
    }

    // Normal mode: run the GUI app
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_deep_link::init())
        .manage(HitRegions::default())
        .invoke_handler(tauri::generate_handler![
            themes::list_themes,
            themes::get_theme_image,
            focus_claude,
            set_hit_regions,
        ])
        .setup(|app| {
            // Overlay companion: no Dock icon, no app switcher entry.
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // Follow the user everywhere: every Space AND fullscreen apps.
            #[cfg(target_os = "macos")]
            if let Some(window) = tauri::Manager::get_webview_window(app, "pet") {
                make_overlay_everywhere(&window);
            }

            // Selective click-through: only the pet/bubble/panel capture the
            // cursor; the transparent rest of the window passes clicks to the
            // app underneath. Poll the global cursor and toggle accordingly.
            if let Some(window) = tauri::Manager::get_webview_window(app, "pet") {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    // Start click-through until the frontend reports regions.
                    let _ = window.set_ignore_cursor_events(true);
                    let mut ignoring = true;
                    loop {
                        // On any query failure, default to "over pet" so the
                        // pet always stays clickable (worst case: old behavior).
                        let inside = match cursor_over_pet(&window, &handle) {
                            Some(v) => v,
                            None => true,
                        };
                        let want_ignore = !inside; // capture only over the pet
                        if want_ignore != ignoring {
                            let _ = window.set_ignore_cursor_events(want_ignore);
                            ignoring = want_ignore;
                        }
                        tokio::time::sleep(std::time::Duration::from_millis(45)).await;
                    }
                });
            }

            // Codex-style pet install deep link:
            //   claude-code-pet://pets/install?name=Robo&imageUrl=https://…/robo.png
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                let handle = app.handle().clone();
                app.deep_link().on_open_url(move |event| {
                    for url in event.urls() {
                        handle_pet_install_url(&handle, url.as_str());
                    }
                });
            }

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(server::socket_server(handle));
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(claude_listener::watch_claude_activity(handle));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// True when the global cursor sits over one of the pet's drawn regions.
/// Coordinates are physical pixels; regions are reported window-relative.
fn cursor_over_pet(
    window: &tauri::WebviewWindow,
    handle: &tauri::AppHandle,
) -> Option<bool> {
    use tauri::Manager;
    let cursor = window.cursor_position().ok()?;
    let origin = window.inner_position().ok()?;
    let x = cursor.x - origin.x as f64;
    let y = cursor.y - origin.y as f64;
    let regions = handle.state::<HitRegions>();
    let guard = regions.0.lock().ok()?;
    Some(
        guard
            .iter()
            .any(|[rx, ry, rw, rh]| x >= *rx && x <= rx + rw && y >= *ry && y <= ry + rh),
    )
}

/// Handle claude-code-pet://pets/install?name=…&imageUrl=https://…
/// Downloads the image into a user theme (all states use it) and tells the
/// frontend to switch, mirroring Codex's codex://pets/install deep link.
fn handle_pet_install_url(app: &tauri::AppHandle, raw: &str) {
    use tauri::Emitter;

    let Ok(url) = tauri::Url::parse(raw) else {
        return;
    };
    if url.scheme() != "claude-code-pet" {
        return;
    }
    let is_install = url.host_str() == Some("pets")
        && url.path().trim_start_matches('/').starts_with("install");
    if !is_install {
        return;
    }

    let mut name = String::new();
    let mut image_url = String::new();
    let mut description = String::new();
    for (k, v) in url.query_pairs() {
        match k.as_ref() {
            "name" => name = v.trim().to_string(),
            "imageUrl" => image_url = v.trim().to_string(),
            "description" => description = v.trim().to_string(),
            _ => {}
        }
    }
    // Codex rules: name required, imageUrl required and HTTPS-only.
    if name.is_empty() || !image_url.starts_with("https://") {
        return;
    }

    let slug: String = name
        .to_lowercase()
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
        .collect::<String>()
        .trim_matches('-')
        .to_string();
    if slug.is_empty() {
        return;
    }

    let Some(home) = dirs::home_dir() else { return };
    let dir = home.join(".claude-code-pet").join("themes").join(&slug);
    if std::fs::create_dir_all(&dir).is_err() {
        return;
    }

    let ext = tauri::Url::parse(&image_url)
        .ok()
        .and_then(|u| {
            std::path::Path::new(u.path())
                .extension()
                .and_then(|e| e.to_str())
                .map(|e| e.to_lowercase())
        })
        .filter(|e| ["png", "gif", "webp", "jpg", "jpeg", "svg"].contains(&e.as_str()))
        .unwrap_or_else(|| "png".to_string());
    let file = format!("pet.{ext}");
    let out = dir.join(&file);

    let app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let ok = std::process::Command::new("curl")
            .args([
                "-fsSL",
                "--max-time",
                "20",
                "--max-filesize",
                "8000000",
                "--proto",
                "=https",
                "-o",
                out.to_string_lossy().as_ref(),
                &image_url,
            ])
            .status()
            .map(|s| s.success())
            .unwrap_or(false);
        if !ok {
            return;
        }

        let states = [
            "idle", "thinking", "read", "write", "bash", "search", "web", "task",
            "subagent", "unknown", "success", "taskDone", "error", "notification",
            "stop", "sessionStart", "sessionEnd",
        ];
        let mut state_map = serde_json::Map::new();
        for s in states {
            state_map.insert(s.to_string(), serde_json::json!({ "src": file }));
        }
        let config = serde_json::json!({
            "name": name,
            "description": description,
            "type": "image",
            "states": state_map,
        });
        if std::fs::write(
            dir.join("config.json"),
            serde_json::to_string_pretty(&config).unwrap_or_default(),
        )
        .is_ok()
        {
            let _ = app.emit("theme-installed", serde_json::json!({ "id": slug }));
        }
    });
}

/// Codex-style: clicking the pet jumps to the Claude app.
#[tauri::command]
fn focus_claude() {
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open")
            .args(["-a", "Claude"])
            .spawn();
    }
}

/// Tauri's alwaysOnTop + visibleOnAllWorkspaces is not enough on macOS to
/// appear over fullscreen apps: the window also needs the fullScreenAuxiliary
/// collection behavior and a status-bar window level.
#[cfg(target_os = "macos")]
fn make_overlay_everywhere(window: &tauri::WebviewWindow) {
    use objc2::msg_send;
    use objc2::runtime::AnyObject;

    let Ok(ns_window) = window.ns_window() else {
        return;
    };

    unsafe {
        let ns = ns_window as *mut AnyObject;
        // canJoinAllSpaces (1<<0) | ignoresCycle (1<<6) | fullScreenAuxiliary (1<<8)
        let behavior: u64 = (1 << 0) | (1 << 6) | (1 << 8);
        let _: () = msg_send![ns, setCollectionBehavior: behavior];
        // NSStatusWindowLevel — above normal windows and fullscreen Spaces.
        let _: () = msg_send![ns, setLevel: 25isize];
    }
}
