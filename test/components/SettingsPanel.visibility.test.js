/**
 * Tests for SettingsPanel Component - Interaction (Part 1)
 */

const React = require('react');
const { render: _render, screen: _screen, fireEvent: _fireEvent, act } = require('@testing-library/react');

const mockSettingsBackground = (_props) =>
  React.createElement('div', { className: 'settings-background-mock' }, 'SettingsBackground Mock');

const mockSettingsModelConfig = (_props) =>
  React.createElement('div', { className: 'settings-model-config-mock' }, 'SettingsModelConfig Mock');

const mockUseSettingsStateReturn = {
  config: { apiUrl: 'http://api.example.com', apiKey: 'test-key', modelName: 'gpt-4' },
  backgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
  editBackgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
  backgroundEditMode: false,
  isConfigured: 'http://api.example.com',
  maskApiKey: (key) => key ? '****' : '',
  handleChange: jest.fn(),
  handleBackgroundEditClick: jest.fn(),
  handleBackgroundCancelEdit: jest.fn(),
  handleBackgroundChange: jest.fn(),
  handleBackgroundSave: jest.fn(),
  handleSelectBackgroundImage: jest.fn(),
  handleClearBackgroundImage: jest.fn()
};

const mockUseSettingsState = jest.fn(() => mockUseSettingsStateReturn);

describe('SettingsPanel Component - Visibility', () => {
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

  test('should make panel visible on mouse enter', async () => {
    const SettingsPanel = require('../../src/components/SettingsPanel.jsx').default;

    _render(React.createElement(SettingsPanel, {
      onToggleTheme: jest.fn(),
      theme: 'light',
      onBackgroundChange: jest.fn()
    }));

    await act(async () => { await Promise.resolve(); });

    const triggerZone = document.querySelector('.settings-trigger-zone');
    const panel = document.querySelector('.settings-panel');

    expect(panel.className).not.toContain('visible');

    _fireEvent.mouseEnter(triggerZone);

    await act(async () => { await Promise.resolve(); });

    expect(panel.className).toContain('visible');
  });

  test('should hide panel on mouse leave', async () => {
    const SettingsPanel = require('../../src/components/SettingsPanel.jsx').default;

    _render(React.createElement(SettingsPanel, {
      onToggleTheme: jest.fn(),
      theme: 'light',
      onBackgroundChange: jest.fn()
    }));

    await act(async () => { await Promise.resolve(); });

    const triggerZone = document.querySelector('.settings-trigger-zone');
    const panel = document.querySelector('.settings-panel');

    _fireEvent.mouseEnter(triggerZone);

    await act(async () => { await Promise.resolve(); });

    expect(panel.className).toContain('visible');

    _fireEvent.mouseLeave(triggerZone);

    await act(async () => { await Promise.resolve(); });

    expect(panel.className).not.toContain('visible');
  });

  test('should use mock hook', async () => {
    const SettingsPanel = require('../../src/components/SettingsPanel.jsx').default;

    _render(React.createElement(SettingsPanel, {
      onToggleTheme: jest.fn(),
      theme: 'light',
      onBackgroundChange: jest.fn()
    }));

    await act(async () => { await Promise.resolve(); });

    expect(mockUseSettingsState).toHaveBeenCalled();
  });
});