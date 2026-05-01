/**
 * Tests for SettingsBackground Component - Inline Actions
 */

const React = require('react');
const { render: _render, screen: _screen, fireEvent: _fireEvent, act } = require('@testing-library/react');

describe('SettingsBackground Component - Inline Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should show select file and clear buttons when background is set', async () => {
    const SettingsBackground = require('../../src/components/SettingsBackground.jsx').default;

    const props = {
      backgroundConfig: { backgroundImageUrl: 'test-url', backgroundOpacity: 0.5 },
      onBackgroundChange: jest.fn(),
      onSelectBackgroundImage: jest.fn(),
      onClearBackgroundImage: jest.fn()
    };

    _render(React.createElement(SettingsBackground, props));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('选择文件')).toBeInTheDocument();
    expect(_screen.getByText('清除')).toBeInTheDocument();
  });

  test('should call onSelectBackgroundImage when select file button clicked', async () => {
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

    _fireEvent.click(_screen.getByText('选择文件'));

    expect(onSelectBackgroundImage).toHaveBeenCalled();
  });

  test('should call onClearBackgroundImage when clear button clicked', async () => {
    const SettingsBackground = require('../../src/components/SettingsBackground.jsx').default;

    const onClearBackgroundImage = jest.fn();
    const props = {
      backgroundConfig: { backgroundImageUrl: 'test-url', backgroundOpacity: 0.5 },
      onClearBackgroundImage,
      onBackgroundChange: jest.fn(),
      onSelectBackgroundImage: jest.fn()
    };

    _render(React.createElement(SettingsBackground, props));

    await act(async () => { await Promise.resolve(); });

    _fireEvent.click(_screen.getByText('清除'));

    expect(onClearBackgroundImage).toHaveBeenCalled();
  });

  test('should not show action buttons in empty state', async () => {
    const SettingsBackground = require('../../src/components/SettingsBackground.jsx').default;

    const props = {
      backgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
      onBackgroundChange: jest.fn(),
      onSelectBackgroundImage: jest.fn(),
      onClearBackgroundImage: jest.fn()
    };

    _render(React.createElement(SettingsBackground, props));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.queryByText('选择文件')).not.toBeInTheDocument();
    expect(_screen.queryByText('清除')).not.toBeInTheDocument();
  });
});
