// SettingsBackground - Background image settings section
// Inline editing pattern: click field to edit in place, auto-save on blur/enter
// Click preview image to open file picker

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

  const handlePreviewClick = (e) => {
    e.stopPropagation();
    onSelectBackgroundImage();
  };

  const handleClearClick = (e) => {
    e.stopPropagation();
    onClearBackgroundImage();
  };

  const opacityPercent = Math.round((editingField === 'backgroundOpacity' ? parseFloat(tempValue) || 0 : backgroundConfig.backgroundOpacity) * 100);

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
          onClick={() => onSelectBackgroundImage()}
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
          {hasBackground && (
            <div className="background-preview" onClick={handlePreviewClick} title="点击更换图片">
              <img src={backgroundConfig.backgroundImageUrl} alt="背景预览" className="background-preview-image" />
              <div className="background-preview-overlay">
                <span className="material-icons">photo_library</span>
                <span>更换图片</span>
              </div>
              <button className="background-preview-clear" onClick={handleClearClick} title="清除背景图片">
                <span className="material-icons">close</span>
              </button>
            </div>
          )}
          {renderField('backgroundOpacity', '透明度', 'tune')}
        </div>
      )}
    </div>
  );

  function renderField(field, label, icon, type = 'text', placeholder = '') {
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
  }
}

// Make available globally for browser environment
if (typeof window !== 'undefined') {
  window.SettingsBackground = SettingsBackground;
}

export default SettingsBackground;
