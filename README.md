# 0701_3P_Paradigm

**Date:** 2026-07-01
**Status:** Prototype — MVP built

## Overview

A React-based chat demo where a user talks with two AI personas powered by **Gemini 3.5 Flash**:

| Persona | Role | Behavior |
|---------|------|----------|
| **Aria** (AI Agent) | Conversational assistant | Always replies to every user message |
| **Coach** | Supportive coach | 30% chance to chime in after Aria replies; 100% if `@Coach` mentioned |

Both bots see the full conversation history. A "XXX is typing..." indicator with animated dots shows while Gemini is generating.

## How to Run

```bash
# 1. Set your Gemini API key
cp .env.example .env
# Edit .env → paste your key

# 2. Install & run
npm install
npm run dev
```

## Architecture

```
src/
├── main.jsx                    # Entry point
├── App.jsx                     # Root component
├── App.css                     # Global styles (dark theme)
├── config/
│   └── gemini.js               # Gemini API endpoint + model config
├── hooks/
│   └── useChat.js              # Core chat logic, bot orchestration
├── utils/
│   ├── api.js                  # Gemini REST API wrapper (fetch)
│   └── coach-trigger.js        # @mention detection + 30% dice roll
└── components/
    ├── ChatRoom.jsx / .css     # Top-level layout
    ├── MessageList.jsx          # Message feed with auto-scroll
    ├── MessageBubble.jsx / .css # Individual message card
    ├── ChatInput.jsx / .css     # Text input + send button
    └── TypingIndicator.jsx / .css # Animated "is typing..." dots
```

## Bot Logic Flow

```
User sends message
  → Add to messages[]
  → "Aria is typing..." → Gemini API (AI Agent prompt + full history)
  → Add Aria's reply → clear typing
  → Coach trigger check:
      ├── /@Coach\b/i found → 100% reply
      └── else → Math.random() < 0.3
  → If triggered:
      → "Coach is typing..." → Gemini API (Coach prompt + full history)
      → Add Coach's reply → clear typing
```

## System Prompts

Placeholder prompts live in [system-prompts/](system-prompts/):
- [ai-agent.md](system-prompts/ai-agent.md) — Aria persona instructions
- [coach.md](system-prompts/coach.md) — Coach persona instructions

Replace the inline prompts in `useChat.js` with content from these files, or import them via Vite's raw import (`?raw`).

## Deployment

GitHub Actions workflow at `.github/workflows/deploy.yml`:
- Triggers on push to `main` when files in this folder change
- Builds with `VITE_GEMINI_API_KEY` from repository secrets
- Deploys to GitHub Pages at `/<repo>/0701_3P_Paradigm/`

**Before deploying:** Add `VITE_GEMINI_API_KEY` as a repository secret.

## Next Steps

- [ ] Replace inline system prompts with actual persona definitions
- [ ] Add streaming responses for more realistic chat feel
- [ ] Add error toast UI (currently errors only log to console)
- [ ] Add message retry on API failure
- [ ] Consider a lightweight backend proxy so the API key is never exposed client-side
