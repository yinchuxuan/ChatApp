function parseFileSectionRef(ref) {
  const markerIndex = ref.indexOf('#');
  if (markerIndex <= 0) throw new Error('file_section requires path and heading');
  let cursor = markerIndex;
  while (ref[cursor] === '#') cursor += 1;
  const level = cursor - markerIndex;
  const filePath = ref.slice(0, markerIndex);
  const heading = ref.slice(cursor).trim();
  if (level > 6 || !heading) throw new Error('file_section requires path and heading');
  return { filePath, level, heading };
}

function normalizeHeading(text) {
  return text.replace(/\s+#+\s*$/, '').trim();
}

function parseHeadingLine(line) {
  const match = line.match(/^\s{0,3}(#{1,6})\s*(.*?)\s*$/);
  if (!match || !match[2]) return null;
  return { level: match[1].length, text: normalizeHeading(match[2]) };
}

function extractFileSection(content, ref) {
  const section = parseFileSectionRef(ref);
  const lines = content.split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const heading = parseHeadingLine(lines[i]);
    if (heading && heading.level === section.level && heading.text === section.heading) {
      start = i + 1;
      break;
    }
  }
  if (start < 0) throw new Error(`file_section heading not found: ${section.heading}`);

  let end = lines.length;
  for (let i = start; i < lines.length; i += 1) {
    const heading = parseHeadingLine(lines[i]);
    if (heading && heading.level <= section.level) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n').trim();
}

function extractUniqueFileSection(content, headingText) {
  const lines = content.split(/\r?\n/);
  const matches = [];
  for (let i = 0; i < lines.length; i += 1) {
    const heading = parseHeadingLine(lines[i]);
    if (heading && heading.text === headingText) matches.push({ index: i, level: heading.level });
  }
  if (matches.length === 0) throw new Error(`file section heading not found: ${headingText}`);
  if (matches.length > 1) throw new Error(`file section heading is not unique: ${headingText}`);
  const match = matches[0];
  let end = lines.length;
  for (let i = match.index + 1; i < lines.length; i += 1) {
    const heading = parseHeadingLine(lines[i]);
    if (heading && heading.level <= match.level) {
      end = i;
      break;
    }
  }
  return lines.slice(match.index + 1, end).join('\n').trim();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseFileSectionRef, extractFileSection, extractUniqueFileSection };
}
