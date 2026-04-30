/**
 * Tests for SettingsBackground Component - Edit Mode (Part 1)
 */

const React = require('react');
const { render: _render, screen: _screen, fireEvent: _fireEvent, act } = require('@testing-library/react');

describe('SettingsBackground Component - Edit Buttons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should show select file button in edit mode', async () => {
    const SettingsBackground = require('../../src/components/SettingsBackground.jsx').default;

    const props = {
      backgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
      editBackgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
      backgroundEditMode: true,
      onBackgroundEditClick: jest.fn(),
      onBackgroundCancelEdit: jest.fn(),
      onBackgroundChange: jest.fn(),
      onBackgroundSave: jest.fn(),
      onSelectBackgroundImage: jest.fn(),
      onClearBackgroundImage: jest.fn()
    };

    _render(React.createElement(SettingsBackground, props));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('选择文件')).toBeInTheDocument();
  });

  test('should show clear button in edit mode', async () => {
    const SettingsBackground = require('../../src/components/SettingsBackground.jsx').default;

    const props = {
      backgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
      editBackgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
      backgroundEditMode: true,
      onBackgroundEditClick: jest.fn(),
      onBackgroundCancelEdit: jest.fn(),
      onBackgroundChange: jest.fn(),
      onBackgroundSave: jest.fn(),
      onSelectBackgroundImage: jest.fn(),
      onClearBackgroundImage: jest.fn()
    };

    _render(React.createElement(SettingsBackground, props));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('清除')).toBeInTheDocument();
  });

  test('should call onSelectBackgroundImage when select file button clicked', async () => {
    const SettingsBackground = require('../../src/components/SettingsBackground.jsx').default;

    const onSelectBackgroundImage = jest.fn();
    const props = {
      backgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
      editBackgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
      backgroundEditMode: true,
      onBackgroundEditClick: jest.fn(),
      onBackgroundCancelEdit: jest.fn(),
      onBackgroundChange: jest.fn(),
      onBackgroundSave: jest.fn(),
      onSelectBackgroundImage,
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
      editBackgroundConfig: { backgroundImageUrl: 'test-url', backgroundOpacity: 0.5 },
      backgroundEditMode: true,
      onBackgroundEditClick: jest.fn(),
      onBackgroundCancelEdit: jest.fn(),
      onBackgroundChange: jest.fn(),
      onBackgroundSave: jest.fn(),
      onSelectBackgroundImage: jest.fn(),
      onClearBackgroundImage
    };

    _render(React.createElement(SettingsBackground, props));

    await act(async () => { await Promise.resolve(); });

    _fireEvent.click(_screen.getByText('清除'));

    expect(onClearBackgroundImage).toHaveBeenCalled();
  });

  test('should render save and cancel buttons in edit mode', async () => {
    const SettingsBackground = require('../../src/components/SettingsBackground.jsx').default;

    const props = {
      backgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
      editBackgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
      backgroundEditMode: true,
      onBackgroundEditClick: jest.fn(),
      onBackgroundCancelEdit: jest.fn(),
      onBackgroundChange: jest.fn(),
      onBackgroundSave: jest.fn(),
      onSelectBackgroundImage: jest.fn(),
      onClearBackgroundImage: jest.fn()
    };

    _render(React.createElement(SettingsBackground, props));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('取消')).toBeInTheDocument();
    expect(_screen.getByText('保存背景')).toBeInTheDocument();
  });

  test('should call onBackgroundSave when save button clicked', async () => {
    const SettingsBackground = require('../../src/components/SettingsBackground.jsx').default;

    const onBackgroundSave = jest.fn();
    const props = {
      backgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
      editBackgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
      backgroundEditMode: true,
      onBackgroundEditClick: jest.fn(),
      onBackgroundCancelEdit: jest.fn(),
      onBackgroundChange: jest.fn(),
      onBackgroundSave,
      onSelectBackgroundImage: jest.fn(),
      onClearBackgroundImage: jest.fn()
    };

    _render(React.createElement(SettingsBackground, props));

    await act(async () => { await Promise.resolve(); });

    _fireEvent.click(_screen.getByText('保存背景'));

    expect(onBackgroundSave).toHaveBeenCalled();
  });
});