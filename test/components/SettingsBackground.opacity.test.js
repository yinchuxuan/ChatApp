/**
 * Tests for SettingsBackground Component - Edit Mode (Part 2)
 */

const React = require('react');
const { render: _render, screen: _screen, fireEvent: _fireEvent, act } = require('@testing-library/react');

describe('SettingsBackground Component - Opacity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should display opacity slider in edit mode', async () => {
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

    const slider = document.querySelector('.opacity-slider');
    expect(slider).toBeTruthy();
    expect(slider.type).toBe('range');
    expect(slider.min).toBe('0');
    expect(slider.max).toBe('100');
  });

  test('should display opacity percentage value', async () => {
    const SettingsBackground = require('../../src/components/SettingsBackground.jsx').default;

    const props = {
      backgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.7 },
      editBackgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.7 },
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

    expect(_screen.getByText('70%')).toBeInTheDocument();
  });

  test('should call onBackgroundChange when opacity slider changed', async () => {
    const SettingsBackground = require('../../src/components/SettingsBackground.jsx').default;

    const onBackgroundChange = jest.fn();
    const props = {
      backgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
      editBackgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
      backgroundEditMode: true,
      onBackgroundEditClick: jest.fn(),
      onBackgroundCancelEdit: jest.fn(),
      onBackgroundChange,
      onBackgroundSave: jest.fn(),
      onSelectBackgroundImage: jest.fn(),
      onClearBackgroundImage: jest.fn()
    };

    _render(React.createElement(SettingsBackground, props));

    await act(async () => { await Promise.resolve(); });

    const slider = document.querySelector('.opacity-slider');
    _fireEvent.change(slider, { target: { value: '80' } });

    expect(onBackgroundChange).toHaveBeenCalledWith('backgroundOpacity', 0.8);
  });
});