const VISUAL_STYLE_ID = 'game-card-visual-style';

function removeGameCardVisualStyle(doc = document) {
  const existing = doc.getElementById(VISUAL_STYLE_ID);
  if (existing) existing.remove();
}

function isSafeVisualStylesheetPath(path) {
  return typeof path === 'string' &&
    path.length > 0 &&
    path.toLowerCase().endsWith('.css') &&
    !path.startsWith('/') &&
    !path.split(/[\\/]+/).includes('..');
}

async function loadGameCardVisualStyle(card, resources, doc = document) {
  removeGameCardVisualStyle(doc);
  const stylesheet = card?.visual?.stylesheet;
  if (!card?.id || !isSafeVisualStylesheetPath(stylesheet) || typeof resources?.readText !== 'function') {
    return false;
  }
  let content;
  try { content = await resources.readText(card.id, stylesheet); } catch (_) { return false; }
  if (!content) return false;
  const style = doc.createElement('style');
  style.id = VISUAL_STYLE_ID;
  style.dataset.gameCardId = card.id;
  style.dataset.source = stylesheet;
  style.textContent = content;
  doc.head.appendChild(style);
  return true;
}

export { isSafeVisualStylesheetPath, loadGameCardVisualStyle, removeGameCardVisualStyle };
