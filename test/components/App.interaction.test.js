/**
 * Tests for App Component - Interaction
 */

const React = require('react');
const { render: _render, screen: _screen, fireEvent: _fireEvent, act } = require('@testing-library/react');

const electronAPI = global.window.electronAPI;

const mockChatPanel = () => React.createElement('div', { className: 'chat-panel-mock' }, 'ChatPanel Mock');
const mockSettingsPanel = ({ onToggleTheme, theme, onBackgroundChange: _onBackgroundChange }) =>
  React.createElement('div', { className: 'settings-panel-mock' },
    `Settings: ${theme}`,
    React.createElement('button', { onClick: onToggleTheme }, 'Toggle Theme')
  );

describe('App Component - Interaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    window.ChatPanel = mockChatPanel;
    window.SettingsPanel = mockSettingsPanel;
    electronAPI.getBackgroundConfig.mockResolvedValue({
      success: true,
      config: { backgroundImageUrl: '', backgroundOpacity: 0.5 }
    });
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: '', apiKey: '', modelName: '' }
    });
  });

  afterEach(() => {
    window.ChatPanel = undefined;
    window.SettingsPanel = undefined;
  });

  test('should handle theme toggle through SettingsPanel', async () => {
    const mockSettingsPanelWithToggle = ({ onToggleTheme, theme }) =>
      React.createElement('button', {
        className: 'toggle-theme-btn',
        onClick: onToggleTheme
      }, `Theme: ${theme}`);

    window.SettingsPanel = mockSettingsPanelWithToggle;

    localStorage.setItem('theme', 'light');

    const App = require('../../src/App.jsx').default;
    _render(React.createElement(App, null));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('Theme: light')).toBeInTheDocument();

    _fireEvent.click(_screen.getByText('Theme: light'));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('Theme: dark')).toBeInTheDocument();
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  test('should handle background config change', async () => {
    const mockSettingsPanelWithBgChange = ({ onBackgroundChange }) =>
      React.createElement('button', {
        className: 'change-bg-btn',
        onClick: () => onBackgroundChange({
          backgroundImageUrl: 'test-image-url',
          backgroundOpacity: 0.3
        })
      }, 'Change Background');

    window.SettingsPanel = mockSettingsPanelWithBgChange;

    const App = require('../../src/App.jsx').default;
    _render(React.createElement(App, null));

    await act(async () => { await Promise.resolve(); });

    const appContainer = document.querySelector('.app-container');
    expect(appContainer.className).not.toContain('has-background-image');

    _fireEvent.click(_screen.getByText('Change Background'));

    await act(async () => { await Promise.resolve(); });

    expect(appContainer.className).toContain('has-background-image');
  });

  test('should render null when ChatPanel component not available', async () => {
    window.ChatPanel = undefined;

    const App = require('../../src/App.jsx').default;
    _render(React.createElement(App, null));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.queryByText('ChatPanel Mock')).not.toBeInTheDocument();
  });

  test('should render null when SettingsPanel component not available', async () => {
    window.SettingsPanel = undefined;

    const App = require('../../src/App.jsx').default;
    _render(React.createElement(App, null));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.queryByText(/Settings:/)).not.toBeInTheDocument();
  });
});