/* eslint-disable no-unused-vars */
/* exported run */

const LOCATION_BACKGROUNDS = {
  school: 'school',
  classroom: 'classroom',
  third_music_room: 'musical_classroom3'
};

function ensureObject(state, key) {
  if (!state[key] || typeof state[key] !== 'object') state[key] = {};
}

function hasResource(resources, key) {
  return !!resources && Object.prototype.hasOwnProperty.call(resources, key);
}

function run(ctx) {
  const { state, config } = ctx;
  ensureObject(state, 'scene');
  ensureObject(state, 'visual');

  const background = LOCATION_BACKGROUNDS[state.scene.location];
  if (hasResource(config.visual && config.visual.background, background)) {
    state.visual.background = background;
  }

  const portrait = state.scene.portrait;
  if (portrait === 'none' || hasResource(config.visual && config.visual.portrait, portrait)) {
    state.visual.portrait = portrait;
  }
  return { state };
}
