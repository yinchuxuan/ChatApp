/**
 * Tests for SettingsModelConfig Component - Inline Editing
 */

const React = require('react');
const { render: _render, screen: _screen, fireEvent: _fireEvent, act } = require('@testing-library/react');

describe('SettingsModelConfig Component - Inline Editing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should show inline editable fields when configured', async () => {
    const SettingsModelConfig = require('../../src/components/SettingsModelConfig.jsx').default;

    const props = {
      config: { apiUrl: 'http://api.example.com', apiKey: 'test-key', modelName: 'gpt-4', protocol: 'openai' },
      onChange: jest.fn(),
      maskApiKey: (key) => key ? 'test****key' : '',
      isConfigured: true
    };

    _render(React.createElement(SettingsModelConfig, props));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('模型 URL')).toBeInTheDocument();
    expect(_screen.getByText('API Key')).toBeInTheDocument();
    expect(_screen.getByText('协议类型')).toBeInTheDocument();
    expect(_screen.getByText('模型名称')).toBeInTheDocument();
  });

  test('should enter edit mode when clicking a field value', async () => {
    const SettingsModelConfig = require('../../src/components/SettingsModelConfig.jsx').default;

    const onChange = jest.fn();
    const props = {
      config: { apiUrl: 'http://api.example.com', apiKey: 'test-key', modelName: 'gpt-4', protocol: 'openai' },
      onChange,
      maskApiKey: (key) => key ? 'test****key' : '',
      isConfigured: true
    };

    _render(React.createElement(SettingsModelConfig, props));

    await act(async () => { await Promise.resolve(); });

    const apiUrlValue = _screen.getByText('http://api.example.com');
    _fireEvent.click(apiUrlValue);

    // Should show an input with the value
    const input = _screen.getByDisplayValue('http://api.example.com');
    expect(input).toBeInTheDocument();
  });

  test('should call onChange when inline edit blurs', async () => {
    const SettingsModelConfig = require('../../src/components/SettingsModelConfig.jsx').default;

    const onChange = jest.fn();
    const props = {
      config: { apiUrl: 'http://api.example.com', apiKey: 'test-key', modelName: 'gpt-4', protocol: 'openai' },
      onChange,
      maskApiKey: (key) => key ? 'test****key' : '',
      isConfigured: true
    };

    _render(React.createElement(SettingsModelConfig, props));

    await act(async () => { await Promise.resolve(); });

    const apiUrlValue = _screen.getByText('http://api.example.com');
    _fireEvent.click(apiUrlValue);

    const input = _screen.getByDisplayValue('http://api.example.com');
    _fireEvent.change(input, { target: { value: 'http://new-api.com' } });

    // Trigger blur to save
    _fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith('apiUrl', 'http://new-api.com');
  });

  test('should show password input for API Key field', async () => {
    const SettingsModelConfig = require('../../src/components/SettingsModelConfig.jsx').default;

    const onChange = jest.fn();
    const props = {
      config: { apiUrl: 'http://api.example.com', apiKey: 'secret-key', modelName: 'gpt-4', protocol: 'openai' },
      onChange,
      maskApiKey: (key) => key ? 'secr****key' : '',
      isConfigured: true
    };

    _render(React.createElement(SettingsModelConfig, props));

    await act(async () => { await Promise.resolve(); });

    const maskedKey = _screen.getByText('secr****key');
    _fireEvent.click(maskedKey);

    // Should show password input
    const passwordInput = document.querySelector('input[type="password"]');
    expect(passwordInput).toBeInTheDocument();
  });

  test('should allow entering api url from the empty state', async () => {
    const SettingsModelConfig = require('../../src/components/SettingsModelConfig.jsx').default;

    const props = {
      config: { apiUrl: '', apiKey: '', modelName: '', protocol: 'openai' },
      onChange: jest.fn(),
      maskApiKey: (key) => key ? '****' : '',
      isConfigured: false
    };

    _render(React.createElement(SettingsModelConfig, props));

    await act(async () => { await Promise.resolve(); });

    _fireEvent.click(_screen.getByText('点击设置'));

    const input = _screen.getByPlaceholderText('https://api.example.com/v1');
    _fireEvent.change(input, { target: { value: 'https://api.example.com/v1' } });
    _fireEvent.blur(input);

    expect(props.onChange).toHaveBeenCalledWith('apiUrl', 'https://api.example.com/v1');
  });

  test('should allow editing an empty api key field', async () => {
    const SettingsModelConfig = require('../../src/components/SettingsModelConfig.jsx').default;

    const props = {
      config: { apiUrl: 'http://api.example.com', apiKey: '', modelName: 'gpt-4', protocol: 'openai' },
      onChange: jest.fn(),
      maskApiKey: (key) => key ? '****' : '',
      isConfigured: true
    };

    _render(React.createElement(SettingsModelConfig, props));

    await act(async () => { await Promise.resolve(); });

    _fireEvent.click(_screen.getByText('未设置'));

    const input = document.querySelector('input[type="password"]');
    _fireEvent.change(input, { target: { value: 'new-key' } });
    _fireEvent.blur(input);

    expect(props.onChange).toHaveBeenCalledWith('apiKey', 'new-key');
  });
});
