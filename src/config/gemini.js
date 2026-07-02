/**
 * Gemini API configuration.
 */
export const GEMINI_CONFIG = {
  model: 'gemini-3.5-flash',
  apiBase:
    'https://generativelanguage.googleapis.com/v1beta/models',
  /** Read from Vite env — must be prefixed with VITE_ */
  get apiKey() {
    return import.meta.env.VITE_GEMINI_API_KEY;
  },
};
