import { GEMINI_CONFIG } from '../config/gemini';

const ROLE_LABEL = {
  user: 'User',
  'ai-agent': 'Aria',
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
 * Call Gemini — send system prompt + full history as a single flat prompt.
 *
 * @param {string} systemPrompt - The system-level instructions for the bot
 * @param {Array<{role: string, content: string}>} messages - Full shared conversation history
 * @returns {Promise<string>} The generated text reply
 */
export async function generateReply(systemPrompt, messages) {
  const url = `${GEMINI_CONFIG.apiBase}/${GEMINI_CONFIG.model}:generateContent`;

  const historyText = formatHistory(messages);
  const fullPrompt = `${systemPrompt}\n\n---\n\nConversation so far:\n\n${historyText}\n\n---\n\nNow reply as yourself.`;

  console.log('[Gemini API] Prompt:\n', fullPrompt);

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: fullPrompt }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 1024,
    },
  };

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
 * Call Gemini to generate a detailed video description for hidden context.
 * The description is NOT shown in the chat — it's stored as hidden context
 * in the conversation history so future rounds can reference it.
 * Structure follows Stage 0a + Scene Description from SwingLens analysis pipeline.
 *
 * @param {string} videoBase64 - Base64-encoded video bytes
 * @param {string} mimeType - MIME type (e.g. video/mp4)
 * @returns {Promise<string>} Detailed video description (4-8 sentences)
 */
export async function generateVideoDescription(videoBase64, mimeType) {
  const url = `${GEMINI_CONFIG.apiBase}/${GEMINI_CONFIG.model}:generateContent`;

  const prompt = `You are a golf swing video analysis system. Watch the video carefully and produce a structured description covering these areas:

1. **Video Context** — Camera view (Down-The-Line / Face-On / other), environment (driving range / simulator / outdoor course / home), lighting and weather conditions, ground surface (grass mat / real grass / turf), any visible buildings, trees, or surroundings.

2. **Golfer & Equipment** — Handedness, club type (driver / iron / putter) if visible based on head shape and shaft length, clothing (hat, gloves, colors, style), approximate build if relevant.

3. **The Swing — Brief Technical Observation** — What the golfer does in general terms (full swing, practice swing, putting, drill). Note any immediately observable characteristics: tempo (fast/deliberate/smooth), balance, whether the swing looks athletic or constrained.

4. **Notable Details** — Anything unusual or noteworthy: alignment sticks, training aids, range targets, other people, background activity.

Be objective and specific. Write in paragraph form, 4-8 sentences total. This description will be stored as context for future AI chat rounds.`;

  const body = {
    contents: [{
      role: 'user',
      parts: [
        { text: prompt },
        { inlineData: { mimeType, data: videoBase64 } },
      ],
    }],
    generationConfig: { maxOutputTokens: 2048 },
  };

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
    throw new Error(`Gemini description API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (data.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked the video: ${data.promptFeedback.blockReason}`);
  }

  const candidate = data.candidates?.[0];
  if (!candidate) throw new Error('Gemini returned no candidates for description');

  const text = candidate.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned empty description');

  console.log('[Gemini API] Video description:', text.slice(0, 150) + '...');
  return text;
}

/**
 * Call Gemini with a video attachment — sends system prompt + history as flat
 * text, plus the video as inlineData.
 *
 * @param {string} systemPrompt
 * @param {Array} messages - Full shared conversation history
 * @param {string} videoBase64 - Base64-encoded video bytes
 * @param {string} mimeType - MIME type of the video (e.g. video/mp4)
 * @returns {Promise<string>} The generated text reply
 */
export async function generateReplyWithVideo(systemPrompt, messages, videoBase64, mimeType) {
  const url = `${GEMINI_CONFIG.apiBase}/${GEMINI_CONFIG.model}:generateContent`;

  const historyText = formatHistory(messages);
  const fullPrompt = `${systemPrompt}\n\n---\n\nConversation so far:\n\n${historyText}\n\n---\n\nNow analyze the attached video and reply as yourself.`;

  console.log('[Gemini API Video] Prompt length:', fullPrompt.length, 'Video base64:', videoBase64.length);

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: fullPrompt },
          { inlineData: { mimeType, data: videoBase64 } },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: 1024,
    },
  };

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
    // Handle safety blocks gracefully
    if (response.status === 400 && errorText.includes('SAFETY')) {
      return 'I cannot analyze this video due to content safety guidelines. Please upload a golf swing video.';
    }
    if (response.status === 429) {
      return 'I\'m currently busy processing. Please wait a moment and try again.';
    }
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log('[Gemini API Video] Response:', JSON.stringify(data, null, 2));

  if (data.promptFeedback?.blockReason) {
    return `I cannot analyze this video: ${data.promptFeedback.blockReason}. Please upload a golf swing video.`;
  }

  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw new Error('Gemini returned no candidates');
  }

  if (candidate.finishReason === 'SAFETY') {
    return 'I cannot analyze this video due to content safety guidelines. Please upload a golf swing video.';
  }

  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    console.warn(`[Gemini API Video] finishReason: ${candidate.finishReason}`);
  }

  const text = candidate.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(`Gemini returned an empty response. finishReason: ${candidate.finishReason}`);
  }

  return text;
}
