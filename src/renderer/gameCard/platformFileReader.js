function createPlatformFileReader({ fs, path, baseDir } = {}) {
  if (!fs?.readFileSync || !path || !baseDir) return undefined;

  return (filePath) => {
    if (path.isAbsolute(filePath)) throw new Error('file path must be relative');
    const root = path.resolve(baseDir);
    const resolved = path.resolve(root, filePath);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
      throw new Error('file path must stay inside game card directory');
    }
    return fs.readFileSync(resolved, 'utf-8');
  };
}

function withPlatformFileReader(options = {}) {
  const coreOptions = { ...options };
  delete coreOptions.fs;
  delete coreOptions.path;
  delete coreOptions.baseDir;
  if (typeof options.readFile === 'function') return coreOptions;
  const readFile = createPlatformFileReader(options);
  return readFile ? { ...coreOptions, readFile } : coreOptions;
}

export { createPlatformFileReader, withPlatformFileReader };
