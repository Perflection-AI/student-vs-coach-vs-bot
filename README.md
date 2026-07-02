# 0701_3P_Paradigm — AI Chat Demo

**Date:** 2026-07-01 | **Status:** Prototype

A React chat demo with **three personas** powered by **Gemini 3.5 Flash (REST API)**. Users can send text messages, upload golf swing videos for AI analysis, and get coaching feedback.

## Personas

| Persona | Role | Behavior |
|---------|------|----------|
| **User** (👤) | Golfer | Sends text + optional video attachments |
| **AI Partner** (🤖) | AI Assistant | Always replies to every user message |
| **Coach** (🎯) | Golf Coach | 30% chance to chime in; 100% if `@Coach` mentioned or manually toggled |

## Screenshots

> Glassmorphism UI with dark theme, gradient bubbles, animated typing indicator.

## Features

### Chat
- **3-persona orchestration** — AI Partner always replies first, then Coach may chime in
- **@Coach toggle** — UI button to force Coach-only mode (skips AI Partner)
- **Typing indicator** — "AI Partner/Coach is typing..." with animated dots while generating
- **Full conversation context** — Both personas see complete history including hidden context

### Video Upload & Analysis
- **Pending attachment** — Select a video first, then type your question, send together
- **Video preview chip** — Shows filename with a ✕ remove button in the input area
- **Validation** — Max 20 MB, max 15 seconds, MP4/MOV/WebM only
- **Hidden video description** — Gemini generates a structured 4-section analysis (Video Context, Golfer & Equipment, Swing Observation, Notable Details) stored as a hidden message in history
- **Coach also sees it** — Hidden descriptions are included in both AI Partner's and Coach's context window; only filtered from the visible chat UI
- **Concurrent text + video** — Single message bubble can contain both text and a playable video

### Coach System
- **Golf knowledge base** — 200+ lines of golf swing expertise imported as the Coach's system prompt (Vite `?raw` import)
- **Serious tone** — Direct, concise, 1–2 sentences, no fluff
- **Sandwich method** — Positive → critique → drill, chronologically fixing the root cause
- **No-jargon rule** — Translates technical P1–P10 analysis into plain English

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
├── main.jsx                        # Entry point
├── App.jsx                         # Root component
├── App.css                         # Global styles (dark glassmorphism)
│
├── config/
│   └── gemini.js                   # Gemini API endpoint + model config
│
├── hooks/
│   └── useChat.js                  # Core chat logic, bot orchestration, video flow
│
├── utils/
│   ├── api.js                      # Gemini REST API wrapper (text, video, description)
│   ├── coach-trigger.js            # @mention detection + 30% dice roll
│   └── video-utils.js              # Video validation, base64 reading, duration, preview URLs
│
├── components/
│   ├── ChatRoom.jsx / .css         # Top-level layout
│   ├── MessageList.jsx             # Message feed with auto-scroll (filters hidden messages)
│   ├── MessageBubble.jsx / .css    # Message card with role-based glassmorphism styles
│   ├── ChatInput.jsx / .css        # Textarea + send button + @Coach toggle + video attachment
│   └── TypingIndicator.jsx / .css  # Animated "is typing..." dots
│
└── knowledge_base.md               # Coach golf knowledge (imported via ?raw)
```

## Data Flow

```
User sends text + optional video
  ├── Has video?
  │   ├── Generate hidden description (4-part Gemini analysis)
  │   ├── Store as hidden message in history
  │   ├── AI Partner analyzes video + full history → reply
  │   └── Coach may chime in (30% roll / @Coach)
  │
  ├── Coach-forced mode?
  │   └── Coach replies (skip AI Partner)
  │
  └── Normal mode (text only):
      ├── AI Partner replies
      └── Coach may chime in (30% roll / @Coach)
```

## Key Design Decisions

- **No AI SDK** — Raw `fetch()` to Gemini REST API, bundle stays small
- **Sequential execution** — AI Partner always completes before Coach, so Coach sees AI Partner's reply in context
- **Non-streaming** — Full response at once (streaming can be added later)
- **Hidden messages** — `hidden: true` flag, filtered in `MessageList`, included in `formatHistory()` for bot context
- **`pushAndSync` pattern** — Local mutable `history` array + `setMessages([...history])` to avoid React closure staleness across async steps
- **Relative asset paths** — `vite.config.js` uses `base: './'` for GitHub Pages sub-path deployment
- **Mobile-first** — `100dvh`, `env(safe-area-inset-*)`, 16px input font (prevents iOS zoom), 44px tap targets

## Deployment

### Prerequisites
1. Push this directory as a **separate GitHub repo** (it's already a git repo)
2. Add `VITE_GEMINI_API_KEY` as a **repository secret**:
   **Settings → Secrets and variables → Actions → New repository secret**

### CI/CD
GitHub Actions workflow at `.github/workflows/deploy.yml`:
- Triggers on push to `main`
- Builds with `VITE_GEMINI_API_KEY` injected at build time
- Deploys to GitHub Pages

After deployment, visit:
```
https://<your-username>.github.io/<repo-name>/
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 |
| Build | Vite 5 |
| AI | Gemini 3.5 Flash (REST API via `fetch`) |
| Styling | Glassmorphism CSS (`backdrop-filter: blur()`, semi-transparent gradients) |
| Font | DM Sans (Google Fonts) |
| CI/CD | GitHub Actions → GitHub Pages |
