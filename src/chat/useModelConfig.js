import React from 'react';
import { subscribeModelConfig } from './modelConfigService.js';
import { rendererServices } from '../platform/index.js';

function useModelConfig(configService = rendererServices.config) {
  const [modelConfig, setModelConfig] = React.useState(null);

  React.useEffect(() => {
    let canceled = false;
    configService.load()
      .then(config => { if (!canceled) setModelConfig(config); })
      .catch(() => { if (!canceled) setModelConfig(null); });
    return () => { canceled = true; };
  }, [configService]);

  React.useEffect(() => subscribeModelConfig(setModelConfig), []);
  return modelConfig;
}

export default useModelConfig;
