import React from 'react';
import { subscribeModelConfig } from './modelConfigService.js';

function useModelConfig(api = window.electronAPI) {
  const [modelConfig, setModelConfig] = React.useState(null);

  React.useEffect(() => {
    let canceled = false;
    api?.getModelConfig?.().then(result => {
      if (!canceled && result?.success) setModelConfig(result.config);
    });
    return () => { canceled = true; };
  }, [api]);

  React.useEffect(() => subscribeModelConfig(setModelConfig), []);
  return modelConfig;
}

export default useModelConfig;
