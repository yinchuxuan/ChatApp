/**
 * Tests for SettingsBackground Component - Preview and Clear Actions
 */

const React = require('react');
const { render: _render, screen: _screen, fireEvent: _fireEvent, act } = require('@testing-library/react');

describe('SettingsBackground Component - Preview Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should show preview when background image is set', async () => {
    const SettingsBackground = require('../../src/components/SettingsBackground.jsx').default;

    const props = {
      backgroundConfig: { backgroundImageUrl: 'test-url', backgroundOpacity: 0.5 },
      onBackgroundChange: jest.fn(),
      onSelectBackgroundImage: jest.fn()
    };

    _render(React.createElement(SettingsBackground, props));

    await act(async () => { await Promise.resolve(); });

    const preview = document.querySelector('.background-preview');
    expect(preview).toBeTruthy();

    const img = preview.querySelector('.background-preview-image');
    expect(img.src).toContain('test-url');
  });

  test('should call onSelectBackgroundImage when preview clicked', async () => {
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

  test('should not show preview in empty state', async () => {
    const SettingsBackground = require('../../src/components/SettingsBackground.jsx').default;

    const props = {
      backgroundConfig: { backgroundImageUrl: '', backgroundOpacity: 0.5 },
      onBackgroundChange: jest.fn(),
      onSelectBackgroundImage: jest.fn(),
      onClearBackgroundImage: jest.fn()
    };

    _render(React.createElement(SettingsBackground, props));

    await act(async () => { await Promise.resolve(); });

    expect(document.querySelector('.background-preview')).toBeNull();
  });
});
