const OPEN_TAG = '<state_patch>';
const CLOSE_TAG = '</state_patch>';
const MAX_PATCH_CHARS = 32768;

function createLeadingStatePatchParser({ maxPatchChars = MAX_PATCH_CHARS } = {}) {
  let buffer = '';
  let mode = 'leading';

  function push(text) {
    if (!text) return {};
    if (mode === 'body') return { body: text };
    buffer += text;

    const leadingWhitespace = buffer.match(/^\s*/)?.[0] || '';
    const candidate = buffer.slice(leadingWhitespace.length);
    if (mode === 'leading') {
      if (!candidate) return {};
      if (!OPEN_TAG.startsWith(candidate) && !candidate.startsWith(OPEN_TAG)) {
        mode = 'body';
        const body = buffer;
        buffer = '';
        return { body };
      }
      if (!candidate.startsWith(OPEN_TAG)) return {};
      mode = 'patch';
    }

    const closeIndex = buffer.indexOf(CLOSE_TAG);
    if (closeIndex < 0 && buffer.length > maxPatchChars) {
      mode = 'body';
      const body = buffer;
      buffer = '';
      return { body };
    }
    if (closeIndex < 0) return {};
    const blockEnd = closeIndex + CLOSE_TAG.length;
    const patchBlock = buffer.slice(0, blockEnd);
    const patchStart = buffer.indexOf(OPEN_TAG) + OPEN_TAG.length;
    const patchText = buffer.slice(patchStart, closeIndex).trim();
    const body = buffer.slice(blockEnd);
    buffer = '';
    mode = 'body';
    return { patchBlock, patchText, ...(body ? { body } : {}) };
  }

  function finish() {
    if (!buffer) return {};
    const body = buffer;
    buffer = '';
    mode = 'body';
    return { body };
  }

  return { finish, push };
}

export { CLOSE_TAG, MAX_PATCH_CHARS, OPEN_TAG, createLeadingStatePatchParser };
