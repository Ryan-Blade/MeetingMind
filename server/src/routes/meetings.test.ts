import { describe, it, expect, vi } from "vitest";

process.env.DATABASE_URL = "postgresql://mock:mock@localhost:5432/mock";

import request from "supertest";
import app from "../index.js";
import { prisma } from "../lib/prisma.js";

describe("Meetings Ingestion Route API", () => {
  it("uploads Zoom JSON transcript and returns ingested meeting payload", async () => {
    const zoomPayload = JSON.stringify({
      title: "Test Zoom Meeting",
      date: "2026-08-07T14:00:00Z",
      duration_seconds: 1800,
      transcript: [
        {
          speaker: "Alex Rivera",
          start_time: "00:00:10",
          text: "We decided to migrate our primary database to AWS Aurora PostgreSQL next month.",
        },
        {
          speaker: "Sarah Chen",
          start_time: "00:00:25",
          text: "Sarah Chen will complete the database schema migration scripts by Friday 5 PM.",
        },
      ],
    });

    vi.spyOn(prisma.user, "findFirst").mockResolvedValue({
      id: "user_demo_123",
      email: "demo@meetingmind.ai",
      name: "Demo User",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.spyOn(prisma.meeting, "create").mockResolvedValue({
      id: "mtg_mock_789",
      userId: "user_demo_123",
      title: "Test Zoom Meeting",
      date: new Date("2026-08-07T14:00:00Z"),
      durationSeconds: 1800,
      attendees: ["Alex Rivera", "Sarah Chen"],
      sourceFormat: "zoom_json",
      transcriptUrl: "uploads/meeting.json",
      rawText: zoomPayload,
      status: "READY",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.spyOn(prisma.meeting, "update").mockImplementation(async (args: any): Promise<any> => {
      return { id: args.where.id, status: args.data.status } as any;
    });

    (vi.spyOn(prisma, "$transaction") as any).mockResolvedValue([]);
    vi.spyOn(prisma.utterance, "createMany").mockResolvedValue({ count: 2 });
    vi.spyOn(prisma.decision, "deleteMany").mockResolvedValue({ count: 0 });
    vi.spyOn(prisma.actionItem, "deleteMany").mockResolvedValue({ count: 0 });
    vi.spyOn(prisma.risk, "deleteMany").mockResolvedValue({ count: 0 });
    vi.spyOn(prisma.disagreement, "deleteMany").mockResolvedValue({ count: 0 });
    vi.spyOn(prisma.decision, "createMany").mockResolvedValue({ count: 0 });
    vi.spyOn(prisma.actionItem, "createMany").mockResolvedValue({ count: 0 });
    vi.spyOn(prisma.risk, "createMany").mockResolvedValue({ count: 0 });
    vi.spyOn(prisma.disagreement, "createMany").mockResolvedValue({ count: 0 });

    vi.spyOn(prisma.meeting, "findUnique").mockResolvedValue({
      id: "mtg_mock_789",
      userId: "user_demo_123",
      title: "Test Zoom Meeting",
      date: new Date("2026-08-07T14:00:00Z"),
      durationSeconds: 1800,
      attendees: ["Alex Rivera", "Sarah Chen"],
      sourceFormat: "zoom_json",
      transcriptUrl: "uploads/meeting.json",
      rawText: zoomPayload,
      status: "ANALYZED",
      createdAt: new Date(),
      updatedAt: new Date(),
      utterances: [
        {
          id: "utt_1",
          meetingId: "mtg_mock_789",
          utteranceId: "mtg_mock_789:utt_1",
          speaker: "Alex Rivera",
          text: "We decided to migrate our primary database to AWS Aurora PostgreSQL next month.",
          timestamp: "00:00:10",
          utteranceIndex: 1,
          qdrantPointId: null,
          createdAt: new Date(),
        },
      ],
      decisions: [],
      actionItems: [],
      risks: [],
      disagreements: [],
    } as any);

    const res = await request(app)
      .post("/api/meetings/upload")
      .attach("file", Buffer.from(zoomPayload), "meeting.json");

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.meeting.title).toBe("Test Zoom Meeting");
  });

  it("returns 400 when no file attached", async () => {
    const res = await request(app).post("/api/meetings/upload");
    expect(res.status).toBe(400);
  });
});
