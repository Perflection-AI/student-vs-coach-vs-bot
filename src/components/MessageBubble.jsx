import './MessageBubble.css';

const ROLE_LABELS = {
  user: 'You',
  'ai-agent': 'AI Partner',
  coach: 'Coach Benny',
};

export default function MessageBubble({ message }) {
  const { role, content, video } = message;
  const isUser = role === 'user';

  return (
    <div className={`bubble-row ${isUser ? 'bubble-row--user' : 'bubble-row--bot'}`}>
      {!isUser && (
        <div className={`bubble-avatar bubble-avatar--${role}`}>
          {role === 'ai-agent' ? '🤖' : '🎯'}
        </div>
      )}
      <div className={`bubble ${isUser ? 'bubble--user' : 'bubble--bot'} bubble--${role}`}>
        <div className="bubble-role">{ROLE_LABELS[role] || role}</div>
        {content && <div className="bubble-content">{content}</div>}
        {video && (
          <div className={`video-attachment${isUser ? ' video-attachment--user' : ''}${content ? ' video-attachment--with-text' : ''}`}>
            <video
              className="video-attachment__player"
              src={video.localUrl}
              controls
              preload="metadata"
              playsInline
            />
            <div className="video-attachment__name">{video.name}</div>
          </div>
        )}
      </div>
      {isUser && (
        <div className="bubble-avatar bubble-avatar--user">👤</div>
      )}
    </div>
  );
}
