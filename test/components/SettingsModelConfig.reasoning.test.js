const React = require('react');
const { fireEvent, render, screen } = require('@testing-library/react');

function renderConfig(protocol, reasoningEffort = '') {
  const SettingsModelConfig = require(
    '../../src/renderer/components/SettingsModelConfig.jsx'
  ).default;
  const props = {
    config: {
      apiUrl: 'https://api.example.com', apiKey: 'key', modelName: 'model',
      protocol, reasoningEffort
    },
    onChange: jest.fn(),
    maskApiKey: () => '****',
    isConfigured: true
  };
  render(React.createElement(SettingsModelConfig, props));
  return props;
}

describe('SettingsModelConfig reasoning effort', () => {
  test('edits OpenAI reasoning effort with OpenAI-supported choices', () => {
    const props = renderConfig('openai', 'medium');

    fireEvent.click(screen.getByText('中（medium）'));
    const select = screen.getByDisplayValue('中（medium）');
    expect(select).toHaveTextContent('极低（minimal）');
    expect(select).toHaveTextContent('最大（max）');

    fireEvent.change(select, { target: { value: 'high' } });
    fireEvent.blur(select);
    expect(props.onChange).toHaveBeenCalledWith('reasoningEffort', 'high');
  });

  test('offers Anthropic-specific reasoning effort choices', () => {
    renderConfig('anthropic');

    fireEvent.click(screen.getByText('模型默认'));
    const select = screen.getByDisplayValue('模型默认');
    expect(select).toHaveTextContent('最大（max）');
    expect(select).not.toHaveTextContent('无（none）');
  });
});
