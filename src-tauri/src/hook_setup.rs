use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

const CODEX_HOOK_EVENTS: &[&str] = &[
    "PreToolUse",
    "PostToolUse",
    "PermissionRequest",
    "SessionStart",
    "SubagentStart",
    "SubagentStop",
    "UserPromptSubmit",
    "Stop",
];

const CLAUDE_HOOK_EVENTS: &[&str] = &[
    "PreToolUse",
    "PostToolUse",
    "PostToolUseFailure",
    "Notification",
    "UserPromptSubmit",
    "Stop",
    "SessionStart",
    "SubagentStart",
    "SubagentStop",
    "TaskCompleted",
];

const APP_MARKER: &str = "claude-code-pet";

pub fn install_hooks() -> Result<(), String> {
    let settings_path = codex_hooks_path()?;
    let command = current_hook_command()?;
    register_hooks(&settings_path, &command, CODEX_HOOK_EVENTS)
}

pub fn uninstall_hooks() -> Result<(), String> {
    let settings_path = codex_hooks_path()?;
    unregister_hooks(&settings_path, CODEX_HOOK_EVENTS, "Codex")
}

pub fn install_claude_hooks() -> Result<(), String> {
    let settings_path = claude_settings_path()?;
    let command = current_hook_command()?;
    register_hooks(&settings_path, &command, CLAUDE_HOOK_EVENTS)
}

pub fn uninstall_claude_hooks() -> Result<(), String> {
    let settings_path = claude_settings_path()?;
    unregister_hooks(&settings_path, CLAUDE_HOOK_EVENTS, "Claude")
}

fn codex_hooks_path() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("could not determine home directory")?;
    Ok(home.join(".codex").join("hooks.json"))
}

fn claude_settings_path() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("could not determine home directory")?;
    Ok(home.join(".claude").join("settings.json"))
}

fn current_hook_command() -> Result<String, String> {
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("determine exe path: {e}"))?
        .to_string_lossy()
        .replace('\\', "/");
    Ok(format!("{exe_path} --hook"))
}

fn read_settings(settings_path: &PathBuf) -> Result<serde_json::Value, String> {
    let settings: serde_json::Value = if settings_path.exists() {
        let text = fs::read_to_string(settings_path).map_err(|e| format!("read settings: {e}"))?;
        if text.trim().is_empty() {
            serde_json::json!({})
        } else {
            serde_json::from_str(&text).map_err(|e| format!("parse settings: {e}"))?
        }
    } else {
        serde_json::json!({})
    };

    if !settings.is_object() {
        return Err("settings is not an object".to_string());
    }

    Ok(settings)
}

fn write_settings(settings_path: &PathBuf, settings: &serde_json::Value) -> Result<(), String> {
    if let Some(parent) = settings_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("create settings dir: {e}"))?;
    }

    let json_str =
        serde_json::to_string_pretty(settings).map_err(|e| format!("serialize settings: {e}"))?;
    fs::write(settings_path, json_str + "\n").map_err(|e| format!("write settings: {e}"))?;

    Ok(())
}

fn backup_settings(settings_path: &PathBuf) -> Result<Option<PathBuf>, String> {
    if !settings_path.exists() {
        return Ok(None);
    }

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("system clock error: {e}"))?
        .as_secs();
    let backup_path =
        settings_path.with_file_name(format!("hooks.claude-code-pet-backup-{timestamp}.json"));
    fs::copy(settings_path, &backup_path).map_err(|e| format!("create settings backup: {e}"))?;

    Ok(Some(backup_path))
}

fn is_our_hook_command(command: &str, current_command: Option<&str>) -> bool {
    let is_current = current_command
        .map(|current| command == current)
        .unwrap_or(false);
    is_current || (command.contains(APP_MARKER) && command.contains("--hook"))
}

fn hook_entry(command: &str) -> serde_json::Value {
    serde_json::json!({
        "matcher": "",
        "hooks": [
            {
                "type": "command",
                "command": command,
            }
        ]
    })
}

fn remove_our_hooks(arr: &mut Vec<serde_json::Value>, current_command: Option<&str>) -> usize {
    let before = arr.len();
    arr.retain(|entry| {
        let contains_our_command = entry
            .get("hooks")
            .and_then(|h| h.as_array())
            .map(|hooks_arr| {
                hooks_arr.iter().any(|h| {
                    h.get("command")
                        .and_then(|c| c.as_str())
                        .map(|c| is_our_hook_command(c, current_command))
                        .unwrap_or(false)
                })
            })
            .unwrap_or(false);
        !contains_our_command
    });
    before - arr.len()
}

fn register_hooks(settings_path: &PathBuf, command: &str, events: &[&str]) -> Result<(), String> {
    let mut settings = read_settings(settings_path)?;

    let hooks = settings
        .as_object_mut()
        .ok_or("settings is not an object")?
        .entry("hooks")
        .or_insert_with(|| serde_json::json!({}));

    let hooks_obj = hooks.as_object_mut().ok_or("hooks is not an object")?;

    let mut added = Vec::new();
    let mut replaced = Vec::new();

    for &event in events {
        let event_hooks = hooks_obj
            .entry(event)
            .or_insert_with(|| serde_json::json!([]));

        let arr = event_hooks
            .as_array_mut()
            .ok_or(format!("{event} is not an array"))?;

        let removed = remove_our_hooks(arr, Some(command));
        if removed > 0 {
            replaced.push(event);
        }
        arr.push(hook_entry(command));
        added.push(event);
    }

    if let Some(path) = backup_settings(settings_path)? {
        println!("[pet] Backed up settings to {}", path.display());
    }
    write_settings(settings_path, &settings)?;

    if !added.is_empty() {
        println!("[pet] Installed hooks: {}", added.join(", "));
    }
    if !replaced.is_empty() {
        println!("[pet] Replaced old hooks: {}", replaced.join(", "));
    }

    Ok(())
}

fn unregister_hooks(
    settings_path: &PathBuf,
    events: &[&str],
    product_name: &str,
) -> Result<(), String> {
    if !settings_path.exists() {
        println!("[pet] No {product_name} hooks file found; nothing to remove.");
        return Ok(());
    }

    let mut settings = read_settings(settings_path)?;
    let hooks = match settings.get_mut("hooks").and_then(|h| h.as_object_mut()) {
        Some(h) => h,
        None => {
            println!("[pet] No hooks found; nothing to remove.");
            return Ok(());
        }
    };

    let mut removed_events = Vec::new();

    for &event in events {
        let Some(event_hooks) = hooks.get_mut(event) else {
            continue;
        };
        let arr = event_hooks
            .as_array_mut()
            .ok_or(format!("{event} is not an array"))?;
        let removed = remove_our_hooks(arr, None);
        if removed > 0 {
            removed_events.push(event);
        }
    }

    if removed_events.is_empty() {
        println!("[pet] No Claude Code Pet {product_name} hooks found; nothing to remove.");
        return Ok(());
    }

    if let Some(path) = backup_settings(settings_path)? {
        println!("[pet] Backed up settings to {}", path.display());
    }
    write_settings(settings_path, &settings)?;
    println!("[pet] Removed hooks: {}", removed_events.join(", "));

    Ok(())
}
