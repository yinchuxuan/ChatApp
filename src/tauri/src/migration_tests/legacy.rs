use super::{load, save, TestDirs};
use crate::electron_migration;
use crate::migration_report::{self, MigrationReport};
use serde_json::json;
use std::fs;

#[test]
fn upgrades_legacy_cards_chat_config_and_missing_background() {
    let dirs = TestDirs::new();
    save(
        dirs.roots.current.join("model-config.json"),
        json!({ "modelName": "legacy-model" }),
    );
    save(
        dirs.roots.legacy.join("background-config.json"),
        json!({
            "backgroundImageUrl": format!(
                "local://{}",
                dirs.roots.legacy.join("missing.png").display()
            ),
            "backgroundOpacity": 0.4
        }),
    );
    save(
        dirs.roots.legacy.join("game-cards/active.json"),
        json!({ "id": "quest" }),
    );
    save(
        dirs.roots.legacy.join("game-cards/cards/quest.json"),
        json!({ "id": "quest", "name": "Quest" }),
    );
    save(
        dirs.roots.legacy.join("chat/history.json"),
        json!([{ "role": "user", "content": "legacy turn" }]),
    );

    let report = electron_migration::run(&dirs.target, &dirs.roots).unwrap();
    assert_eq!(report.status, "migrated");
    assert_eq!(report.warnings.len(), 1);
    assert_eq!(report.warnings[0].stage, "background config");
    assert_eq!(
        load(dirs.target.join("config/model.json"))["modelName"],
        "legacy-model"
    );
    assert_eq!(
        load(dirs.target.join("game-cards/cards/quest/card.json"))["id"],
        "quest"
    );
    let history = load(
        dirs.target
            .join("game-cards/cards/quest/sessions/default/messages.json"),
    );
    assert_eq!(history[0]["content"], "legacy turn");
    let background = load(dirs.target.join("config/background.json"));
    assert_eq!(background["backgroundImageUrl"], "");
}

#[test]
fn converts_an_existing_legacy_background_to_the_controlled_url() {
    let dirs = TestDirs::new();
    let image = dirs.roots.current.join("winter.png");
    fs::create_dir_all(image.parent().unwrap()).unwrap();
    fs::write(&image, b"image fixture").unwrap();
    save(
        dirs.roots.current.join("background-config.json"),
        json!({
            "backgroundImageUrl": format!("local://{}", image.display()),
            "backgroundOpacity": 0.6
        }),
    );

    let report = electron_migration::run(&dirs.target, &dirs.roots).unwrap();
    assert!(report.warnings.is_empty());
    let background = load(dirs.target.join("config/background.json"));
    assert_eq!(
        background["backgroundImageUrl"],
        crate::config_commands::USER_BACKGROUND_URL
    );
    assert_eq!(
        background["backgroundImagePath"],
        image.canonicalize().unwrap().to_string_lossy().as_ref()
    );
}

#[test]
fn failed_migration_is_clean_and_can_retry() {
    let dirs = TestDirs::new();
    let source = dirs.roots.current.join("model-config.json");
    fs::create_dir_all(source.parent().unwrap()).unwrap();
    fs::write(&source, "not-json").unwrap();

    let error = electron_migration::run(&dirs.target, &dirs.roots).unwrap_err();
    assert_eq!(error.0.stage, "read legacy JSON");
    assert!(!dirs.target.join("config/model.json").exists());
    let report: MigrationReport =
        crate::json_store::read_json(&migration_report::report_path(&dirs.target))
            .unwrap()
            .unwrap();
    assert_eq!(report.status, "failed");
    assert_eq!(report.error.unwrap().path, source.display().to_string());
    assert!(!fs::read_dir(&dirs.root).unwrap().any(|entry| {
        entry
            .unwrap()
            .file_name()
            .to_string_lossy()
            .contains("electron-migration-")
    }));

    fs::write(&source, r#"{"modelName":"recovered"}"#).unwrap();
    let retried = electron_migration::run(&dirs.target, &dirs.roots).unwrap();
    assert_eq!(retried.status, "migrated");
    assert_eq!(
        load(dirs.target.join("config/model.json"))["modelName"],
        "recovered"
    );
}
