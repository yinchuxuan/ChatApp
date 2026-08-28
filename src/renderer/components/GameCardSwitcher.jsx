import React from 'react';
import { normalizeGameCardError } from '../gameCard/runtimeError.js';
import { rendererServices } from '../platform/index.js';
import { gameCard, PropTypes } from './componentPropTypes.js';

function GameCardSwitcher({
  activeCard,
  isLoading,
  onActivate,
  onImport,
  onError,
  repository = rendererServices.cards
}) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [cards, setCards] = React.useState([]);
  const [busy, setBusy] = React.useState(false);

  const loadCards = React.useCallback(async () => {
    try {
      const result = await repository.list();
      setCards(Array.isArray(result) ? result : []);
    } catch (error) {
      onError?.(normalizeGameCardError(error, { title: '读取游戏卡失败' }));
    }
  }, [onError, repository]);

  React.useEffect(() => {
    if (open || !mounted) return undefined;
    const timer = window.setTimeout(() => setMounted(false), 180);
    return () => window.clearTimeout(timer);
  }, [mounted, open]);

  const toggle = (event) => {
    event.stopPropagation();
    if (isLoading || busy) return;
    const nextOpen = !open;
    if (nextOpen) {
      setMounted(true);
      void loadCards();
    }
    setOpen(nextOpen);
  };

  const activate = async (event, card) => {
    event.stopPropagation();
    if (busy || (card?.id || null) === (activeCard?.id || null)) {
      setOpen(false);
      return;
    }
    setBusy(true);
    onError?.(null);
    try {
      await onActivate(card);
      setOpen(false);
    } catch (error) {
      onError?.(normalizeGameCardError(error, { title: '切换游戏卡失败' }));
    } finally {
      setBusy(false);
    }
  };

  const importCard = async (event) => {
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    onError?.(null);
    try {
      const card = await onImport();
      if (card) {
        await loadCards();
        setOpen(false);
      }
    } catch (error) {
      if (!error.canceled) onError?.(normalizeGameCardError(error, { title: '导入游戏卡失败' }));
    } finally {
      setBusy(false);
    }
  };

  const title = activeCard?.name || activeCard?.id || '普通聊天';
  const renderCard = card => (
    <button key={card?.id || 'no-card'} type="button"
      className={`game-card-switch-row${(card?.id || null) === (activeCard?.id || null) ? ' active' : ''}`}
      onClick={event => activate(event, card)} disabled={busy}>
      <span className="game-card-switch-state" aria-hidden="true" />
      <span className="game-card-switch-name">{card?.name || card?.id || '普通聊天'}</span>
    </button>
  );

  return <div className="game-card-switcher" data-gc-part="game-card-switcher">
    <button type="button" className="game-card-title-main" data-gc-part="game-card-title-main"
      onClick={toggle} disabled={isLoading || busy} aria-label="切换游戏卡"
      title={isLoading ? '生成完成后可切换游戏卡' : title}
      aria-expanded={open} aria-controls="game-card-switch-panel">
      <span className="material-icons game-card-title-icon" data-gc-part="game-card-title-icon">
        {activeCard ? 'extension' : 'chat'}
      </span>
      <span className="game-card-title-name" data-gc-part="game-card-title-name">{title}</span>
      <span className="material-icons game-card-switch-arrow" aria-hidden="true">arrow_drop_down</span>
    </button>
    {mounted ? <div id="game-card-switch-panel" className="game-card-switch-panel"
      data-state={open ? 'open' : 'closing'} aria-hidden={!open}
      onClick={event => event.stopPropagation()}>
      <div className="game-card-switch-heading">切换游戏卡</div>
      <div className="game-card-switch-list">
        {renderCard(null)}
        {cards.map(renderCard)}
      </div>
      <button type="button" className="game-card-switch-import" onClick={importCard}
        disabled={busy} aria-label="导入游戏卡文件夹">
        <span className="material-icons">drive_folder_upload</span><span>导入游戏卡</span>
      </button>
    </div> : null}
  </div>;
}

GameCardSwitcher.propTypes = {
  activeCard: gameCard,
  isLoading: PropTypes.bool,
  onActivate: PropTypes.func.isRequired,
  onImport: PropTypes.func.isRequired,
  onError: PropTypes.func,
  repository: PropTypes.shape({ list: PropTypes.func.isRequired })
};

export default GameCardSwitcher;
