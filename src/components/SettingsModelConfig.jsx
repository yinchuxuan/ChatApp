// SettingsModelConfig - Model configuration settings section
// Part of SettingsPanel component - inline editing, no separate edit mode

function SettingsModelConfig({
  config,
  onChange,
  maskApiKey,
  isConfigured
}) {
  const [editingField, setEditingField] = React.useState(null);
  const [tempValue, setTempValue] = React.useState('');

  const startEdit = (field) => {
    setEditingField(field);
    setTempValue(config[field] || '');
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
    const displayValue = field === 'apiKey' ? maskApiKey(config[field]) : (config[field] || '未设置');
    const protocolLabel = field === 'protocol' ? (config.protocol === 'anthropic' ? 'Anthropic' : 'OpenAI') : '';

    return (
      <div className="settings-field-inline">
        <span className="settings-field-label">
          <span className="material-icons">{icon}</span>
          {label}
        </span>
        {isEditing ? (
          field === 'protocol' ? (
            <select
              className="md-input settings-inline-input"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={finishEdit}
              onKeyDown={handleKeyDown}
              autoFocus
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
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
              autoFocus
            />
          )
        ) : (
          <span
            className="settings-field-value"
            onClick={() => startEdit(field)}
            title="点击编辑"
          >
            {field === 'protocol' ? protocolLabel : displayValue}
            <span className="material-icons settings-edit-icon">edit</span>
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
      {!isConfigured ? (
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
        </div>
      )}
    </div>
  );
}

// Make available globally for browser environment
if (typeof window !== 'undefined') {
  window.SettingsModelConfig = SettingsModelConfig;
}

export default SettingsModelConfig;
