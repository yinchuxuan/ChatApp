function resolveContent(content, originalMessage = {}) {
  if (typeof content !== 'string') return '';
  return content.replaceAll('{{original_content}}', originalMessage.content || '');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { resolveContent };
}
