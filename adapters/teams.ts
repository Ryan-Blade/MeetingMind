import { ParserAdapter, ParsedTranscript, ParsedUtterance } from "../shared/index.js";

export const teamsAdapter: ParserAdapter = {
  format: "teams-export",

  canParse(content: string, filename?: string): boolean {
    if (filename && (filename.includes("teams") || filename.endsWith(".vtt"))) return true;
    if (content.includes("WEBVTT") || /\[\d{2}:\d{2}:\d{2}\]/i.test(content)) return true;
    return false;
  },

  async parse(meetingId: string, content: string): Promise<ParsedTranscript> {
    const lines = content.split(/\r?\n/);
    const utterances: ParsedUtterance[] = [];
    const attendeesSet = new Set<string>();
    let index = 1;

    // Pattern 1: [00:01:23] Speaker Name: Utterance text
    const patternTimestampFirst = /^\[(\d{2}:\d{2}:\d{2})\]\s*([^:]+):\s*(.+)$/;
    // Pattern 2: Speaker Name [00:01:23]: Utterance text
    const patternSpeakerFirst = /^([^\[]+)\s*\[(\d{2}:\d{2}:\d{2})\]:\s*(.+)$/;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("WEBVTT") || line.startsWith("NOTE")) continue;

      let match = line.match(patternTimestampFirst);
      if (match) {
        const [, timestamp, speaker, text] = match;
        attendeesSet.add(speaker.trim());
        utterances.push({
          utteranceId: `${meetingId}:utt_${index}`,
          speaker: speaker.trim(),
          text: text.trim(),
          timestamp,
          utteranceIndex: index++,
        });
        continue;
      }

      match = line.match(patternSpeakerFirst);
      if (match) {
        const [, speaker, timestamp, text] = match;
        attendeesSet.add(speaker.trim());
        utterances.push({
          utteranceId: `${meetingId}:utt_${index}`,
          speaker: speaker.trim(),
          text: text.trim(),
          timestamp,
          utteranceIndex: index++,
        });
        continue;
      }
    }

    return {
      title: "Teams Meeting Transcript",
      date: new Date().toISOString(),
      attendees: Array.from(attendeesSet),
      utterances,
      sourceFormat: "teams-export",
      rawText: content,
    };
  },
};
