import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "../index.js";
import { prisma } from "../lib/prisma.js";

// Mock Prisma calls for route testing
vi.spyOn(prisma.user, "findFirst").mockResolvedValue({
  id: "user_demo_123",
  email: "demo@meetingmind.ai",
  name: "Demo User",
  createdAt: new Date(),
  updatedAt: new Date(),
} as any);

(vi.spyOn(prisma.meeting, "create") as any).mockImplementation(async (args: any) => {
  return {
    id: "mtg_mock_789",
    userId: args.data.userId,
    title: args.data.title,
    date: args.data.date,
    durationSeconds: args.data.durationSeconds,
    attendees: args.data.attendees,
    sourceFormat: args.data.sourceFormat,
    transcriptUrl: args.data.transcriptUrl,
    rawText: args.data.rawText,
    status: "READY",
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;
});

vi.spyOn(prisma.utterance, "createMany").mockResolvedValue({ count: 2 });
vi.spyOn(prisma.meeting, "findUnique").mockResolvedValue({
  id: "mtg_mock_789",
  userId: "user_demo_123",
  title: "Test Zoom Meeting",
  sourceFormat: "zoom-json",
  status: "READY",
  utterances: [
    { id: "u1", utteranceId: "mtg_mock_789:utt_1", speaker: "Alice", text: "Hello", timestamp: "00:00:00", utteranceIndex: 1 },
    { id: "u2", utteranceId: "mtg_mock_789:utt_2", speaker: "Bob", text: "Hi", timestamp: "00:00:05", utteranceIndex: 2 },
  ],
} as any);

describe("Meetings Ingestion Route API", () => {
  it("uploads Zoom JSON transcript and returns ingested meeting payload", async () => {
    const zoomPayload = JSON.stringify({
      title: "Test Zoom Meeting",
      transcript: [
        { speaker: "Alice", start_time: "00:00:00", text: "Hello" },
        { speaker: "Bob", start_time: "00:00:05", text: "Hi" },
      ],
    });

    const res = await request(app)
      .post("/api/meetings/upload")
      .attach("file", Buffer.from(zoomPayload), "meeting.json");

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.meeting.title).toBe("Test Zoom Meeting");
    expect(res.body.meeting.utterances.length).toBe(2);
    expect(res.body.meeting.utterances[0].utteranceId).toBe("mtg_mock_789:utt_1");
  });

  it("fetches ingested meeting by ID", async () => {
    const res = await request(app).get("/api/meetings/mtg_mock_789");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.meeting.id).toBe("mtg_mock_789");
  });
});
