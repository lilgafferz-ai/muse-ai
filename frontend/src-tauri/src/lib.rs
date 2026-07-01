use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
    RunEvent,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers as ShortcutModifiers};

/// Toggle window visibility (show/hide with system tray)
fn toggle_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            window.hide().ok();
        } else {
            window.show().ok();
            window.set_focus().ok();
        }
    }
}

/// Run a background system command via Muse
#[tauri::command]
fn run_muse_command(command: String) -> String {
    match std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", &command])
        .output()
    {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            if stdout.trim().is_empty() {
                format!("Error: {}", stderr.trim())
            } else {
                stdout.trim().to_string()
            }
        }
        Err(e) => format!("Failed: {}", e),
    }
}

/// Get system information from Rust side (faster than spawning powershell)
#[tauri::command]
fn get_system_info() -> serde_json::Value {
    serde_json::json!({
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "hostname": hostname::get().unwrap_or_default().to_string_lossy().to_string(),
        "cpus": std::thread::available_parallelism().map(|n| n.get()).unwrap_or(0),
        "user": std::env::var("USERNAME").or_else(|_| std::env::var("USER")).unwrap_or_default(),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // ─── System Tray ──────────────────────────────────────
            let app_handle = app.handle();

            // Build tray menu
            let show_item = MenuItem::with_id(app, "show", "Show Muse", true, None::<&str>)?;
            let hide_item = MenuItem::with_id(app, "hide", "Hide to Tray", true, None::<&str>)?;
            let separator = tauri::menu::PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit Muse", true, Some("CmdOrCtrl+Q"))?;

            let menu = Menu::with_items(app, &[&show_item, &hide_item, &separator, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("Muse AI Companion")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().ok();
                            window.set_focus().ok();
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            window.hide().ok();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| match event {
                    tauri::tray::TrayIconEvent::Click { .. } => {
                        let app = tray.app_handle();
                        toggle_window(app);
                    }
                    _ => {}
                })
                .build(app)?;

            // ─── Global Shortcuts ────────────────────────────────
            let app_handle_clone = app_handle.clone();
            app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(move |_app, shortcut, event| {
                        if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                            let shortcut_str = shortcut.to_string();
                            match shortcut_str.as_str() {
                                "Ctrl+Shift+M" | "CommandOrControl+Shift+M" => {
                                    toggle_window(&app_handle_clone);
                                }
                                "Ctrl+Shift+Space" | "CommandOrControl+Shift+Space" => {
                                    // Activate Muse - could send a signal to the frontend
                                    if let Some(window) = app_handle_clone.get_webview_window("main") {
                                        window.show().ok();
                                        window.set_focus().ok();
                                        // Emit event to frontend to start listening
                                        window.emit("muse-activate", ()).ok();
                                    }
                                }
                                _ => {}
                            }
                        }
                    })
                    .build(),
            )?;

            // Register the shortcuts
            let shortcuts = app.global_shortcut();
            shortcuts.register(
                Code::KeyM,
                ShortcutModifiers::CONTROL | ShortcutModifiers::SHIFT,
            )?;
            shortcuts.register(
                Code::Space,
                ShortcutModifiers::CONTROL | ShortcutModifiers::SHIFT,
            )?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![run_muse_command, get_system_info])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, event| match event {
            RunEvent::ExitRequested { api, .. } => {
                // On window close, hide to tray instead of quitting
                api.prevent_exit();
            }
            _ => {}
        });
}
