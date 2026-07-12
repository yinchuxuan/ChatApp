const STAGE_LABELS = {
  validate_card: '游戏卡主文件校验',
  load_state_schema: '读取状态 schema',
  validate_state_schema: '状态 schema 校验'
};

function formatStage(stage) {
  return STAGE_LABELS[stage] || stage;
}

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

export { formatGameCardErrorText, formatStage, normalizeGameCardError };
