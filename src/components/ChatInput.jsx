import { useState, useEffect, useRef } from 'react';
import { validateVideo, getVideoDuration, readFileAsBase64, createVideoPreviewUrl } from '../utils/video-utils';
import './ChatInput.css';

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('');
  const [coachMode, setCoachMode] = useState(false);
  const [pendingVideo, setPendingVideo] = useState(null);
  const fileInputRef = useRef(null);

  // Reset coach highlight when the round completes (disabled transitions true→false)
  useEffect(() => {
    if (!disabled) {
      setCoachMode(false);
    }
  }, [disabled]);

  const toggleCoach = () => {
    setCoachMode((prev) => !prev);
  };

  const handleSubmit = () => {
    if (disabled) return;
    const trimmed = text.trim();
    if (!trimmed && !pendingVideo) return;
    onSend(text, coachMode, pendingVideo);
    setText('');
    setPendingVideo(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  /** Open the file picker */
  const handleAttach = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  /** Remove the pending video attachment */
  const removeVideo = () => {
    if (pendingVideo?.localUrl) {
      URL.revokeObjectURL(pendingVideo.localUrl);
    }
    setPendingVideo(null);
  };

  /** File selected — validate, read, and hold as pending */
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset so the same file can be re-selected
    e.target.value = '';

    // Validate size + type
    const validationError = validateVideo(file);
    if (validationError) {
      alert(validationError);
      return;
    }

    // Validate duration (must load metadata)
    try {
      const duration = await getVideoDuration(file);
      if (duration > 15) {
        alert(`Video too long (${Math.round(duration)}s). Maximum is 15 seconds.`);
        return;
      }
    } catch {
      alert('Could not read video metadata. Try a different file.');
      return;
    }

    // Read file as base64 for Gemini API
    let base64;
    try {
      base64 = await readFileAsBase64(file);
    } catch {
      alert('Failed to read video file. Please try again.');
      return;
    }

    const mimeType = file.type || 'video/mp4';
    const localUrl = createVideoPreviewUrl(file);

    setPendingVideo({
      base64,
      mimeType,
      name: file.name,
      size: file.size,
      localUrl,
    });
  };

  return (
    <div className={`chat-input-wrapper${coachMode ? ' chat-input-wrapper--coach' : ''}`}>
      <button
        className={`coach-toggle${coachMode ? ' coach-toggle--active' : ''}`}
        onClick={toggleCoach}
        disabled={disabled}
        title="Toggle @Coach Benny attention"
        type="button"
      >
        @Coach Benny
      </button>

      {/* Pending video attachment preview */}
      {pendingVideo && (
        <div className="video-pending-preview">
          <span className="video-pending-preview__icon">📁</span>
          <span className="video-pending-preview__name">{pendingVideo.name}</span>
          <button
            className="video-pending-preview__remove"
            onClick={removeVideo}
            type="button"
            title="Remove video"
          >
            ✕
          </button>
        </div>
      )}

      <div className="chat-input-area">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          onChange={handleFileChange}
          className="video-file-input"
        />
        <button
          className="attach-button"
          onClick={handleAttach}
          disabled={disabled}
          title="Attach video"
          type="button"
        >
          📁
        </button>
        <textarea
          className="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Waiting for replies...' : pendingVideo ? 'Ask about your swing...' : 'Type a message...'}
          rows={2}
          disabled={disabled}
        />
        <button
          className="send-button"
          onClick={handleSubmit}
          disabled={disabled || (!text.trim() && !pendingVideo)}
          title={pendingVideo ? 'Send with video' : 'Send (Enter)'}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
