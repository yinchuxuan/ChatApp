import React from 'react';
import { PropTypes } from './componentPropTypes.js';

const CENTERED_STYLE = { left: '50%' };
const portraitShape = PropTypes.shape({
  character: PropTypes.string.isRequired,
  expression: PropTypes.string.isRequired,
  index: PropTypes.number,
  transition: PropTypes.string,
  url: PropTypes.string.isRequired
});

function GameCardPortraitLayers({ layers, onExitEnd, onExpressionExitEnd }) {
  const {
    current = [], exiting = [], exitingCount = 0, expressionExits = []
  } = layers;
  return <>
    {exiting.length > 0 && <div className="app-portrait-layer app-portrait-layer-exiting"
      data-count={exitingCount} aria-hidden="true" onAnimationEnd={onExitEnd}>
      {exiting.map(portrait => <div key={portrait.character}
        className="app-portrait-slot" data-character={portrait.character}
        data-index={portrait.index} style={exitingCount === 1 ? CENTERED_STYLE : undefined}>
        <img className="app-portrait-image" data-transition="exit" src={portrait.url} alt="" />
      </div>)}
    </div>}
    {current.length > 0 && <div className="app-portrait-layer"
      data-gc-part="portrait-layer" data-count={current.length} aria-hidden="true">
      {current.map((portrait, index) => {
        const previous = expressionExits.find(item => item.character === portrait.character);
        return <div key={portrait.character} className="app-portrait-slot"
          data-character={portrait.character} data-index={index}
          style={current.length === 1 ? CENTERED_STYLE : undefined}>
          {previous && <img key={previous.expression}
            className="app-portrait-image" data-transition="expression-exit"
            src={previous.url} alt=""
            onAnimationEnd={() => onExpressionExitEnd(portrait.character)} />}
          <img key={portrait.expression} className="app-portrait-image"
            data-transition={portrait.transition} src={portrait.url} alt="" />
        </div>;
      })}
    </div>}
  </>;
}

GameCardPortraitLayers.propTypes = {
  layers: PropTypes.shape({
    current: PropTypes.arrayOf(portraitShape).isRequired,
    exiting: PropTypes.arrayOf(portraitShape).isRequired,
    exitingCount: PropTypes.number.isRequired,
    expressionExits: PropTypes.arrayOf(portraitShape).isRequired
  }).isRequired,
  onExitEnd: PropTypes.func.isRequired,
  onExpressionExitEnd: PropTypes.func.isRequired
};

export default GameCardPortraitLayers;
