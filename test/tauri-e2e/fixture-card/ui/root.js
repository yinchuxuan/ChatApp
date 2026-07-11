// eslint-disable-next-line no-unused-vars
function Root({ React, state, emit }) {
  return React.createElement('button', {
    className: 'tauri-e2e-ui',
    style: { pointerEvents: 'auto' },
    onClick: () => emit({
      type: 'game.state.apply',
      actions: [{ type: 'state.set', path: 'score', value: Number(state.score || 0) + 1 }]
    })
  }, `本地交互 ${state.score || 0}`);
}
