const { parseFileSectionRef } = require('./fileSections');

function collectContentFilePaths(card, paths) {
  Object.values(card?.content?.files || {}).forEach((filePath) => {
    if (typeof filePath === 'string') paths.add(filePath);
  });
}

function collectExecSourceFiles(value, paths) {
  if (Array.isArray(value)) return value.forEach((item) => collectExecSourceFiles(item, paths));
  if (!value || typeof value !== 'object') return;
  if (value.type === 'exec' && typeof value.sourceFile === 'string') paths.add(value.sourceFile);
  Object.values(value).forEach((item) => collectExecSourceFiles(item, paths));
}

function collectLegacyContentPaths(card, paths) {
  const rules = JSON.stringify(card?.rules || []);
  const contentPattern = /\{\{file_content:((?:\\.|[^}])*)\}\}/g;
  rules.replace(contentPattern, (_, filePath) => {
    paths.add(filePath.replaceAll('\\}}', '}}').replaceAll('\\\\', '\\'));
    return '';
  });
  const sectionPattern = /\{\{file_section:((?:\\.|[^}])*)\}\}/g;
  rules.replace(sectionPattern, (_, ref) => {
    const decoded = ref.replaceAll('\\}}', '}}').replaceAll('\\\\', '\\');
    paths.add(parseFileSectionRef(decoded).filePath);
    return '';
  });
}

function collectFileContentPaths(card) {
  const paths = new Set();
  collectContentFilePaths(card, paths);
  collectLegacyContentPaths(card, paths);
  collectExecSourceFiles(card?.rules, paths);
  return [...paths];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { collectFileContentPaths };
}
