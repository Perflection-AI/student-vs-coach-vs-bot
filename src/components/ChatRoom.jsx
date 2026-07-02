import ChatInput from './ChatInput';
import MessageList from './MessageList';
import TypingIndicator from './TypingIndicator';
import './ChatRoom.css';

export default function ChatRoom({ messages, typingBots, isProcessing, onSend }) {
  return (
    <div className="chat-room">
      <header className="chat-header">
        <h1>3P Paradigm</h1>
        <span className="chat-header-sub">User · Aria · Coach</span>
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
