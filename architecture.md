# MeetingMind — System Architecture & Data Pipeline

## Overview

MeetingMind parses meeting transcripts into citation-verified decisions, action items, risks, and disagreements.

```
ingest → parse → chunk → embed → index → extract → validate → store → serve
```

## Pipeline Stages

1. **Ingest (`POST /api/meetings/upload`)**:
   Accepts multipart transcript files (Zoom JSON format, Teams exports, or plain text transcripts).

2. **Parse (`adapters/`)**:
   Matches incoming files to format adapters (`zoom.ts`, `teams.ts`, `text.ts`) implementing the common `ParserAdapter` interface. Produces normalized `Utterance` records with assigned speaker, HH:MM:SS timestamp, sequence index, and stable `meeting_id:utterance_id` primary key identifiers.

3. **Chunk**:
   Uses utterance-level boundary chunking. Each speaker turn is maintained as an indivisible context block with metadata preserved.

4. **Embed (`OpenAI text-embedding-3-small`)**:
   Computes vector representations for each utterance text block.

5. **Index (`Qdrant`)**:
   Stores vector embeddings in Qdrant vector database along with payload attributes (`meetingId`, `utteranceId`, `speaker`, `timestamp`, `text`). Returns `qdrantPointId` stored back in Postgres `Utterance` record as a cross-database foreign reference.

6. **Extract (`Claude Tool-Use Agents`)**:
   Invokes Anthropic Messages API with strict tool parameters from [`server/agents/schemas.ts`](file:///c:/Users/sulph/OneDrive/Desktop/Nebula/server/agents/schemas.ts):
   - `decisionExtractorTool`: Extracts decisions with verbatim quotes and confidence scores.
   - `actionItemExtractorTool`: Identifies action owner, commitment, deadline, and priority.
   - `riskExtractorTool`: Identifies doubts, concerns, blockers, or dependencies.
   - `disagreementExtractorTool`: Evaluates utterance candidate pairs windowed by topic cluster to extract conflicting positions.

7. **Validate (`server/lib/citation-validator.ts`)**:
   Passes extractions through the zero-hallucinations gate (`validateExtraction` / `validateDisagreement`). Verifies that `exact_quote` is present verbatim in the source utterance text and confidence satisfies threshold requirements. Extractions failing validation are rejected instantly before hitting Postgres.

8. **Store (`Postgres / Prisma`)**:
   Maps extracted `snake_case` payload fields (`exact_quote`, `source_utterance_id`) to Prisma `camelCase` schema models (`Decision`, `ActionItem`, `Risk`, `Disagreement`).

9. **Serve (`GET /api/meetings/:id`)**:
   Serves synced meeting timeline and validated intelligence cards to the Signal Room client UI.

## Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Recharts, Framer Motion
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Storage**: PostgreSQL (Relational metadata & validated extractions), Qdrant (Vector storage)
- **AI / LLM**: Anthropic Claude Messages API (Tool-use extraction), OpenAI `text-embedding-3-small`
