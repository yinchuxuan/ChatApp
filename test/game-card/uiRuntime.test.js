const React = require('react');
const {
  compileGameCardUiRootSource,
  isSafeUiRootSourcePath,
  loadGameCardUiRoot
} = require('../../src/renderer/gameCard/uiRuntime');

describe('game card ui runtime', () => {
  afterEach(() => jest.clearAllMocks());

  test('validates ui root source paths', () => {
    expect(isSafeUiRootSourcePath('ui/root.js')).toBe(true);
    expect(isSafeUiRootSourcePath('ui/root.jsx')).toBe(true);
    expect(isSafeUiRootSourcePath('../root.js')).toBe(false);
    expect(isSafeUiRootSourcePath('/root.js')).toBe(false);
    expect(isSafeUiRootSourcePath('ui/root.tsx')).toBe(false);
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

  test('loads ui root source from card resources', async () => {
    const resources = {
      readText: jest.fn().mockResolvedValue('function Root() { return null; }')
    };
    const card = {
      id: 'choice-card',
      ui: { root: { source: 'ui/root.js', style: 'ui/root.css', props: { label: 'A' } } }
    };

    const root = await loadGameCardUiRoot(card, resources, React);

    expect(root.Component).toEqual(expect.any(Function));
    expect(root.props).toEqual({ label: 'A' });
    expect(resources.readText).toHaveBeenCalledWith('choice-card', 'ui/root.js');
  });
});
