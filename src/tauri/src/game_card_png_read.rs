use crate::game_card_archive::MAX_ARCHIVE_SIZE;
use crate::game_card_error::{CardResult, GameCardError};
use crate::game_card_png::{
    decode_header, file_sha256, SegmentHeader, GAME_CHUNK, HEADER_SIZE, PNG_SIGNATURE, SEGMENT_SIZE,
};
use crc32fast::Hasher;
use std::fs::{self, File};
use std::io::{BufReader, Read, Seek, SeekFrom, Write};
use std::path::Path;

fn read_exact_or_error(reader: &mut impl Read, bytes: &mut [u8]) -> CardResult<()> {
    reader
        .read_exact(bytes)
        .map_err(|_| GameCardError::new("PNG file is truncated"))
}

fn read_crc(reader: &mut impl Read, hasher: Hasher) -> CardResult<()> {
    let mut expected = [0_u8; 4];
    read_exact_or_error(reader, &mut expected)?;
    if u32::from_be_bytes(expected) == hasher.finalize() {
        Ok(())
    } else {
        Err(GameCardError::new("PNG chunk CRC is invalid"))
    }
}

fn discard_chunk(reader: &mut impl Read, kind: [u8; 4], length: u32) -> CardResult<()> {
    let mut hasher = Hasher::new();
    hasher.update(&kind);
    let mut remaining = length as usize;
    let mut buffer = [0_u8; 64 * 1024];
    while remaining > 0 {
        let take = remaining.min(buffer.len());
        read_exact_or_error(reader, &mut buffer[..take])?;
        hasher.update(&buffer[..take]);
        remaining -= take;
    }
    read_crc(reader, hasher)
}

fn validate_common(current: &SegmentHeader, expected: &SegmentHeader) -> CardResult<()> {
    if current.count == expected.count
        && current.archive_size == expected.archive_size
        && current.archive_sha256 == expected.archive_sha256
    {
        Ok(())
    } else {
        Err(GameCardError::new(
            "PNG game card segments contain inconsistent metadata",
        ))
    }
}

fn read_segment(
    reader: &mut impl Read,
    output: &mut File,
    length: u32,
    expected: &mut Option<SegmentHeader>,
    seen: &mut Vec<bool>,
) -> CardResult<()> {
    if length < HEADER_SIZE as u32 {
        return Err(GameCardError::new("PNG game card segment is truncated"));
    }
    let mut hasher = Hasher::new();
    hasher.update(&GAME_CHUNK);
    let mut header_bytes = [0_u8; HEADER_SIZE];
    read_exact_or_error(reader, &mut header_bytes)?;
    hasher.update(&header_bytes);
    let header = decode_header(&header_bytes)?;
    if let Some(common) = expected.as_ref() {
        validate_common(&header, common)?;
    } else {
        output.set_len(header.archive_size)?;
        seen.resize(header.count as usize, false);
        *expected = Some(header.clone());
    }
    if seen[header.index as usize] {
        return Err(GameCardError::new(
            "PNG game card contains duplicate segments",
        ));
    }
    let payload_size = u64::from(length) - HEADER_SIZE as u64;
    let expected_size =
        (header.archive_size - u64::from(header.index) * SEGMENT_SIZE).min(SEGMENT_SIZE);
    if payload_size != expected_size {
        return Err(GameCardError::new("PNG game card segment size is invalid"));
    }
    output.seek(SeekFrom::Start(u64::from(header.index) * SEGMENT_SIZE))?;
    let mut remaining = payload_size as usize;
    let mut buffer = [0_u8; 64 * 1024];
    while remaining > 0 {
        let take = remaining.min(buffer.len());
        read_exact_or_error(reader, &mut buffer[..take])?;
        hasher.update(&buffer[..take]);
        output.write_all(&buffer[..take])?;
        remaining -= take;
    }
    read_crc(reader, hasher)?;
    seen[header.index as usize] = true;
    Ok(())
}

pub fn extract_png_archive(input: &Path, output_path: &Path) -> CardResult<()> {
    if fs::metadata(input)?.len() > MAX_ARCHIVE_SIZE + 513 * 1024 * 1024 {
        return Err(GameCardError::new("PNG game card is too large"));
    }
    let mut reader = BufReader::new(File::open(input)?);
    let mut signature = [0_u8; 8];
    read_exact_or_error(&mut reader, &mut signature)?;
    if signature != PNG_SIGNATURE {
        return Err(GameCardError::new("game card file is not a PNG image"));
    }
    let mut output = File::create(output_path)?;
    let mut expected = None;
    let mut seen = Vec::new();
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
        if kind == *b"IDAT" && expected.is_some() {
            return Err(GameCardError::new(
                "PNG game card chunks must follow all image data",
            ));
        }
        if kind == GAME_CHUNK {
            if !saw_idat {
                return Err(GameCardError::new(
                    "PNG game card chunks must follow image data",
                ));
            }
            read_segment(&mut reader, &mut output, length, &mut expected, &mut seen)?;
        } else {
            discard_chunk(&mut reader, kind, length)?;
        }
        saw_idat |= kind == *b"IDAT";
        if kind == *b"IEND" {
            if length != 0 || !saw_idat {
                return Err(GameCardError::new("PNG image structure is invalid"));
            }
            let mut trailing = [0_u8; 1];
            if reader.read(&mut trailing)? != 0 {
                return Err(GameCardError::new("PNG contains data after IEND"));
            }
            break;
        }
    }
    let expected = expected
        .ok_or_else(|| GameCardError::new("PNG image does not contain an embedded game card"))?;
    if seen.iter().any(|value| !value) {
        return Err(GameCardError::new("PNG game card is missing segments"));
    }
    output.flush()?;
    drop(output);
    if file_sha256(output_path)? != expected.archive_sha256 {
        return Err(GameCardError::new(
            "PNG game card archive checksum is invalid",
        ));
    }
    Ok(())
}
