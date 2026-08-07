import { ParserAdapter, ParsedTranscript, ParsedUtterance } from "../shared/index.js";

export const zoomAdapter: ParserAdapter = {
  format: "zoom-json",

  canParse(content: string, filename?: string): boolean {
    if (filename && filename.endsWith(".json")) return true;
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return true;
      if (parsed && (parsed.transcript || parsed.utterances)) return true;
    } catch {
      return false;
    }
    return false;
  },

  async parse(meetingId: string, content: string): Promise<ParsedTranscript> {
    const rawObj = JSON.parse(content);
    const rawUtterances: Array<{ speaker?: string; name?: string; start_time?: string; timestamp?: string; text?: string; message?: string }> =
      Array.isArray(rawObj) ? rawObj : (rawObj.transcript || rawObj.utterances || []);

    const title = rawObj.title || "Zoom Meeting Transcript";
    const date = rawObj.date || new Date().toISOString();
    const durationSeconds = rawObj.duration_seconds || rawObj.durationSeconds;

    const attendeesSet = new Set<string>();
    const utterances: ParsedUtterance[] = [];

    rawUtterances.forEach((item, index) => {
      const speaker = (item.speaker || item.name || "Unknown Speaker").trim();
      const timestamp = (item.start_time || item.timestamp || "00:00:00").substring(0, 8);
      const text = (item.text || item.message || "").trim();

      if (speaker) attendeesSet.add(speaker);

      utterances.push({
        utteranceId: `${meetingId}:utt_${index + 1}`,
        speaker,
        text,
        timestamp,
        utteranceIndex: index + 1,
      });
    });

    return {
      title,
      date,
      durationSeconds,
      attendees: Array.from(attendeesSet),
      utterances,
      sourceFormat: "zoom-json",
      rawText: content,
    };
  },
};
