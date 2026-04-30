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
      editBackgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
      backgroundEditMode: false,
      onBackgroundEditClick: jest.fn(),
      onBackgroundCancelEdit: jest.fn(),
      onBackgroundChange: jest.fn(),
      onBackgroundSave: jest.fn(),
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
      editBackgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
      backgroundEditMode: false,
      onBackgroundEditClick: jest.fn(),
      onBackgroundCancelEdit: jest.fn(),
      onBackgroundChange: jest.fn(),
      onBackgroundSave: jest.fn(),
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
      editBackgroundConfig: { backgroundImageUrl: 'test-url', backgroundOpacity: 0.5 },
      backgroundEditMode: false,
      onBackgroundEditClick: jest.fn(),
      onBackgroundCancelEdit: jest.fn(),
      onBackgroundChange: jest.fn(),
      onBackgroundSave: jest.fn(),
      onSelectBackgroundImage: jest.fn(),
      onClearBackgroundImage: jest.fn()
    };

    _render(React.createElement(SettingsBackground, props));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('已设置')).toBeInTheDocument();
  });

  test('should call onBackgroundEditClick when empty state clicked', async () => {
    const SettingsBackground = require('../../src/components/SettingsBackground.jsx').default;

    const onBackgroundEditClick = jest.fn();
    const props = {
      backgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
      editBackgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
      backgroundEditMode: false,
      onBackgroundEditClick,
      onBackgroundCancelEdit: jest.fn(),
      onBackgroundChange: jest.fn(),
      onBackgroundSave: jest.fn(),
      onSelectBackgroundImage: jest.fn(),
      onClearBackgroundImage: jest.fn()
    };

    _render(React.createElement(SettingsBackground, props));

    await act(async () => { await Promise.resolve(); });

    const emptyState = _screen.getByText('未设置背景图片').closest('.background-empty-state');
    _fireEvent.click(emptyState);

    expect(onBackgroundEditClick).toHaveBeenCalled();
  });

  test('should call onBackgroundEditClick when configured card clicked', async () => {
    const SettingsBackground = require('../../src/components/SettingsBackground.jsx').default;

    const onBackgroundEditClick = jest.fn();
    const props = {
      backgroundConfig: { backgroundImageUrl: 'test-url', backgroundOpacity: 0.5 },
      editBackgroundConfig: { backgroundImageUrl: 'test-url', backgroundOpacity: 0.5 },
      backgroundEditMode: false,
      onBackgroundEditClick,
      onBackgroundCancelEdit: jest.fn(),
      onBackgroundChange: jest.fn(),
      onBackgroundSave: jest.fn(),
      onSelectBackgroundImage: jest.fn(),
      onClearBackgroundImage: jest.fn()
    };

    _render(React.createElement(SettingsBackground, props));

    await act(async () => { await Promise.resolve(); });

    const summaryCard = document.querySelector('.background-summary-card');
    _fireEvent.click(summaryCard);

    expect(onBackgroundEditClick).toHaveBeenCalled();
  });

  test('should render edit form when in edit mode', async () => {
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

    expect(_screen.getByText('图片路径')).toBeInTheDocument();
    expect(_screen.getByText('透明度')).toBeInTheDocument();
  });
});