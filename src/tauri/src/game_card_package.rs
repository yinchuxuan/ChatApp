use crate::game_card_archive::{extract_archive, write_archive};
use crate::game_card_error::{CardResult, GameCardError};
use crate::game_card_imports::read_card;
use crate::game_card_png::{file_sha256, sha256_hex, PNG_SIGNATURE};
use crate::game_card_png_read::extract_png_archive;
use crate::game_card_png_write::wrap_png;
use crate::game_card_schema::validate_card;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use uuid::Uuid;

#[derive(Clone, Copy)]
pub enum ExportFormat {
    GameCard,
    Png,
}

fn validate_source(source: &Path) -> CardResult<serde_json::Value> {
    let card = read_card(source)?;
    validate_card(&card, source)?;
    Ok(card)
}

fn temporary(parent: &Path, suffix: &str) -> PathBuf {
    parent.join(format!(".game-card-{}-{suffix}", Uuid::new_v4()))
}

fn replace_file(temp: &Path, target: &Path) -> CardResult<()> {
    if !target.exists() {
        fs::rename(temp, target)?;
        return Ok(());
    }
    let parent = target.parent().unwrap_or_else(|| Path::new("."));
    let backup = temporary(parent, "backup");
    fs::rename(target, &backup)?;
    if let Err(error) = fs::rename(temp, target) {
        let rollback = fs::rename(&backup, target);
        let message = rollback.map_or_else(
            |rollback| format!("failed to export game card: {error}; rollback failed: {rollback}"),
            |_| format!("failed to export game card: {error}"),
        );
        return Err(GameCardError::new(message));
    }
    let _ = fs::remove_file(backup);
    Ok(())
}

fn safe_file_part(value: &str) -> String {
    value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | '.') {
                character
            } else {
                '-'
            }
        })
        .collect()
}

fn verify_export(package: &Path, parent: &Path) -> CardResult<()> {
    let staging = temporary(parent, "verify");
    let result = extract_package(package, &staging)
        .and_then(|_| validate_source(&staging))
        .map(|_| ());
    let _ = fs::remove_dir_all(staging);
    result
}

pub fn extract_package(source: &Path, target: &Path) -> CardResult<()> {
    let mut input = fs::File::open(source)?;
    let mut magic = [0_u8; 8];
    input
        .read_exact(&mut magic)
        .map_err(|_| GameCardError::new("game card file is truncated"))?;
    if magic == PNG_SIGNATURE {
        let parent = target
            .parent()
            .ok_or_else(|| GameCardError::new("invalid game card staging directory"))?;
        let archive = temporary(parent, "embedded.gamecard");
        let result =
            extract_png_archive(source, &archive).and_then(|_| extract_archive(&archive, target));
        let _ = fs::remove_file(archive);
        result
    } else if magic[0..4] == *b"PK\x03\x04" {
        extract_archive(source, target)
    } else {
        Err(GameCardError::new(
            "game card file must be a .gamecard archive or embedded PNG",
        ))
    }
}

fn cover_path(source: &Path, cover: Option<&Path>) -> CardResult<PathBuf> {
    let cover = cover.ok_or_else(|| GameCardError::new("PNG export requires a cover image"))?;
    let candidate = if cover.is_absolute() {
        cover.to_path_buf()
    } else {
        source.join(cover)
    };
    let root = source.canonicalize()?;
    let real = candidate.canonicalize()?;
    if !real.starts_with(root) || !real.is_file() {
        return Err(GameCardError::new(
            "game card cover must stay inside the source directory",
        ));
    }
    Ok(real)
}

pub fn export_package(
    source: &Path,
    output_dir: &Path,
    format: ExportFormat,
    cover: Option<&Path>,
) -> CardResult<(PathBuf, String)> {
    let source = source.canonicalize()?;
    let card = validate_source(&source)?;
    let id = card["id"]
        .as_str()
        .ok_or_else(|| GameCardError::new("game card id is missing"))?;
    let version = card["version"]
        .as_str()
        .ok_or_else(|| GameCardError::new("game card version is missing"))?;
    fs::create_dir_all(output_dir)?;
    let output_dir = output_dir.canonicalize()?;
    if output_dir.starts_with(&source) {
        return Err(GameCardError::new(
            "game card output directory must stay outside the source directory",
        ));
    }
    let extension = match format {
        ExportFormat::GameCard => "gamecard",
        ExportFormat::Png => "png",
    };
    let target = output_dir.join(format!(
        "{}-{}.{}",
        safe_file_part(id),
        safe_file_part(version),
        extension
    ));
    let archive = temporary(&output_dir, "payload.gamecard");
    let artifact = temporary(&output_dir, extension);
    let result = (|| {
        write_archive(&source, &archive)?;
        match format {
            ExportFormat::GameCard => fs::rename(&archive, &artifact)?,
            ExportFormat::Png => wrap_png(&cover_path(&source, cover)?, &archive, &artifact)?,
        }
        verify_export(&artifact, &output_dir)?;
        let checksum = sha256_hex(&file_sha256(&artifact)?);
        replace_file(&artifact, &target)?;
        Ok((target.clone(), checksum))
    })();
    let _ = fs::remove_file(archive);
    let _ = fs::remove_file(artifact);
    result
}
