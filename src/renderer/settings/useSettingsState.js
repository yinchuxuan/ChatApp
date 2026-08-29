import React from 'react';
import { DEFAULT_GENERATION_PARAMS, withDefaultGenerationParams } from '../chat/modelGenerationParams.js';
import { publishModelConfig } from '../chat/modelConfigService.js';
import { testModelConnection } from '../chat/modelConnectionTest.js';
import { rendererServices } from '../platform/index.js';
import useLatestSave from './useLatestSave.js';

const DEFAULT_CONFIG = {
  apiUrl: '', apiKey: '', modelName: '', protocol: 'openai', ...DEFAULT_GENERATION_PARAMS
};
const DEFAULT_BACKGROUND = { backgroundImageUrl: '', backgroundOpacity: 0.5 };

function useSettingsState(
  onBackgroundChange,
  services = rendererServices,
  connectionTester = testModelConnection
) {
  const [config, setConfig] = React.useState(DEFAULT_CONFIG);
  const [backgroundConfig, setBackgroundConfig] = React.useState(DEFAULT_BACKGROUND);
  const [error, setError] = React.useState(null);
  const [isBackgroundBusy, setBackgroundBusy] = React.useState(false);
  const configRef = React.useRef(config);
  const backgroundRef = React.useRef(backgroundConfig);
  const onBackgroundChangeRef = React.useRef(onBackgroundChange);
  configRef.current = config;
  backgroundRef.current = backgroundConfig;
  onBackgroundChangeRef.current = onBackgroundChange;

  React.useEffect(() => {
    let canceled = false;
    const load = async () => {
      try {
        const [savedConfig, savedBackground] = await Promise.all([
          services.config.load(), services.background.load()
        ]);
        if (canceled) return;
        const nextConfig = withDefaultGenerationParams({ ...DEFAULT_CONFIG, ...savedConfig });
        const nextBackground = { ...DEFAULT_BACKGROUND, ...savedBackground };
        setConfig(nextConfig);
        setBackgroundConfig(nextBackground);
        onBackgroundChangeRef.current?.(nextBackground);
      } catch (nextError) {
        if (!canceled) setError(nextError);
      }
    };
    void load();
    return () => { canceled = true; };
  }, [services]);

  const saveConfig = React.useCallback(value => services.config.save(value), [services]);
  const saveBackground = React.useCallback(value => services.background.save(value), [services]);
  const queueConfigSave = useLatestSave(saveConfig, publishModelConfig, setError);
  const notifyBackground = React.useCallback(value => onBackgroundChangeRef.current?.(value), []);
  const queueBackgroundSave = useLatestSave(saveBackground, notifyBackground, setError);

  const handleChange = React.useCallback((field, value) => {
    const updated = { ...configRef.current, [field]: value };
    configRef.current = updated;
    setConfig(updated);
    queueConfigSave(updated);
  }, [queueConfigSave]);

  const handleBackgroundChange = React.useCallback((field, value) => {
    const updated = { ...backgroundRef.current, [field]: value };
    backgroundRef.current = updated;
    setBackgroundConfig(updated);
    queueBackgroundSave(updated);
  }, [queueBackgroundSave]);

  const handleSelectBackgroundImage = React.useCallback(async () => {
    setBackgroundBusy(true);
    setError(null);
    try {
      const localUrl = await services.background.selectImage();
      if (!localUrl) return;
      const updated = { ...backgroundRef.current, backgroundImageUrl: localUrl };
      const saved = await services.background.save(updated) || updated;
      backgroundRef.current = saved;
      setBackgroundConfig(saved);
      onBackgroundChangeRef.current?.(saved);
    } catch (nextError) {
      if (!nextError.canceled) setError(nextError);
    } finally {
      setBackgroundBusy(false);
    }
  }, [services]);

  const handleClearBackgroundImage = React.useCallback(() => {
    handleBackgroundChange('backgroundImageUrl', '');
  }, [handleBackgroundChange]);

  const handleTestConnection = React.useCallback(
    () => connectionTester(configRef.current),
    [connectionTester]
  );

  const maskApiKey = key => {
    if (!key || key.length <= 8) return key ? '****' : '';
    return `${key.substring(0, 4)}****${key.substring(key.length - 4)}`;
  };

  return {
    config, backgroundConfig, error, isBackgroundBusy,
    isConfigured: config.apiUrl || config.apiKey || config.modelName,
    maskApiKey, handleChange, handleBackgroundChange,
    handleSelectBackgroundImage, handleClearBackgroundImage, handleTestConnection
  };
}

export default useSettingsState;
