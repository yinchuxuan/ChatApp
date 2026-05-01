// SettingsPanel Component - Hidden panel on right side
// Provides settings for theme toggle, background image, and model configuration
/* global useSettingsState */

function SettingsPanel({ onToggleTheme, theme, onBackgroundChange }) {
  const [visible, setVisible] = React.useState(false);
  const useSettingsStateHook = window.useSettingsState || useSettingsState;

  const state = useSettingsStateHook(onBackgroundChange);
  const {
    config, backgroundConfig, isConfigured, maskApiKey,
    handleBackgroundChange, handleSelectBackgroundImage,
    handleChange
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
          <span className="settings-title">系统配置</span>
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
              onBackgroundChange={handleBackgroundChange}
              onSelectBackgroundImage={handleSelectBackgroundImage}
            />
          ) : null}
          {SettingsModelConfigComp ? (
            <SettingsModelConfigComp
              config={config}
              onChange={handleChange}
              maskApiKey={maskApiKey}
              isConfigured={isConfigured}
            />
          ) : null}
        </div>
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