export interface ParsedUtterance {
  utteranceId: string; // meeting_id:utterance_id
  speaker: string;
  text: string;
  timestamp: string; // HH:MM:SS
  utteranceIndex: number;
}

export interface ParsedTranscript {
  title?: string;
  date?: string;
  durationSeconds?: number;
  attendees: string[];
  utterances: ParsedUtterance[];
  sourceFormat: "zoom-json" | "teams-export" | "plain-text";
  rawText: string;
}

export interface ParserAdapter {
  format: "zoom-json" | "teams-export" | "plain-text";
  canParse(content: string, filename?: string): boolean;
  parse(meetingId: string, content: string): Promise<ParsedTranscript>;
}
