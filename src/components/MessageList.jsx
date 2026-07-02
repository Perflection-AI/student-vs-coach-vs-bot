import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

export default function MessageList({ messages }) {
  const bottomRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="message-list message-list--empty">
        <div className="empty-state">
          <span className="empty-icon">💬</span>
          <p>Start the conversation!<br />Aria always replies. Coach might chime in.</p>
          <p className="empty-hint">Try <code>@Coach</code> to get the Coach's attention.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.filter((m) => !m.hidden).map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
