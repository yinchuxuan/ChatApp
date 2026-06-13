function normalizeHeading(text) {
  return text.replace(/\s+#+\s*$/, '').trim();
}

function parseHeadingLine(line) {
  const match = line.match(/^\s{0,3}(#{1,6})\s*(.*?)\s*$/);
  if (!match || !match[2]) return null;
  return { level: match[1].length, text: normalizeHeading(match[2]) };
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
  module.exports = { extractUniqueFileSection };
}
