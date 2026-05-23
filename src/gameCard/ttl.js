function decayTTL(messages) {
  return Array.isArray(messages) ? messages.slice() : [];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { decayTTL };
}
