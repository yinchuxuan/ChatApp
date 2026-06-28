const React = require('react');
const {
  compileGameCardUiRootSource,
  isSafeUiRootSourcePath,
  isSafeUiRootStylePath,
  loadGameCardUiRoot,
  loadGameCardUiRootStyle,
  removeGameCardUiRootStyle
} = require('../../src/gameCard/uiRuntime');

describe('game card ui runtime', () => {
  afterEach(() => {
    removeGameCardUiRootStyle(document);
    jest.clearAllMocks();
  });

  test('validates ui root source and style paths', () => {
    expect(isSafeUiRootSourcePath('ui/root.js')).toBe(true);
    expect(isSafeUiRootSourcePath('ui/root.jsx')).toBe(true);
    expect(isSafeUiRootSourcePath('../root.js')).toBe(false);
    expect(isSafeUiRootSourcePath('/root.js')).toBe(false);
    expect(isSafeUiRootSourcePath('ui/root.tsx')).toBe(false);
    expect(isSafeUiRootStylePath('ui/root.css')).toBe(true);
    expect(isSafeUiRootStylePath('../root.css')).toBe(false);
  });

  test('compiles Root component sources', () => {
    const Root = compileGameCardUiRootSource(`
      function Root({ React, props }) {
        return React.createElement('button', null, props.label);
      }
    `, React);

    expect(Root).toEqual(expect.any(Function));
  });

  test('compiles simple default export component sources', () => {
    const Root = compileGameCardUiRootSource(`
      export default function ChoiceRoot({ React }) {
        return React.createElement('button', null, 'A');
      }
    `, React);

    expect(Root).toEqual(expect.any(Function));
  });

  test('rejects browser globals and imports in ui root source', () => {
    expect(() => compileGameCardUiRootSource('import x from "x"; function Root() {}', React))
      .toThrow('cannot use import or require');
    expect(() => compileGameCardUiRootSource('function Root() { return window.location; }', React))
      .toThrow('blocked browser runtime token');
  });

  test('loads ui root source and optional style from card resources', async () => {
    const api = {
      readGameCardFile: jest.fn(async (_id, filePath) => ({
        success: true,
        content: filePath.endsWith('.css')
          ? '.choice { pointer-events: auto; }'
          : 'function Root() { return null; }'
      }))
    };
    const card = {
      id: 'choice-card',
      ui: { root: { source: 'ui/root.js', style: 'ui/root.css', props: { label: 'A' } } }
    };

    await expect(loadGameCardUiRootStyle(card, api, document)).resolves.toBe(true);
    const root = await loadGameCardUiRoot(card, api, React);

    expect(root.Component).toEqual(expect.any(Function));
    expect(root.props).toEqual({ label: 'A' });
    expect(document.getElementById('game-card-ui-root-style').textContent)
      .toContain('pointer-events');
  });
});
