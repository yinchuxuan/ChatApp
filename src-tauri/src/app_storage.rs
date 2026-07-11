use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::{Mutex, OwnedMutexGuard};

#[derive(Clone)]
pub struct AppStorage {
    root: PathBuf,
    locks: Arc<Mutex<HashMap<PathBuf, Arc<Mutex<()>>>>>,
    pending_background: Arc<Mutex<Option<PathBuf>>>,
}

impl AppStorage {
    pub fn new(root: PathBuf) -> Self {
        Self {
            root,
            locks: Arc::new(Mutex::new(HashMap::new())),
            pending_background: Arc::new(Mutex::new(None)),
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

    pub async fn set_pending_background(&self, path: PathBuf) {
        *self.pending_background.lock().await = Some(path);
    }

    pub async fn pending_background(&self) -> Option<PathBuf> {
        self.pending_background.lock().await.clone()
    }

    pub async fn clear_pending_background(&self) {
        *self.pending_background.lock().await = None;
    }
}
