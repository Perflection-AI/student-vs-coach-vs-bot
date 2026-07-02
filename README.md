# 0701_3P_Paradigm — AI Chat Demo

**Date:** 2026-07-02 | **Status:** Prototype | **Prev:** 0701

A React chat demo with **three personas** powered by **Gemini 3.5 Flash (REST API)**. Users can send text messages, upload golf swing videos for AI analysis, and get coaching feedback.

## Personas

| Persona | Role | Behavior |
|---------|------|----------|
| **User** (👤) | Golfer | Sends text + optional video attachments |
| **AI Partner** (🤖) | AI Assistant | Always replies to every user message; 30% chance to proactively invite Coach |
| **Coach** (🎯) | Golf Coach | Sharp, direct, one-sentence expert critique. Triggered by AI Partner (30%) or `@Coach` mention |

## Screenshots

> Glassmorphism UI with dark theme, gradient bubbles, animated typing indicator.

## Features

### Chat
- **3-persona orchestration** — AI Partner always replies first; Coach may chime in (30% via AI Partner invite, or @Coach mention, or manual toggle)
- **AI Partner → Coach handoff** — AI Partner has 30% chance to proactively invite Coach; her reply reflects the invitation, then Coach fires immediately
- **@Coach toggle** — UI button to force Coach-only mode (skips AI Partner)
- **Typing indicator** — "AI Partner/Coach is typing..." with animated dots while generating
- **Full conversation context** — Both personas see complete history including hidden context

### Video Upload & Analysis
- **Unified Gemini API call** — One `generateUnifiedVideoReply()` call outputs structured JSON `{ description, reply }` via `response_schema`
- **SwingLens-grade description** — Multi-stage analysis (P1–P10 positional breakdown, causal reasoning, root-cause diagnosis, prescription reference) following pro golf biomechanics standards; up to 65k tokens
- **Structured output** — `description` stored as hidden context for future rounds; `reply` shown as visible chat message — cleanly separated by Gemini JSON mode
- **Hidden video description** — Gemini generates a detailed multi-stage analysis (Video Context, P1–P10, Causal Chain, Root-Cause) stored as hidden message in history
- **Coach also sees it** — Hidden descriptions are included in both AI Partner's and Coach's context window; only filtered from the visible chat UI
- **Concurrent text + video** — Single message bubble can contain both text and a playable video
- **Validation** — Max 20 MB, max 15 seconds, MP4/MOV/WebM only

### Coach System
- **Golf knowledge base** — 200+ lines of golf swing expertise (P1–P10, biomechanics, ball flight) imported as Coach's system prompt
- **Sharp tone** — 1 sentence ideal, max 2. Direct, authoritative, no fluff. "Aria is the cheerleader. You are the coach."
- **No-jargon rule** — Translates technical P1–P10 analysis into plain English
- **Sandwich method** — Positive → critique → drill, chronologically fixing the root cause
- **No confidence output** — Coach never outputs confidence levels, ratings, or scores

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
│   ├── api.js                      # Gemini REST API wrapper: unified video reply (JSON structured output), text reply, legacy fallbacks
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
  │   └── generateUnifiedVideoReply() — single Gemini call
  │         → structured JSON { description, reply }
  │         ├── description → hidden message (SwingLens-grade, 65k tokens)
  │         └── reply → visible AI Partner message
  │
  ├── Coach-forced mode?
  │   └── Coach replies (skip AI Partner)
  │
  └── AI Partner replies (text or video)

      ┌── 30%: AI Partner invited Coach ──→ Coach forced reply immediately
      │
      └── 70%: normal → Coach trigger check
               ├── @Coach mentioned → Coach replies
               ├── 30% random roll → Coach replies
               └── otherwise → done
```

## Key Design Decisions

- **No AI SDK** — Raw `fetch()` to Gemini REST API, bundle stays small
- **Unified video API call** — `generateUnifiedVideoReply()` produces both the detailed swing description and chat reply in one Gemini request using structured JSON output (`response_mime_type: "application/json"` + `response_schema`). No more two-step description-then-reply flow.
- **SwingLens-grade analysis** — The description prompt follows the full P1–P10 biomechanics methodology (4 stages: observation, causal reasoning, root-cause, prescription) with up to 65k output tokens.
- **Structured output separation** — `description` → hidden context; `reply` → visible message. Cleanly distinguished via Gemini JSON mode, not post-hoc parsing.
- **Sequential execution** — AI Partner always completes before Coach, so Coach sees AI Partner's reply in context
- **AI Partner → Coach handoff** — 30% chance AI Partner proactively invites Coach, reflected in her reply text; Coach then fires immediately (not probabilistic)
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

## Changelog (0702)

| Change | Detail |
|--------|--------|
| **Renamed Aria → AI Partner** | All display text, prompts, comments, component labels updated |
| **Unified video API call** | `generateUnifiedVideoReply()` — one Gemini call with structured JSON output `{ description, reply }` replaces the old two-step flow |
| **SwingLens-grade description** | Composite prompt follows 4-stage PGA coaching methodology (P1–P10, causal reasoning, root-cause, prescription); `maxOutputTokens` raised to 65536 |
| **AI Partner → Coach handoff** | 30% chance AI Partner proactively asks Coach; reflected in her reply, then Coach fires immediately |
| **Coach tone overhaul** | Sharp, direct, authoritative — 1 sentence ideal, max 2. No confidence levels, no fluff, no warmth |
| **Confidence Mandate removed** | Deleted from `knowledge_base.md` — Coach no longer outputs confidence ratings |
| **Title updated** | Header: `User · AI Partner · Coach` (was `3P Paradigm`), subtitle removed |

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 |
| Build | Vite 5 |
| AI | Gemini 3.5 Flash (REST API via `fetch`, structured output via `response_schema`) |
| Styling | Glassmorphism CSS (`backdrop-filter: blur()`, semi-transparent gradients) |
| Font | DM Sans (Google Fonts) |
| CI/CD | GitHub Actions → GitHub Pages |
