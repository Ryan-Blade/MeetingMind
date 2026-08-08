import { describe, it, expect, vi } from "vitest";

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://mock:mock@localhost:5432/mock";

import request from "supertest";
import app from "../index.js";
import { prisma } from "../lib/prisma.js";
import { validateExtraction, validateDisagreement } from "../../lib/citation-validator.js";

// Mock Prisma for analysis tests
const mockMeeting = {
  id: "mtg_zoom_2026_08_07_001",
  title: "Payment Bug Triage",
  date: new Date(),
  sourceFormat: "zoom-json",
  status: "READY",
  utterances: [
    { id: "u1", utteranceId: "mtg_zoom_2026_08_07_001:utt_1", speaker: "Sarah Chen", text: "Thanks everyone for joining emergency triage.", timestamp: "00:00:05", utteranceIndex: 1 },
    { id: "u2", utteranceId: "mtg_zoom_2026_08_07_001:utt_2", speaker: "Alex Rivera", text: "We decided to deploy the missing database index migration to production immediately instead of rolling back.", timestamp: "00:01:05", utteranceIndex: 2 },
    { id: "u3", utteranceId: "mtg_zoom_2026_08_07_001:utt_3", speaker: "Marcus Vance", text: "Marcus Vance will run the database index migration script by 11:30 AM today.", timestamp: "00:01:25", utteranceIndex: 3 },
    { id: "u4", utteranceId: "mtg_zoom_2026_08_07_001:utt_4", speaker: "Sarah Chen", text: "There is a risk that running concurrent index creation on the active primary DB could cause brief locks.", timestamp: "00:01:45", utteranceIndex: 4 },
  ],
};

vi.spyOn(prisma.meeting, "findUnique").mockResolvedValue(mockMeeting as any);
vi.spyOn(prisma.meeting, "update").mockResolvedValue(mockMeeting as any);
(vi.spyOn(prisma, "$transaction") as any).mockResolvedValue([]);

describe("Phase 3 Analysis Orchestrator & Citation Gate", () => {
  it("runs analysis pipeline and passes valid extractions through citation validator gate", async () => {
    const res = await request(app).post("/api/meetings/mtg_zoom_2026_08_07_001/analyze");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("verifies citation validator rejects hallucinated quotes pre-write", () => {
    const invalidQuote = "We decided to shutdown all servers";
    const sourceText = mockMeeting.utterances[1].text;

    const validationResult = validateExtraction({
      exactQuote: invalidQuote,
      sourceUtteranceText: sourceText,
      confidence: 0.95,
      minConfidence: 0.75,
    });

    expect(validationResult.valid).toBe(false);
    expect(validationResult.reason).toContain("quote not found verbatim");
  });

  it("verifies citation validator validates exact quotes successfully", () => {
    const exactQuote = "deploy the missing database index migration to production immediately";
    const sourceText = mockMeeting.utterances[1].text;

    const validationResult = validateExtraction({
      exactQuote,
      sourceUtteranceText: sourceText,
      confidence: 0.95,
      minConfidence: 0.75,
    });

    expect(validationResult.valid).toBe(true);
  });
});
