import ChatRoom from './components/ChatRoom';
import { useChat } from './hooks/useChat';
import './App.css';

export default function App() {
  const { messages, typingBots, isProcessing, sendMessage } = useChat();

  return (
    <ChatRoom
      messages={messages}
      typingBots={typingBots}
      isProcessing={isProcessing}
      onSend={sendMessage}
    />
  );
}
