mod app_storage;
mod config_commands;
mod electron_migration;
mod game_card_commands;
mod game_card_copy;
mod game_card_error;
mod game_card_imports;
mod game_card_paths;
mod game_card_references;
mod game_card_repository;
mod game_card_schema;
mod game_card_state_schema;
mod history;
mod json_store;
mod migration_chat;
mod migration_fs;
mod migration_layout;
mod migration_report;
mod model_commands;
mod model_http;
mod resource_assets;
mod resource_response;
mod session_commands;
mod session_management;
mod sessions;

use app_storage::AppStorage;
use model_commands::ModelNetworkState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .register_asynchronous_uri_scheme_protocol("local", |context, request, responder| {
            let storage = context.app_handle().state::<AppStorage>().inner().clone();
            std::thread::spawn(move || {
                responder.respond(resource_response::handle_resource_request(
                    &storage, request,
                ));
            });
        })
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            let config_base = app.path().config_dir()?;
            let data_base = app.path().data_dir()?;
            let electron_roots =
                electron_migration::roots_for(std::env::consts::OS, &config_base, &data_base);
            match electron_migration::run(&data_dir, &electron_roots) {
                Ok(report) => {
                    for warning in report.warnings {
                        eprintln!(
                            "Electron data migration warning at {} ({}): {}",
                            warning.stage, warning.path, warning.message
                        );
                    }
                }
                Err(error) => eprintln!("{error}"),
            }
            std::fs::create_dir_all(&data_dir)?;
            app.manage(AppStorage::new(data_dir));
            app.manage(ModelNetworkState::new()?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            config_commands::get_model_config,
            config_commands::save_model_config,
            config_commands::get_background_config,
            config_commands::save_background_config,
            config_commands::select_background_image,
            session_commands::get_chat_history,
            session_commands::save_chat_history,
            session_commands::list_chat_sessions,
            session_commands::get_active_chat_session,
            session_commands::create_chat_session,
            session_commands::set_active_chat_session,
            session_commands::rename_chat_session,
            session_commands::delete_chat_session,
            game_card_commands::get_game_cards,
            game_card_commands::get_game_card,
            game_card_commands::save_game_card,
            game_card_commands::import_game_card_from_directory,
            game_card_commands::set_active_game_card,
            game_card_commands::get_active_game_card,
            game_card_commands::read_game_card_file,
            model_commands::stream_model_request,
            model_commands::cancel_model_stream
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}

#[cfg(test)]
mod game_card_tests;
#[cfg(test)]
mod migration_tests;
#[cfg(test)]
mod model_tests;
#[cfg(test)]
mod resource_tests;
#[cfg(test)]
mod tests;
