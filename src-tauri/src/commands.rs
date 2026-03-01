use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::State;

pub struct OpenFileState {
    pub pending: Mutex<Vec<String>>,
    pub frontend_ready: AtomicBool,
}

#[tauri::command]
pub fn get_opened_files(state: State<'_, OpenFileState>) -> Vec<String> {
    state.frontend_ready.store(true, Ordering::SeqCst);
    let mut pending = state.pending.lock().unwrap();
    pending.drain(..).collect()
}
