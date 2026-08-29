const React = require('react');
const { fireEvent, render, screen, waitFor } = require('@testing-library/react');

const COMPLETE_CONFIG = {
  apiUrl: 'https://api.example.com/v1',
  apiKey: 'test-key',
  modelName: 'test-model',
  protocol: 'openai'
};

function renderConfig(overrides = {}) {
  const SettingsModelConfig = require(
    '../../src/renderer/components/SettingsModelConfig.jsx'
  ).default;
  const props = {
    config: COMPLETE_CONFIG,
    onChange: jest.fn(),
    onTestConnection: jest.fn().mockResolvedValue(undefined),
    maskApiKey: () => 'test****key',
    isConfigured: true,
    ...overrides
  };
  const view = render(React.createElement(SettingsModelConfig, props));
  return { props, ...view };
}

describe('SettingsModelConfig connection test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('disables testing until the connection config is complete', () => {
    renderConfig({ config: { ...COMPLETE_CONFIG, modelName: '' } });

    expect(screen.getByRole('button', { name: '已配置' })).toBeDisabled();
  });

  test('tests the connection and displays success', async () => {
    const { props } = renderConfig();

    fireEvent.click(screen.getByRole('button', { name: '已配置' }));

    expect(screen.getByRole('button', { name: '连接中…' })).toBeDisabled();
    await waitFor(() => expect(screen.getByRole('button', { name: '已连接' })).toBeEnabled());
    expect(props.onTestConnection).toHaveBeenCalledTimes(1);
  });

  test('displays the provider error', async () => {
    renderConfig({
      onTestConnection: jest.fn().mockRejectedValue(new Error('Invalid API key'))
    });

    fireEvent.click(screen.getByRole('button', { name: '已配置' }));

    const failed = await screen.findByRole('button', { name: '连接失败：Invalid API key' });
    expect(failed).toHaveTextContent('连接失败');
    expect(failed).toHaveAttribute('title', 'Invalid API key');
  });

  test('clears a previous result when connection settings change', async () => {
    const view = renderConfig();
    fireEvent.click(screen.getByRole('button', { name: '已配置' }));
    await screen.findByRole('button', { name: '已连接' });

    view.rerender(React.createElement(
      require('../../src/renderer/components/SettingsModelConfig.jsx').default,
      { ...view.props, config: { ...COMPLETE_CONFIG, modelName: 'another-model' } }
    ));

    await waitFor(() => expect(screen.getByRole('button', { name: '已配置' })).toBeEnabled());
  });
});
