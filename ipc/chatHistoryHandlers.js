// Chat History IPC Handlers
// Handles chat message persistence in a dedicated directory

const path = require('path');

function registerChatHistoryHandlers(ipcMain, chatHistoryPath, fs) {
  // Ensure the chat-histories directory exists
  const chatHistoryDir = path.dirname(chatHistoryPath);
  if (!fs.existsSync(chatHistoryDir)) {
    fs.mkdirSync(chatHistoryDir, { recursive: true });
  }

  ipcMain.handle('get-chat-history', () => {
    try {
      if (fs.existsSync(chatHistoryPath)) {
        const content = fs.readFileSync(chatHistoryPath, 'utf-8');
        const messages = JSON.parse(content);
        // Restore _thinking from thinking field for UI compatibility
        const restored = Array.isArray(messages) ? messages.map(msg => {
          const restored = { ...msg };
          if (msg.thinking) restored._thinking = msg.thinking;
          return restored;
        }) : [];
        return { success: true, messages: restored };
      }
      return { success: true, messages: [] };
    } catch (err) {
      console.error('Error reading chat history:', err);
      return { success: false, error: err.message, messages: [] };
    }
  });

  ipcMain.handle('save-chat-history', (event, messages) => {
    try {
      // Ensure directory exists (in case it was deleted between calls)
      if (!fs.existsSync(chatHistoryDir)) {
        fs.mkdirSync(chatHistoryDir, { recursive: true });
      }
      // Only keep role, content, thinking fields
      const cleanedMessages = messages.map(msg => {
        const cleaned = { role: msg.role, content: msg.content };
        if (msg.thinking) cleaned.thinking = msg.thinking;
        return cleaned;
      });
      fs.writeFileSync(chatHistoryPath, JSON.stringify(cleanedMessages, null, 2), 'utf-8');
      return { success: true };
    } catch (err) {
      console.error('Error saving chat history:', err);
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerChatHistoryHandlers };
