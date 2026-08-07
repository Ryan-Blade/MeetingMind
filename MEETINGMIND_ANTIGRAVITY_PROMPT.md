# MeetingMind — Antigravity Kickoff Prompt (optimized)

**Setup (do once, before pasting):** commit `prisma/schema.prisma`, `server/agents/schemas.ts`, `server/lib/citation-validator.ts`, and `.env.example` (keys: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `QDRANT_URL`, `QDRANT_API_KEY`, `JWT_SECRET`) into an empty repo, open it as the Antigravity Workspace, mode = **Agent-assisted**, start a **Planning-mode** task, paste the block below.

```
Build "MeetingMind": parses meeting transcripts into citation-verified decisions, action items, risks, disagreements. 48h hackathon build — working vertical slice over exhaustive scope. Citation validation is non-negotiable.

STACK: React 19 + TS + Tailwind 4 + Recharts + Framer Motion (client) · Node/Express + TS (server) · Postgres/Prisma · Qdrant (Docker, local) · OpenAI text-embedding-3-small · Claude tool-use for extraction. Signal Room theme: #0D1627 base, #D7F64A accent, Space Grotesk headers, IBM Plex Mono for quotes/timestamps. No stack substitutions without asking.

FIXED CONTRACTS (already in repo — build to match, do not redefine; ask before changing):
- prisma/schema.prisma — full data model
- server/agents/schemas.ts — Zod + Anthropic tool schemas for all 4 agents + confidence thresholds
- server/lib/citation-validator.ts — validation gate every extraction must pass pre-write

RULE: never persist a decision/action_item/risk/disagreement whose exact_quote isn't verbatim in its source utterance. Reject silently-failing extractions rather than storing them.

Produce a task-list Artifact per phase before starting it. Pause for my review after Phase 1 and Phase 3.

PHASE 1 — Foundation
- Monorepo: client/, server/, shared/, adapters/
- `prisma migrate dev` against existing schema (don't redefine models)
- docker-compose: Postgres + Qdrant
- .github/workflows/ci.yml: typecheck, lint, unit tests
- architecture.md: ingest→parse→chunk→embed→index→extract→validate→store→serve

PHASE 2 — Ingestion
- POST /api/meetings/upload (multipart): Zoom JSON, Teams export, plain text
- Adapter registry pattern (adapters/zoom.ts, teams.ts, text.ts implementing shared Parser interface) — new formats never touch extraction/UI
- Utterance IDs: `meeting_id:utterance_id`
- Embed + index utterances into Qdrant with speaker/timestamp metadata
- Unit tests per adapter against /fixtures

PHASE 3 — Extraction Agents (highest-risk phase, do not parallelize)
- Use tools already defined in server/agents/schemas.ts (decisionExtractorTool, actionItemExtractorTool, riskExtractorTool, disagreementExtractorTool). Call Anthropic Messages API with `tools` set; read results ONLY from tool_use blocks, never regex-parsed text.
- Disagreement agent runs on utterance PAIRS — build pair-windowing in the orchestrator (same topic cluster, within N utterances)
- POST /api/meetings/:id/analyze: hybrid retrieve → run 4 agents → validateExtraction/validateDisagreement (citation-validator.ts) BEFORE every Prisma create, failed validation = skip write, not just log
- Map snake_case tool output → camelCase Prisma fields explicitly at the persistence boundary (exact_quote → exactQuote, etc.)

PHASE 4 — Frontend (can start in parallel against fixture data once Phase 1 lands)
- Signal Room landing page; drag-drop upload w/ live parse progress
- Dual-pane dashboard: transcript timeline (left) synced to intelligence cards (right, grouped by type)
- Click card → scroll/highlight source utterance
- Filter/sort: type, owner, priority, timestamp

PHASE 5 — Test & Harden
- Playwright e2e: upload→analyze→inspect
- Fixture: PRD appendix transcript (zoom_2026_08_07_001, Payment Bug Triage) — assert expected decisions/action_items/risks/disagreements
- CI green end to end

Use the browser tool to actually run + click through upload→analyze→inspect before calling a phase done — don't mark UI work complete from code inspection alone. After each phase, summarize what changed + what to review, not a full diff dump.
```

## Execution notes
- Parallelize Phase 2 + Phase 4 in separate Agent Manager workspaces once Phase 1 is committed. Keep Phase 3 sequential in your main workspace — both other phases integrate against its output.
- Spot-check extraction output against the PRD's fixture "Expected Output" block by eye each time you touch Phase 3 — a bug in the validator itself would hide the exact failure it exists to catch.
