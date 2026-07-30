import { applyAssistantDisplayRules } from '../gameCard/displayRules.js';
import { messageKey } from './messageSelection.js';

const INPUT_ACTION_PATTERN = /data-gc-chat-input-(?:value|value-from|label)/;

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

function buildReadingEntries(messages, isLoading, streamContent, displayedCount, display) {
  const sourceMessages = Array.isArray(messages) ? messages : [];
  const completed = sourceMessages
    .map((message, index) => ({ message, messageIndex: index }))
    .filter(({ message }) => message?.role === 'assistant');
  const lastCompleted = completed.length - 1;
  const entries = completed
    .map(({ message, messageIndex }, index) => ({
      key: messageKey(message, `assistant-${messageIndex}`),
      messageIndex,
      pageCount: resolveReadingSegments(
        message.content,
        display,
        !isLoading && index === lastCompleted
      ).length,
      streaming: false
    }))
    .filter(entry => entry.pageCount > 0);
  if (isLoading) {
    const content = String(streamContent || '').slice(0, displayedCount);
    entries.push({
      key: `streaming-${sourceMessages.length}`,
      messageIndex: sourceMessages.length,
      pageCount: Math.max(resolveReadingSegments(content, display).length, 1),
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
  buildReadingEntries,
  normalizeReadingCursor,
  resolveReadingSegments,
  splitReadingSegments
};
