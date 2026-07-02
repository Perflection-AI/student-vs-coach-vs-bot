import './TypingIndicator.css';

const BOT_NAMES = {
  'ai-agent': 'AI Partner',
  coach: 'Coach Benny',
};

export default function TypingIndicator({ typingBots }) {
  if (typingBots.size === 0) return null;

  const names = Array.from(typingBots)
    .map((key) => BOT_NAMES[key] || key)
    .join(' & ');

  return (
    <div className="typing-indicator">
      <span className="typing-dots">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </span>
      <span className="typing-label">{names} {typingBots.size === 1 ? 'is' : 'are'} typing...</span>
    </div>
  );
}
