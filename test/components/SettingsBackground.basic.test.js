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

  test('should show config card with preview and opacity when background is set', async () => {
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
    expect(document.querySelector('.background-preview')).toBeTruthy();
    expect(_screen.getByText('透明度')).toBeInTheDocument();
  });

  test('should show opacity value in display mode', async () => {
    const SettingsBackground = require('../../src/components/SettingsBackground.jsx').default;

    const props = {
      backgroundConfig: { backgroundImageUrl: 'test-url', backgroundOpacity: 0.7 },
      onBackgroundChange: jest.fn(),
      onSelectBackgroundImage: jest.fn(),
      onClearBackgroundImage: jest.fn()
    };

    _render(React.createElement(SettingsBackground, props));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('70%')).toBeInTheDocument();
  });

  test('should call onSelectBackgroundImage when empty state clicked', async () => {
    const SettingsBackground = require('../../src/components/SettingsBackground.jsx').default;

    const onSelectBackgroundImage = jest.fn();
    const props = {
      backgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
      onSelectBackgroundImage,
      onBackgroundChange: jest.fn(),
      onClearBackgroundImage: jest.fn()
    };

    _render(React.createElement(SettingsBackground, props));

    await act(async () => { await Promise.resolve(); });

    const emptyState = _screen.getByText('未设置背景图片').closest('.config-empty-state');
    _fireEvent.click(emptyState);

    expect(onSelectBackgroundImage).toHaveBeenCalled();
  });

  test('should call onSelectBackgroundImage when preview image clicked', async () => {
    const SettingsBackground = require('../../src/components/SettingsBackground.jsx').default;

    const onSelectBackgroundImage = jest.fn();
    const props = {
      backgroundConfig: { backgroundImageUrl: 'test-url', backgroundOpacity: 0.5 },
      onSelectBackgroundImage,
      onBackgroundChange: jest.fn(),
      onClearBackgroundImage: jest.fn()
    };

    _render(React.createElement(SettingsBackground, props));

    await act(async () => { await Promise.resolve(); });

    const preview = document.querySelector('.background-preview');
    _fireEvent.click(preview);

    expect(onSelectBackgroundImage).toHaveBeenCalled();
  });
});
