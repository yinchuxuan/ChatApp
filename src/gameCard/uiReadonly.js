import { cloneJson, deepFreeze } from '../../shared/game-card/utils/jsonValue.js';

function readonly(value) {
  return deepFreeze(cloneJson(value));
}

export { readonly };
