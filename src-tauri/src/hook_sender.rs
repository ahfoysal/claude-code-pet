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

    // Send to pet widget
    if let Ok(mut stream) = TcpStream::connect_timeout(
        &format!("{HOST}:{PORT}").parse().unwrap(),
        Duration::from_secs(1),
    ) {
        let _ = stream.write_all(&buf);
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
