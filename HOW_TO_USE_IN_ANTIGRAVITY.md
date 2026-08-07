# Using these files in Antigravity (condensed)

1. **Seed before you prompt.** Copy `prisma/schema.prisma`, `server/agents/schemas.ts`, `server/lib/citation-validator.ts` into those exact repo paths, commit them. The planning agent reads your workspace before drafting a task list — if the contracts already exist on disk, it plans around them instead of inventing its own (subtly different) versions.
2. **Reference by path, not by paste.** Once files are in-repo, say "use the tool in `server/agents/schemas.ts`" — don't re-paste contents; a pasted copy can drift from disk after edits.
3. **Review the Plan Artifact, not the code, first.** Confirm Phase 1 says "use existing schema.prisma" (not "define Prisma schema") and Phase 3 lists citation validation as its own task, not folded silently into "extraction."
4. **At Phase 3, check the wiring yourself:** the Anthropic call must pass `tools:[...]` and read `tool_use` blocks — not regex JSON out of free text — and `validateExtraction`/`validateDisagreement` must run *before* the Prisma `create`, with failed validation skipping the write entirely.
5. **Parallelize safely.** Open extra Agent Manager workspaces on the same repo for Phase 2 (ingestion) and Phase 4 (frontend, can build against fixtures) once Phase 1 is committed. Keep Phase 3 sequential in your main workspace.
6. **Before demo:** run the PRD's fixture transcript (`zoom_2026_08_07_001`) through the pipeline and diff the output against the PRD's "Expected Output" block by eye — do this every time you touch Phase 3, not just once.
