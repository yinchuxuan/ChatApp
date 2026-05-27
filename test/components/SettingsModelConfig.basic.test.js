/**
 * Tests for SettingsModelConfig Component - Basic
 */

const React = require('react');
const { render: _render, screen: _screen, fireEvent: _fireEvent, act } = require('@testing-library/react');

describe('SettingsModelConfig Component - Basic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render model config section', async () => {
    const SettingsModelConfig = require('../../src/components/SettingsModelConfig.jsx').default;

    const props = {
      config: { apiUrl: '', apiKey: '', modelName: '', protocol: 'openai' },
      onChange: jest.fn(),
      maskApiKey: (key) => key ? '****' : '',
      isConfigured: false
    };

    _render(React.createElement(SettingsModelConfig, props));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('模型配置')).toBeInTheDocument();
  });

  test('should show empty state when not configured', async () => {
    const SettingsModelConfig = require('../../src/components/SettingsModelConfig.jsx').default;

    const props = {
      config: { apiUrl: '', apiKey: '', modelName: '', protocol: 'openai' },
      onChange: jest.fn(),
      maskApiKey: (key) => key ? '****' : '',
      isConfigured: false
    };

    _render(React.createElement(SettingsModelConfig, props));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('尚未配置模型')).toBeInTheDocument();
    expect(_screen.getByText('点击设置')).toBeInTheDocument();
  });

  test('should show configured status when model is configured', async () => {
    const SettingsModelConfig = require('../../src/components/SettingsModelConfig.jsx').default;

    const props = {
      config: { apiUrl: 'http://api.example.com', apiKey: 'test-key', modelName: 'gpt-4', protocol: 'openai' },
      onChange: jest.fn(),
      maskApiKey: (key) => key ? 'tes****key' : '',
      isConfigured: true
    };

    _render(React.createElement(SettingsModelConfig, props));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('已配置')).toBeInTheDocument();
  });

  test('should display config summary values when configured', async () => {
    const SettingsModelConfig = require('../../src/components/SettingsModelConfig.jsx').default;

    const props = {
      config: { apiUrl: 'http://api.example.com/v1', apiKey: 'test-api-key-12345', modelName: 'gpt-4', protocol: 'openai' },
      onChange: jest.fn(),
      maskApiKey: (key) => key ? key.substring(0, 4) + '****' + key.substring(key.length - 4) : '',
      isConfigured: true
    };

    _render(React.createElement(SettingsModelConfig, props));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('http://api.example.com/v1')).toBeInTheDocument();
    expect(_screen.getByText('test****2345')).toBeInTheDocument();
    expect(_screen.getByText('gpt-4')).toBeInTheDocument();
  });

  test('should display generation parameter fields when configured', async () => {
    const SettingsModelConfig = require('../../src/components/SettingsModelConfig.jsx').default;

    const props = {
      config: {
        apiUrl: 'http://api.example.com',
        apiKey: 'test-key',
        modelName: 'gpt-4',
        protocol: 'openai',
        maxTokens: '2048',
        temperature: '0.8',
        topP: '0.9',
        frequencyPenalty: '0.2',
        presencePenalty: '0.4'
      },
      onChange: jest.fn(),
      maskApiKey: (key) => key ? 'tes****key' : '',
      isConfigured: true
    };

    _render(React.createElement(SettingsModelConfig, props));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('最大输出')).toBeInTheDocument();
    expect(_screen.getByText('Temperature')).toBeInTheDocument();
    expect(_screen.getByText('Top P')).toBeInTheDocument();
    expect(_screen.getByText('频率惩罚')).toBeInTheDocument();
    expect(_screen.getByText('存在惩罚')).toBeInTheDocument();
  });
});
