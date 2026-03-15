mod commands;

use commands::OpenFileState;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{Emitter, Manager, RunEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = OpenFileState {
        pending: Mutex::new(Vec::new()),
        frontend_ready: AtomicBool::new(false),
    };

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![commands::get_opened_files])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    // Handle file paths passed as CLI arguments (e.g. `./MikeDown file.md`
    // or `open -a 'MikeDown' --args file.md`). The `open` command without
    // --args uses Apple Events instead, which are handled by RunEvent::Opened.
    {
        let cli_paths: Vec<String> = std::env::args()
            .skip(1) // skip binary path
            .filter_map(|arg| {
                let path = std::path::PathBuf::from(&arg);
                let abs = if path.is_relative() {
                    std::env::current_dir().ok()?.join(&path)
                } else {
                    path
                };
                match abs.extension().and_then(|e| e.to_str()) {
                    Some("md" | "markdown" | "txt") if abs.is_file() => {
                        abs.to_str().map(String::from)
                    }
                    _ => None,
                }
            })
            .collect();

        if !cli_paths.is_empty() {
            let s = app.state::<OpenFileState>();
            let mut pending = s.pending.lock().unwrap_or_else(|e| e.into_inner());
            *pending = cli_paths;
        }
    }

    app.run(|app_handle, event| {
        if let RunEvent::Opened { urls } = event {
            let paths: Vec<String> = urls
                .iter()
                .filter_map(|url| url.to_file_path().ok())
                .filter(|p| {
                    matches!(
                        p.extension().and_then(|e| e.to_str()),
                        Some("md" | "markdown")
                    )
                })
                .filter_map(|p| p.to_str().map(String::from))
                .collect();

            if paths.is_empty() {
                return;
            }

            let state = app_handle.state::<OpenFileState>();
            if state.frontend_ready.load(Ordering::SeqCst) {
                let _ = app_handle.emit("file-open", &paths);
            } else {
                let mut pending = state.pending.lock().unwrap_or_else(|e| e.into_inner());
                *pending = paths;
            }
        }
    });
}
