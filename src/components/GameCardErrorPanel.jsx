const STAGE_LABELS = {
  validate_card: '游戏卡主文件校验',
  load_state_schema: '读取状态 schema',
  validate_state_schema: '状态 schema 校验'
};

function normalizeGameCardError(error, fallback = {}) {
  if (!error) return null;
  const details = Array.isArray(error.details) ? error.details : [];
  return {
    title: fallback.title || error.title || '当前游戏卡无法运行',
    message: error.message || error.error || fallback.message || '游戏卡加载失败',
    stage: error.stage || fallback.stage || '',
    file: error.file || fallback.file || '',
    details: details.map(item => typeof item === 'string' ? { message: item } : item)
  };
}

function copyGameCardError(error) {
  const normalized = normalizeGameCardError(error);
  if (!normalized || typeof navigator === 'undefined' || !navigator.clipboard) return;
  navigator.clipboard.writeText(formatGameCardErrorText(normalized));
}

function formatGameCardErrorText(error) {
  const lines = [error.title, error.message];
  if (error.stage) lines.push(`阶段: ${formatStage(error.stage)}`);
  if (error.file) lines.push(`文件: ${error.file}`);
  error.details.forEach((item, index) => {
    const file = item.file ? `${item.file}: ` : '';
    lines.push(`${index + 1}. ${file}${item.message || ''}`);
  });
  return lines.filter(Boolean).join('\n');
}

function formatStage(stage) {
  return STAGE_LABELS[stage] || stage;
}

function GameCardErrorPanel({ error, variant = 'active', onClose }) {
  const R = window.React || React;
  const C = R.createElement;
  const normalized = normalizeGameCardError(error);
  const [expanded, setExpanded] = R.useState(false);
  if (!normalized) return null;
  const visible = expanded ? normalized.details : normalized.details.slice(0, 5);
  const hiddenCount = normalized.details.length - visible.length;
  return C('section', { className: `game-card-error-panel ${variant}`, role: 'alert', onClick: event => event.stopPropagation() },
    onClose ? C('button', {
      type: 'button',
      className: 'game-card-error-close',
      'aria-label': '关闭导入错误',
      title: '关闭',
      onClick: onClose
    }, C('span', { className: 'material-icons' }, 'close')) : null,
    C('div', { className: 'game-card-error-heading' },
      C('span', { className: 'material-icons' }, 'error'),
      C('div', null,
        C('div', { className: 'game-card-error-title' }, normalized.title),
        C('div', { className: 'game-card-error-message' }, normalized.message)
      )
    ),
    C('div', { className: 'game-card-error-meta' },
      normalized.stage ? C('span', null, `阶段: ${formatStage(normalized.stage)}`) : null,
      normalized.file ? C('span', null, `文件: ${normalized.file}`) : null
    ),
    visible.length ? C('ol', { className: 'game-card-error-details' },
      visible.map((item, index) => C('li', { key: index },
        item.file ? C('span', { className: 'game-card-error-file' }, `${item.file}: `) : null,
        C('span', null, item.message || '')
      ))
    ) : null,
    C('div', { className: 'game-card-error-actions' },
      hiddenCount > 0 ? C('button', { type: 'button', onClick: () => setExpanded(true) }, `展开 ${hiddenCount} 条`) : null,
      C('button', { type: 'button', onClick: () => copyGameCardError(normalized) }, '复制错误')
    )
  );
}

if (typeof window !== 'undefined') {
  window.GameCardErrorPanel = GameCardErrorPanel;
  window.normalizeGameCardError = normalizeGameCardError;
}

export default GameCardErrorPanel;
export { normalizeGameCardError, formatGameCardErrorText };
