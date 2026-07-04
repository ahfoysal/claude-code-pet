use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use tauri::Emitter;
use tokio::time::{sleep, Duration};

#[derive(Clone, Debug, Default)]
struct FileState {
    modified_ms: u128,
    len: u64,
    activity: u64,
}

pub async fn watch_claude_activity(app: tauri::AppHandle) {
    let mut seen: HashMap<PathBuf, FileState> = HashMap::new();
    let mut ticks = 0u64;

    loop {
        ticks += 1;
        // Session snapshots refresh chat titles; cheap, so refresh regularly
        // and at startup.
        if ticks == 1 || ticks % 3 == 0 {
            emit_recent_session_snapshots(&app);
        }
        scan_session_files(&app, &mut seen);
        scan_project_logs(&app, &mut seen);
        sleep(Duration::from_secs(2)).await;
    }
}

/// Desktop-app session files store numbers as strings ("1782986573204").
fn json_u64(v: Option<&Value>) -> u64 {
    match v {
        Some(Value::Number(n)) => n.as_u64().unwrap_or_default(),
        Some(Value::String(s)) => s.parse().unwrap_or_default(),
        _ => 0,
    }
}

fn json_bool(v: Option<&Value>) -> bool {
    match v {
        Some(Value::Bool(b)) => *b,
        Some(Value::String(s)) => s.eq_ignore_ascii_case("true"),
        _ => false,
    }
}

/// Emit title/metadata snapshots for sessions active in the last 30 minutes,
/// so the pet can label live sessions with their chat name (e.g. "Hallo").
fn emit_recent_session_snapshots(app: &tauri::AppHandle) {
    let Some(root) = claude_session_root() else {
        return;
    };

    let now_ms = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or_default();

    let mut emitted = 0;
    for path in collect_files(&root, "json") {
        if emitted >= 12 {
            break;
        }
        let Ok(text) = fs::read_to_string(&path) else {
            continue;
        };
        let Ok(json) = serde_json::from_str::<Value>(&text) else {
            continue;
        };
        let activity = json_u64(json.get("lastActivityAt"));
        if activity == 0 || now_ms.saturating_sub(activity) > 30 * 60 * 1000 {
            continue;
        }
        if let Some(payload) = snapshot_payload(&json) {
            let _ = app.emit("pet-event", &payload);
            emitted += 1;
        }
    }
}

fn scan_session_files(app: &tauri::AppHandle, seen: &mut HashMap<PathBuf, FileState>) {
    let Some(root) = claude_session_root() else {
        return;
    };

    for path in collect_files(&root, "json") {
        let Ok(meta) = fs::metadata(&path) else {
            continue;
        };
        let modified_ms = modified_ms(&meta.modified().ok());
        let len = meta.len();
        let previous = seen.get(&path).cloned().unwrap_or_default();
        if previous.modified_ms == modified_ms && previous.len == len {
            continue;
        }

        let Ok(text) = fs::read_to_string(&path) else {
            continue;
        };
        let Ok(json) = serde_json::from_str::<Value>(&text) else {
            continue;
        };

        let activity = json_u64(json.get("lastActivityAt"));

        seen.insert(
            path.clone(),
            FileState {
                modified_ms,
                len,
                activity,
            },
        );

        if previous.activity == activity && previous.activity != 0 {
            continue;
        }

        if let Some(payload) = snapshot_payload(&json) {
            let _ = app.emit("pet-event", &payload);
        }
    }
}

fn snapshot_payload(json: &Value) -> Option<Value> {
    let cwd = json
        .get("cwd")
        .or_else(|| json.get("originCwd"))
        .and_then(Value::as_str)
        .unwrap_or("");
    // The real chat title (Recents sidebar name); fall back to the folder.
    let title = json
        .get("title")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|t| !t.is_empty())
        .map(str::to_string)
        .unwrap_or_else(|| {
            if cwd.is_empty() {
                String::new()
            } else {
                format!("Working in {}", cwd.rsplit('/').next().unwrap_or(cwd))
            }
        });

    Some(serde_json::json!({
        "source": "claude-desktop-session-listener",
        "hook_event_name": "ClaudeSessionSnapshot",
        "session_id": json.get("cliSessionId").or_else(|| json.get("sessionId")).and_then(Value::as_str).unwrap_or(""),
        "thread_title": title,
        "cwd": cwd,
        "archived": json_bool(json.get("isArchived")),
        "last_activity_at": json_u64(json.get("lastActivityAt")),
    }))
}

fn scan_project_logs(app: &tauri::AppHandle, seen: &mut HashMap<PathBuf, FileState>) {
    let Some(home) = dirs::home_dir() else {
        return;
    };
    let root = home.join(".claude").join("projects");

    for path in collect_files(&root, "jsonl") {
        let Ok(meta) = fs::metadata(&path) else {
            continue;
        };
        let modified_ms = modified_ms(&meta.modified().ok());
        let len = meta.len();
        let previous = seen.get(&path).cloned().unwrap_or_default();
        if previous.modified_ms == modified_ms && previous.len == len {
            continue;
        }

        seen.insert(
            path.clone(),
            FileState {
                modified_ms,
                len,
                activity: 0,
            },
        );

        if previous.len == 0 || len <= previous.len {
            continue;
        }

        if let Some(payload) = payload_from_last_jsonl_line(&path) {
            let _ = app.emit("pet-event", &payload);
        }
    }
}

fn payload_from_last_jsonl_line(path: &Path) -> Option<Value> {
    let file = fs::File::open(path).ok()?;
    let len = file.metadata().ok()?.len();
    let start = len.saturating_sub(16 * 1024);
    let mut reader = BufReader::new(file);
    reader.seek(SeekFrom::Start(start)).ok()?;

    let mut last = None;
    for line in reader.lines().map_while(Result::ok) {
        if !line.trim().is_empty() {
            last = Some(line);
        }
    }

    let json = serde_json::from_str::<Value>(&last?).ok()?;
    let event = infer_event(&json);
    let tool_name = infer_tool_name(&json).unwrap_or_default();
    let cwd = json.get("cwd").and_then(Value::as_str).unwrap_or("");
    let prompt = if event == "UserPromptSubmit" {
        infer_message_text(&json).unwrap_or_default()
    } else {
        String::new()
    };
    // Claude's latest reply text (assistant records that aren't tool calls).
    let reply = if event == "TaskCompleted" {
        infer_message_text(&json).unwrap_or_default()
    } else {
        String::new()
    };
    let tokens = infer_tokens(&json);

    Some(serde_json::json!({
        "source": "claude-project-log-listener",
        "hook_event_name": event,
        "session_id": json.get("sessionId").and_then(Value::as_str).unwrap_or("claude-log"),
        "cwd": cwd,
        "tool_name": tool_name,
        "prompt": prompt,
        "reply": reply,
        "tokens": tokens,
        "timestamp": json.get("timestamp").cloned().unwrap_or(Value::Null),
    }))
}

/// Total tokens for the latest assistant turn (context + generated), from the
/// transcript's `message.usage`. Mirrors Claude Code's token status readout.
fn infer_tokens(json: &Value) -> u64 {
    let Some(usage) = json.get("message").and_then(|m| m.get("usage")) else {
        return 0;
    };
    let get = |k: &str| usage.get(k).and_then(Value::as_u64).unwrap_or(0);
    get("input_tokens")
        + get("output_tokens")
        + get("cache_read_input_tokens")
        + get("cache_creation_input_tokens")
}

fn infer_event(json: &Value) -> &'static str {
    let record_type = json.get("type").and_then(Value::as_str).unwrap_or("");
    let role = json
        .get("message")
        .and_then(|m| m.get("role"))
        .and_then(Value::as_str)
        .unwrap_or("");
    let content = json
        .get("message")
        .and_then(|m| m.get("content"))
        .and_then(Value::as_array);

    if record_type == "assistant"
        && content
            .map(|items| {
                items
                    .iter()
                    .any(|item| item.get("type").and_then(Value::as_str) == Some("tool_use"))
            })
            .unwrap_or(false)
    {
        return "PreToolUse";
    }

    if role == "user" {
        let has_tool_result = content
            .map(|items| {
                items
                    .iter()
                    .any(|item| item.get("type").and_then(Value::as_str) == Some("tool_result"))
            })
            .unwrap_or(false);
        if has_tool_result {
            return "PostToolUse";
        }
        // A plain user message — the start of a new turn.
        return "UserPromptSubmit";
    }

    if record_type == "assistant" {
        return "TaskCompleted";
    }

    "SessionStart"
}

/// Pull the text of a user or assistant message out of a transcript record.
fn infer_message_text(json: &Value) -> Option<String> {
    let message = json.get("message")?;
    let content = message.get("content")?;

    let text = match content {
        Value::String(s) => s.clone(),
        Value::Array(items) => items
            .iter()
            .find_map(|item| {
                if item.get("type").and_then(Value::as_str) == Some("text") {
                    item.get("text").and_then(Value::as_str).map(str::to_string)
                } else {
                    None
                }
            })
            .unwrap_or_default(),
        _ => String::new(),
    };

    let clean = text.split_whitespace().collect::<Vec<_>>().join(" ");
    if clean.is_empty() || clean.starts_with('<') {
        // Skip system-injected content like <system-reminder> or command wrappers.
        return None;
    }
    Some(clean.chars().take(180).collect())
}

fn infer_tool_name(json: &Value) -> Option<String> {
    let items = json
        .get("message")
        .and_then(|m| m.get("content"))
        .and_then(Value::as_array)?;

    for item in items {
        if item.get("type").and_then(Value::as_str) == Some("tool_use") {
            if let Some(name) = item.get("name").and_then(Value::as_str) {
                return Some(name.to_string());
            }
            if let Some(name) = item.get("tool_name").and_then(Value::as_str) {
                return Some(name.to_string());
            }
        }
    }

    None
}

fn claude_session_root() -> Option<PathBuf> {
    let home = dirs::home_dir()?;
    Some(
        home.join("Library")
            .join("Application Support")
            .join("Claude")
            .join("claude-code-sessions"),
    )
}

fn collect_files(root: &Path, extension: &str) -> Vec<PathBuf> {
    let mut files = Vec::new();
    collect_files_inner(root, extension, &mut files);
    files
}

fn collect_files_inner(root: &Path, extension: &str, files: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(root) else {
        return;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_files_inner(&path, extension, files);
        } else if path
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext == extension)
            .unwrap_or(false)
        {
            files.push(path);
        }
    }
}

fn modified_ms(time: &Option<SystemTime>) -> u128 {
    time.and_then(|time| time.duration_since(SystemTime::UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}
