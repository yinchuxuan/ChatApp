function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== 'object') return value;
  Object.freeze(value);
  Object.keys(value).forEach(key => freeze(value[key]));
  return value;
}

function readonly(value) {
  return freeze(clone(value));
}

export { readonly };
