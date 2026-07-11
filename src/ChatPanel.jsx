import React from 'react';
import ChatRuntime from './chat/ChatRuntime.jsx';
import { GameCardRuntimeProvider } from './chat/GameCardRuntimeProvider.jsx';

function ChatPanel(props) {
  return <GameCardRuntimeProvider>
    <ChatRuntime {...props} />
  </GameCardRuntimeProvider>;
}

export default ChatPanel;
