mod app_storage;
mod config_commands;
mod history;
mod json_store;
mod session_commands;
mod session_management;
mod sessions;

use app_storage::AppStorage;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            app.manage(AppStorage::new(data_dir));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            config_commands::get_model_config,
            config_commands::save_model_config,
            config_commands::get_background_config,
            config_commands::save_background_config,
            session_commands::get_chat_history,
            session_commands::save_chat_history,
            session_commands::list_chat_sessions,
            session_commands::get_active_chat_session,
            session_commands::create_chat_session,
            session_commands::set_active_chat_session,
            session_commands::rename_chat_session,
            session_commands::delete_chat_session
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}

#[cfg(test)]
mod tests;
