/* ================================================
   Video utility helpers — validation, base64, duration
   ================================================ */

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_DURATION = 15; // seconds
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ALLOWED_EXT = /\.(mp4|mov|webm)$/i;

/**
 * Read a File as a base64 data string (sans the data: prefix).
 */
export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Validate a video file's size and type.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateVideo(file) {
  if (file.size > MAX_SIZE) {
    return `Video too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 20 MB.`;
  }
  if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXT.test(file.name)) {
    return 'Only MP4, MOV, and WebM videos are supported.';
  }
  return null;
}

/**
 * Load a video file's metadata and return its duration in seconds.
 */
export function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      // Some browsers return Infinity for certain formats
      if (Number.isFinite(video.duration) && video.duration > 0) {
        resolve(video.duration);
      } else {
        // Fallback: seek to a far point to force duration calculation
        video.currentTime = 1e101;
        video.ontimeupdate = () => {
          video.ontimeupdate = null;
          resolve(Math.max(video.duration || 0, 0));
        };
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read video metadata'));
    };
  });
}

/**
 * Create a local blob URL for a video file (used for in-chat preview).
 * Caller should revoke with URL.revokeObjectURL() when done.
 */
export function createVideoPreviewUrl(file) {
  return URL.createObjectURL(file);
}
