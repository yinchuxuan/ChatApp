/**
 * Tests for SettingsBackground Component - Basic
 */

const React = require('react');
const { render: _render, screen: _screen, fireEvent: _fireEvent, act } = require('@testing-library/react');

describe('SettingsBackground Component - Basic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render background settings section', async () => {
    const SettingsBackground = require('../../src/components/SettingsBackground.jsx').default;

    const props = {
      backgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
      onBackgroundChange: jest.fn(),
      onSelectBackgroundImage: jest.fn(),
      onClearBackgroundImage: jest.fn()
    };

    _render(React.createElement(SettingsBackground, props));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('背景图片')).toBeInTheDocument();
  });

  test('should show empty state when no background image', async () => {
    const SettingsBackground = require('../../src/components/SettingsBackground.jsx').default;

    const props = {
      backgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
      onBackgroundChange: jest.fn(),
      onSelectBackgroundImage: jest.fn(),
      onClearBackgroundImage: jest.fn()
    };

    _render(React.createElement(SettingsBackground, props));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('未设置背景图片')).toBeInTheDocument();
  });

  test('should show configured status when background image is set', async () => {
    const SettingsBackground = require('../../src/components/SettingsBackground.jsx').default;

    const props = {
      backgroundConfig: { backgroundImageUrl: 'test-url', backgroundOpacity: 0.5 },
      onBackgroundChange: jest.fn(),
      onSelectBackgroundImage: jest.fn(),
      onClearBackgroundImage: jest.fn()
    };

    _render(React.createElement(SettingsBackground, props));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('已设置')).toBeInTheDocument();
  });

  test('should show config card with inline fields when background is set', async () => {
    const SettingsBackground = require('../../src/components/SettingsBackground.jsx').default;

    const props = {
      backgroundConfig: { backgroundImageUrl: 'test-url', backgroundOpacity: 0.5 },
      onBackgroundChange: jest.fn(),
      onSelectBackgroundImage: jest.fn(),
      onClearBackgroundImage: jest.fn()
    };

    _render(React.createElement(SettingsBackground, props));

    await act(async () => { await Promise.resolve(); });

    expect(document.querySelector('.config-summary-card')).toBeTruthy();
    expect(_screen.getByText('图片路径')).toBeInTheDocument();
    expect(_screen.getByText('透明度')).toBeInTheDocument();
  });

  test('should call onBackgroundChange when field clicked and edited', async () => {
    const SettingsBackground = require('../../src/components/SettingsBackground.jsx').default;

    const onBackgroundChange = jest.fn();
    const props = {
      backgroundConfig: { backgroundImageUrl: 'test-url', backgroundOpacity: 0.5 },
      onBackgroundChange,
      onSelectBackgroundImage: jest.fn(),
      onClearBackgroundImage: jest.fn()
    };

    _render(React.createElement(SettingsBackground, props));

    await act(async () => { await Promise.resolve(); });

    const fieldValue = document.querySelector('.settings-field-value');
    _fireEvent.click(fieldValue);

    const input = document.querySelector('.settings-inline-input');
    expect(input).toBeTruthy();

    _fireEvent.change(input, { target: { value: 'new-url' } });
    _fireEvent.blur(input);

    expect(onBackgroundChange).toHaveBeenCalledWith('backgroundImageUrl', 'new-url');
  });

  test('should show empty state clickable, clicking starts edit', async () => {
    const SettingsBackground = require('../../src/components/SettingsBackground.jsx').default;

    const onBackgroundChange = jest.fn();
    const props = {
      backgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
      onBackgroundChange,
      onSelectBackgroundImage: jest.fn(),
      onClearBackgroundImage: jest.fn()
    };

    _render(React.createElement(SettingsBackground, props));

    await act(async () => { await Promise.resolve(); });

    const emptyState = _screen.getByText('未设置背景图片').closest('.config-empty-state');
    await act(async () => { _fireEvent.click(emptyState); });

    const input = document.querySelector('.settings-inline-input');
    expect(input).toBeTruthy();
  });
});
