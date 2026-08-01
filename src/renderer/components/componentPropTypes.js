import PropTypes from 'prop-types';

const gameCard = PropTypes.shape({
  id: PropTypes.string,
  audio: PropTypes.shape({ bgm: PropTypes.objectOf(PropTypes.string) }),
  visual: PropTypes.shape({
    background: PropTypes.objectOf(PropTypes.string),
    cg: PropTypes.objectOf(PropTypes.string),
    portrait: PropTypes.objectOf(PropTypes.objectOf(PropTypes.string))
  }),
  ui: PropTypes.shape({
    root: PropTypes.shape({ source: PropTypes.string, style: PropTypes.string })
  })
});

const gameState = PropTypes.object;
const message = PropTypes.shape({
  id: PropTypes.string,
  role: PropTypes.string.isRequired,
  content: PropTypes.string,
  isError: PropTypes.bool,
  _renderIndex: PropTypes.number
});
const runtimeError = PropTypes.shape({
  title: PropTypes.string,
  message: PropTypes.string,
  error: PropTypes.string,
  stage: PropTypes.string,
  file: PropTypes.string,
  details: PropTypes.array
});
const sessionRepository = PropTypes.shape({
  loadHistory: PropTypes.func.isRequired,
  saveHistory: PropTypes.func.isRequired,
  list: PropTypes.func.isRequired,
  create: PropTypes.func.isRequired,
  setActive: PropTypes.func.isRequired,
  rename: PropTypes.func.isRequired,
  delete: PropTypes.func.isRequired
});

export { gameCard, gameState, message, PropTypes, runtimeError, sessionRepository };
