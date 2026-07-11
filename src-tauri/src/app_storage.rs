use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::{Mutex, OwnedMutexGuard};

#[derive(Clone)]
pub struct AppStorage {
    root: PathBuf,
    locks: Arc<Mutex<HashMap<PathBuf, Arc<Mutex<()>>>>>,
}

impl AppStorage {
    pub fn new(root: PathBuf) -> Self {
        Self {
            root,
            locks: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn model_config_path(&self) -> PathBuf {
        self.root.join("config/model.json")
    }

    pub fn background_config_path(&self) -> PathBuf {
        self.root.join("config/background.json")
    }

    pub fn game_cards_dir(&self) -> PathBuf {
        self.root.join("game-cards")
    }

    pub async fn lock(&self, key: &Path) -> OwnedMutexGuard<()> {
        let lock = {
            let mut locks = self.locks.lock().await;
            locks
                .entry(key.to_path_buf())
                .or_insert_with(|| Arc::new(Mutex::new(())))
                .clone()
        };
        lock.lock_owned().await
    }
}
