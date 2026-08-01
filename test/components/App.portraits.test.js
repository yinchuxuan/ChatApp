const React = require('react');
const { act, render } = require('@testing-library/react');

let mockChatPanelProps;
const mockChatPanel = (props) => {
  mockChatPanelProps = props;
  return React.createElement('div');
};

jest.mock('../../src/renderer/ChatPanel.jsx', () => ({
  __esModule: true,
  default: (props) => mockChatPanel(props)
}));
jest.mock('../../src/renderer/components/SettingsPanel.jsx', () => ({
  __esModule: true,
  default: () => null
}));

test('renders, updates and clears multiple game card portraits', async () => {
  window.matchMedia = jest.fn(() => ({ matches: false }));
  const App = require('../../src/renderer/App.jsx').default;
  render(React.createElement(App));

  await act(async () => mockChatPanelProps.onPortraitChange({
    portraits: [
      { character: 'touma', expression: 'normal', url: 'touma-url' },
      { character: 'setsuna', expression: 'happy', url: 'setsuna-url' }
    ]
  }));
  const layer = document.querySelector('[data-gc-part="portrait-layer"]');
  const toumaSlot = layer.querySelector('[data-character="touma"]');
  const portrait = toumaSlot.querySelector('img');
  const setsunaPortrait = layer.querySelector('[data-character="setsuna"] img');
  expect(layer.dataset.count).toBe('2');
  expect(portrait.getAttribute('src')).toBe('touma-url');
  expect(portrait.dataset.transition).toBe('enter');
  expect(document.querySelector('.app-container').className).toContain('has-portrait');

  await act(async () => mockChatPanelProps.onPortraitChange({
    portraits: [
      { character: 'touma', expression: 'sad', url: 'touma-sad-url' },
      { character: 'setsuna', expression: 'happy', url: 'setsuna-url' }
    ]
  }));
  const nextToumaSlot = document.querySelector('[data-character="touma"]');
  const nextPortrait = nextToumaSlot.querySelector('img');
  expect(nextPortrait.getAttribute('src')).toBe('touma-sad-url');
  expect(nextPortrait.dataset.transition).toBe('expression');
  expect(nextToumaSlot).toBe(toumaSlot);
  expect(nextPortrait).not.toBe(portrait);
  expect(document.querySelector('[data-character="setsuna"] img')).toBe(setsunaPortrait);
  expect(setsunaPortrait.dataset.transition).toBe('stable');

  await act(async () => mockChatPanelProps.onPortraitChange({
    portraits: [{ character: 'touma', expression: 'sad', url: 'touma-sad-url' }]
  }));
  const singleLayer = document.querySelector('[data-gc-part="portrait-layer"]');
  expect(singleLayer.dataset.count).toBe('1');
  expect(singleLayer.querySelector('[data-character="touma"]').style.left).toBe('50%');

  await act(async () => mockChatPanelProps.onPortraitChange({ portraits: [] }));
  expect(document.querySelector('[data-gc-part="portrait-layer"]')).toBeNull();
});
