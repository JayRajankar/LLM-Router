// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            use tauri_plugin_shell::ShellExt;
            let sidecar = app.shell().sidecar("llm-router")
                .expect("failed to create sidecar");
            
            // Spawn the sidecar and let Tauri handle lifecycle (it will kill it automatically on exit)
            let _ = sidecar.spawn().expect("Failed to spawn sidecar");
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
