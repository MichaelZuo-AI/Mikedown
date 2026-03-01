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

    app.run(|app_handle, event| {
        if let RunEvent::Opened { urls } = event {
            let paths: Vec<String> = urls
                .iter()
                .filter_map(|url| url.to_file_path().ok())
                .filter_map(|p| p.to_str().map(String::from))
                .collect();

            if paths.is_empty() {
                return;
            }

            let state = app_handle.state::<OpenFileState>();
            if state.frontend_ready.load(Ordering::SeqCst) {
                let _ = app_handle.emit("file-open", &paths);
            } else {
                let mut pending = state.pending.lock().unwrap();
                pending.extend(paths);
            }
        }
    });
}
