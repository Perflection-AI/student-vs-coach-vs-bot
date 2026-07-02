/**
 * Gemini API configuration.
 *
 * Gemini 3.5 Flash:
 *   - 1M token input context window
 *   - 65k max output tokens (set maxOutputTokens: 65536 for unlimited-length responses)
 *   - Structured output via response_mime_type: "application/json" + response_schema
 *   - temperature/top_p/top_k are NOT recommended — model is optimized for defaults
 *   - Use thinking_level ("low" / "medium" / "high") instead of thinking_budget
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
