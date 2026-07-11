/**
 * Tests for App Component - Theme
 */

const React = require('react');
const { render: _render, screen: _screen, fireEvent: _fireEvent, act } = require('@testing-library/react');

const platformMock = global.platformMock;

let initialGameCardBackground = '';
const mockChatPanel = (props) => {
  React.useEffect(() => {
    if (initialGameCardBackground) props.onBackgroundChange({ url: initialGameCardBackground });
  }, []);
  return React.createElement('div', { className: 'chat-panel-mock' }, 'ChatPanel Mock');
};
const mockSettingsPanel = ({ onToggleTheme: _onToggleTheme, theme, onBackgroundChange: _onBackgroundChange }) =>
  React.createElement('div', { className: 'settings-panel-mock' }, `Settings: ${theme}`);

jest.mock('../../src/ChatPanel.jsx', () => ({ __esModule: true, default: (props) => mockChatPanel(props) }));
jest.mock('../../src/components/SettingsPanel.jsx', () => ({ __esModule: true, default: (props) => mockSettingsPanel(props) }));

describe('App Component - Theme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    initialGameCardBackground = '';
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    }));
    platformMock.getBackgroundConfig.mockResolvedValue({
      success: true,
      config: { backgroundImageUrl: '', backgroundOpacity: 0.5 }
    });
    platformMock.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: '', apiKey: '', modelName: '' }
    });
  });

  test('should initialize theme from localStorage', async () => {
    localStorage.setItem('theme', 'dark');

    const App = require('../../src/App.jsx').default;

    _render(React.createElement(App, null));

    await act(async () => { await Promise.resolve(); });

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  test('should initialize theme from system preference when no saved theme', async () => {
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    }));

    const App = require('../../src/App.jsx').default;

    _render(React.createElement(App, null));

    await act(async () => { await Promise.resolve(); });

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  test('should initialize light theme when system prefers light', async () => {
    localStorage.clear();
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    }));

    const App = require('../../src/App.jsx').default;

    _render(React.createElement(App, null));

    await act(async () => { await Promise.resolve(); });

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  test('should render app container', async () => {
    const App = require('../../src/App.jsx').default;

    _render(React.createElement(App, null));

    await act(async () => { await Promise.resolve(); });

    const appContainer = document.querySelector('.app-container');
    expect(appContainer).toBeTruthy();
  });

  test('should render ChatPanel when no document selected', async () => {
    const App = require('../../src/App.jsx').default;

    _render(React.createElement(App, null));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('ChatPanel Mock')).toBeInTheDocument();
  });

  test('uses the initial game card background from the runtime callback', async () => {
    initialGameCardBackground = 'local:///Users/me/Application Support/ChatApp/invite.png';
    const App = require('../../src/App.jsx').default;

    _render(React.createElement(App, null));

    await act(async () => { await Promise.resolve(); });

    expect(document.querySelector('.app-background-layer-current').style.backgroundImage)
      .toContain('local:///Users/me/Application%20Support/ChatApp/invite.png');
  });

  test('should render SettingsPanel component', async () => {
    const App = require('../../src/App.jsx').default;

    _render(React.createElement(App, null));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText(/Settings:/)).toBeInTheDocument();
  });
});
