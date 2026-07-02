import { GEMINI_CONFIG } from '../config/gemini';

const ROLE_LABEL = {
  user: 'User',
  'ai-agent': 'AI Partner',
  coach: 'Coach',
};

/**
 * Format conversation history as plain text.
 */
function formatHistory(messages) {
  return messages
    .map((m) => `${ROLE_LABEL[m.role] || m.role}: ${m.content}`)
    .join('\n\n');
}

/**
 * Robust JSON extraction from Gemini response text.
 * Handles both bare JSON and markdown-wrapped JSON.
 */
function extractJSON(text) {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Try extracting from code block
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        // fall through
      }
    }
  }
  throw new Error('Could not parse JSON from Gemini response. Raw: ' + text.slice(0, 200));
}

/**
 * Composite prompt template for the unified video evaluation call.
 *
 * Asks Gemini to output a JSON object with two fields:
 *   - "description" — extremely detailed SwingLens-style technical analysis (unlimited length)
 *   - "reply"       — AI Partner's warm conversational chat reply
 *
 * The description follows the SwingLens advanced_prompt methodology:
 *   Stage 1 — P1–P10 Comprehensive Observation
 *   Stage 2 — Causal Reasoning
 *   Stage 3 — Root-Cause Diagnosis
 *   Stage 4 — Prescription Rationale
 * with full golf biomechanics terminology, confidence levels, and the "Good Player" filter.
 */
const COMPOSITE_PROMPT_TEMPLATE = `You are an Elite PGA Coach-level analyst AND a friendly AI assistant named "AI Partner".

Your response must be valid JSON with exactly two string fields:
{
  "description": "...",
  "reply": "..."
}

──── FIELD "description" — Extremely Detailed Video Analysis (unlimited length) ────
Analyze the attached golf swing like a PGA Tour performance coach. Be thorough — there is no length limit. Use the following multi-stage process:

### Stage 1: Comprehensive Observation (P1–P10)
For each position, describe setup, kinematics, and notable checks. Use proper P-labels and golf biomechanics terminology (lead/trail, Center of Pressure, X-factor, kinematic sequence, etc.).
- P1 (Address): Stance width, foot flare, alignment (square/open/closed), posture (C/S/neutral), grip style + strength, ball position, hand–body spacing, spine tilt.
- P2 (Takeaway): One-piece start? Clubhead relative to hands, clubface square-to-arc (leading edge ~45°?), shaft parallel, knee-height check.
- P3 (Halfway Back): Lead arm parallel? Arm–shaft ~90° L-position? Wrist condition (bowed/flat/cupped). Hip vs shoulder turn ratio.
- P4 (Top): Shaft direction (neutral/laid-off/across-the-line). Clubface orientation. Trail elbow pitched down? Weight ~75–80% trail side. X-factor stretch.
- P5 (Early Downswing): Lower-body initiation — pelvis rotation + lateral shift. Shallowing vs steepening. Trail elbow slotting. Bump then turn. Apply the "P5 Validation Rule": does P4 prove functional here?
- P6 (Delivery): Shaft lean. Side-bend (~20°). Hip opening. Trail elbow in front of hip.
- P7 (Impact): Hand position ahead/behind. Shaft lean, dynamic loft. Strike quality, low point. Body rotation — belt buckle facing?
- P8 (Release): Both-arms-straight window. Clubhead exit path. Release timing (early/late/on-time).
- P9 (Finish): Rotation toward target, weight on lead, balance.
- P10 (End Pose): Holdable balance, athletic finish.

Add **confidence level** (High/Medium/Low) for the observations and justify if not High (e.g., "Medium — DTL angle obscures hip depth").

### Stage 2: Causal Reasoning
- Overall tempo (fast/deliberate/smooth/rhythmic) and rhythm.
- Kinematic sequence: pelvis → torso → arms → club — which segment leads or stalls?
- Weight shift / Center of Pressure timeline (approximate pattern).
- Connect the dots — how does one position cause the next (e.g., "P2 inside → P4 laid-off → steep transition")?
- Apply the "Good Player Filter": unorthodox-looking moves that work are functional compensations, not errors.

### Stage 3: Root-Cause / Optimization Opportunity
- Identify the **single highest-leverage** biomechanical root-cause.
- Frame it as an "optimization" or "characteristic", never as a "fault" or "error".
- Explain how adjusting it unlocks the golfer's athletic potential.
- What are the downstream effects on ball flight and strike quality?

### Stage 4: Prescription Reference
- One feel/analogy and one drill that addresses the root-cause.
- Expected change in ball flight (e.g., "more consistent strike, tighter dispersion").

### Vocabulary Rules
- Use "tendency/characteristic" instead of "fault/error".
- Use "optimization/adjustment" instead of "fix".
- Use "unique pattern" instead of "severe deviation".
- Always lead by acknowledging athletic strengths (tempo, mobility, balance, etc.).
- Do NOT mention specific professional golfer names.
- Do NOT use emoji or "—"/"—" dashes.

──── FIELD "reply" — Chat Message ────
Write a warm, engaging reply as AI Partner (2–5 sentences):
- Reference your observations naturally — don't just list technical facts.
- Keep it conversational and encouraging.
- Never pretend to be Coach. Speak in your own voice.

──── Context ────
{AI_AGENT_PROMPT}

Conversation history:
{HISTORY}

Now analyze the attached video and output ONLY valid JSON with "description" and "reply".`;

/**
 * Call Gemini and extract the JSON-structured response.
 * Shared fetch + parse logic used by all public API functions.
 *
 * @param {object} body - The request body (contents + generationConfig)
 * @returns {Promise<object>} Parsed JSON from Gemini
 */
async function callGeminiJSON(body) {
  const url = `${GEMINI_CONFIG.apiBase}/${GEMINI_CONFIG.model}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_CONFIG.apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (data.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked: ${data.promptFeedback.blockReason}`);
  }

  const candidate = data.candidates?.[0];
  if (!candidate) throw new Error('Gemini returned no candidates');

  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    console.warn(`[Gemini API] finishReason: ${candidate.finishReason}`);
  }

  const text = candidate.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned empty response');

  return extractJSON(text);
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Call Gemini — send system prompt + full history as a single flat prompt.
 *
 * @param {string} systemPrompt - The system-level instructions for the bot
 * @param {Array<{role: string, content: string}>} messages - Full shared conversation history
 * @returns {Promise<string>} The generated text reply
 */
export async function generateReply(systemPrompt, messages) {
  const historyText = formatHistory(messages);
  const fullPrompt = `${systemPrompt}\n\n---\n\nConversation so far:\n\n${historyText}\n\n---\n\nNow reply as yourself.`;

  console.log('[Gemini API] Prompt:\n', fullPrompt);

  const body = {
    contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
    generationConfig: {
      maxOutputTokens: 65536,
    },
  };

  const response = await fetch(`${GEMINI_CONFIG.apiBase}/${GEMINI_CONFIG.model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_CONFIG.apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  console.log('[Gemini API] Full response:', JSON.stringify(data, null, 2));

  if (data.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked the prompt: ${data.promptFeedback.blockReason}`);
  }

  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw new Error('Gemini returned no candidates');
  }

  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    console.warn(`[Gemini API] Candidate finishReason: ${candidate.finishReason}`);
  }

  const text = candidate.content?.parts?.[0]?.text;
  if (!text) {
    console.error('[Gemini API] Candidate content:', JSON.stringify(candidate.content, null, 2));
    throw new Error(`Gemini returned an empty response. finishReason: ${candidate.finishReason}`);
  }

  return text;
}

/**
 * Unified Gemini call for video analysis — produces both the detailed
 * SwingLens-style swing description AND AI Partner's chat reply in a single request.
 *
 * Uses Gemini's structured JSON output so the two fields are cleanly separated
 * and the description can be arbitrarily long (up to 65k tokens).
 *
 * @param {string} aiAgentPrompt - AI Partner's system prompt
 * @param {Array} messages - Full conversation history
 * @param {string} videoBase64 - Base64-encoded video bytes
 * @param {string} mimeType - MIME type (e.g. video/mp4)
 * @returns {Promise<{description: string, reply: string}>}
 */
export async function generateUnifiedVideoReply(aiAgentPrompt, messages, videoBase64, mimeType) {
  const historyText = formatHistory(messages);

  const fullPrompt = COMPOSITE_PROMPT_TEMPLATE
    .replace('{AI_AGENT_PROMPT}', aiAgentPrompt)
    .replace('{HISTORY}', historyText);

  const body = {
    contents: [{
      role: 'user',
      parts: [
        { text: fullPrompt },
        { inlineData: { mimeType, data: videoBase64 } },
      ],
    }],
    generationConfig: {
      maxOutputTokens: 65536,
      response_mime_type: 'application/json',
      response_schema: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          reply: { type: 'string' },
        },
        required: ['description', 'reply'],
      },
    },
  };

  const result = await callGeminiJSON(body);

  return {
    description: result.description || '',
    reply: result.reply || '',
  };
}

/**
 * Call Gemini with a video attachment — sends system prompt + history as flat
 * text, plus the video as inlineData. Returns just the reply text.
 *
 * @param {string} systemPrompt
 * @param {Array} messages - Full shared conversation history
 * @param {string} videoBase64 - Base64-encoded video bytes
 * @param {string} mimeType - MIME type of the video (e.g. video/mp4)
 * @returns {Promise<string>} The generated text reply
 */
export async function generateReplyWithVideo(systemPrompt, messages, videoBase64, mimeType) {
  const historyText = formatHistory(messages);
  const fullPrompt = `${systemPrompt}\n\n---\n\nConversation so far:\n\n${historyText}\n\n---\n\nNow analyze the attached video and reply as yourself.`;

  console.log('[Gemini API Video] Prompt length:', fullPrompt.length, 'Video base64:', videoBase64.length);

  const body = {
    contents: [{
      role: 'user',
      parts: [
        { text: fullPrompt },
        { inlineData: { mimeType, data: videoBase64 } },
      ],
    }],
    generationConfig: {
      maxOutputTokens: 65536,
    },
  };

  const response = await fetch(`${GEMINI_CONFIG.apiBase}/${GEMINI_CONFIG.model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_CONFIG.apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 400 && errorText.includes('SAFETY')) {
      return 'I cannot analyze this video due to content safety guidelines. Please upload a golf swing video.';
    }
    if (response.status === 429) {
      return 'I\'m currently busy processing. Please wait a moment and try again.';
    }
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (data.promptFeedback?.blockReason) {
    return `I cannot analyze this video: ${data.promptFeedback.blockReason}. Please upload a golf swing video.`;
  }

  const candidate = data.candidates?.[0];
  if (!candidate) throw new Error('Gemini returned no candidates');

  if (candidate.finishReason === 'SAFETY') {
    return 'I cannot analyze this video due to content safety guidelines. Please upload a golf swing video.';
  }

  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    console.warn(`[Gemini API Video] finishReason: ${candidate.finishReason}`);
  }

  const text = candidate.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Gemini returned empty response. finishReason: ${candidate.finishReason}`);

  return text;
}
