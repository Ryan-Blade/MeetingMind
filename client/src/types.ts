export interface Utterance {
  id: string;
  utteranceId: string;
  speaker: string;
  text: string;
  timestamp: string;
  utteranceIndex: number;
}

export interface Decision {
  id: string;
  decision: string;
  speaker: string;
  timestamp: string;
  exactQuote: string;
  confidence: number;
  context?: string | null;
  sourceUtteranceId: string;
}

export interface ActionItem {
  id: string;
  action: string;
  owner: string;
  deadline?: string | null;
  speaker: string;
  timestamp: string;
  exactQuote: string;
  confidence: number;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  sourceUtteranceId: string;
}

export interface Risk {
  id: string;
  risk: string;
  riskType: "DOUBT" | "CONCERN" | "BLOCKER" | "DEPENDENCY";
  speaker: string;
  timestamp: string;
  exactQuote: string;
  confidence: number;
  severity: "HIGH" | "MEDIUM" | "LOW";
  sourceUtteranceId: string;
}

export interface Disagreement {
  id: string;
  topic: string;
  position1: string;
  speaker1: string;
  timestamp1: string;
  position2: string;
  speaker2: string;
  timestamp2: string;
  resolution?: string | null;
  confidence: number;
  sourceUtteranceId1: string;
  sourceUtteranceId2: string;
}

export interface MeetingData {
  id: string;
  title: string;
  date: string;
  durationSeconds?: number;
  attendees: string[];
  sourceFormat: string;
  status: string;
  utterances: Utterance[];
  decisions: Decision[];
  actionItems: ActionItem[];
  risks: Risk[];
  disagreements: Disagreement[];
}
