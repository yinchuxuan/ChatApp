/**
 * Tests for SettingsPanel Component - Basic
 */

const React = require('react');
const { render: _render, screen: _screen, fireEvent: _fireEvent, act } = require('@testing-library/react');

const electronAPI = global.window.electronAPI;

const mockSettingsBackground = (_props) =>
  React.createElement('div', { className: 'settings-background-mock' }, 'SettingsBackground Mock');

const mockSettingsModelConfig = (_props) =>
  React.createElement('div', { className: 'settings-model-config-mock' }, 'SettingsModelConfig Mock');

const mockUseSettingsStateReturn = {
  config: { apiUrl: 'http://api.example.com', apiKey: 'test-key', modelName: 'gpt-4' },
  backgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
  isConfigured: 'http://api.example.com',
  maskApiKey: (key) => key ? '****' : '',
  handleChange: jest.fn(),
  handleBackgroundChange: jest.fn(),
  handleSelectBackgroundImage: jest.fn()
};

const mockUseSettingsState = jest.fn(() => mockUseSettingsStateReturn);

describe('SettingsPanel Component - Basic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'http://api.example.com', apiKey: 'test-key', modelName: 'gpt-4' }
    });
    electronAPI.getBackgroundConfig.mockResolvedValue({
      success: true,
      config: { backgroundImageUrl: '', backgroundOpacity: 0.5 }
    });
    window.SettingsBackground = mockSettingsBackground;
    window.SettingsModelConfig = mockSettingsModelConfig;
    window.useSettingsState = mockUseSettingsState;
  });

  afterEach(() => {
    window.SettingsBackground = undefined;
    window.SettingsModelConfig = undefined;
    window.useSettingsState = undefined;
  });

  test('should render settings trigger zone', async () => {
    const SettingsPanel = require('../../src/components/SettingsPanel.jsx').default;

    _render(React.createElement(SettingsPanel, {
      onToggleTheme: jest.fn(),
      theme: 'light',
      onBackgroundChange: jest.fn()
    }));

    await act(async () => { await Promise.resolve(); });

    const triggerZone = document.querySelector('.settings-trigger-zone');
    expect(triggerZone).toBeTruthy();
  });

  test('should render settings panel container', async () => {
    const SettingsPanel = require('../../src/components/SettingsPanel.jsx').default;

    _render(React.createElement(SettingsPanel, {
      onToggleTheme: jest.fn(),
      theme: 'light',
      onBackgroundChange: jest.fn()
    }));

    await act(async () => { await Promise.resolve(); });

    const panel = document.querySelector('.settings-panel');
    expect(panel).toBeTruthy();
  });

  test('should render settings header', async () => {
    const SettingsPanel = require('../../src/components/SettingsPanel.jsx').default;

    _render(React.createElement(SettingsPanel, {
      onToggleTheme: jest.fn(),
      theme: 'light',
      onBackgroundChange: jest.fn()
    }));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('系统配置')).toBeInTheDocument();
  });

  test('should render theme toggle section', async () => {
    const SettingsPanel = require('../../src/components/SettingsPanel.jsx').default;

    _render(React.createElement(SettingsPanel, {
      onToggleTheme: jest.fn(),
      theme: 'light',
      onBackgroundChange: jest.fn()
    }));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('外观模式')).toBeInTheDocument();
  });

  test('should show correct theme toggle button text for light theme', async () => {
    const SettingsPanel = require('../../src/components/SettingsPanel.jsx').default;

    _render(React.createElement(SettingsPanel, {
      onToggleTheme: jest.fn(),
      theme: 'light',
      onBackgroundChange: jest.fn()
    }));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('切换到深色')).toBeInTheDocument();
  });

  test('should show correct theme toggle button text for dark theme', async () => {
    const SettingsPanel = require('../../src/components/SettingsPanel.jsx').default;

    _render(React.createElement(SettingsPanel, {
      onToggleTheme: jest.fn(),
      theme: 'dark',
      onBackgroundChange: jest.fn()
    }));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('切换到浅色')).toBeInTheDocument();
  });

  test('should call onToggleTheme when theme button clicked', async () => {
    const onToggleTheme = jest.fn();
    const SettingsPanel = require('../../src/components/SettingsPanel.jsx').default;

    _render(React.createElement(SettingsPanel, {
      onToggleTheme,
      theme: 'light',
      onBackgroundChange: jest.fn()
    }));

    await act(async () => { await Promise.resolve(); });

    _fireEvent.click(_screen.getByText('切换到深色'));

    expect(onToggleTheme).toHaveBeenCalled();
  });

  test('should render settings indicator', async () => {
    const SettingsPanel = require('../../src/components/SettingsPanel.jsx').default;

    _render(React.createElement(SettingsPanel, {
      onToggleTheme: jest.fn(),
      theme: 'light',
      onBackgroundChange: jest.fn()
    }));

    await act(async () => { await Promise.resolve(); });

    const indicator = document.querySelector('.settings-indicator');
    expect(indicator).toBeTruthy();
  });
});