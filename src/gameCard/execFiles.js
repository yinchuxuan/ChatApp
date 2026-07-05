const { resolveFileSource } = require('./contentFiles');

function createExecFiles(options = {}, state = {}) {
  return Object.freeze({
    read: (fileRef) => {
      if (typeof fileRef !== 'string' || fileRef.length === 0) {
        throw new Error('files.read requires a file id');
      }
      return resolveFileSource(fileRef, { ...options, state });
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createExecFiles };
}
