// SettingsModelConfig - Model configuration settings section
// Part of SettingsPanel component

function SettingsModelConfig({
  config,
  editConfig,
  editMode,
  onEditClick,
  onChange,
  maskApiKey,
  isConfigured
}) {
  return (
    <div className="model-config-section">
      <div className="model-config-header">
        <span className="material-icons">smart_toy</span>
        <span className="model-label">模型配置</span>
        {isConfigured && !editMode && <span className="config-status configured">已配置</span>}
      </div>
      {editMode ? (
        <>
          <div className="settings-field">
            <label className="settings-label">模型 URL</label>
            <input
              type="text"
              className="md-input settings-input"
              value={editConfig.apiUrl}
              onChange={(e) => onChange('apiUrl', e.target.value)}
              placeholder="https://api.example.com/v1"
            />
          </div>
          <div className="settings-field">
            <label className="settings-label">API Key</label>
            <input
              type="password"
              className="md-input settings-input"
              value={editConfig.apiKey}
              onChange={(e) => onChange('apiKey', e.target.value)}
              placeholder="输入您的 API Key"
            />
          </div>
          <div className="settings-field">
            <label className="settings-label">协议类型</label>
            <select
              className="md-input settings-input"
              value={editConfig.protocol}
              onChange={(e) => onChange('protocol', e.target.value)}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>
          <div className="settings-field">
            <label className="settings-label">模型名称</label>
            <input
              type="text"
              className="md-input settings-input"
              value={editConfig.modelName}
              onChange={(e) => onChange('modelName', e.target.value)}
              placeholder="model-name"
            />
          </div>
        </>
      ) : (
        isConfigured ? (
          <div
            className="config-summary-card md-card background-clickable-card"
            onClick={onEditClick}
          >
            <div className="config-summary-item">
              <span className="config-summary-label">
                <span className="material-icons">link</span>
                模型 URL
              </span>
              <span className="config-summary-value">{config.apiUrl || '未设置'}</span>
            </div>
            <div className="config-summary-item">
              <span className="config-summary-label">
                <span className="material-icons">key</span>
                API Key
              </span>
              <span className="config-summary-value">{maskApiKey(config.apiKey) || '未设置'}</span>
            </div>
            <div className="config-summary-item">
              <span className="config-summary-label">
                <span className="material-icons">settings_ethernet</span>
                协议类型
              </span>
              <span className="config-summary-value">{config.protocol === 'anthropic' ? 'Anthropic' : 'OpenAI'}</span>
            </div>
            <div className="config-summary-item">
              <span className="config-summary-label">
                <span className="material-icons">smart_toy</span>
                模型名称
              </span>
              <span className="config-summary-value">{config.modelName || '未设置'}</span>
            </div>
          </div>
        ) : (
          <div
            className="config-empty-state background-clickable-empty"
            onClick={onEditClick}
            title="点击设置模型配置"
          >
            <span className="material-icons">settings_suggest</span>
            <div>尚未配置模型</div>
            <div className="config-add-hint">
              <span className="material-icons">add</span>
              <span>点击设置</span>
            </div>
          </div>
        )
      )}
    </div>
  );
}

// Make available globally for browser environment
if (typeof window !== 'undefined') {
  window.SettingsModelConfig = SettingsModelConfig;
}

export default SettingsModelConfig;