/**
 * Tests for SettingsBackground Component - Opacity
 */

const React = require('react');
const { render: _render, screen: _screen, fireEvent: _fireEvent, act } = require('@testing-library/react');

describe('SettingsBackground Component - Opacity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should display opacity value in card when background is set', async () => {
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

  test('should display opacity slider when clicked for editing', async () => {
    const SettingsBackground = require('../../src/components/SettingsBackground.jsx').default;

    const props = {
      backgroundConfig: { backgroundImageUrl: 'test-url', backgroundOpacity: 0.5 },
      onBackgroundChange: jest.fn(),
      onSelectBackgroundImage: jest.fn(),
      onClearBackgroundImage: jest.fn()
    };

    _render(React.createElement(SettingsBackground, props));

    await act(async () => { await Promise.resolve(); });

    const opacityValue = _screen.getByText('50%');
    _fireEvent.click(opacityValue);

    const slider = document.querySelector('.opacity-slider');
    expect(slider).toBeTruthy();
    expect(slider.type).toBe('range');
    expect(slider.min).toBe('0');
    expect(slider.max).toBe('100');
  });

  test('should call onBackgroundChange when opacity slider changed and blurred', async () => {
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

    const opacityValue = _screen.getByText('50%');
    _fireEvent.click(opacityValue);

    const slider = document.querySelector('.opacity-slider');
    _fireEvent.change(slider, { target: { value: '80' } });
    _fireEvent.blur(slider);

    expect(onBackgroundChange).toHaveBeenCalledWith('backgroundOpacity', 0.8);
  });
});
