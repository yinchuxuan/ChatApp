use crate::game_card_error::{CardResult, GameCardError};
use crate::game_card_paths::{assert_safe_relative, existing_file};
use serde_json::{Map, Value};
use std::fs;
use std::path::{Path, PathBuf};

const MAX_IMPORT_DEPTH: usize = 20;

fn import_path(value: &Value) -> Option<&str> {
    let object = value.as_object()?;
    if object.len() != 1 {
        return None;
    }
    object.get("$import")?.as_str()
}

fn read_json(path: &Path) -> CardResult<Value> {
    let content = fs::read_to_string(path).map_err(|error| {
        GameCardError::new(format!("Failed to read {}: {error}", path.display()))
    })?;
    serde_json::from_str(&content)
        .map_err(|error| GameCardError::new(format!("Failed to parse {}: {error}", path.display())))
}

fn expand(value: Value, root: &Path, stack: &[PathBuf]) -> CardResult<Value> {
    if let Some(relative) = import_path(&value) {
        assert_safe_relative(relative, Some("json"))?;
        let path = existing_file(root, relative)?;
        if stack.contains(&path) {
            return Err(GameCardError::new(format!(
                "circular game card import: {relative}"
            )));
        }
        if stack.len() >= MAX_IMPORT_DEPTH {
            return Err(GameCardError::new("game card import depth limit exceeded"));
        }
        let mut next_stack = stack.to_vec();
        next_stack.push(path.clone());
        return expand(read_json(&path)?, root, &next_stack);
    }
    match value {
        Value::Array(items) => {
            let mut output = Vec::new();
            for item in items {
                match expand(item, root, stack)? {
                    Value::Array(expanded) => output.extend(expanded),
                    expanded => output.push(expanded),
                }
            }
            Ok(Value::Array(output))
        }
        Value::Object(items) => {
            let mut output = Map::new();
            for (key, child) in items {
                output.insert(key, expand(child, root, stack)?);
            }
            Ok(Value::Object(output))
        }
        primitive => Ok(primitive),
    }
}

pub fn read_card(root: &Path) -> CardResult<Value> {
    let card_path = existing_file(root, "card.json")?;
    expand(read_json(&card_path)?, root, &[card_path])
}
