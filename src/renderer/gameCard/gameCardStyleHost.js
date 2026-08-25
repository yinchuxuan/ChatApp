const STYLE_SLOTS = [
  { id: 'game-card-display-style', path: card => card?.display?.stylesheet },
  { id: 'game-card-visual-style', path: card => card?.visual?.stylesheet },
  { id: 'game-card-ui-style', path: card => card?.ui?.stylesheet },
  { id: 'game-card-ui-root-style', path: card => card?.ui?.root?.style }
];

const STYLESHEET_EXTENSION_PATTERN = /\.css$/i;
const URI_SCHEME_PATTERN = /^[A-Za-z][A-Za-z0-9+.-]*:/;

function isSafeGameCardStylesheetPath(path) {
  if (typeof path !== 'string' || !STYLESHEET_EXTENSION_PATTERN.test(path)) return false;
  if (path.startsWith('/') || path.includes('\\') || URI_SCHEME_PATTERN.test(path)) return false;
  return path.split('/').every(segment => segment.length > 0 && segment !== '..');
}

function ensureStyleSlots(doc) {
  return STYLE_SLOTS.map(({ id }) => {
    const style = doc.getElementById(id) || doc.createElement('style');
    style.id = id;
    doc.head.appendChild(style);
    return style;
  });
}

function clearStyleSlot(style) {
  style.textContent = '';
  delete style.dataset.gameCardId;
  delete style.dataset.source;
}

async function readStyle(resources, cardId, definition, card) {
  const source = definition.path(card);
  if (!isSafeGameCardStylesheetPath(source)) return { source: '', content: '' };
  try {
    const content = await resources.readText(cardId, source);
    return { source, content: typeof content === 'string' ? content : '' };
  } catch (_) {
    return { source: '', content: '' };
  }
}

function createGameCardStyleHost(resources, doc = document) {
  let requestVersion = 0;

  async function load(card) {
    const version = ++requestVersion;
    const slots = ensureStyleSlots(doc);
    if (!card?.id || typeof resources?.readText !== 'function') {
      slots.forEach(clearStyleSlot);
      return false;
    }

    const styles = await Promise.all(STYLE_SLOTS.map(
      definition => readStyle(resources, card.id, definition, card)
    ));
    if (version !== requestVersion) return false;

    styles.forEach(({ source, content }, index) => {
      const style = slots[index];
      clearStyleSlot(style);
      if (!content) return;
      style.dataset.gameCardId = card.id;
      style.dataset.source = source;
      style.textContent = content;
    });
    return styles.some(({ content }) => content.length > 0);
  }

  function destroy() {
    requestVersion += 1;
    STYLE_SLOTS.forEach(({ id }) => doc.getElementById(id)?.remove());
  }

  return { destroy, load };
}

export { createGameCardStyleHost, isSafeGameCardStylesheetPath };
