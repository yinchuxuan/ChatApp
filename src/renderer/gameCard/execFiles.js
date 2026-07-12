import { resolveFileSource } from './contentFiles.js';

const fileEntriesByApi = new WeakMap();

function createExecFiles(options = {}, state = {}) {
  const api = Object.freeze({
    read: (fileRef) => {
      if (typeof fileRef !== 'string' || fileRef.length === 0) {
        throw new Error('files.read requires a file id');
      }
      return resolveFileSource(fileRef, { ...options, state });
    }
  });
  fileEntriesByApi.set(api, () => Object.fromEntries(Object.keys(options.card?.files || {}).map((fileId) => (
    [fileId, resolveFileSource(fileId, { ...options, state })]
  ))));
  return api;
}

function getExecFileEntries(api) {
  return fileEntriesByApi.get(api)?.() || {};
}

export { createExecFiles, getExecFileEntries };
