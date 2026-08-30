use crate::game_card_archive::MAX_ARCHIVE_SIZE;
use crate::game_card_error::{CardResult, GameCardError};
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;

pub const PNG_SIGNATURE: [u8; 8] = [137, 80, 78, 71, 13, 10, 26, 10];
pub const GAME_CHUNK: [u8; 4] = *b"gcAr";
pub const SEGMENT_SIZE: u64 = 16 * 1024 * 1024;
pub const HEADER_SIZE: usize = 58;
const MAGIC: [u8; 8] = *b"CHATGCPK";

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SegmentHeader {
    pub index: u32,
    pub count: u32,
    pub archive_size: u64,
    pub archive_sha256: [u8; 32],
}

pub fn segment_count(archive_size: u64) -> CardResult<u32> {
    if archive_size == 0 || archive_size > MAX_ARCHIVE_SIZE {
        return Err(GameCardError::new(
            "embedded game card archive size is invalid",
        ));
    }
    Ok(archive_size.div_ceil(SEGMENT_SIZE) as u32)
}

pub fn encode_header(header: &SegmentHeader) -> [u8; HEADER_SIZE] {
    let mut bytes = [0_u8; HEADER_SIZE];
    bytes[0..8].copy_from_slice(&MAGIC);
    bytes[8..10].copy_from_slice(&1_u16.to_be_bytes());
    bytes[10..14].copy_from_slice(&header.index.to_be_bytes());
    bytes[14..18].copy_from_slice(&header.count.to_be_bytes());
    bytes[18..26].copy_from_slice(&header.archive_size.to_be_bytes());
    bytes[26..58].copy_from_slice(&header.archive_sha256);
    bytes
}

pub fn decode_header(bytes: &[u8; HEADER_SIZE]) -> CardResult<SegmentHeader> {
    if bytes[0..8] != MAGIC {
        return Err(GameCardError::new(
            "PNG contains an invalid game card chunk",
        ));
    }
    let version = u16::from_be_bytes(bytes[8..10].try_into().unwrap());
    if version != 1 {
        return Err(GameCardError::new(format!(
            "unsupported PNG game card version: {version}"
        )));
    }
    let header = SegmentHeader {
        index: u32::from_be_bytes(bytes[10..14].try_into().unwrap()),
        count: u32::from_be_bytes(bytes[14..18].try_into().unwrap()),
        archive_size: u64::from_be_bytes(bytes[18..26].try_into().unwrap()),
        archive_sha256: bytes[26..58].try_into().unwrap(),
    };
    if header.count != segment_count(header.archive_size)? || header.index >= header.count {
        return Err(GameCardError::new(
            "PNG game card segment metadata is invalid",
        ));
    }
    Ok(header)
}

pub fn file_sha256(path: &Path) -> CardResult<[u8; 32]> {
    let mut reader = BufReader::new(File::open(path)?);
    let mut digest = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let read = reader.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        digest.update(&buffer[..read]);
    }
    Ok(digest.finalize().into())
}

pub fn sha256_hex(hash: &[u8; 32]) -> String {
    hash.iter().map(|byte| format!("{byte:02x}")).collect()
}
