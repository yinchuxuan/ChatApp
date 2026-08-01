import React from 'react';
import ChatPanel from './ChatPanel.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import { rendererServices } from './platform/index.js';

const CENTERED_PORTRAIT_STYLE = { left: '50%' };

// App Component
function App() {
  const [theme, setTheme] = React.useState('light');
  const [backgroundConfig, setBackgroundConfig] = React.useState({
    backgroundImageUrl: '',
    backgroundOpacity: 0.5
  });
  const [gameCardBackgroundUrl, setGameCardBackgroundUrl] = React.useState('');
  const [gameCardPortraits, setGameCardPortraits] = React.useState([]);
  const [backgroundLayers, setBackgroundLayers] = React.useState({ current: '', previous: '' });
  const [visualPanel, setVisualPanel] = React.useState({ textPanel: 'center', cardId: '' });

  // Initialize theme from system preference or localStorage
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = prefersDark ? 'dark' : 'light';
      setTheme(initialTheme);
      document.documentElement.setAttribute('data-theme', initialTheme);
    }
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // Handle background change
  const handleBackgroundChange = React.useCallback((config) => {
    setBackgroundConfig(config);
  }, []);

  React.useEffect(() => {
    return rendererServices.background.subscribe(setBackgroundConfig);
  }, []);

  const handleGameCardBackgroundChange = React.useCallback((detail) => {
    setGameCardBackgroundUrl(detail?.url || '');
  }, []);

  const handleGameCardPortraitChange = React.useCallback((detail) => {
    const nextPortraits = Array.isArray(detail?.portraits) ? detail.portraits : [];
    setGameCardPortraits(currentPortraits => nextPortraits.map((portrait) => {
      const previous = currentPortraits.find(item => item.character === portrait.character);
      const transition = !previous
        ? 'enter'
        : previous.expression === portrait.expression ? 'stable' : 'expression';
      return { ...portrait, transition };
    }));
  }, []);

  const handleVisualPanelChange = React.useCallback((detail) => {
    const textPanel = ['left', 'right'].includes(detail?.textPanel) ? detail.textPanel : 'center';
    setVisualPanel({ textPanel, cardId: detail?.cardId || '' });
  }, []);

  const backgroundImageUrl = gameCardBackgroundUrl || backgroundConfig.backgroundImageUrl;
  const cssUrl = (url) => `url("${String(url).replace(/["\\]/g, '\\$&')}")`;
  const gameCardThemeClass = React.useMemo(() => {
    if (!visualPanel.cardId) return '';
    return ` game-card-theme-${visualPanel.cardId.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}`;
  }, [visualPanel.cardId]);

  React.useEffect(() => {
    setBackgroundLayers(prev => prev.current === backgroundImageUrl
      ? prev
      : backgroundImageUrl
        ? { current: backgroundImageUrl, previous: prev.current }
        : { current: '', previous: '' });
  }, [backgroundImageUrl]);

  const handleBackgroundAnimationEnd = React.useCallback(() => {
    setBackgroundLayers(prev => prev.previous ? { ...prev, previous: '' } : prev);
  }, []);

  const getBackgroundStyle = React.useCallback((url) => url ? {
    backgroundImage: cssUrl(url),
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  } : {}, []);

  // Generate overlay style for opacity
  const getOverlayStyle = React.useCallback(() => {
    if (backgroundImageUrl) {
      const baseColor = theme === 'dark' ? 'rgba(20, 18, 24,' : 'rgba(255, 251, 254,';
      return {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: `${baseColor} 1)`,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: backgroundConfig.backgroundOpacity
      };
    }
    return {};
  }, [backgroundImageUrl, backgroundConfig.backgroundOpacity, theme]);

  return (
    <div
      className={`app-container game-card-visual-layout game-card-visual-position-${visualPanel.textPanel}${gameCardThemeClass}${backgroundImageUrl ? ' has-background-image' : ''}${gameCardPortraits.length ? ' has-portrait' : ''}`}
      data-gc-part="app"
    >
      {backgroundLayers.previous && <div className="app-background-layer app-background-layer-previous" style={getBackgroundStyle(backgroundLayers.previous)} />}
      {backgroundLayers.current && <div key={backgroundLayers.current} className="app-background-layer app-background-layer-current" style={getBackgroundStyle(backgroundLayers.current)} onAnimationEnd={handleBackgroundAnimationEnd} />}
      {backgroundImageUrl && <div data-gc-part="background-overlay" style={getOverlayStyle()} />}
      {gameCardPortraits.length > 0 && <div className="app-portrait-layer" data-gc-part="portrait-layer" data-count={gameCardPortraits.length} aria-hidden="true">
        {gameCardPortraits.map((portrait, index) => (
          <div
            key={portrait.character}
            className="app-portrait-slot"
            data-character={portrait.character}
            data-index={index}
            style={gameCardPortraits.length === 1 ? CENTERED_PORTRAIT_STYLE : undefined}
          >
            <img
              key={portrait.expression}
              className="app-portrait-image"
              data-transition={portrait.transition}
              src={portrait.url}
              alt=""
            />
          </div>
        ))}
      </div>}
      <div className="app-content-wrapper">
        <ChatPanel
          onBackgroundChange={handleGameCardBackgroundChange}
          onPortraitChange={handleGameCardPortraitChange}
          onVisualPanelChange={handleVisualPanelChange}
        />
      </div>
      <SettingsPanel onToggleTheme={toggleTheme} theme={theme} onBackgroundChange={handleBackgroundChange} />
    </div>
  );
}

export default App;
