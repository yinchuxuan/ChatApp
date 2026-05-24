function GameCardTitleControl({ modelName }) {
  const [card, setCard] = React.useState(null);
  const [error, setError] = React.useState('');
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
    if (!window.electronAPI?.importGameCardFromFile) return;
    setIsImporting(true);
    setError('');
    const result = await window.electronAPI.importGameCardFromFile();
    if (result.success) {
      setCard(result.card || null);
    } else if (!result.canceled) {
      setError(result.error || '导入失败');
    }
    setIsImporting(false);
  };

  const title = card ? (card.name || card.id) : '未加载游戏卡';

  return (
    <div className={`game-card-title-control ${card ? 'loaded' : ''}`} title={error || title}>
      <div className="game-card-title-main">
        <span className="material-icons game-card-title-icon">extension</span>
        <span className="game-card-title-name">{title}</span>
      </div>
      {modelName ? <span className="config-status configured game-card-model-status">{modelName}</span> : null}
      <button
        className="game-card-import-btn md-btn md-btn-icon"
        onClick={handleImport}
        disabled={isImporting}
        title="导入游戏卡 JSON"
        aria-label="导入游戏卡 JSON"
      >
        <span className="material-icons">{isImporting ? 'hourglass_empty' : 'drive_folder_upload'}</span>
      </button>
      {error ? (
        <span className="game-card-title-error" aria-label={error}>
          <span className="material-icons">error</span>
        </span>
      ) : null}
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.GameCardTitleControl = GameCardTitleControl;
}

export default GameCardTitleControl;
