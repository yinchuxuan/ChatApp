function getChatGeneration() {
  if (typeof window !== 'undefined' && window.ChatGeneration) return window.ChatGeneration;
  if (typeof require !== 'undefined') return require('./chatGeneration');
  return null;
}

function useLastUserMessageEdit(R, messages = [], isLoading = false) {
  const helper = getChatGeneration();
  const [editingIndex, setEditingIndex] = R.useState(null);
  const [content, setContent] = R.useState('');
  const lastUserIndex = helper ? helper.findLastUserIndex(messages) : -1;

  R.useEffect(() => {
    if (editingIndex === null) return;
    if (isLoading || editingIndex !== lastUserIndex) setEditingIndex(null);
  }, [editingIndex, isLoading, lastUserIndex]);

  const start = R.useCallback((index, value) => {
    if (isLoading || index !== lastUserIndex) return;
    setEditingIndex(index);
    setContent(helper?.stripTurnContext(value) || '');
  }, [helper, isLoading, lastUserIndex]);

  return {
    content,
    isActive: editingIndex !== null,
    isEditing: (index) => editingIndex === index,
    canEdit: (index) => !isLoading && index === lastUserIndex,
    start,
    change: setContent,
    cancel: () => setEditingIndex(null),
    finish: () => setEditingIndex(null)
  };
}

if (typeof window !== 'undefined') window.useLastUserMessageEdit = useLastUserMessageEdit;
if (typeof module !== 'undefined') module.exports = useLastUserMessageEdit;
