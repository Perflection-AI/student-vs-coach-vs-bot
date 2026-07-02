import ChatInput from './ChatInput';
import MessageList from './MessageList';
import TypingIndicator from './TypingIndicator';
import './ChatRoom.css';

export default function ChatRoom({ messages, typingBots, isProcessing, onSend }) {
  return (
    <div className="chat-room">
      <header className="chat-header">
        <h1>User · AI Partner · Coach Benny</h1>
      </header>

      <MessageList messages={messages} />

      <div className="chat-footer">
        <TypingIndicator typingBots={typingBots} />
        <ChatInput
          onSend={(text, coachForced, video) => onSend(text, coachForced, video)}
          disabled={isProcessing}
        />
      </div>
    </div>
  );
}
