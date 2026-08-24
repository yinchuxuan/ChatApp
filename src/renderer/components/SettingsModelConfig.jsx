import React from 'react';
import { reasoningEffortsForProtocol } from '../chat/modelGenerationParams.js';
import { PropTypes } from './componentPropTypes.js';

// SettingsModelConfig - Model configuration settings section
// Part of SettingsPanel component - inline editing, no separate edit mode

const EFFORT_LABELS = {
  none: '无（none）', minimal: '极低（minimal）', low: '低（low）',
  medium: '中（medium）', high: '高（high）', xhigh: '极高（xhigh）', max: '最大（max）'
};

function selectOptions(field, protocol) {
  if (field === 'protocol') {
    return [{ value: 'openai', label: 'OpenAI' }, { value: 'anthropic', label: 'Anthropic' }];
  }
  if (field === 'reasoningEffort') {
    return [
      { value: '', label: '模型默认' },
      ...reasoningEffortsForProtocol(protocol).map(value => ({ value, label: EFFORT_LABELS[value] }))
    ];
  }
  return null;
}

function SettingsModelConfig({
  config,
  onChange,
  maskApiKey,
  isConfigured
}) {
  const [editingField, setEditingField] = React.useState(null);
  const [tempValue, setTempValue] = React.useState('');

  const startEdit = (field) => {
    const options = selectOptions(field, config.protocol);
    const value = config[field] ?? '';
    setEditingField(field);
    setTempValue(options?.some(option => option.value === value) ? value : (options?.[0].value ?? value));
  };

  const finishEdit = () => {
    if (editingField) {
      onChange(editingField, tempValue);
    }
    setEditingField(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const renderField = (field, label, icon, type = 'text', placeholder = '') => {
    const isEditing = editingField === field;
    const options = selectOptions(field, config.protocol);
    const selectedOption = options?.find(option => option.value === config[field]);
    const displayValue = field === 'apiKey'
      ? (maskApiKey(config[field]) || '未设置')
      : (selectedOption?.label || (options ? options[0].label : config[field]) || '未设置');

    return (
      <div className="settings-field-inline">
        <span className="settings-field-label">
          <span className="material-icons">{icon}</span>
          {label}
        </span>
        {isEditing ? (
          options ? (
            <select
              className="md-input settings-inline-input"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={finishEdit}
              onKeyDown={handleKeyDown}
              autoFocus
            >
              {options.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          ) : (
            <input
              type={type}
              className="md-input settings-inline-input"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={finishEdit}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              step={type === 'number' ? 'any' : undefined}
              autoFocus
            />
          )
        ) : (
          <span
            className="settings-field-value"
            onClick={() => startEdit(field)}
          >
            {displayValue}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="model-config-section">
      <div className="model-config-header">
        <span className="material-icons">smart_toy</span>
        <span className="model-label">模型配置</span>
        {isConfigured && <span className="config-status configured">已配置</span>}
      </div>
      {!isConfigured && !editingField ? (
        <div
          className="config-empty-state background-clickable-empty"
          onClick={() => startEdit('apiUrl')}
          title="点击设置模型配置"
        >
          <span className="material-icons">settings_suggest</span>
          <div>尚未配置模型</div>
          <div className="config-add-hint">
            <span className="material-icons">add</span>
            <span>点击设置</span>
          </div>
        </div>
      ) : (
        <div className="config-summary-card">
          {renderField('apiUrl', '模型 URL', 'link', 'text', 'https://api.example.com/v1')}
          {renderField('apiKey', 'API Key', 'key', 'password', '输入您的 API Key')}
          {renderField('protocol', '协议类型', 'settings_ethernet')}
          {renderField('modelName', '模型名称', 'smart_toy', 'text', 'model-name')}
          {renderField('reasoningEffort', '推理强度', 'psychology')}
          {renderField('maxTokens', '最大输出', 'short_text', 'number', '50000')}
          {renderField('temperature', 'Temperature', 'device_thermostat', 'number', '1')}
          {renderField('topP', 'Top P', 'filter_alt', 'number', '1')}
          {renderField('frequencyPenalty', '频率惩罚', 'repeat', 'number', '0')}
          {renderField('presencePenalty', '存在惩罚', 'person_search', 'number', '0')}
        </div>
      )}
    </div>
  );
}

SettingsModelConfig.propTypes = {
  config: PropTypes.shape({ protocol: PropTypes.string }).isRequired,
  onChange: PropTypes.func.isRequired,
  maskApiKey: PropTypes.func.isRequired,
  isConfigured: PropTypes.oneOfType([PropTypes.bool, PropTypes.string])
};

export default SettingsModelConfig;
