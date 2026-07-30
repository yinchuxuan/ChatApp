const OPEN_TAG = '<state_patch>';
const CLOSE_TAG = '</state_patch>';
const MAX_PATCH_CHARS = 32768;

function partialOpenLength(text) {
  const limit = Math.min(text.length, OPEN_TAG.length - 1);
  for (let length = limit; length > 0; length -= 1) {
    if (OPEN_TAG.startsWith(text.slice(-length))) return length;
  }
  return 0;
}

function createStatePatchStreamParser({ maxPatchChars = MAX_PATCH_CHARS } = {}) {
  let buffer = '';
  let inPatch = false;

  function drain(finishing = false) {
    const events = [];
    while (buffer) {
      if (!inPatch) {
        const openIndex = buffer.indexOf(OPEN_TAG);
        if (openIndex >= 0) {
          if (openIndex > 0) events.push({ type: 'body', text: buffer.slice(0, openIndex) });
          buffer = buffer.slice(openIndex);
          inPatch = true;
          continue;
        }
        const held = finishing ? 0 : partialOpenLength(buffer);
        const body = buffer.slice(0, buffer.length - held);
        if (body) events.push({ type: 'body', text: body });
        buffer = buffer.slice(buffer.length - held);
        break;
      }

      const closeIndex = buffer.indexOf(CLOSE_TAG);
      if (closeIndex < 0) {
        if (!finishing && buffer.length <= maxPatchChars) break;
        events.push({ type: 'body', text: buffer });
        buffer = '';
        inPatch = false;
        break;
      }
      const end = closeIndex + CLOSE_TAG.length;
      events.push({
        type: 'patch',
        block: buffer.slice(0, end),
        text: buffer.slice(OPEN_TAG.length, closeIndex).trim()
      });
      buffer = buffer.slice(end);
      inPatch = false;
    }
    return events;
  }

  function push(text) {
    if (text) buffer += text;
    return drain(false);
  }

  function finish() {
    return drain(true);
  }

  return { finish, push };
}

export { CLOSE_TAG, MAX_PATCH_CHARS, OPEN_TAG, createStatePatchStreamParser };
