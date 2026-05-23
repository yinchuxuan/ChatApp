function validateGameCard(card) {
  const errors = [];

  if (!card || typeof card !== 'object') {
    errors.push('card must be an object');
  } else if (!Array.isArray(card.rules)) {
    errors.push('card.rules must be an array');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validateGameCard };
}
