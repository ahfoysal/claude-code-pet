use std::fs::{self, OpenOptions};
use std::io::{Read, Write};
use std::net::TcpStream;
use std::time::Duration;

const HOST: &str = "127.0.0.1";
const PORT: u16 = 19876;

/// Hook sender mode: read JSON from stdin, send to pet widget via TCP, then exit.
pub fn run_hook_sender() {
    let mut buf = Vec::new();
    if std::io::stdin().read_to_end(&mut buf).is_err() || buf.is_empty() {
        return;
    }

    let payload = match serde_json::from_slice::<serde_json::Value>(&buf) {
        Ok(payload) => payload,
        Err(_) => return,
    };

    write_event_log(&payload);

    // Send to the running pet widget.
    match TcpStream::connect_timeout(
        &format!("{HOST}:{PORT}").parse().unwrap(),
        Duration::from_secs(1),
    ) {
        Ok(mut stream) => {
            let _ = stream.write_all(&buf);
        }
        Err(_) => {
            // Pet isn't running — auto-launch it when a Claude session begins,
            // so it opens alongside Claude. Single-instance guards duplicates.
            let event = payload
                .get("hook_event_name")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            if matches!(event, "SessionStart" | "UserPromptSubmit") {
                launch_pet();
            }
        }
    }
}

/// Spawn the pet GUI (this same binary, no args) detached from the hook process.
fn launch_pet() {
    let Ok(exe) = std::env::current_exe() else {
        return;
    };
    #[cfg(target_os = "macos")]
    {
        // Prefer the installed .app so it launches as a proper GUI app.
        let app = "/Applications/Claude Code Pet.app";
        if std::path::Path::new(app).exists() {
            let _ = std::process::Command::new("open").arg(app).spawn();
            return;
        }
        let _ = std::process::Command::new(exe).spawn();
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = std::process::Command::new(exe).spawn();
    }
}

fn write_event_log(payload: &serde_json::Value) {
    let Some(home) = dirs::home_dir() else {
        return;
    };

    let dir = home.join(".claude-code-pet");
    if fs::create_dir_all(&dir).is_err() {
        return;
    }

    let record = serde_json::json!({
        "received_at_ms": now_ms(),
        "source": "hook",
        "payload": payload,
    });

    let path = dir.join("events.jsonl");
    let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) else {
        return;
    };
    let _ = writeln!(file, "{record}");
}

fn now_ms() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}
