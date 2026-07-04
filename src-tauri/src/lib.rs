pub mod battle;
pub mod commands;
pub mod loader;
pub mod models;
pub mod physics;
pub mod rules;
pub mod validator;

use commands::battle_cmd;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            battle_cmd::list_characters,
            battle_cmd::list_arenas,
            battle_cmd::list_rulesets,
            battle_cmd::list_skills,
            battle_cmd::validate_assets,
            battle_cmd::import_official_package,
            battle_cmd::init_battle,
            battle_cmd::step_battle,
            battle_cmd::finish_battle,
            battle_cmd::list_replays,
            battle_cmd::get_replay,
            battle_cmd::delete_replay,
            battle_cmd::export_replay,
            battle_cmd::import_replay,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
