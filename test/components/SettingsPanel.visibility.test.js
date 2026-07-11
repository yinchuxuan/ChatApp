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
  isConfigured: 'http://api.example.com',
  maskApiKey: (key) => key ? '****' : '',
  handleChange: jest.fn(),
  handleBackgroundChange: jest.fn(),
  handleSelectBackgroundImage: jest.fn(),
  handleClearBackgroundImage: jest.fn()
};

const mockUseSettingsState = jest.fn(() => mockUseSettingsStateReturn);

jest.mock('../../src/components/useSettingsState.js', () => ({ __esModule: true, default: (...args) => mockUseSettingsState(...args) }));
jest.mock('../../src/components/SettingsBackground.jsx', () => ({ __esModule: true, default: (props) => mockSettingsBackground(props) }));
jest.mock('../../src/components/SettingsModelConfig.jsx', () => ({ __esModule: true, default: (props) => mockSettingsModelConfig(props) }));

describe('SettingsPanel Component - Visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
