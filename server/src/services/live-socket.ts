import { Server as HttpServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { prisma } from "../lib/prisma.js";
import { indexUtterancesInQdrant } from "../lib/qdrant.js";
import { validateExtraction } from "../../lib/citation-validator.js";
import {
  DECISION_MIN_CONFIDENCE,
  ACTION_ITEM_MIN_CONFIDENCE,
  RISK_MIN_CONFIDENCE,
} from "../../agents/schemas.js";
import {
  extractDecisionsForUtterance,
  extractActionItemsForUtterance,
  extractRisksForUtterance,
} from "../agents/extractor.js";

let wss: WebSocketServer | null = null;
const activeUtterancesMap = new Map<string, Array<{ utteranceId: string; text: string; speaker: string; timestamp: string }>>();

export function initLiveSocketServer(server: HttpServer) {
  wss = new WebSocketServer({ server, path: "/ws/live-meeting" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("[Live Socket] Client connected to real-time meeting stream");

    ws.on("message", async (rawMessage: string) => {
      try {
        const data = JSON.parse(rawMessage.toString());

        if (data.type === "START_LIVE_SESSION") {
          let meetingId = `live_${Date.now()}`;
          let meetingTitle = data.title || "Live Meeting Session";
          try {
            const user = await prisma.user.findFirst();
            const meeting = await prisma.meeting.create({
              data: {
                userId: user ? user.id : "demo_user",
                title: meetingTitle,
                date: new Date(),
                sourceFormat: "live-stream",
                transcriptUrl: "live://stream",
                rawText: "",
                status: "PROCESSING",
              },
            });
            meetingId = meeting.id;
            meetingTitle = meeting.title;
          } catch (err) {
            console.warn("[Live Socket] Database offline, running live session with in-memory persistence:", meetingId);
          }
          activeUtterancesMap.set(meetingId, []);

          ws.send(JSON.stringify({ type: "SESSION_STARTED", meetingId, title: meetingTitle }));
        }

        if (data.type === "LIVE_UTTERANCE") {
          const { meetingId, speaker, text, timestamp } = data;
          if (!meetingId || !text) return;

          const activeList = activeUtterancesMap.get(meetingId) || [];
          const index = activeList.length + 1;
          const utteranceId = `${meetingId}:utt_${index}`;

          const newUtt = { utteranceId, speaker: speaker || "Speaker", text: text.trim(), timestamp: timestamp || "00:00:00" };
          activeList.push(newUtt);
          activeUtterancesMap.set(meetingId, activeList);

          // 1. INSTANT BROADCAST (<5ms UI Latency)
          const liveUtterancePayload = {
            id: utteranceId,
            meetingId,
            utteranceId,
            speaker: newUtt.speaker,
            text: newUtt.text,
            timestamp: newUtt.timestamp,
            utteranceIndex: index,
            qdrantPointId: null,
          };

          broadcast({ type: "UTTERANCE_ADDED", meetingId, utterance: liveUtterancePayload });

          // 2. Async Non-blocking Persistence & AI Extractions in Background
          processBackgroundUtterance(meetingId, utteranceId, index, newUtt).catch((err) =>
            console.error("[Background Processing Error]", err)
          );
        }
      } catch (err) {
        console.error("[Live Socket Error]", err);
      }
    });
  });
}

async function processBackgroundUtterance(
  meetingId: string,
  utteranceId: string,
  index: number,
  newUtt: { utteranceId: string; speaker: string; text: string; timestamp: string }
) {
  // Store in Postgres & Qdrant
  try {
    const pointMap = await indexUtterancesInQdrant(meetingId, [{ ...newUtt, utteranceIndex: index }]);
    await prisma.utterance.create({
      data: {
        meetingId,
        utteranceId,
        speaker: newUtt.speaker,
        text: newUtt.text,
        timestamp: newUtt.timestamp,
        utteranceIndex: index,
        qdrantPointId: pointMap.get(utteranceId) || null,
      },
    });
  } catch (err) {}

  // Run AI Extraction Agents asynchronously
  // A. Decisions
  const decisions = await extractDecisionsForUtterance(newUtt.text, utteranceId, newUtt.speaker, newUtt.timestamp);
  for (const dec of decisions) {
    const val = validateExtraction({
      exactQuote: dec.exact_quote,
      sourceUtteranceText: newUtt.text,
      confidence: dec.confidence,
      minConfidence: DECISION_MIN_CONFIDENCE,
      requiredFields: { decision: dec.decision },
    });
    if (val.valid) {
      let saved: any = {
        id: `dec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        meetingId,
        sourceUtteranceId: dec.source_utterance_id,
        decision: dec.decision,
        speaker: dec.speaker,
        timestamp: dec.timestamp,
        exactQuote: dec.exact_quote,
        confidence: dec.confidence,
        context: dec.context || null,
      };
      try {
        saved = await prisma.decision.create({
          data: {
            meetingId,
            sourceUtteranceId: dec.source_utterance_id,
            decision: dec.decision,
            speaker: dec.speaker,
            timestamp: dec.timestamp,
            exactQuote: dec.exact_quote,
            confidence: dec.confidence,
            context: dec.context || null,
          },
        });
      } catch (e) {}
      broadcast({ type: "EXTRACTION_ADDED", meetingId, cardType: "DECISION", card: saved });
    }
  }

  // B. Action Items
  const actionItems = await extractActionItemsForUtterance(newUtt.text, utteranceId, newUtt.speaker, newUtt.timestamp);
  for (const act of actionItems) {
    const val = validateExtraction({
      exactQuote: act.exact_quote,
      sourceUtteranceText: newUtt.text,
      confidence: act.confidence,
      minConfidence: ACTION_ITEM_MIN_CONFIDENCE,
      requiredFields: { action: act.action, owner: act.owner },
    });
    if (val.valid) {
      let saved: any = {
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        meetingId,
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
      };
      try {
        saved = await prisma.actionItem.create({
          data: {
            meetingId,
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
          },
        });
      } catch (e) {}
      broadcast({ type: "EXTRACTION_ADDED", meetingId, cardType: "ACTION_ITEM", card: saved });
    }
  }

  // C. Risks
  const risks = await extractRisksForUtterance(newUtt.text, utteranceId, newUtt.speaker, newUtt.timestamp);
  for (const r of risks) {
    const val = validateExtraction({
      exactQuote: r.exact_quote,
      sourceUtteranceText: newUtt.text,
      confidence: r.confidence,
      minConfidence: RISK_MIN_CONFIDENCE,
      requiredFields: { risk: r.risk, riskType: r.risk_type },
    });
    if (val.valid) {
      let saved: any = {
        id: `risk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        meetingId,
        sourceUtteranceId: r.source_utterance_id,
        risk: r.risk,
        riskType: r.risk_type,
        speaker: r.speaker,
        timestamp: r.timestamp,
        exactQuote: r.exact_quote,
        confidence: r.confidence,
        severity: r.severity,
      };
      try {
        saved = await prisma.risk.create({
          data: {
            meetingId,
            sourceUtteranceId: r.source_utterance_id,
            risk: r.risk,
            riskType: r.risk_type,
            speaker: r.speaker,
            timestamp: r.timestamp,
            exactQuote: r.exact_quote,
            confidence: r.confidence,
            severity: r.severity,
          },
        });
      } catch (e) {}
      broadcast({ type: "EXTRACTION_ADDED", meetingId, cardType: "RISK", card: saved });
    }
  }
}

function broadcast(payload: any) {
  if (!wss) return;
  const jsonStr = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(jsonStr);
    }
  });
}
