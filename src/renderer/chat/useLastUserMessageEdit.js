import * as chatGeneration from './chatGeneration.js';

function useLastUserMessageEdit(R, messages = [], isLoading = false) {
  const helper = chatGeneration;
  const [editingIndex, setEditingIndex] = R.useState(null);
  const [content, setContent] = R.useState('');
  const lastUserIndex = helper ? helper.findLastUserIndex(messages) : -1;
  const retrySource = lastUserIndex >= 0
    ? helper?.stripTurnContext(messages[lastUserIndex]?.content) || ''
    : '';

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
    retrySource,
    isActive: editingIndex !== null,
    isEditing: (index) => editingIndex === index,
    canEdit: (index) => !isLoading && index === lastUserIndex,
    start,
    change: setContent,
    cancel: () => setEditingIndex(null),
    finish: () => setEditingIndex(null)
  };
}

export default useLastUserMessageEdit;
