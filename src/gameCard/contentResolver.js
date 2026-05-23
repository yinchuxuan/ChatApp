function resolveContent(content) {
  return typeof content === 'string' ? content : '';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { resolveContent };
}
