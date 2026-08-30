use crate::game_card_archive::MAX_ARCHIVE_SIZE;
use crate::game_card_error::{CardResult, GameCardError};
use crate::game_card_png::{
    encode_header, file_sha256, segment_count, SegmentHeader, GAME_CHUNK, HEADER_SIZE,
    PNG_SIGNATURE, SEGMENT_SIZE,
};
use crc32fast::Hasher;
use std::fs::{self, File};
use std::io::{BufReader, BufWriter, Read, Write};
use std::path::Path;

const MAX_COVER_SIZE: u64 = 512 * 1024 * 1024;

fn read_exact_or_error(reader: &mut impl Read, bytes: &mut [u8]) -> CardResult<()> {
    reader
        .read_exact(bytes)
        .map_err(|_| GameCardError::new("PNG file is truncated"))
}

fn transfer_chunk(
    reader: &mut impl Read,
    writer: &mut impl Write,
    kind: [u8; 4],
    length: u32,
    keep: bool,
) -> CardResult<[u8; 4]> {
    if keep {
        writer.write_all(&length.to_be_bytes())?;
        writer.write_all(&kind)?;
    }
    let mut hasher = Hasher::new();
    hasher.update(&kind);
    let mut remaining = length as usize;
    let mut buffer = [0_u8; 64 * 1024];
    while remaining > 0 {
        let take = remaining.min(buffer.len());
        read_exact_or_error(reader, &mut buffer[..take])?;
        hasher.update(&buffer[..take]);
        if keep {
            writer.write_all(&buffer[..take])?;
        }
        remaining -= take;
    }
    let mut expected = [0_u8; 4];
    read_exact_or_error(reader, &mut expected)?;
    if u32::from_be_bytes(expected) != hasher.finalize() {
        return Err(GameCardError::new("PNG chunk CRC is invalid"));
    }
    if keep {
        writer.write_all(&expected)?;
    }
    Ok(expected)
}

fn write_game_chunks(writer: &mut impl Write, archive: &Path) -> CardResult<()> {
    let archive_size = fs::metadata(archive)?.len();
    let count = segment_count(archive_size)?;
    let archive_sha256 = file_sha256(archive)?;
    let mut reader = BufReader::new(File::open(archive)?);
    for index in 0..count {
        let payload_size = (archive_size - u64::from(index) * SEGMENT_SIZE).min(SEGMENT_SIZE);
        let length = HEADER_SIZE as u32 + payload_size as u32;
        writer.write_all(&length.to_be_bytes())?;
        writer.write_all(&GAME_CHUNK)?;
        let header = encode_header(&SegmentHeader {
            index,
            count,
            archive_size,
            archive_sha256,
        });
        let mut hasher = Hasher::new();
        hasher.update(&GAME_CHUNK);
        hasher.update(&header);
        writer.write_all(&header)?;
        let mut remaining = payload_size as usize;
        let mut buffer = [0_u8; 64 * 1024];
        while remaining > 0 {
            let take = remaining.min(buffer.len());
            read_exact_or_error(&mut reader, &mut buffer[..take])?;
            hasher.update(&buffer[..take]);
            writer.write_all(&buffer[..take])?;
            remaining -= take;
        }
        writer.write_all(&hasher.finalize().to_be_bytes())?;
    }
    Ok(())
}

pub fn wrap_png(cover: &Path, archive: &Path, output: &Path) -> CardResult<()> {
    if fs::metadata(cover)?.len() > MAX_COVER_SIZE
        || fs::metadata(archive)?.len() > MAX_ARCHIVE_SIZE
    {
        return Err(GameCardError::new("PNG game card input is too large"));
    }
    let mut reader = BufReader::new(File::open(cover)?);
    let mut writer = BufWriter::new(File::create(output)?);
    let mut signature = [0_u8; 8];
    read_exact_or_error(&mut reader, &mut signature)?;
    if signature != PNG_SIGNATURE {
        return Err(GameCardError::new("game card cover must be a PNG image"));
    }
    writer.write_all(&signature)?;
    let mut first = true;
    let mut saw_idat = false;
    loop {
        let mut length_bytes = [0_u8; 4];
        read_exact_or_error(&mut reader, &mut length_bytes)?;
        let length = u32::from_be_bytes(length_bytes);
        let mut kind = [0_u8; 4];
        read_exact_or_error(&mut reader, &mut kind)?;
        if first && kind != *b"IHDR" {
            return Err(GameCardError::new("PNG must begin with IHDR"));
        }
        first = false;
        saw_idat |= kind == *b"IDAT";
        if kind == *b"IEND" {
            if length != 0 || !saw_idat {
                return Err(GameCardError::new("PNG image structure is invalid"));
            }
            let crc = transfer_chunk(&mut reader, &mut writer, kind, length, false)?;
            write_game_chunks(&mut writer, archive)?;
            writer.write_all(&length_bytes)?;
            writer.write_all(&kind)?;
            writer.write_all(&crc)?;
            let mut trailing = [0_u8; 1];
            if reader.read(&mut trailing)? != 0 {
                return Err(GameCardError::new("PNG contains data after IEND"));
            }
            writer.flush()?;
            return Ok(());
        }
        transfer_chunk(&mut reader, &mut writer, kind, length, kind != GAME_CHUNK)?;
    }
}
