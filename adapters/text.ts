import { ParserAdapter, ParsedTranscript, ParsedUtterance } from "../shared/index.js";

export const textAdapter: ParserAdapter = {
  format: "plain-text",

  canParse(_content: string, _filename?: string): boolean {
    // Default fallback adapter for plain text files
    return true;
  },

  async parse(meetingId: string, content: string): Promise<ParsedTranscript> {
    const lines = content.split(/\r?\n/);
    const utterances: ParsedUtterance[] = [];
    const attendeesSet = new Set<string>();
    let index = 1;

    // Pattern 1: Speaker Name (00:01:23): Utterance text
    const patternParenTime = /^([^(]+)\s*\((\d{2}:\d{2}:\d{2})\):\s*(.+)$/;
    // Pattern 2: Speaker Name: Utterance text
    const patternSimple = /^([^:]+):\s*(.+)$/;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      let match = line.match(patternParenTime);
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

      match = line.match(patternSimple);
      if (match) {
        const [, speaker, text] = match;
        attendeesSet.add(speaker.trim());
        utterances.push({
          utteranceId: `${meetingId}:utt_${index}`,
          speaker: speaker.trim(),
          text: text.trim(),
          timestamp: "00:00:00",
          utteranceIndex: index++,
        });
        continue;
      }
    }

    return {
      title: "Plain Text Meeting Transcript",
      date: new Date().toISOString(),
      attendees: Array.from(attendeesSet),
      utterances,
      sourceFormat: "plain-text",
      rawText: content,
    };
  },
};
