// SettingsBackground - Background image settings section
// Part of SettingsPanel component

function SettingsBackground({
  backgroundConfig,
  editBackgroundConfig,
  backgroundEditMode,
  onBackgroundEditClick,
  onBackgroundCancelEdit,
  onBackgroundChange,
  onBackgroundSave,
  onSelectBackgroundImage,
  onClearBackgroundImage
}) {
  return (
    <div className="background-settings-section">
      <div className="background-settings-header">
        <span className="material-icons">wallpaper</span>
        <span className="background-label">背景图片</span>
        {backgroundConfig.backgroundImageUrl && !backgroundEditMode && (
          <span className="config-status configured">已设置</span>
        )}
      </div>
      {backgroundEditMode ? (
        <div className="background-edit-form">
          <div className="settings-field">
            <label className="settings-label">图片路径</label>
            <input
              type="text"
              className="md-input settings-input"
              value={editBackgroundConfig.backgroundImageUrl}
              onChange={(e) => onBackgroundChange('backgroundImageUrl', e.target.value)}
              placeholder="输入图片URL或选择本地文件"
            />
          </div>
          <div className="background-image-actions">
            <button className="md-btn md-btn-tonal" onClick={onSelectBackgroundImage} title="选择本地图片">
              <span className="material-icons">folder_open</span>
              <span>选择文件</span>
            </button>
            <button className="md-btn md-btn-tonal" onClick={onClearBackgroundImage} title="清除背景">
              <span className="material-icons">clear</span>
              <span>清除</span>
            </button>
          </div>
          <div className="settings-field">
            <label className="settings-label">透明度</label>
            <div className="opacity-slider-container">
              <input
                type="range"
                className="opacity-slider"
                min="0"
                max="100"
                value={Math.round(editBackgroundConfig.backgroundOpacity * 100)}
                onChange={(e) => onBackgroundChange('backgroundOpacity', parseInt(e.target.value) / 100)}
              />
              <span className="opacity-value">{Math.round(editBackgroundConfig.backgroundOpacity * 100)}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="background-display">
          {backgroundConfig.backgroundImageUrl ? (
            <div
              className="background-summary-card md-card background-clickable-card"
              onClick={onBackgroundEditClick}
            >
              <div className="background-preview">
                <img src={backgroundConfig.backgroundImageUrl} alt="背景预览" className="background-preview-image" />
              </div>
              <div className="background-info">
                <span className="background-opacity-label">透明度: {Math.round(backgroundConfig.backgroundOpacity * 100)}%</span>
              </div>
            </div>
          ) : (
            <div
              className="background-empty-state background-clickable-empty"
              onClick={onBackgroundEditClick}
              title="点击设置背景图片"
            >
              <span className="material-icons">image_not_supported</span>
              <div>未设置背景图片</div>
              <div className="background-add-hint">
                <span className="material-icons">add</span>
                <span>点击设置</span>
              </div>
            </div>
          )}
        </div>
      )}
      {backgroundEditMode && (
        <div className="settings-actions background-actions">
          <button className="md-btn md-btn-primary" onClick={onBackgroundCancelEdit}>
            <span>取消</span>
          </button>
          <button className="md-btn md-btn-contained" onClick={onBackgroundSave}>
            <span className="material-icons">save</span>
            <span>保存背景</span>
          </button>
        </div>
      )}
    </div>
  );
}

// Make available globally for browser environment
if (typeof window !== 'undefined') {
  window.SettingsBackground = SettingsBackground;
}

export default SettingsBackground;