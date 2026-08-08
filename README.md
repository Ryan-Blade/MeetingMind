<div align="center">

# 🧠 MeetingMind

**AI-powered meeting intelligence platform that transforms raw transcripts and live audio into citation-verified decisions, action items, risks, and disagreements — in real time.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector_DB-DC244C?style=flat-square)](https://qdrant.tech/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

</div>

---

## Table of Contents

1. [What is MeetingMind?](#what-is-meetingmind)
2. [Key Features](#key-features)
3. [Architecture Overview](#architecture-overview)
4. [Data Pipeline (9 Stages)](#data-pipeline-9-stages)
5. [Tech Stack](#tech-stack)
6. [Project Structure](#project-structure)
7. [Database Schema](#database-schema)
8. [API Reference](#api-reference)
9. [AI Extraction Agents](#ai-extraction-agents)
10. [Zero-Hallucination Citation Validation](#zero-hallucination-citation-validation)
11. [Live Streaming Mode](#live-streaming-mode)
12. [Multi-Provider LLM System](#multi-provider-llm-system)
13. [Format Adapters](#format-adapters)
14. [UI Components](#ui-components)
15. [Quick Start](#quick-start)
16. [Environment Variables](#environment-variables)
17. [Running Tests](#running-tests)
18. [Deployment](#deployment)

---

## What is MeetingMind?

MeetingMind is a full-stack AI system that ingests meeting transcripts — from Zoom JSON exports, Microsoft Teams exports, or plain text — and automatically extracts structured intelligence from them using Claude tool-use agents. Every extraction is citation-verified against the source transcript before being stored, eliminating hallucinations at the database gate.

It also supports a **live streaming mode** where the mic is captured in real time, speech is transcribed, and AI extractions appear on screen within seconds of someone speaking — with <5ms UI latency via WebSocket broadcasting.

The core insight: **every AI output must cite its exact verbatim quote from the source utterance.** If the quote doesn't exist in the source text, the record is rejected before it touches Postgres.

---

## Key Features

| Feature | Description |
|---|---|
| 📂 **Multi-format ingestion** | Parses Zoom JSON, Microsoft Teams exports, and plain-text transcripts via a pluggable adapter registry |
| 🤖 **Claude tool-use extraction** | Four specialized AI agents extract decisions, action items, risks, and disagreements using Anthropic's structured tool-call API |
| 🔒 **Zero-hallucination gate** | Every AI extraction is validated: `exact_quote` must exist verbatim in the source utterance or the record is rejected instantly |
| 🎙️ **Live streaming mode** | Real-time mic capture → speaker transcription → WebSocket AI broadcast → UI update in <5ms |
| 📡 **WebSocket real-time sync** | Full-duplex `ws://` connection syncs live utterances and AI cards to all connected clients simultaneously |
| 🧠 **Vector search (Qdrant)** | Each utterance is embedded with `text-embedding-3-small` and indexed in Qdrant for semantic retrieval |
| 🗂️ **Dual-pane dashboard** | Left: chronological transcript timeline. Right: filterable intelligence cards with bidirectional highlight-on-click |
| 🪟 **Floating HUD overlay** | Detachable mini-overlay for use during active meetings without covering the screen |
| 📥 **Auto-export transcripts** | Live sessions auto-generate downloadable `.json` and `.txt` transcript files on every utterance |
| 🔄 **Multi-provider LLM** | Key-stacking across Gemini, NVIDIA, Anthropic, OpenAI, and Groq with automatic quota rotation |
| 🐳 **Docker-first infra** | Single `docker-compose up` spins up Postgres 16 and Qdrant |
| 🧪 **Full test suite** | Vitest unit tests + Playwright E2E tests |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React 19)                       │
│  Header │ UploadModal │ LiveStreamModal │ FloatingHudOverlay     │
│  TranscriptTimeline  │  IntelligenceCards  │  FilterBar          │
│                     WebSocket Client (auto-reconnect)           │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP REST + WebSocket ws://
┌───────────────────────────▼─────────────────────────────────────┐
│                  SERVER  (Node.js + Express)                     │
│                                                                  │
│  POST /api/meetings/upload   ──►  Parser Registry               │
│  POST /api/meetings/:id/analyze ─►  Analysis Pipeline          │
│  GET  /api/meetings/:id       ──►  Postgres Query               │
│  GET  /api/meetings/          ──►  Meeting List                 │
│  GET  /health                 ──►  Health Check                 │
│  ws://…/ws/live-meeting       ──►  Live Socket Server           │
│                                                                  │
│  ┌──────────────┐  ┌─────────────────┐  ┌───────────────────┐  │
│  │   Adapters   │  │  AI Extractors  │  │ Citation Validator│  │
│  │ zoom.ts      │  │ decisions       │  │ validateExtraction│  │
│  │ teams.ts     │  │ action items    │  │ validateDisagree  │  │
│  │ text.ts      │  │ risks           │  └───────────────────┘  │
│  └──────────────┘  │ disagreements   │                          │
│                    └─────────────────┘                          │
└──────────┬─────────────────────────────────┬────────────────────┘
           │                                 │
  ┌────────▼────────┐               ┌────────▼────────┐
  │   PostgreSQL    │               │     Qdrant      │
  │  (Prisma ORM)   │               │ (Vector Search) │
  │                 │               │                 │
  │ User            │               │ utterance       │
  │ Meeting         │◄──qdrantPointId── embeddings    │
  │ Utterance       │               │ (text-embedding │
  │ Decision        │               │  -3-small)      │
  │ ActionItem      │               └─────────────────┘
  │ Risk            │
  │ Disagreement    │
  └─────────────────┘
```

---

## Data Pipeline (9 Stages)

The full pipeline runs on every uploaded transcript and on each live utterance:

```
ingest → parse → chunk → embed → index → extract → validate → store → serve
```

### Stage 1 — Ingest (`POST /api/meetings/upload`)
Accepts a multipart file upload. Supports:
- **Zoom JSON** (`meeting_saved_chat.json` or `transcript.json` format)
- **Microsoft Teams** meeting export (`.txt` or `.json`)
- **Plain text** transcripts (`Speaker Name: text` or `Speaker Name (HH:MM:SS): text`)

### Stage 2 — Parse (`adapters/`)
The `parserRegistry` auto-detects the format and routes to the correct adapter:

| Adapter | File | Detects |
|---|---|---|
| `ZoomAdapter` | `adapters/zoom.ts` | JSON with `meeting_id` or Zoom transcript structure |
| `TeamsAdapter` | `adapters/teams.ts` | Teams `.txt` export with `HH:MM:SS` timestamp lines |
| `PlainTextAdapter` | `adapters/text.ts` | Free-form `Speaker: text` or `Speaker (time): text` |

Each adapter implements `ParserAdapter` and produces normalized `Utterance` records:
```ts
interface Utterance {
  utteranceId: string;      // "meetingId:utt_N" stable primary key
  speaker: string;          // Speaker display name
  text: string;             // Utterance body text
  timestamp: string;        // "HH:MM:SS"
  utteranceIndex: number;   // Sequential position
}
```

### Stage 3 — Chunk
Each speaker turn is treated as an indivisible context block. No cross-speaker chunking occurs, preserving attribution integrity for citation validation.

### Stage 4 — Embed
Each utterance text is passed to **OpenAI `text-embedding-3-small`** to produce a 1536-dimensional dense vector representation.

### Stage 5 — Index (`Qdrant`)
Embeddings are stored in a Qdrant vector collection named `meetingmind-utterances` with the following payload attributes per point:
- `meetingId`, `utteranceId`, `speaker`, `timestamp`, `text`

The returned Qdrant point UUID is stored back in the Postgres `Utterance.qdrantPointId` field as a cross-database foreign reference, enabling hybrid SQL+vector queries.

### Stage 6 — Extract (Claude Tool-Use Agents)
Four specialized agents call the Anthropic Messages API with strict JSON tool schemas. Each agent is invoked per utterance (or per utterance pair for disagreements):

| Agent | Tool | Extracts |
|---|---|---|
| `decisionExtractorTool` | `extract_decisions` | Formal decisions, outcomes, resolved agreements |
| `actionItemExtractorTool` | `extract_action_items` | Commitments with owner, deadline, priority |
| `riskExtractorTool` | `extract_risks` | Doubts, concerns, blockers, dependencies |
| `disagreementExtractorTool` | `extract_disagreement` | Conflicting positions between speakers (windowed pair analysis, N=3) |

### Stage 7 — Validate (`server/lib/citation-validator.ts`)
Every AI extraction passes through the **zero-hallucination gate** before any database write:

```ts
validateExtraction({
  exactQuote: dec.exact_quote,
  sourceUtteranceText: utt.text,
  confidence: dec.confidence,
  minConfidence: DECISION_MIN_CONFIDENCE,  // 0.85
  requiredFields: { decision: dec.decision }
})
// Returns { valid: boolean, reason?: string }
```

Rules:
- `exact_quote` must be a verbatim substring of `sourceUtteranceText`
- `confidence` must meet the per-category minimum threshold
- All required fields must be non-empty

Rejections are logged with `[VALIDATOR REJECTED ...]` and never reach Postgres.

### Stage 8 — Store (Postgres via Prisma)
Validated extractions are written in a single **Prisma `$transaction`** that atomically:
1. Deletes all previous extractions for the meeting
2. Bulk-inserts the new validated set
3. Updates meeting status to `ANALYZED`

### Stage 9 — Serve (`GET /api/meetings/:id`)
Returns the full meeting with all linked `utterances`, `decisions`, `actionItems`, `risks`, and `disagreements` joined from Postgres.

---

## Tech Stack

### Frontend
| Technology | Version | Role |
|---|---|---|
| **React** | 19 | UI framework |
| **TypeScript** | 5.7 | Type safety |
| **Tailwind CSS** | v4 | Styling |
| **Vite** | latest | Build tool & dev server |
| **Framer Motion** | — | Animations |
| **Recharts** | — | Data visualizations |

### Backend
| Technology | Version | Role |
|---|---|---|
| **Node.js** | 22 | Runtime |
| **Express** | 4.21 | HTTP server |
| **TypeScript** | 5.7 | Type safety |
| **tsx** | 4.19 | Dev-mode TypeScript runner (no compile step) |
| **ws** | 8.18 | Native WebSocket server |
| **multer** | 1.4 | Multipart file uploads |
| **zod** | 3.24 | Runtime schema validation |

### AI / LLM
| Technology | Role |
|---|---|
| **Anthropic Claude** (Messages API, tool-use) | Structured extraction agents |
| **OpenAI `text-embedding-3-small`** | Utterance embedding |
| **Google Gemini** | Multi-provider fallback |
| **NVIDIA NIM** | Multi-provider fallback |
| **Groq** | Multi-provider fallback |

### Storage
| Technology | Role |
|---|---|
| **PostgreSQL 16** | Relational: meetings, utterances, extractions |
| **Prisma ORM 6** | Type-safe database client + migrations |
| **Qdrant** | Vector database for utterance embeddings |

### Infrastructure
| Technology | Role |
|---|---|
| **Docker Compose** | Postgres + Qdrant containers |
| **npm workspaces** | Monorepo: `client`, `server`, `shared`, `adapters` |
| **Playwright** | E2E browser testing |
| **Vitest** | Unit testing |

---

## Project Structure

```
meetingmind/
├── client/                          # React 19 frontend (Vite)
│   └── src/
│       ├── App.tsx                  # Root app, WebSocket client, state
│       ├── types.ts                 # Frontend type definitions
│       ├── mockData.ts              # PRD fixture data for demo mode
│       └── components/
│           ├── Header.tsx           # Nav bar with action buttons
│           ├── UploadModal.tsx      # Transcript file upload flow
│           ├── LiveStreamModal.tsx  # Live meeting recording & speaker tracking
│           ├── FloatingHudOverlay.tsx # Detachable mini-overlay HUD
│           ├── TranscriptTimeline.tsx # Left pane: chronological utterances
│           ├── IntelligenceCards.tsx  # Right pane: AI extraction cards
│           └── FilterBar.tsx        # Filter/sort controls
│
├── server/                          # Node.js + Express backend
│   └── src/
│       ├── index.ts                 # Server entry: Express setup, WebSocket init, static serving
│       ├── routes/
│       │   ├── meetings.ts          # POST /upload, GET /:id, GET /
│       │   └── analyze.ts           # POST /:id/analyze, runMeetingAnalysis()
│       ├── services/
│       │   ├── live-socket.ts       # WebSocket server, live session management
│       │   └── diarization.ts       # MultimodalDiarizationEngine (voice + OCR)
│       ├── agents/
│       │   └── extractor.ts         # extractDecisions/ActionItems/Risks/Disagreement
│       └── lib/
│           ├── prisma.ts            # Prisma client singleton
│           ├── qdrant.ts            # Qdrant client, indexUtterancesInQdrant()
│           ├── llm-provider.ts      # Multi-provider LLM manager with key rotation
│           └── citation-validator.ts # Zero-hallucination validation gate
│
├── agents/                          # Shared agent tool schemas
│   └── schemas.ts                   # Tool definitions + confidence thresholds
│
├── adapters/                        # Transcript format parsers (npm workspace)
│   ├── index.ts                     # Exports parserRegistry
│   ├── registry.ts                  # Auto-detection + routing
│   ├── zoom.ts                      # Zoom JSON adapter
│   ├── teams.ts                     # Microsoft Teams adapter
│   ├── text.ts                      # Plain-text adapter
│   └── fixtures/                    # Sample transcripts for tests
│
├── shared/                          # Shared types (npm workspace)
│   └── index.ts                     # Common interfaces
│
├── prisma/                          # Prisma migrations
├── schema.prisma                    # Database schema
├── docker-compose.yml               # Postgres 16 + Qdrant
├── playwright.config.ts             # E2E test config
└── package.json                     # Root workspace + scripts
```

---

## Database Schema

MeetingMind uses a **hybrid storage architecture**: relational metadata in PostgreSQL, vector embeddings in Qdrant. The `Utterance.qdrantPointId` field is the cross-database join key.

```
User
 └── Meeting (userId FK)
      ├── Utterance[]   (qdrantPointId → Qdrant)
      ├── Decision[]    (sourceUtteranceId + exactQuote)
      ├── ActionItem[]  (sourceUtteranceId + exactQuote)
      ├── Risk[]        (sourceUtteranceId + exactQuote)
      └── Disagreement[] (sourceUtteranceId1 + sourceUtteranceId2)
```

### Meeting Status FSM
```
PROCESSING → READY → ANALYZING → ANALYZED
                              └→ FAILED
```

### Extraction Fields (common to all 4 types)
Every extraction record carries:
- `sourceUtteranceId` — stable `meetingId:utt_N` reference
- `exactQuote` — verbatim substring from source utterance (citation-validated)
- `confidence` — float 0–1, must exceed per-category threshold
- `speaker` + `timestamp` — provenance metadata

---

## API Reference

### `POST /api/meetings/upload`
Upload a transcript file for parsing, embedding, and analysis.

**Request:** `multipart/form-data`
```
file: <transcript file>   (Zoom JSON | Teams export | plain text)
```

**Response `201`:**
```json
{
  "success": true,
  "meeting": {
    "id": "clxyz...",
    "title": "Q3 Planning Call",
    "date": "2026-08-01T10:00:00Z",
    "attendees": ["Alice", "Bob", "Carol"],
    "sourceFormat": "zoom-json",
    "status": "ANALYZED",
    "utterances": [...],
    "decisions": [...],
    "actionItems": [...],
    "risks": [...],
    "disagreements": [...]
  }
}
```

---

### `POST /api/meetings/:id/analyze`
Re-run AI extraction on an already-ingested meeting (useful after model upgrades).

**Response `200`:**
```json
{ "success": true, "meeting": { ... } }
```

---

### `GET /api/meetings/:id`
Fetch a meeting with all linked extractions.

**Response `200`:**
```json
{ "success": true, "meeting": { ... } }
```

---

### `GET /api/meetings`
List all meetings ordered by creation date.

**Response `200`:**
```json
{
  "success": true,
  "meetings": [
    {
      "id": "...",
      "title": "...",
      "_count": { "utterances": 42, "decisions": 3, "actionItems": 7, "risks": 2, "disagreements": 1 }
    }
  ]
}
```

---

### `GET /health`
```json
{ "status": "ok", "timestamp": "2026-08-08T14:00:00Z" }
```

---

### WebSocket: `ws://<host>:3001/ws/live-meeting`

**Client → Server messages:**

| `type` | Payload | Description |
|---|---|---|
| `START_LIVE_SESSION` | `{ title?: string }` | Creates a new live meeting session in Postgres |
| `LIVE_UTTERANCE` | `{ meetingId, speaker, text, timestamp }` | Submits a single transcribed utterance |
| `END_LIVE_SESSION` | `{ meetingId }` | Finalizes session, returns download file paths |

**Server → Client broadcasts:**

| `type` | Payload | Description |
|---|---|---|
| `SESSION_STARTED` | `{ meetingId, title }` | Confirms session creation |
| `UTTERANCE_ADDED` | `{ meetingId, utterance, filePaths }` | Broadcasts new utterance to all clients (<5ms) |
| `EXTRACTION_ADDED` | `{ meetingId, cardType, card }` | Broadcasts validated AI extraction card |
| `SESSION_ENDED` | `{ meetingId, filePaths }` | Session closed with transcript download URLs |

---

## AI Extraction Agents

All four agents use the Anthropic Claude Messages API with **structured tool-use**. The tools are defined in [`agents/schemas.ts`](agents/schemas.ts) with strict JSON Schema input definitions.

### Decision Extractor
Identifies formal decisions, resolutions, and agreed-upon outcomes.

**Minimum confidence:** 0.85  
**Required fields:** `decision`, `exact_quote`, `source_utterance_id`  
**Optional:** `context`

```json
// Example output
{
  "decisions": [{
    "decision": "We will deploy the v2.4 patch without rolling back",
    "exact_quote": "Let's go ahead and deploy the missing index without rolling back v2.4",
    "speaker": "Alice",
    "timestamp": "00:14:32",
    "confidence": 0.94,
    "source_utterance_id": "clx123:utt_7"
  }]
}
```

### Action Item Extractor
Identifies specific commitments with an owner and optional deadline.

**Minimum confidence:** 0.80  
**Priority levels:** `CRITICAL` | `HIGH` | `MEDIUM` | `LOW`  
**Status default:** `PENDING`

```json
{
  "action_items": [{
    "action": "Run load tests against the staging database before Friday",
    "owner": "Bob",
    "deadline": "Friday EOD",
    "priority": "HIGH",
    "exact_quote": "Bob, can you run the load tests against staging before Friday?",
    "confidence": 0.91
  }]
}
```

### Risk Extractor
Identifies doubts, concerns, blockers, and dependencies.

**Minimum confidence:** 0.75  
**Risk types:** `DOUBT` | `CONCERN` | `BLOCKER` | `DEPENDENCY`  
**Severity levels:** `HIGH` | `MEDIUM` | `LOW`

```json
{
  "risks": [{
    "risk": "Database lock contention may cause timeouts during peak traffic",
    "risk_type": "CONCERN",
    "severity": "HIGH",
    "exact_quote": "I'm worried that we'll see lock contention during peak hours",
    "confidence": 0.88
  }]
}
```

### Disagreement Extractor
Analyzes **pairs** of utterances (sliding window N=3) to detect conflicting positions between different speakers.

**Minimum confidence:** 0.80  
**Detection:** Only triggers between different speakers  
**Window size:** 3 utterances lookahead

```json
{
  "found": true,
  "topic": "Release strategy: rollback vs patch",
  "position_1": "We must roll back v2.4 to protect users",
  "position_2": "Rolling back would take 3 hours, we should patch instead",
  "resolution": "Agreed to apply targeted index patch without full rollback",
  "confidence": 0.91
}
```

---

## Zero-Hallucination Citation Validation

Every AI extraction must pass through `validateExtraction()` before it is stored. This is the core reliability guarantee of MeetingMind.

```ts
// server/lib/citation-validator.ts

function validateExtraction({
  exactQuote,           // What the AI claims was said
  sourceUtteranceText,  // What was actually said
  confidence,
  minConfidence,
  requiredFields
}): { valid: boolean; reason?: string }

// PASS: exactQuote is a verbatim substring of sourceUtteranceText
// FAIL: any character mismatch → logged and dropped
```

For disagreements, `validateDisagreement()` runs the same check independently on **both** utterance quotes.

**Confidence thresholds:**

| Category | Threshold |
|---|---|
| Decision | ≥ 0.85 |
| Action Item | ≥ 0.80 |
| Risk | ≥ 0.75 |
| Disagreement | ≥ 0.80 |

---

## Live Streaming Mode

The live meeting mode allows MeetingMind to process meetings in real time:

```
Browser Mic → Web Speech API → LiveStreamModal
    → WebSocket LIVE_UTTERANCE → Server
    → Broadcast UTTERANCE_ADDED to all clients  (<5ms)
    → Background: Qdrant embed + Postgres persist
    → Background: AI extract → validate → Postgres
    → Broadcast EXTRACTION_ADDED to all clients
```

**Key design choices:**

1. **Two-phase processing:** The utterance is broadcast to the UI immediately (`<5ms`), while AI processing happens asynchronously in the background.
2. **Auto-persistence:** On every utterance, the full session is written to both a `.json` structured file and a `.txt` plain file under `server/uploads/`.
3. **Database-optional:** If Postgres is offline, the live session continues with in-memory persistence. Files are still written to disk and AI extractions still run.
4. **Auto-reconnect:** The client WebSocket auto-reconnects every 3 seconds on disconnect.
5. **Dynamic speaker tracking:** The `MultimodalDiarizationEngine` identifies N distinct speakers from voice fingerprint hashes or raw speaker tags, and can fuse with OCR-detected participant names from screen content (Zoom/Teams/Meet).

### Auto-generated transcript files

Every live session produces two downloadable files:

**`{session_title}_{meetingId}.json`**
```json
{
  "title": "Q3 Planning",
  "date": "2026-08-08T14:00:00Z",
  "duration_seconds": 900,
  "source_format": "live_stream_capture",
  "attendees": ["Alice", "Bob"],
  "transcript": [
    { "speaker": "Alice", "start_time": "00:01:30", "text": "..." }
  ]
}
```

**`{session_title}_{meetingId}.txt`**
```
Alice (00:01:30): Let's kick off the sprint planning session.
Bob (00:01:45): Sounds good. I've got the backlog ready.
```

---

## Multi-Provider LLM System

MeetingMind supports **free-tier key stacking** across multiple LLM providers with automatic quota rotation. Configure provider priority order in `.env`:

```env
LLM_PROVIDER_ORDER="gemini,nvidia,anthropic,openai,groq"
GEMINI_API_KEYS="key1,key2,key3"      # comma-separated; rotates on quota
NVIDIA_API_KEYS="key1,key2"
ANTHROPIC_API_KEYS="key1"
OPENAI_API_KEYS="key1"
GROQ_API_KEYS="key1"
```

The `LLMProviderManager` in `server/lib/llm-provider.ts`:
- Tries each provider in priority order
- Rotates through multiple keys per provider on `429` / quota exhaustion
- Falls back to the next provider on consecutive failures
- All extraction agents expose a unified `executeToolCall()` interface regardless of backend provider

---

## Format Adapters

The adapter system (`adapters/`) is a pluggable, auto-detecting parser registry:

```ts
// adapters/registry.ts
parserRegistry.getAdapter(fileContent, filename)
// Returns: ZoomAdapter | TeamsAdapter | PlainTextAdapter
```

### `ZoomAdapter` (`adapters/zoom.ts`)
Parses Zoom meeting JSON exports. Detects `meeting_id` or `transcript` keys. Extracts `start_time`, `display_name`, and `text` from each entry.

### `TeamsAdapter` (`adapters/teams.ts`)
Parses Microsoft Teams `.txt` exports. Handles the `HH:MM:SS Speaker Name\n Text` line pattern. Falls back to speaker-prefix detection.

### `PlainTextAdapter` (`adapters/text.ts`)
Handles free-form transcripts in formats like:
- `Speaker Name: text content`
- `Speaker Name (00:01:30): text content`
- `[00:01:30] Speaker: text`

All adapters output the same normalized `ParsedMeeting` shape:
```ts
interface ParsedMeeting {
  title?: string;
  date?: string;
  durationSeconds?: number;
  attendees: string[];
  sourceFormat: string;
  utterances: Utterance[];
}
```

---

## UI Components

### `Header.tsx`
Top navigation bar. Buttons: **Upload Transcript**, **Live Stream**, **Floating HUD**, **Run Analysis**.

### `UploadModal.tsx`
File drag-and-drop / browse modal. Sends `multipart/form-data` to `POST /api/meetings/upload`. On success, updates the full meeting state.

### `LiveStreamModal.tsx`
Full live-meeting control panel:
- Starts/stops WebSocket session
- Controls microphone capture via `getUserMedia`
- Displays real-time speaker name input with dynamic N-speaker tracking
- Shows live utterance feed with typing indicators
- Provides download links to `.json` and `.txt` session files

### `FloatingHudOverlay.tsx`
Compact mini-overlay (draggable) showing live extraction cards during an active meeting without interrupting the current meeting view. Can be expanded to the full Signal Room view.

### `TranscriptTimeline.tsx`
Left-pane: scrollable list of utterances, color-coded by speaker, with timestamp. Clicking a speaker turn highlights the linked intelligence card on the right. Selected utterance with `highlightQuote` applies verbatim text highlight.

### `IntelligenceCards.tsx`
Right-pane: tabbed view across Decisions, Action Items, Risks, and Disagreements. Each card shows:
- Category badge + confidence score
- Verbatim `exactQuote` in a styled callout
- Speaker + timestamp provenance
- Clicking a card scrolls and highlights the source utterance in the timeline

### `FilterBar.tsx`
Controls for filtering intelligence cards:
- **Type filter:** ALL / Decisions / Actions / Risks / Disagreements
- **Owner filter:** dropdown from action item owners + attendee list
- **Priority filter:** CRITICAL / HIGH / MEDIUM / LOW
- **Sort:** by Timestamp / Confidence / Priority

---

## Quick Start

### Prerequisites
- Node.js 22+
- Docker & Docker Compose
- npm 10+

### 1. Clone and install
```bash
git clone https://github.com/Ryan-Blade/MeetingMind.git
cd MeetingMind
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env and add your API keys (see Environment Variables section)
```

### 3. Start infrastructure
```bash
docker-compose up -d
# Starts PostgreSQL on :5432 and Qdrant on :6333
```

### 4. Initialize database
```bash
cd server
npx prisma migrate dev --name init
npx prisma generate
cd ..
```

### 5. Start development servers
```bash
npm run dev
# Concurrently starts:
#   Server → http://localhost:3001
#   Client → http://localhost:5173
# WebSocket → ws://localhost:3001/ws/live-meeting
```

### 6. Open the app
Navigate to [http://localhost:5173](http://localhost:5173)

The app loads with a pre-populated fixture meeting (PRD Planning session). Try:
- **Upload Transcript** — drag in a Zoom JSON, Teams export, or plain text file
- **Live Stream** — click "Start Session", speak into your mic, watch AI cards appear in real time
- **Run Analysis** — re-runs extraction on the current meeting

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/meetingmind?schema=public"

# LLM Provider Priority (try providers in this order)
LLM_PROVIDER_ORDER="gemini,nvidia,anthropic,openai,groq"

# Key stacking: comma-separated keys per provider
GEMINI_API_KEYS="your-gemini-key-1,your-gemini-key-2"
NVIDIA_API_KEYS="your-nvidia-key-1,your-nvidia-key-2"
ANTHROPIC_API_KEYS="your-anthropic-key"
OPENAI_API_KEYS="your-openai-key"
GROQ_API_KEYS="your-groq-key"

# Single-key fallbacks (legacy)
GEMINI_API_KEY="your-gemini-api-key"
NVIDIA_API_KEY="your-nvidia-api-key"
ANTHROPIC_API_KEY=""
OPENAI_API_KEY=""

# Vector database
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY=""   # leave empty for local Qdrant

# Auth
JWT_SECRET="your-secret-here"
```

> **Tip:** MeetingMind works without any API keys in demo mode — fixture data is pre-loaded and the fallback rule-based extractor handles basic patterns.

---

## Running Tests

### Unit tests (Vitest)
```bash
# All workspaces
npm run test

# Server only
npm run test --workspace=@meetingmind/server

# Adapter parser tests
npm run test --workspace=@meetingmind/adapters
```

### E2E tests (Playwright)
```bash
npm run test:e2e
```

Tests cover:
- Adapter parsing for all three formats (zoom, teams, plain text)
- Upload endpoint integration
- Analysis pipeline with citation validation
- Live WebSocket session lifecycle

---

## Deployment

### Single-port production build
MeetingMind serves the React client as static files from the Express server — no separate frontend host needed.

```bash
npm run build
# Builds client → client/dist/
# Builds server → server/dist/

npm run start
# Server serves API on :3001
# Server serves React SPA at GET * → client/dist/index.html
```

Access everything at `http://localhost:3001`.

### Docker deployment
A sample production `docker-compose.yml` is included for Postgres and Qdrant. Add your own app container or deploy the built server to any Node.js host (Railway, Render, Fly.io, etc).

```bash
# Production infrastructure
docker-compose up -d postgres qdrant

# Run migrations
DATABASE_URL=your_prod_url npx prisma migrate deploy

# Start server
NODE_ENV=production npm run start
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Run the test suite: `npm run test && npm run test:e2e`
4. Commit with conventional commits: `git commit -m "feat: add X"`
5. Open a pull request

---

## License

MIT — see [LICENSE](LICENSE)

---

<div align="center">
  Built with TypeScript · React · Node.js · PostgreSQL · Qdrant · Claude API
</div>