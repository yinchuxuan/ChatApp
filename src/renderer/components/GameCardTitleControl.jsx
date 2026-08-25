import React from 'react';
import ChatSessionManager from './ChatSessionManager.jsx';
import GameCardErrorPanel from './GameCardErrorPanel.jsx';
import { normalizeGameCardError } from '../gameCard/runtimeError.js';
import { useGameCardRuntime } from '../chat/GameCardRuntimeProvider.jsx';
import { rendererServices } from '../platform/index.js';
import { PropTypes } from './componentPropTypes.js';

function GameCardTitleControl({ modelName, isLoading = false, onBeforeSessionChange, onSessionChanged, onSwitchSession, onActiveCardChanged, audioControl, onImportError, cardRepository = rendererServices.cards }) {
  const { activeCard: card, changeActiveCard } = useGameCardRuntime();
  const [error, setError] = React.useState(null);
  const [isImporting, setIsImporting] = React.useState(false);

  const handleImport = async (event) => {
    event.stopPropagation();
    setIsImporting(true);
    setError(null);
    try {
      const importedCard = await cardRepository.importDirectory();
      changeActiveCard(importedCard || null);
      onImportError?.(null);
      await onActiveCardChanged?.(importedCard || null);
    } catch (nextFailure) {
      if (nextFailure.canceled) return;
      const nextError = normalizeGameCardError(nextFailure, { title: '导入游戏卡失败' });
      setError(nextError);
      onImportError?.(nextError);
    } finally {
      setIsImporting(false);
    }
  };

  const title = card ? (card.name || card.id) : '未加载游戏卡';
  const errorTitle = error ? `${error.title || '导入游戏卡失败'}: ${error.message || error.error || ''}` : '';

  return (
    <div className={`game-card-title-control ${card ? 'loaded' : ''}`} data-gc-part="game-card-title" title={errorTitle || title}>
      <div className="game-card-title-main" data-gc-part="game-card-title-main">
        <span className="material-icons game-card-title-icon" data-gc-part="game-card-title-icon">extension</span>
        <span className="game-card-title-name" data-gc-part="game-card-title-name">{title}</span>
      </div>
      {modelName ? <span className="config-status configured game-card-model-status" data-gc-part="model-status">{modelName}</span> : null}
      <div className="game-card-title-actions" data-gc-part="game-card-title-actions">
        {audioControl || null}
        <ChatSessionManager
          cardId={card?.id || ''}
          onBeforeSessionChange={onBeforeSessionChange}
          onSessionChanged={onSessionChanged}
          onSwitchSession={onSwitchSession}
        />
        <button
          className="game-card-import-btn md-btn md-btn-icon"
          data-gc-part="game-card-import-button"
          onClick={handleImport}
          disabled={isImporting || isLoading}
          title={isLoading ? '生成完成后可导入游戏卡' : '导入游戏卡文件夹'}
          aria-label="导入游戏卡文件夹"
        >
          <span className="material-icons">{isImporting ? 'hourglass_empty' : 'drive_folder_upload'}</span>
        </button>
        {error ? (
          <button className="game-card-title-error" data-gc-part="game-card-title-error" type="button" aria-label={errorTitle} onClick={(event) => event.stopPropagation()}>
            <span className="material-icons">error</span>
          </button>
        ) : null}
      </div>
      {error && !onImportError ? <GameCardErrorPanel error={error} variant="import" /> : null}
    </div>
  );
}

GameCardTitleControl.propTypes = {
  modelName: PropTypes.string,
  isLoading: PropTypes.bool,
  onBeforeSessionChange: PropTypes.func,
  onSessionChanged: PropTypes.func,
  onSwitchSession: PropTypes.func,
  onActiveCardChanged: PropTypes.func,
  audioControl: PropTypes.node,
  onImportError: PropTypes.func,
  cardRepository: PropTypes.shape({ importDirectory: PropTypes.func.isRequired })
};

export default GameCardTitleControl;
