/**
 * highlightQuotes - Wraps text enclosed by quote pairs in <span class="quoted-text">
 * Supports: smart quotes, corner brackets, ASCII quotes
 * Operates on HTML strings, only modifying text nodes to avoid breaking tags.
 */

// Unicode escapes used:
// \u201c = " (left double)  \u201d = " (right double)
// \u2018 = ' (left single)  \u2019 = ' (right single)
// \u300c = 「  \u300d = 」  \u300e = 『  \u300f = 』

const QUOTE_PAIRS = [
  { open: '\u201c', close: '\u201d' },
  { open: '\u2018', close: '\u2019' },
  { open: '\u300c', close: '\u300d' },
  { open: '\u300e', close: '\u300f' },
];

// ASCII quotes use the same char for open and close
const ASCII_QUOTES = [
  { open: '"', close: '"' },
  { open: "'", close: "'" },
];

function wrapQuotesInText(text) {
  let result = '';
  let i = 0;
  const len = text.length;

  while (i < len) {
    let matched = false;
    const allPairs = [...QUOTE_PAIRS, ...ASCII_QUOTES];
    for (const pair of allPairs) {
      if (text[i] === pair.open) {
        // For same-char pairs (ASCII), find the next occurrence
        if (pair.open === pair.close) {
          const closeIdx = text.indexOf(pair.close, i + 1);
          if (closeIdx > i) {
            const inner = text.slice(i + 1, closeIdx);
            result += '<span class="quoted-text">' + pair.open + inner + pair.close + '</span>';
            i = closeIdx + 1;
            matched = true;
            break;
          }
        } else {
          // For distinct open/close pairs, use depth counting
          let j = i + 1;
          let depth = 1;
          while (j < len && depth > 0) {
            if (text[j] === pair.open) depth++;
            if (text[j] === pair.close) depth--;
            j++;
          }
          if (depth === 0) {
            const inner = text.slice(i + 1, j - 1);
            result += '<span class="quoted-text">' + pair.open + inner + pair.close + '</span>';
            i = j;
            matched = true;
            break;
          }
        }
      }
    }
    if (!matched) {
      result += text[i];
      i++;
    }
  }
  return result;
}

function highlightQuotes(html) {
  if (typeof html !== 'string') return html;
  const parts = html.split(/(<[^>]+>)/g);
  let result = '';
  for (const part of parts) {
    if (part.startsWith('<')) {
      result += part;
    } else {
      result += wrapQuotesInText(part);
    }
  }
  return result;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { highlightQuotes, wrapQuotesInText };
}
if (typeof window !== 'undefined') {
  window.highlightQuotes = highlightQuotes;
  window.wrapQuotesInText = wrapQuotesInText;
}
