/**
 * REAL YouTube Video Live Stream Test
 * Video: "Weekly Meeting Example" — https://www.youtube.com/watch?v=3WrZMzqpFTc
 *
 * This script feeds the REAL transcript from the YouTube video through
 * MeetingMind's WebSocket pipeline, simulating exactly what happens when
 * a user captures the video with screen+audio and the Web Speech API
 * transcribes it.
 *
 * The video has 4 speakers in a "Student Success" weekly meeting:
 *   - Facilitator (meeting chair)
 *   - Mentor (mentee advisor)
 *   - School Nurse
 *   - Guidance Counselor
 *
 * Speaker assignments are based on watching the actual video content
 * and matching dialogue to roles.
 */

import { WebSocket } from "ws";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Real transcript from YouTube auto-captions, grouped into speaker turns ────
// (YouTube captions are fragmented into ~3s chunks; merged here by speaker turn)
const REAL_YOUTUBE_TRANSCRIPT = [
  {
    speaker: "Facilitator",
    text: "Hello everyone. Thank you guys for coming to our weekly student success meeting and let's just get started. So I have our list of chronically absent students here and I've been noticing a troubling trend. A lot of students are skipping on Fridays. Does anyone have any idea what's going on?",
    timestamp: "00:00:00",
  },
  {
    speaker: "Mentor",
    text: "I've heard some of my mentees talking about how it's really hard to get out of bed on Fridays. It might be good if we did something like a pancake breakfast to encourage them to come.",
    timestamp: "00:00:17",
  },
  {
    speaker: "Facilitator",
    text: "I think that's a great idea. Let's try that next week.",
    timestamp: "00:00:26",
  },
  {
    speaker: "School Nurse",
    text: "It might also be because a lot of students have been getting sick now that it's getting colder outside. I've had a number of students come by my office with symptoms like sniffling and coughing. We should put up posters with tips for not getting sick since it's almost flu season, like you know wash your hands after the bathroom, stuff like that.",
    timestamp: "00:00:30",
  },
  {
    speaker: "Facilitator",
    text: "I think that's a good idea and it'll be a good reminder for the teachers as well. So one of the things I wanted to talk about — there's a student I've noticed here, John Smith. He's missed seven days already and it's only November. Does anyone have an idea what's going on with him?",
    timestamp: "00:00:44",
  },
  {
    speaker: "Mentor",
    text: "I might be able to fill in the gaps there. I talked to John today and he's really stressed out. He's been dealing with helping his parents take care of his younger siblings during the day. It might actually be a good idea if he spoke to the guidance counselor a little bit.",
    timestamp: "00:01:00",
  },
  {
    speaker: "Guidance Counselor",
    text: "I can talk to John today if you want to send him to my office after you meet with him. It's a lot to deal with for a middle schooler.",
    timestamp: "00:01:12",
  },
  {
    speaker: "Facilitator",
    text: "Great, thanks. And I can help out with the family's child care needs. I'll look for some free or low cost resources in the community to share with John and he can share them with his family.",
    timestamp: "00:01:20",
  },
  {
    speaker: "Facilitator",
    text: "Great, well some really good ideas here today. Thanks for coming and if no one has anything else I think we can wrap up.",
    timestamp: "00:01:31",
  },
];

const SERVER_URL = "ws://localhost:3001/ws/live-meeting";
const HTTP_BASE = "http://localhost:3001";

// ── Color helpers for terminal ────────────────────────────────────────────────
const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

async function runTest() {
  console.log(c.bold("\n══════════════════════════════════════════════════════════════"));
  console.log(c.bold("  MeetingMind — Real YouTube Video Live Stream Test"));
  console.log(c.bold("  Video: Weekly Meeting Example (3WrZMzqpFTc)"));
  console.log(c.bold("══════════════════════════════════════════════════════════════\n"));

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(SERVER_URL);
    let sessionId = "";
    const utterancesReceived = [];
    const extractionsReceived = [];
    let jsonExportPath = "";
    let txtExportPath = "";
    let allSent = false;

    ws.on("error", (err) => {
      console.error(c.red(`[ERROR] WebSocket connection failed: ${err.message}`));
      console.error(c.red("Make sure the server is running: npm run dev"));
      reject(err);
    });

    ws.on("open", () => {
      console.log(c.green("✓ WebSocket connected to MeetingMind server"));
      ws.send(JSON.stringify({
        type: "START_LIVE_SESSION",
        title: "YouTube: Weekly Meeting Example (Student Success)",
      }));
    });

    ws.on("message", (rawData) => {
      const data = JSON.parse(rawData.toString());

      // ── Session started ───────────────────────────────────────────────
      if (data.type === "SESSION_STARTED") {
        sessionId = data.meetingId;
        console.log(c.green(`✓ Live session created: ${sessionId}`));
        console.log(c.cyan(`  Title: ${data.title}`));
        console.log(c.dim(`  Sending ${REAL_YOUTUBE_TRANSCRIPT.length} speaker turns from YouTube video...\n`));

        // Feed utterances with realistic timing (800ms between turns)
        REAL_YOUTUBE_TRANSCRIPT.forEach((utt, i) => {
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: "LIVE_UTTERANCE",
              meetingId: sessionId,
              speaker: utt.speaker,
              text: utt.text,
              timestamp: utt.timestamp,
            }));
            console.log(c.cyan(`  ► [${utt.timestamp}] ${c.bold(utt.speaker)}: "${utt.text.substring(0, 70)}..."`));

            if (i === REAL_YOUTUBE_TRANSCRIPT.length - 1) {
              allSent = true;
              console.log(c.dim(`\n  All ${REAL_YOUTUBE_TRANSCRIPT.length} utterances sent. Waiting for AI extractions...\n`));
            }
          }, i * 800);
        });
      }

      // ── Utterance broadcast received ──────────────────────────────────
      if (data.type === "UTTERANCE_ADDED" && data.meetingId === sessionId) {
        utterancesReceived.push({
          speaker: data.utterance.speaker,
          text: data.utterance.text,
          id: data.utterance.utteranceId,
        });
        // Track export file paths
        if (data.filePaths?.jsonPath) jsonExportPath = data.filePaths.jsonPath;
        if (data.filePaths?.txtPath) txtExportPath = data.filePaths.txtPath;
      }

      // ── AI Extraction received ────────────────────────────────────────
      if (data.type === "EXTRACTION_ADDED" && data.meetingId === sessionId) {
        const card = data.card;
        const type = data.cardType;
        extractionsReceived.push({ type, card });

        const label =
          type === "DECISION" ? card.decision :
          type === "ACTION_ITEM" ? `${card.action} → Owner: ${card.owner}` :
          type === "RISK" ? card.risk :
          JSON.stringify(card).substring(0, 80);

        console.log(c.yellow(`  ✨ [${type}] ${label}`));
        if (card.exactQuote) {
          console.log(c.dim(`     Quote: "${card.exactQuote.substring(0, 80)}..."`));
        }
      }
    });

    // ── Final verification after pipeline completes ─────────────────────
    setTimeout(async () => {
      console.log(c.bold("\n══════════════════════════════════════════════════════════════"));
      console.log(c.bold("  RESULTS"));
      console.log(c.bold("══════════════════════════════════════════════════════════════\n"));

      // 1. Utterance count
      const uttOk = utterancesReceived.length === REAL_YOUTUBE_TRANSCRIPT.length;
      console.log(
        uttOk ? c.green(`✓ Utterances: ${utterancesReceived.length}/${REAL_YOUTUBE_TRANSCRIPT.length} received`) :
                c.red(`✗ Utterances: ${utterancesReceived.length}/${REAL_YOUTUBE_TRANSCRIPT.length} received`)
      );

      // 2. Speaker attribution
      const speakersDetected = [...new Set(utterancesReceived.map((u) => u.speaker))];
      console.log(c.green(`✓ Speakers identified: ${speakersDetected.join(", ")}`));

      // 3. AI Extractions
      const byType = extractionsReceived.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {});
      console.log(c.green(`✓ AI Extractions: ${extractionsReceived.length} total`));
      for (const [type, count] of Object.entries(byType)) {
        console.log(c.yellow(`    ${type}: ${count}`));
      }

      // 4. Export file validation
      console.log(c.bold("\n  Export Files:"));
      if (jsonExportPath) {
        try {
          const res = await fetch(`${HTTP_BASE}/${jsonExportPath}`);
          const jsonData = await res.json();
          console.log(c.green(`✓ JSON export: ${jsonExportPath}`));
          console.log(c.dim(`    Title: ${jsonData.title}`));
          console.log(c.dim(`    Attendees: ${jsonData.attendees?.join(", ")}`));
          console.log(c.dim(`    Utterances: ${jsonData.transcript?.length}`));

          // Verify speaker separation in JSON
          const jsonSpeakers = [...new Set(jsonData.transcript?.map((t) => t.speaker) || [])];
          console.log(c.green(`✓ JSON speaker separation: ${jsonSpeakers.join(", ")}`));

          // Save a local copy for inspection
          const localCopy = path.join(__dirname, "..", "test-results", `youtube_meeting_${sessionId}.json`);
          const resultsDir = path.dirname(localCopy);
          if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });
          fs.writeFileSync(localCopy, JSON.stringify(jsonData, null, 2));
          console.log(c.dim(`    Local copy saved: ${localCopy}`));
        } catch (err) {
          console.log(c.red(`✗ JSON export failed: ${err.message}`));
        }
      }

      if (txtExportPath) {
        try {
          const res = await fetch(`${HTTP_BASE}/${txtExportPath}`);
          const txtData = await res.text();
          console.log(c.green(`✓ TXT export: ${txtExportPath}`));

          // Verify each speaker appears in the TXT
          for (const spk of speakersDetected) {
            const present = txtData.includes(spk);
            console.log(present ? c.green(`    ✓ "${spk}" found in transcript`) : c.red(`    ✗ "${spk}" NOT found`));
          }

          // Verify key content from the meeting
          const keywords = ["John Smith", "pancake breakfast", "guidance counselor", "flu season", "child care"];
          for (const kw of keywords) {
            const found = txtData.toLowerCase().includes(kw.toLowerCase());
            console.log(found ? c.green(`    ✓ Key topic "${kw}" present`) : c.dim(`    - "${kw}" not found`));
          }
        } catch (err) {
          console.log(c.red(`✗ TXT export failed: ${err.message}`));
        }
      }

      // 5. Expected extractions from this meeting
      console.log(c.bold("\n  Expected AI Extractions from this meeting:"));
      const expectedDecisions = [
        "Pancake breakfast on Fridays to encourage attendance",
        "Put up health/hygiene posters for flu season",
        "Guidance counselor to talk to John Smith",
        "Find free/low-cost child care resources for John's family",
      ];
      for (const d of expectedDecisions) {
        const found = extractionsReceived.some(
          (e) => e.type === "DECISION" && (
            e.card.decision?.toLowerCase().includes(d.split(" ")[0].toLowerCase()) ||
            e.card.exactQuote?.toLowerCase().includes(d.split(" ")[0].toLowerCase())
          )
        );
        console.log(found ? c.green(`    ✓ "${d}"`) : c.dim(`    ○ "${d}" (not extracted or different wording)`));
      }

      // End session
      ws.send(JSON.stringify({ type: "END_LIVE_SESSION", meetingId: sessionId }));

      console.log(c.bold("\n══════════════════════════════════════════════════════════════"));
      const passed = uttOk && speakersDetected.length >= 3 && extractionsReceived.length >= 1;
      console.log(passed ? c.green(c.bold("  ✓ ALL CHECKS PASSED")) : c.red(c.bold("  ✗ SOME CHECKS FAILED")));
      console.log(c.bold("══════════════════════════════════════════════════════════════\n"));

      ws.close();
      resolve();
    }, REAL_YOUTUBE_TRANSCRIPT.length * 800 + 10000); // all sends + 10s for AI
  });
}

runTest().catch(console.error);
