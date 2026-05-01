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
  editConfig: { apiUrl: 'http://api.example.com', apiKey: 'test-key', modelName: 'gpt-4' },
  editMode: false,
  backgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
  editBackgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
  backgroundEditMode: false,
  isConfigured: 'http://api.example.com',
  maskApiKey: (key) => key ? '****' : '',
  handleEditClick: jest.fn(),
  handleCancelEdit: jest.fn(),
  handleChange: jest.fn(),
  handleSave: jest.fn(),
  handleBackgroundEditClick: jest.fn(),
  handleBackgroundCancelEdit: jest.fn(),
  handleBackgroundChange: jest.fn(),
  handleBackgroundSave: jest.fn(),
  handleSelectBackgroundImage: jest.fn(),
  handleClearBackgroundImage: jest.fn()
};

const mockUseSettingsState = jest.fn(() => mockUseSettingsStateReturn);

describe('SettingsPanel Component - Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.SettingsBackground = mockSettingsBackground;
    window.SettingsModelConfig = mockSettingsModelConfig;
    window.useSettingsState = mockUseSettingsState;
  });

  afterEach(() => {
    window.SettingsBackground = undefined;
    window.SettingsModelConfig = undefined;
    window.useSettingsState = undefined;
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

  test('should not render SettingsBackground when not available', async () => {
    window.SettingsBackground = undefined;

    const SettingsPanel = require('../../src/components/SettingsPanel.jsx').default;

    _render(React.createElement(SettingsPanel, {
      onToggleTheme: jest.fn(),
      theme: 'light',
      onBackgroundChange: jest.fn()
    }));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.queryByText('SettingsBackground Mock')).not.toBeInTheDocument();
  });

  test('should not render SettingsModelConfig when not available', async () => {
    window.SettingsModelConfig = undefined;

    const SettingsPanel = require('../../src/components/SettingsPanel.jsx').default;

    _render(React.createElement(SettingsPanel, {
      onToggleTheme: jest.fn(),
      theme: 'light',
      onBackgroundChange: jest.fn()
    }));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.queryByText('SettingsModelConfig Mock')).not.toBeInTheDocument();
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