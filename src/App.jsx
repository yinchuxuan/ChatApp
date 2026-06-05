// App Component - Main application entry point
// Uses components loaded globally via Babel standalone

// App Component
function App() {
  // Destructure globally-registered components to local variables for JSX usage
  const ChatPanel = typeof window !== 'undefined' ? window.ChatPanel : null;
  const SettingsPanel = typeof window !== 'undefined' ? window.SettingsPanel : null;

  const [theme, setTheme] = React.useState('light');
  const [backgroundConfig, setBackgroundConfig] = React.useState({
    backgroundImageUrl: '',
    backgroundOpacity: 0.5
  });
  const [gameCardBackgroundUrl, setGameCardBackgroundUrl] = React.useState('');

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

  // Listen for background-config-changed events (from IPC saves)
  React.useEffect(() => {
    const handler = (e) => { setBackgroundConfig(e.detail); };
    window.addEventListener('background-config-changed', handler);
    if (window.electronAPI) {
      window.electronAPI.onBackgroundConfigChanged((config) => {
        setBackgroundConfig(config);
      });
    }
    return () => window.removeEventListener('background-config-changed', handler);
  }, []);

  React.useEffect(() => {
    const handler = (e) => setGameCardBackgroundUrl(e.detail?.url || '');
    window.addEventListener('game-card-background-changed', handler);
    return () => window.removeEventListener('game-card-background-changed', handler);
  }, []);

  const backgroundImageUrl = gameCardBackgroundUrl || backgroundConfig.backgroundImageUrl;

  // Generate background style
  const getBackgroundStyle = React.useCallback(() => {
    if (backgroundImageUrl) {
      return {
        backgroundImage: `url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    }
    return {};
  }, [backgroundImageUrl]);

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
      className={`app-container${backgroundImageUrl ? ' has-background-image' : ''}`}
      style={getBackgroundStyle()}
    >
      {backgroundImageUrl && <div style={getOverlayStyle()} />}
      <div className="app-content-wrapper">
        {ChatPanel ? <ChatPanel /> : null}
      </div>
      {SettingsPanel ? (
        <SettingsPanel onToggleTheme={toggleTheme} theme={theme} onBackgroundChange={handleBackgroundChange} />
      ) : null}
    </div>
  );
}

// Render - only in non-test environment
if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test') {
  const container = document.getElementById('root');
  const root = ReactDOM.createRoot(container);
  root.render(<App />);
}

export default App;
