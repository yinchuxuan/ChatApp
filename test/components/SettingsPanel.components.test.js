/**
 * Tests for SettingsPanel Component - Component Rendering
 */

const React = require('react');
const { render: _render, screen: _screen, act } = require('@testing-library/react');

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
  handleSelectBackgroundImage: jest.fn(),
  handleClearBackgroundImage: jest.fn()
};

const mockUseSettingsState = jest.fn(() => mockUseSettingsStateReturn);

jest.mock('../../src/settings/useSettingsState.js', () => ({ __esModule: true, default: (...args) => mockUseSettingsState(...args) }));
jest.mock('../../src/components/SettingsBackground.jsx', () => ({ __esModule: true, default: (props) => mockSettingsBackground(props) }));
jest.mock('../../src/components/SettingsModelConfig.jsx', () => ({ __esModule: true, default: (props) => mockSettingsModelConfig(props) }));

describe('SettingsPanel Component - Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render SettingsBackground component when available', async () => {
    const SettingsPanel = require('../../src/components/SettingsPanel.jsx').default;

    _render(React.createElement(SettingsPanel, {
      onToggleTheme: jest.fn(),
      theme: 'light',
      onBackgroundChange: jest.fn()
    }));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('SettingsBackground Mock')).toBeInTheDocument();
  });

  test('should render SettingsModelConfig component when available', async () => {
    const SettingsPanel = require('../../src/components/SettingsPanel.jsx').default;

    _render(React.createElement(SettingsPanel, {
      onToggleTheme: jest.fn(),
      theme: 'light',
      onBackgroundChange: jest.fn()
    }));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('SettingsModelConfig Mock')).toBeInTheDocument();
  });

  test('should render SettingsBackground without a global registration', async () => {
    const SettingsPanel = require('../../src/components/SettingsPanel.jsx').default;

    _render(React.createElement(SettingsPanel, {
      onToggleTheme: jest.fn(),
      theme: 'light',
      onBackgroundChange: jest.fn()
    }));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('SettingsBackground Mock')).toBeInTheDocument();
  });

  test('should render SettingsModelConfig without a global registration', async () => {
    const SettingsPanel = require('../../src/components/SettingsPanel.jsx').default;

    _render(React.createElement(SettingsPanel, {
      onToggleTheme: jest.fn(),
      theme: 'light',
      onBackgroundChange: jest.fn()
    }));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('SettingsModelConfig Mock')).toBeInTheDocument();
  });

  test('should not show configured status badge in header after removal', async () => {
    mockUseSettingsState.mockReturnValue({
      ...mockUseSettingsStateReturn,
      isConfigured: 'http://api.example.com'
    });

    const SettingsPanel = require('../../src/components/SettingsPanel.jsx').default;

    _render(React.createElement(SettingsPanel, {
      onToggleTheme: jest.fn(),
      theme: 'light',
      onBackgroundChange: jest.fn()
    }));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.queryByText('已配置')).not.toBeInTheDocument();
  });

  test('should handle not configured state', async () => {
    mockUseSettingsState.mockReturnValue({
      ...mockUseSettingsStateReturn,
      config: { apiUrl: '', apiKey: '', modelName: '' },
      isConfigured: false
    });

    const SettingsPanel = require('../../src/components/SettingsPanel.jsx').default;

    _render(React.createElement(SettingsPanel, {
      onToggleTheme: jest.fn(),
      theme: 'light',
      onBackgroundChange: jest.fn()
    }));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.queryByText('已配置')).not.toBeInTheDocument();
  });
});
