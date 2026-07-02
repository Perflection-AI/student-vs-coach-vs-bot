import { generateReply, generateUnifiedVideoReply } from '../utils/api';
import { shouldCoachReply } from '../utils/coach-trigger';
import { useCallback, useRef, useState } from 'react';
import COACH_KNOWLEDGE_BASE from '../knowledge_base.md?raw';

/**
 * Returns the system prompt text for a given role by reading the imported
 * markdown files. In production, these are inlined by Vite's raw import.
 * For now, we use placeholder text — replace with actual prompts.
 */
const AI_AGENT_PROMPT = `You are a friendly and knowledgeable AI assistant named "AI Partner" in a group chat.
- You always reply to the user's messages.
- Keep your responses concise (2-4 sentences), warm, and engaging.
- You are part of a multi-person conversation — another bot (a Coach named "Coach Benny") may occasionally chime in.
- If Coach Benny speaks, you may acknowledge or build on their points naturally.
- Never pretend to be Coach Benny. Always speak in your own voice.`;

const COACH_PROMPT = `${COACH_KNOWLEDGE_BASE}

## Chat Context

You are "Coach Benny" in a group chat with "AI Partner" (an AI assistant) and a user.
- Be sharp, direct, and serious. Say more with fewer words.
- 1 sentence is ideal. Maximum 2 short sentences. No fluff, no warmth, no pleasantries.
- Cut straight to the root cause. Identify the one thing that matters and say it bluntly.
- AI Partner is the cheerleader. You are the coach. Do not match her tone.
- Never pretend to be AI Partner. Always speak in your own voice.
- Never output confidence levels, ratings, or scores.
- Always reply — never output empty text.`;

let nextId = 1;
function genId() {
  return `msg-${Date.now()}-${nextId++}`;
}

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [typingBots, setTypingBots] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  /**
   * Send a user message and orchestrate bot replies.
   * @param {string} text - The user's message
   * @param {boolean} [coachForced=false] - If true, skip AI Partner and force Coach to reply
   * @param {object|null} [video=null] - Optional video attachment { base64, mimeType, name, size, localUrl }
   */
  const sendMessage = useCallback(async (text, coachForced = false, video = null) => {
    if (processingRef.current) return;
    const trimmed = text.trim();
    if (!trimmed && !video) return;

    processingRef.current = true;
    setIsProcessing(true);

    // Working history — local mutable array to avoid closure staleness
    const history = [...messages];

    const pushAndSync = (msg) => {
      history.push(msg);
      setMessages([...history]);
    };

    // 1. Add user message (text + optional video)
    const userContent = trimmed || (video ? `[Attached video: ${video.name}]` : '');
    const userMsg = {
      id: genId(),
      role: 'user',
      content: userContent,
      timestamp: Date.now(),
      ...(video ? {
        video: {
          base64: video.base64,
          mimeType: video.mimeType,
          name: video.name,
          size: video.size,
          localUrl: video.localUrl,
        },
      } : {}),
    };
    pushAndSync(userMsg);

    try {
      if (video) {
        // ----- Video analysis: single unified Gemini call → structured {description, reply} -----
        console.log('[useChat] Video attached — running unified AI Partner analysis...');
        setTypingBots((prev) => new Set(prev).add('ai-agent'));

        // 60% chance AI Partner proactively asks Coach for their opinion
        const ariaAsksCoach = Math.random() < 0.3;
        const ariaPrompt = ariaAsksCoach
          ? AI_AGENT_PROMPT + '\n- When relevant, proactively invite Coach Benny (the golf expert in this chat) for their professional opinion. Address them as "Coach Benny" directly in your message.'
          : AI_AGENT_PROMPT;

        // One Gemini API call that outputs both the detailed swing description
        // (stored as hidden context) and AI Partner's visible chat reply.
        let hiddenDesc = '';
        let ariaReply = '';
        try {
          const unified = await generateUnifiedVideoReply(
            ariaPrompt,
            history,
            video.base64,
            video.mimeType,
          );
          hiddenDesc = unified.description;
          ariaReply = unified.reply;
          console.log('[useChat] Unified video reply — description chars:', hiddenDesc.length, 'reply chars:', ariaReply.length);
        } catch (unifiedErr) {
          console.warn('[useChat] Unified video reply failed:', unifiedErr);
          // Fallback: if the unified call fails entirely, try the old two-step
          ariaReply = 'I\'ve looked at your swing video but encountered an issue analyzing it in detail. Could you describe what you\'re working on?';
        }

        // Store the detailed description as hidden context (Coach sees it too)
        if (hiddenDesc) {
          const descMsg = {
            id: genId(),
            role: 'ai-agent',
            content: `[Video analysis context: ${hiddenDesc}]`,
            timestamp: Date.now(),
            hidden: true,
          };
          console.log('[useChat] Hidden description stored (len=' + hiddenDesc.length + ')');
          pushAndSync(descMsg);
        }

        // Store AI Partner's reply as a visible message
        const aiMsg = {
          id: genId(),
          role: 'ai-agent',
          content: ariaReply,
          timestamp: Date.now(),
        };
        pushAndSync(aiMsg);
        setTypingBots((prev) => {
          const next = new Set(prev);
          next.delete('ai-agent');
          return next;
        });

        // Coach trigger — AI Partner may have asked Coach, or random/@Coach roll
        if (ariaAsksCoach) {
          // 60%: AI Partner proactively asked — force Coach to reply immediately
          console.log('[useChat] AI Partner asked Coach — forcing Coach reply');
          setTypingBots((prev) => new Set(prev).add('coach'));

          try {
            const coachReply = await generateReply(COACH_PROMPT, history);
            console.log('[useChat] Coach reply received:', coachReply.slice(0, 80) + '...');
            const coachMsg = { id: genId(), role: 'coach', content: coachReply, timestamp: Date.now() };
            pushAndSync(coachMsg);
          } catch (coachErr) {
            console.error('[useChat] Coach API call failed:', coachErr);
          }

          setTypingBots((prev) => {
            const next = new Set(prev);
            next.delete('coach');
            return next;
          });
        } else {
          // Normal trigger: 30% random or @Coach mention
          const coachDecision = shouldCoachReply(trimmed);
          console.log('[useChat] Coach decision after video:', coachDecision);

          if (coachDecision.triggered) {
            console.log('[useChat] Calling Coach API (video context)...');
            setTypingBots((prev) => new Set(prev).add('coach'));

            try {
              const coachReply = await generateReply(COACH_PROMPT, history);
              console.log('[useChat] Coach reply received:', coachReply.slice(0, 80) + '...');
              const coachMsg = { id: genId(), role: 'coach', content: coachReply, timestamp: Date.now() };
              pushAndSync(coachMsg);
            } catch (coachErr) {
              console.error('[useChat] Coach API call failed:', coachErr);
            }

            setTypingBots((prev) => {
              const next = new Set(prev);
              next.delete('coach');
              return next;
            });
          }
        }
      } else if (coachForced) {
        // ----- Coach-forced mode: skip AI Partner, only Coach replies -----
        console.log('[useChat] Coach mode — forcing Coach reply, skipping AI Partner');
        setTypingBots((prev) => new Set(prev).add('coach'));

        const coachReply = await generateReply(COACH_PROMPT, history);
        console.log('[useChat] Coach reply received:', coachReply.slice(0, 80) + '...');
        const coachMsg = { id: genId(), role: 'coach', content: coachReply, timestamp: Date.now() };

        pushAndSync(coachMsg);
        setTypingBots((prev) => {
          const next = new Set(prev);
          next.delete('coach');
          return next;
        });
      } else {
        // ----- Normal mode: AI Partner always replies, then Coach may chime in -----
        setTypingBots((prev) => new Set(prev).add('ai-agent'));

        // 60% chance AI Partner proactively asks Coach
        const ariaAsksCoach = Math.random() < 0.3;
        const ariaPrompt = ariaAsksCoach
          ? AI_AGENT_PROMPT + '\n- When relevant, proactively invite Coach Benny (the golf expert in this chat) for their professional opinion. Address them as "Coach Benny" directly in your message.'
          : AI_AGENT_PROMPT;

        const aiReply = await generateReply(ariaPrompt, history);
        const aiMsg = { id: genId(), role: 'ai-agent', content: aiReply, timestamp: Date.now() };

        pushAndSync(aiMsg);
        setTypingBots((prev) => {
          const next = new Set(prev);
          next.delete('ai-agent');
          return next;
        });

        // Coach trigger — AI Partner may have asked Coach, or random/@Coach roll
        if (ariaAsksCoach) {
          // 60%: AI Partner proactively asked — force Coach to reply immediately
          console.log('[useChat] AI Partner asked Coach — forcing Coach reply');
          setTypingBots((prev) => new Set(prev).add('coach'));

          try {
            const coachReply = await generateReply(COACH_PROMPT, history);
            console.log('[useChat] Coach reply received:', coachReply.slice(0, 80) + '...');
            const coachMsg = { id: genId(), role: 'coach', content: coachReply, timestamp: Date.now() };
            pushAndSync(coachMsg);
          } catch (coachErr) {
            console.error('[useChat] Coach API call failed:', coachErr);
          }

          setTypingBots((prev) => {
            const next = new Set(prev);
            next.delete('coach');
            return next;
          });
        } else {
          // Normal trigger: 30% random or @Coach mention
          const coachDecision = shouldCoachReply(trimmed);
          console.log('[useChat] Coach decision:', coachDecision);

          if (coachDecision.triggered) {
            console.log('[useChat] Calling Coach API...');
            setTypingBots((prev) => new Set(prev).add('coach'));

            try {
              const coachReply = await generateReply(COACH_PROMPT, history);
              console.log('[useChat] Coach reply received:', coachReply.slice(0, 80) + '...');
              const coachMsg = { id: genId(), role: 'coach', content: coachReply, timestamp: Date.now() };
              pushAndSync(coachMsg);
            } catch (coachErr) {
              console.error('[useChat] Coach API call failed:', coachErr);
            }

            setTypingBots((prev) => {
              const next = new Set(prev);
              next.delete('coach');
              return next;
            });
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      // Clear all typing indicators on error
      setTypingBots(new Set());
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [messages]);

  return { messages, typingBots, isProcessing, sendMessage };
}
