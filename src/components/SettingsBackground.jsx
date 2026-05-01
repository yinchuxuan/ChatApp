// SettingsBackground - Background image settings section
// Inline editing pattern: click field to edit in place, auto-save on blur/enter

function SettingsBackground({
  backgroundConfig,
  onBackgroundChange,
  onSelectBackgroundImage,
  onClearBackgroundImage
}) {
  const [editingField, setEditingField] = React.useState(null);
  const [tempValue, setTempValue] = React.useState('');

  const hasBackground = !!backgroundConfig.backgroundImageUrl;

  const startEdit = (field) => {
    setEditingField(field);
    setTempValue(backgroundConfig[field] !== undefined ? backgroundConfig[field] : '');
  };

  const finishEdit = () => {
    if (editingField && tempValue !== backgroundConfig[editingField]) {
      onBackgroundChange(editingField, editingField === 'backgroundOpacity' ? parseFloat(tempValue) / 100 : tempValue);
    }
    setEditingField(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const opacityPercent = Math.round((editingField === 'backgroundOpacity' ? parseFloat(tempValue) || 0 : backgroundConfig.backgroundOpacity) * 100);

  const renderField = (field, label, icon, type = 'text', placeholder = '') => {
    const isEditing = editingField === field;
    const displayValue = field === 'backgroundOpacity'
      ? `${Math.round(backgroundConfig.backgroundOpacity * 100)}%`
      : (backgroundConfig[field] || '未设置');

    return (
      <div className="settings-field-inline">
        <span className="settings-field-label">
          <span className="material-icons">{icon}</span>
          {label}
        </span>
        {isEditing ? (
          field === 'backgroundOpacity' ? (
            <div className="opacity-slider-container">
              <input
                type="range"
                className="opacity-slider"
                min="0"
                max="100"
                value={opacityPercent}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={finishEdit}
                autoFocus
              />
              <span className="opacity-value">{opacityPercent}%</span>
            </div>
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
          >
            {displayValue}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="background-settings-section">
      <div className="background-settings-header">
        <span className="material-icons">wallpaper</span>
        <span className="background-label">背景图片</span>
        {hasBackground && <span className="config-status configured">已设置</span>}
      </div>
      {!hasBackground && editingField === null ? (
        <div
          className="config-empty-state background-clickable-empty"
          onClick={() => startEdit('backgroundImageUrl')}
          title="点击设置背景图片"
        >
          <span className="material-icons">image_not_supported</span>
          <div>未设置背景图片</div>
          <div className="config-add-hint">
            <span className="material-icons">add</span>
            <span>点击设置</span>
          </div>
        </div>
      ) : (
        <div className="config-summary-card">
          {renderField('backgroundImageUrl', '图片路径', 'link', 'text', '输入图片URL')}
          <div className="settings-field-inline">
            <span className="settings-field-label">
              <span className="material-icons">folder_open</span>
              <span>操作</span>
            </span>
            <div className="background-inline-actions">
              <button className="md-btn md-btn-tonal" onClick={onSelectBackgroundImage} title="选择本地图片">
                <span className="material-icons">file_open</span>
                <span>选择文件</span>
              </button>
              <button className="md-btn md-btn-tonal" onClick={onClearBackgroundImage} title="清除背景">
                <span className="material-icons">delete</span>
                <span>清除</span>
              </button>
            </div>
          </div>
          {renderField('backgroundOpacity', '透明度', 'tune')}
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
