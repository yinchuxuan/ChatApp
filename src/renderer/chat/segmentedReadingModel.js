import { applyAssistantDisplayRules } from '../gameCard/displayRules.js';
import { messageKey } from './messageSelection.js';

const INPUT_ACTION_PATTERN = /data-gc-chat-input-(?:value|value-from|label)/;
const STATE_PATCH_PATTERN = /<state_patch>([\s\S]*?)<\/state_patch>/g;

function splitReadingSegments(content) {
  return String(content || '')
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n+/)
    .filter(segment => segment.trim());
}

function resolveReadingSegments(content, display, includeInputActions = true) {
  const segments = splitReadingSegments(applyAssistantDisplayRules(content, display));
  return includeInputActions
    ? segments
    : segments.filter(segment => !INPUT_ACTION_PATTERN.test(segment));
}

function buildStatePatchTimeline(content, display, includeInputActions = true) {
  const source = String(content || '');
  const patches = [...source.matchAll(STATE_PATCH_PATTERN)].map((match, ordinal) => {
    const prefix = source.slice(0, match.index).replace(STATE_PATCH_PATTERN, '');
    return {
      boundary: resolveReadingSegments(prefix, display, includeInputActions).length,
      ordinal,
      text: match[1].trim()
    };
  });
  return {
    pageCount: resolveReadingSegments(source, display, includeInputActions).length,
    patches
  };
}

function buildReadingEntries(messages, isLoading, streamContent, displayedCount, display,
  rawStreamContent = streamContent, streamMessageId = '') {
  const sourceMessages = Array.isArray(messages) ? messages : [];
  const completed = sourceMessages
    .map((message, index) => ({ message, messageIndex: index }))
    .filter(({ message }) => message?.role === 'assistant');
  const lastCompleted = completed.length - 1;
  const entries = completed
    .map(({ message, messageIndex }, index) => {
      const content = String(message.content || '');
      const timeline = buildStatePatchTimeline(
        content,
        display,
        !isLoading && index === lastCompleted
      );
      return {
        content,
        key: messageKey(message, `assistant-${messageIndex}`),
        messageIndex,
        pageCount: timeline.pageCount,
        patches: timeline.patches,
        streaming: false
      };
    })
    .filter(entry => entry.pageCount > 0);
  if (isLoading) {
    const visible = String(streamContent || '').slice(0, displayedCount);
    const content = String(rawStreamContent || visible);
    const timeline = buildStatePatchTimeline(content, display);
    entries.push({
      content,
      key: streamMessageId || `streaming-${sourceMessages.length}`,
      messageIndex: sourceMessages.length,
      pageCount: Math.max(resolveReadingSegments(visible, display).length, 1),
      patches: timeline.patches,
      streaming: true
    });
  }
  return entries;
}

function normalizeReadingCursor(cursor, entries) {
  if (entries.length === 0) return { entryIndex: 0, pageIndex: 0 };
  const entryIndex = Math.min(cursor.entryIndex, entries.length - 1);
  const pageIndex = Math.min(cursor.pageIndex, entries[entryIndex].pageCount - 1);
  return { entryIndex, pageIndex };
}

export {
  buildStatePatchTimeline,
  buildReadingEntries,
  normalizeReadingCursor,
  resolveReadingSegments,
  splitReadingSegments
};
