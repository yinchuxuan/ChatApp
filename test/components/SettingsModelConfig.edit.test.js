/**
 * Tests for SettingsModelConfig Component - Edit Mode
 */

const React = require('react');
const { render: _render, screen: _screen, fireEvent: _fireEvent, act } = require('@testing-library/react');

describe('SettingsModelConfig Component - Edit Mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render edit form when in edit mode', async () => {
    const SettingsModelConfig = require('../../src/components/SettingsModelConfig.jsx').default;

    const props = {
      config: { apiUrl: '', apiKey: '', modelName: '' },
      editConfig: { apiUrl: '', apiKey: '', modelName: '' },
      editMode: true,
      onEditClick: jest.fn(),
      onChange: jest.fn(),
      maskApiKey: (key) => key ? '****' : '',
      isConfigured: false
    };

    _render(React.createElement(SettingsModelConfig, props));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('模型 URL')).toBeInTheDocument();
    expect(_screen.getByText('API Key')).toBeInTheDocument();
    expect(_screen.getByText('模型名称')).toBeInTheDocument();
  });

  test('should call onChange when apiUrl input changed', async () => {
    const SettingsModelConfig = require('../../src/components/SettingsModelConfig.jsx').default;

    const onChange = jest.fn();
    const props = {
      config: { apiUrl: '', apiKey: '', modelName: '' },
      editConfig: { apiUrl: '', apiKey: '', modelName: '' },
      editMode: true,
      onEditClick: jest.fn(),
      onChange,
      maskApiKey: (key) => key ? '****' : '',
      isConfigured: false
    };

    _render(React.createElement(SettingsModelConfig, props));

    await act(async () => { await Promise.resolve(); });

    const apiUrlInput = _screen.getByPlaceholderText('https://api.example.com/v1');
    _fireEvent.change(apiUrlInput, { target: { value: 'http://new-api.com' } });

    expect(onChange).toHaveBeenCalledWith('apiUrl', 'http://new-api.com');
  });

  test('should call onChange when apiKey input changed', async () => {
    const SettingsModelConfig = require('../../src/components/SettingsModelConfig.jsx').default;

    const onChange = jest.fn();
    const props = {
      config: { apiUrl: '', apiKey: '', modelName: '' },
      editConfig: { apiUrl: '', apiKey: '', modelName: '' },
      editMode: true,
      onEditClick: jest.fn(),
      onChange,
      maskApiKey: (key) => key ? '****' : '',
      isConfigured: false
    };

    _render(React.createElement(SettingsModelConfig, props));

    await act(async () => { await Promise.resolve(); });

    const apiKeyInput = _screen.getByPlaceholderText('输入您的 API Key');
    _fireEvent.change(apiKeyInput, { target: { value: 'new-api-key' } });

    expect(onChange).toHaveBeenCalledWith('apiKey', 'new-api-key');
  });

  test('should call onChange when modelName input changed', async () => {
    const SettingsModelConfig = require('../../src/components/SettingsModelConfig.jsx').default;

    const onChange = jest.fn();
    const props = {
      config: { apiUrl: '', apiKey: '', modelName: '' },
      editConfig: { apiUrl: '', apiKey: '', modelName: '' },
      editMode: true,
      onEditClick: jest.fn(),
      onChange,
      maskApiKey: (key) => key ? '****' : '',
      isConfigured: false
    };

    _render(React.createElement(SettingsModelConfig, props));

    await act(async () => { await Promise.resolve(); });

    const modelNameInput = _screen.getByPlaceholderText('model-name');
    _fireEvent.change(modelNameInput, { target: { value: 'new-model' } });

    expect(onChange).toHaveBeenCalledWith('modelName', 'new-model');
  });
});