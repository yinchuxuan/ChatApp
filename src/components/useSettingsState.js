// useSettingsState - Custom hook for SettingsPanel state management
// Extracts config loading and handlers from SettingsPanel

function useSettingsState(onBackgroundChange) {
  const [config, setConfig] = React.useState({
    apiUrl: '', apiKey: '', modelName: '', protocol: 'openai'
  });
  const [backgroundConfig, setBackgroundConfig] = React.useState({
    backgroundImageUrl: '', backgroundOpacity: 0.5
  });

  // Load configs on mount
  React.useEffect(() => {
    async function loadConfig() {
      if (window.electronAPI) {
        const result = await window.electronAPI.getModelConfig();
        if (result.success) {
          const defaultConfig = { apiUrl: '', apiKey: '', modelName: '', protocol: 'openai' };
          const cfg = { ...defaultConfig, ...result.config };
          setConfig(cfg);
        }
        const bgResult = await window.electronAPI.getBackgroundConfig();
        if (bgResult.success) {
          setBackgroundConfig(bgResult.config);
          if (onBackgroundChange) onBackgroundChange(bgResult.config);
        }
      }
    }
    loadConfig();
  }, []);

  // Model config - auto-save on change
  const handleChange = async (field, value) => {
    setConfig(prev => {
      const updated = { ...prev, [field]: value };
      if (window.electronAPI) {
        window.electronAPI.saveModelConfig(updated).then(result => {
          if (result.success) {
            window.dispatchEvent(new CustomEvent('model-config-changed', { detail: updated }));
          }
        });
      }
      return updated;
    });
  };

  // Background config - auto-save on change
  const handleBackgroundChange = async (field, value) => {
    setBackgroundConfig(prev => {
      const updated = { ...prev, [field]: value };
      if (window.electronAPI) {
        window.electronAPI.saveBackgroundConfig(updated).then(result => {
          if (result.success) {
            window.dispatchEvent(new CustomEvent('background-config-changed', { detail: updated }));
            if (onBackgroundChange) onBackgroundChange(updated);
          }
        });
      }
      return updated;
    });
  };

  const handleSelectBackgroundImage = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.selectBackgroundImage();
      if (result.success && result.filePath) {
        const imageResult = await window.electronAPI.readBackgroundImage(result.filePath);
        if (imageResult.success) {
          setBackgroundConfig(prev => {
            const updated = { ...prev, backgroundImageUrl: imageResult.localUrl };
            if (window.electronAPI) {
              window.electronAPI.saveBackgroundConfig(updated).then(saveResult => {
                if (saveResult.success) {
                  window.dispatchEvent(new CustomEvent('background-config-changed', { detail: updated }));
                  if (onBackgroundChange) onBackgroundChange(updated);
                }
              });
            }
            return updated;
          });
        }
      }
    }
  };

  // Mask API key
  const maskApiKey = (key) => {
    if (!key || key.length <= 8) return key ? '****' : '';
    return key.substring(0, 4) + '****' + key.substring(key.length - 4);
  };

  return {
    config, backgroundConfig,
    isConfigured: config.apiUrl || config.apiKey || config.modelName,
    maskApiKey,
    handleChange,
    handleBackgroundChange, handleSelectBackgroundImage
  };
}

// Make available globally for browser environment
if (typeof window !== 'undefined') {
  window.useSettingsState = useSettingsState;
}

export default useSettingsState;
