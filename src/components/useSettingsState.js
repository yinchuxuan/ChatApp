// useSettingsState - Custom hook for SettingsPanel state management
// Extracts config loading and handlers from SettingsPanel

function useSettingsState(onBackgroundChange) {
  const [config, setConfig] = React.useState({
    apiUrl: '', apiKey: '', modelName: ''
  });
  const [editMode, setEditMode] = React.useState(false);
  const [editConfig, setEditConfig] = React.useState({
    apiUrl: '', apiKey: '', modelName: ''
  });
  const [backgroundConfig, setBackgroundConfig] = React.useState({
    backgroundImageUrl: '', backgroundOpacity: 0.5
  });
  const [backgroundEditMode, setBackgroundEditMode] = React.useState(false);
  const [editBackgroundConfig, setEditBackgroundConfig] = React.useState({
    backgroundImageUrl: '', backgroundOpacity: 0.5
  });

  // Load configs on mount
  React.useEffect(() => {
    async function loadConfig() {
      if (window.electronAPI) {
        const result = await window.electronAPI.getModelConfig();
        if (result.success) {
          setConfig(result.config);
          setEditConfig(result.config);
        }
        const bgResult = await window.electronAPI.getBackgroundConfig();
        if (bgResult.success) {
          setBackgroundConfig(bgResult.config);
          setEditBackgroundConfig(bgResult.config);
          if (onBackgroundChange) onBackgroundChange(bgResult.config);
        }
      }
    }
    loadConfig();
  }, []);

  // Model config handlers
  const handleEditClick = () => { setEditConfig(config); setEditMode(true); };
  const handleCancelEdit = () => { setEditConfig(config); setEditMode(false); };
  const handleChange = (field, value) => {
    setEditConfig(prev => ({ ...prev, [field]: value }));
  };
  const handleSave = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.saveModelConfig(editConfig);
      if (result.success) { setConfig(editConfig); setEditMode(false); }
    }
  };

  // Background handlers
  const handleBackgroundEditClick = () => {
    setEditBackgroundConfig(backgroundConfig); setBackgroundEditMode(true);
  };
  const handleBackgroundCancelEdit = () => {
    setEditBackgroundConfig(backgroundConfig); setBackgroundEditMode(false);
  };
  const handleBackgroundChange = (field, value) => {
    setEditBackgroundConfig(prev => ({ ...prev, [field]: value }));
  };
  const handleBackgroundSave = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.saveBackgroundConfig(editBackgroundConfig);
      if (result.success) {
        setBackgroundConfig(editBackgroundConfig);
        setBackgroundEditMode(false);
        if (onBackgroundChange) onBackgroundChange(editBackgroundConfig);
      }
    }
  };
  const handleSelectBackgroundImage = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.selectBackgroundImage();
      if (result.success && result.filePath) {
        const imageResult = await window.electronAPI.readBackgroundImage(result.filePath);
        if (imageResult.success) {
          setEditBackgroundConfig(prev => ({
            ...prev, backgroundImageUrl: imageResult.localUrl
          }));
        }
      }
    }
  };
  const handleClearBackgroundImage = () => {
    setEditBackgroundConfig(prev => ({ ...prev, backgroundImageUrl: '' }));
  };

  // Mask API key
  const maskApiKey = (key) => {
    if (!key || key.length <= 8) return key ? '****' : '';
    return key.substring(0, 4) + '****' + key.substring(key.length - 4);
  };

  return {
    config, editConfig, editMode, backgroundConfig, editBackgroundConfig,
    backgroundEditMode, isConfigured: config.apiUrl || config.apiKey || config.modelName,
    maskApiKey,
    handleEditClick, handleCancelEdit, handleChange, handleSave,
    handleBackgroundEditClick, handleBackgroundCancelEdit, handleBackgroundChange,
    handleBackgroundSave, handleSelectBackgroundImage, handleClearBackgroundImage
  };
}

// Make available globally for browser environment
if (typeof window !== 'undefined') {
  window.useSettingsState = useSettingsState;
}

export default useSettingsState;