import './GameCardErrorPanel.jsx';

function GameCardTitleControl({ modelName, onBeforeSessionChange, onSessionChanged, audioControl, onImportError }) {
  const [card, setCard] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [isImporting, setIsImporting] = React.useState(false);

  const loadActiveCard = React.useCallback(async () => {
    if (!window.electronAPI?.getActiveGameCard) return;
    const result = await window.electronAPI.getActiveGameCard();
    if (result.success) setCard(result.card || null);
  }, []);

  React.useEffect(() => {
    loadActiveCard();
  }, [loadActiveCard]);

  const handleImport = async (event) => {
    event.stopPropagation();
    if (!window.electronAPI?.importGameCardFromDirectory) return;
    setIsImporting(true);
    setError(null);
    const result = await window.electronAPI.importGameCardFromDirectory();
    if (result.success) {
      setCard(result.card || null);
      onImportError?.(null);
      window.dispatchEvent(new CustomEvent('game-card-changed', { detail: result.card || null }));
    } else if (!result.canceled) {
      const nextError = window.normalizeGameCardError?.(result, { title: '导入游戏卡失败' }) || result;
      setError(nextError);
      onImportError?.(nextError);
    }
    setIsImporting(false);
  };

  const title = card ? (card.name || card.id) : '未加载游戏卡';
  const SessionManager = window.ChatSessionManager;
  const ErrorPanel = window.GameCardErrorPanel;
  const errorTitle = error ? `${error.title || '导入游戏卡失败'}: ${error.message || error.error || ''}` : '';

  return (
    <div className={`game-card-title-control ${card ? 'loaded' : ''}`} title={errorTitle || title}>
      <div className="game-card-title-main">
        <span className="material-icons game-card-title-icon">extension</span>
        <span className="game-card-title-name">{title}</span>
      </div>
      {modelName ? <span className="config-status configured game-card-model-status">{modelName}</span> : null}
      <div className="game-card-title-actions">
        {audioControl || null}
        {SessionManager ? <SessionManager onBeforeSessionChange={onBeforeSessionChange} onSessionChanged={onSessionChanged} /> : null}
        <button
          className="game-card-import-btn md-btn md-btn-icon"
          onClick={handleImport}
          disabled={isImporting}
          title="导入游戏卡文件夹"
          aria-label="导入游戏卡文件夹"
        >
          <span className="material-icons">{isImporting ? 'hourglass_empty' : 'drive_folder_upload'}</span>
        </button>
        {error ? (
          <button className="game-card-title-error" type="button" aria-label={errorTitle} onClick={(event) => event.stopPropagation()}>
            <span className="material-icons">error</span>
          </button>
        ) : null}
      </div>
      {error && ErrorPanel && !onImportError ? <ErrorPanel error={error} variant="import" /> : null}
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.GameCardTitleControl = GameCardTitleControl;
}

export default GameCardTitleControl;
