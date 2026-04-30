// SettingsPanel Component - Hidden panel on right side
// Provides settings for theme toggle, background image, and model configuration
/* global useSettingsState */

function SettingsPanel({ onToggleTheme, theme, onBackgroundChange }) {
  const [visible, setVisible] = React.useState(false);
  const useSettingsStateHook = window.useSettingsState || useSettingsState;

  const state = useSettingsStateHook(onBackgroundChange);
  const {
    config, editConfig, editMode, backgroundConfig, editBackgroundConfig,
    backgroundEditMode, isConfigured, maskApiKey,
    handleEditClick, handleCancelEdit, handleChange, handleSave,
    handleBackgroundEditClick, handleBackgroundCancelEdit, handleBackgroundChange,
    handleBackgroundSave, handleSelectBackgroundImage, handleClearBackgroundImage
  } = state;

  const handleMouseEnter = () => setVisible(true);
  const handleMouseLeave = () => setVisible(false);

  const SettingsBackgroundComp = window.SettingsBackground;
  const SettingsModelConfigComp = window.SettingsModelConfig;

  return (
    <div className="settings-trigger-zone" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className={`settings-panel ${visible ? 'visible' : ''}`}>
        <div className="settings-header">
          <span className="material-icons">settings</span>
          <span className="settings-title">模型配置</span>
          {isConfigured && !editMode && <span className="config-status configured">已配置</span>}
        </div>
        <div className="settings-content">
          <div className="theme-toggle-section">
            <div className="theme-toggle-header">
              <span className="material-icons">palette</span>
              <span className="theme-label">外观模式</span>
            </div>
            <button className="md-btn md-btn-tonal theme-toggle-btn" onClick={onToggleTheme}>
              <span className="material-icons">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
              <span>{theme === 'dark' ? '切换到浅色' : '切换到深色'}</span>
            </button>
          </div>
          {SettingsBackgroundComp ? (
            <SettingsBackgroundComp
              backgroundConfig={backgroundConfig}
              editBackgroundConfig={editBackgroundConfig}
              backgroundEditMode={backgroundEditMode}
              onBackgroundEditClick={handleBackgroundEditClick}
              onBackgroundCancelEdit={handleBackgroundCancelEdit}
              onBackgroundChange={handleBackgroundChange}
              onBackgroundSave={handleBackgroundSave}
              onSelectBackgroundImage={handleSelectBackgroundImage}
              onClearBackgroundImage={handleClearBackgroundImage}
            />
          ) : null}
          {SettingsModelConfigComp ? (
            <SettingsModelConfigComp
              config={config}
              editConfig={editConfig}
              editMode={editMode}
              onEditClick={handleEditClick}
              onCancelEdit={handleCancelEdit}
              onChange={handleChange}
              onSave={handleSave}
              maskApiKey={maskApiKey}
              isConfigured={isConfigured}
            />
          ) : null}
        </div>
        {editMode && (
          <div className="settings-actions">
            <button className="md-btn md-btn-primary" onClick={handleCancelEdit}>
              <span>取消</span>
            </button>
            <button className="md-btn md-btn-contained" onClick={handleSave}>
              <span className="material-icons">save</span>
              <span>保存模型</span>
            </button>
          </div>
        )}
      </div>
      <div className={`settings-indicator ${isConfigured ? 'configured' : ''}`}>
        <span className="material-icons">chevron_left</span>
      </div>
    </div>
  );
}

// Make available globally for browser environment
if (typeof window !== 'undefined') {
  window.SettingsPanel = SettingsPanel;
}

export default SettingsPanel;