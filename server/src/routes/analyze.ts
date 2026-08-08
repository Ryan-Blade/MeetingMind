import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import {
  validateExtraction,
  validateDisagreement,
} from "../../lib/citation-validator.js";
import {
  DECISION_MIN_CONFIDENCE,
  ACTION_ITEM_MIN_CONFIDENCE,
  RISK_MIN_CONFIDENCE,
  DISAGREEMENT_MIN_CONFIDENCE,
} from "../../agents/schemas.js";
import {
  extractDecisionsForUtterance,
  extractActionItemsForUtterance,
  extractRisksForUtterance,
  extractDisagreementForPair,
} from "../agents/extractor.js";

export const analyzeRouter = Router();

export async function runMeetingAnalysis(meetingId: string) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { utterances: { orderBy: { utteranceIndex: "asc" } } },
  });

  if (!meeting) {
    throw new Error("Meeting not found");
  }

  await prisma.meeting.update({
    where: { id: meeting.id },
    data: { status: "ANALYZING" },
  });

  const utterances = meeting.utterances;
  const decisionsToCreate = [];
  const actionItemsToCreate = [];
  const risksToCreate = [];
  const disagreementsToCreate = [];

  // Single-utterance extraction passes (Decisions, Action Items, Risks)
  for (const utt of utterances) {
    // 1. Decisions
    const decisions = await extractDecisionsForUtterance(utt.text, utt.utteranceId, utt.speaker, utt.timestamp);
    for (const dec of decisions) {
      const val = validateExtraction({
        exactQuote: dec.exact_quote,
        sourceUtteranceText: utt.text,
        confidence: dec.confidence,
        minConfidence: DECISION_MIN_CONFIDENCE,
        requiredFields: { decision: dec.decision },
      });

      if (val.valid) {
        decisionsToCreate.push({
          meetingId: meeting.id,
          sourceUtteranceId: dec.source_utterance_id,
          decision: dec.decision,
          speaker: dec.speaker,
          timestamp: dec.timestamp,
          exactQuote: dec.exact_quote,
          confidence: dec.confidence,
          context: dec.context || null,
        });
      } else {
        console.warn(`[VALIDATOR REJECTED DECISION] ${val.reason}`);
      }
    }

    // 2. Action Items
    const actionItems = await extractActionItemsForUtterance(utt.text, utt.utteranceId, utt.speaker, utt.timestamp);
    for (const act of actionItems) {
      const val = validateExtraction({
        exactQuote: act.exact_quote,
        sourceUtteranceText: utt.text,
        confidence: act.confidence,
        minConfidence: ACTION_ITEM_MIN_CONFIDENCE,
        requiredFields: { action: act.action, owner: act.owner },
      });

      if (val.valid) {
        actionItemsToCreate.push({
          meetingId: meeting.id,
          sourceUtteranceId: act.source_utterance_id,
          action: act.action,
          owner: act.owner,
          deadline: act.deadline || null,
          speaker: act.speaker,
          timestamp: act.timestamp,
          exactQuote: act.exact_quote,
          confidence: act.confidence,
          priority: act.priority,
          status: "PENDING",
        });
      } else {
        console.warn(`[VALIDATOR REJECTED ACTION ITEM] ${val.reason}`);
      }
    }

    // 3. Risks
    const risks = await extractRisksForUtterance(utt.text, utt.utteranceId, utt.speaker, utt.timestamp);
    for (const r of risks) {
      const val = validateExtraction({
        exactQuote: r.exact_quote,
        sourceUtteranceText: utt.text,
        confidence: r.confidence,
        minConfidence: RISK_MIN_CONFIDENCE,
        requiredFields: { risk: r.risk, riskType: r.risk_type },
      });

      if (val.valid) {
        risksToCreate.push({
          meetingId: meeting.id,
          sourceUtteranceId: r.source_utterance_id,
          risk: r.risk,
          riskType: r.risk_type,
          speaker: r.speaker,
          timestamp: r.timestamp,
          exactQuote: r.exact_quote,
          confidence: r.confidence,
          severity: r.severity,
        });
      } else {
        console.warn(`[VALIDATOR REJECTED RISK] ${val.reason}`);
      }
    }
  }

  // Pair-windowing pass for Disagreements (Window N=3)
  const WINDOW_SIZE = 3;
  for (let i = 0; i < utterances.length; i++) {
    for (let j = i + 1; j < Math.min(i + 1 + WINDOW_SIZE, utterances.length); j++) {
      const u1 = utterances[i];
      const u2 = utterances[j];
      if (u1.speaker === u2.speaker) continue; // Must be between different speakers

      const disagreement = await extractDisagreementForPair(u1, u2);
      if (disagreement) {
        const val = validateDisagreement({
          exactQuote1: disagreement.exact_quote_1,
          sourceUtteranceText1: u1.text,
          exactQuote2: disagreement.exact_quote_2,
          sourceUtteranceText2: u2.text,
          confidence: disagreement.confidence,
          minConfidence: DISAGREEMENT_MIN_CONFIDENCE,
        });

        if (val.valid) {
          disagreementsToCreate.push({
            meetingId: meeting.id,
            sourceUtteranceId1: u1.utteranceId,
            sourceUtteranceId2: u2.utteranceId,
            topic: disagreement.topic,
            position1: disagreement.position_1,
            speaker1: disagreement.speaker_1,
            timestamp1: disagreement.timestamp_1,
            position2: disagreement.position_2,
            speaker2: disagreement.speaker_2,
            timestamp2: disagreement.timestamp_2,
            resolution: disagreement.resolution || null,
            confidence: disagreement.confidence,
          });
        } else {
          console.warn(`[VALIDATOR REJECTED DISAGREEMENT] ${val.reason}`);
        }
      }
    }
  }

  // Persist validated records in Postgres
  await prisma.$transaction([
    prisma.decision.deleteMany({ where: { meetingId: meeting.id } }),
    prisma.actionItem.deleteMany({ where: { meetingId: meeting.id } }),
    prisma.risk.deleteMany({ where: { meetingId: meeting.id } }),
    prisma.disagreement.deleteMany({ where: { meetingId: meeting.id } }),

    ...(decisionsToCreate.length > 0 ? [prisma.decision.createMany({ data: decisionsToCreate })] : []),
    ...(actionItemsToCreate.length > 0 ? [prisma.actionItem.createMany({ data: actionItemsToCreate })] : []),
    ...(risksToCreate.length > 0 ? [prisma.risk.createMany({ data: risksToCreate })] : []),
    ...(disagreementsToCreate.length > 0 ? [prisma.disagreement.createMany({ data: disagreementsToCreate })] : []),

    prisma.meeting.update({
      where: { id: meeting.id },
      data: { status: "ANALYZED" },
    }),
  ]);

  return await prisma.meeting.findUnique({
    where: { id: meeting.id },
    include: {
      utterances: { orderBy: { utteranceIndex: "asc" } },
      decisions: true,
      actionItems: true,
      risks: true,
      disagreements: true,
    },
  });
}

// POST /api/meetings/:id/analyze
analyzeRouter.post("/:id/analyze", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const updatedMeeting = await runMeetingAnalysis(id);
    res.json({ success: true, meeting: updatedMeeting });
  } catch (error) {
    console.error("Analysis failed:", error);
    res.status(500).json({ error: "Failed to analyze meeting", details: error instanceof Error ? error.message : error });
  }
});
