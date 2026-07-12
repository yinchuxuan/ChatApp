use crate::app_storage::AppStorage;
use crate::electron_migration::{self, ElectronRoots};
use crate::game_card_repository;
use crate::json_store::{read_json, write_json};
use crate::session_commands::load_history;
use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

struct TestDirs {
    root: PathBuf,
    target: PathBuf,
    roots: ElectronRoots,
}

impl TestDirs {
    fn new() -> Self {
        let root = std::env::temp_dir().join(format!("chatapp-migration-{}", Uuid::new_v4()));
        Self {
            target: root.join("com.airp.chatapp"),
            roots: ElectronRoots {
                current: root.join("ChatApp"),
                legacy: root.join("harness_lab"),
            },
            root,
        }
    }
}

impl Drop for TestDirs {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.root);
    }
}

fn save(path: impl AsRef<Path>, value: Value) {
    write_json(path.as_ref(), &value).unwrap();
}

fn load(path: impl AsRef<Path>) -> Value {
    read_json(path.as_ref()).unwrap().unwrap()
}

#[tokio::test]
async fn migrates_current_card_all_sessions_messages_and_state_once() {
    let dirs = TestDirs::new();
    let source = &dirs.roots.current;
    save(
        source.join("config/model.json"),
        json!({ "modelName": "electron" }),
    );
    save(
        source.join("game-cards/active.json"),
        json!({ "id": "wa2" }),
    );
    save(
        source.join("game-cards/cards/wa2/card.json"),
        json!({ "id": "wa2", "name": "WA2" }),
    );
    save(
        source.join("game-cards/cards/wa2/sessions/active.json"),
        json!({ "id": "second" }),
    );
    save(
        source.join("game-cards/cards/wa2/sessions/index.json"),
        json!({ "sessions": [
            {
                "id": "default", "title": "Default", "createdAt": "2026-01-01T00:00:00.000Z",
                "updatedAt": "2026-01-01T00:00:00.000Z", "messageCount": 1, "preview": "default"
            },
            {
                "id": "second", "title": "Second", "createdAt": "2026-01-02T00:00:00.000Z",
                "updatedAt": "2026-01-02T00:00:00.000Z", "messageCount": 1, "preview": "second"
            }
        ] }),
    );
    for (id, turn) in [("default", 1), ("second", 8)] {
        save(
            source.join(format!("game-cards/cards/wa2/sessions/{id}/messages.json")),
            json!({ "messages": [{ "role": "user", "content": id }], "gameState": { "turn": turn } }),
        );
        save(
            source.join(format!(
                "game-cards/cards/wa2/sessions/{id}/retry-base.json"
            )),
            json!({ "messages": [], "gameState": { "turn": turn - 1 } }),
        );
    }

    let report = electron_migration::run(&dirs.target, &dirs.roots).unwrap();
    assert_eq!(report.status, "migrated");
    let storage = AppStorage::new(dirs.target.clone());
    let active = game_card_repository::active(&storage)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(active["id"], "wa2");
    let history = load_history(&storage).await.unwrap();
    assert_eq!(history["messages"][0]["content"], "second");
    assert_eq!(history["gameState"]["turn"], 8);
    assert_eq!(history["retryBaseState"]["turn"], 7);

    save(
        dirs.target.join("config/model.json"),
        json!({ "modelName": "tauri-new" }),
    );
    save(
        source.join("config/model.json"),
        json!({ "modelName": "electron-old" }),
    );
    let repeated = electron_migration::run(&dirs.target, &dirs.roots).unwrap();
    assert_eq!(repeated.status, "migrated");
    assert_eq!(
        load(dirs.target.join("config/model.json"))["modelName"],
        "tauri-new"
    );
}

#[test]
fn existing_tauri_data_is_never_overwritten() {
    let dirs = TestDirs::new();
    save(
        dirs.target.join("config/model.json"),
        json!({ "modelName": "tauri" }),
    );
    save(
        dirs.roots.current.join("config/model.json"),
        json!({ "modelName": "electron" }),
    );
    let report = electron_migration::run(&dirs.target, &dirs.roots).unwrap();
    assert_eq!(report.status, "skipped-existing-data");
    assert_eq!(
        load(dirs.target.join("config/model.json"))["modelName"],
        "tauri"
    );
}

#[test]
fn resolves_electron_roots_for_each_desktop_family() {
    let config = Path::new("/config");
    let data = Path::new("/data");
    assert_eq!(
        electron_migration::roots_for("linux", config, data).current,
        config.join("ChatApp")
    );
    for os in ["macos", "windows"] {
        let roots = electron_migration::roots_for(os, config, data);
        assert_eq!(roots.current, data.join("ChatApp"));
        assert_eq!(roots.legacy, data.join("harness_lab"));
    }
}

mod legacy;
