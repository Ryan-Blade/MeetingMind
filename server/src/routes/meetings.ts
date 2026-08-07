import { Router, Request, Response } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma.js";
import { parserRegistry } from "@meetingmind/adapters";
import { indexUtterancesInQdrant } from "../lib/qdrant.js";

const upload = multer({ storage: multer.memoryStorage() });
export const meetingsRouter = Router();

async function getOrCreateDemoUser(): Promise<string> {
  const existing = await prisma.user.findFirst();
  if (existing) return existing.id;

  const newUser = await prisma.user.create({
    data: {
      email: "demo@meetingmind.ai",
      name: "Demo User",
    },
  });
  return newUser.id;
}

// POST /api/meetings/upload
meetingsRouter.post("/upload", upload.single("file"), async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const content = file.buffer.toString("utf-8");
    const adapter = parserRegistry.getAdapter(content, file.originalname);
    
    // Generate temporary ID to prefix utterances
    const tempMeetingId = `mtg_${Date.now()}`;
    const parsed = await adapter.parse(tempMeetingId, content);

    const userId = await getOrCreateDemoUser();

    // Create Meeting record in Postgres
    const meeting = await prisma.meeting.create({
      data: {
        userId,
        title: parsed.title || file.originalname.replace(/\.[^/.]+$/, ""),
        date: parsed.date ? new Date(parsed.date) : new Date(),
        durationSeconds: parsed.durationSeconds || null,
        attendees: parsed.attendees,
        sourceFormat: parsed.sourceFormat,
        transcriptUrl: `uploads/${file.originalname}`,
        rawText: content,
        status: "READY",
      },
    });

    // Re-bind utterance IDs with actual database meeting ID
    const formattedUtterances = parsed.utterances.map((u, i) => ({
      ...u,
      utteranceId: `${meeting.id}:utt_${i + 1}`,
      utteranceIndex: i + 1,
    }));

    // Index into Qdrant
    const pointIdMap = await indexUtterancesInQdrant(meeting.id, formattedUtterances);

    // Create Utterance records in Postgres
    await prisma.utterance.createMany({
      data: formattedUtterances.map((u) => ({
        meetingId: meeting.id,
        utteranceId: u.utteranceId,
        speaker: u.speaker,
        text: u.text,
        timestamp: u.timestamp,
        utteranceIndex: u.utteranceIndex,
        qdrantPointId: pointIdMap.get(u.utteranceId) || null,
      })),
    });

    const fullMeeting = await prisma.meeting.findUnique({
      where: { id: meeting.id },
      include: { utterances: { orderBy: { utteranceIndex: "asc" } } },
    });

    res.status(201).json({ success: true, meeting: fullMeeting });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to parse and ingest transcript", details: error instanceof Error ? error.message : error });
  }
});

// GET /api/meetings/:id
meetingsRouter.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        utterances: { orderBy: { utteranceIndex: "asc" } },
        decisions: true,
        actionItems: true,
        risks: true,
        disagreements: true,
      },
    });

    if (!meeting) {
      res.status(404).json({ error: "Meeting not found" });
      return;
    }

    res.json({ success: true, meeting });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch meeting", details: error instanceof Error ? error.message : error });
  }
});

// GET /api/meetings (List all meetings)
meetingsRouter.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const meetings = await prisma.meeting.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            utterances: true,
            decisions: true,
            actionItems: true,
            risks: true,
            disagreements: true,
          },
        },
      },
    });
    res.json({ success: true, meetings });
  } catch (error) {
    res.status(500).json({ error: "Failed to list meetings" });
  }
});
