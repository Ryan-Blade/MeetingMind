// MeetingMind — extraction agent schemas.
// Zod = runtime validation + TS types (z.infer). Tool `input_schema` = passed
// to Anthropic Messages API so the model must use tool-use, not free text.
// If the model doesn't call the tool, treat it as "no extractions", never
// parse prose as a fallback.

import { z } from "zod";

// --- Decision ---
export const DecisionSchema = z.object({
  decision: z.string().min(1),
  exact_quote: z.string().min(1),
  speaker: z.string().min(1),
  timestamp: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  confidence: z.number().min(0).max(1),
  context: z.string().optional(),
  source_utterance_id: z.string().min(1),
});
export type DecisionExtraction = z.infer<typeof DecisionSchema>;
export const DECISION_MIN_CONFIDENCE = 0.75;

export const decisionExtractorTool = {
  name: "extract_decisions",
  description:
    "Extract explicit decisions made in this utterance. Only emit if explicitly stated — not a proposal/question. If none, call with empty decisions array.",
  input_schema: {
    type: "object",
    properties: {
      decisions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            decision: { type: "string" },
            exact_quote: { type: "string", description: "Verbatim substring from utterance text, no paraphrasing" },
            speaker: { type: "string" },
            timestamp: { type: "string", description: "HH:MM:SS" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            context: { type: "string" },
          },
          required: ["decision", "exact_quote", "speaker", "timestamp", "confidence"],
        },
      },
    },
    required: ["decisions"],
  },
} as const;

// --- Action Item ---
export const ActionItemSchema = z.object({
  action: z.string().min(1),
  owner: z.string().min(1),
  deadline: z.string().nullable(),
  exact_quote: z.string().min(1),
  speaker: z.string().min(1),
  timestamp: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  confidence: z.number().min(0).max(1),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  source_utterance_id: z.string().min(1),
});
export type ActionItemExtraction = z.infer<typeof ActionItemSchema>;
export const ACTION_ITEM_MIN_CONFIDENCE = 0.75;

export const actionItemExtractorTool = {
  name: "extract_action_items",
  description:
    "Extract action items/commitments: who owns it, by when. If owner can't be determined, omit the item — never guess.",
  input_schema: {
    type: "object",
    properties: {
      action_items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            action: { type: "string" },
            owner: { type: "string", description: "Never blank/'Unknown' — omit item instead" },
            deadline: { type: ["string", "null"] },
            exact_quote: { type: "string" },
            speaker: { type: "string" },
            timestamp: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            priority: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
          },
          required: ["action", "owner", "exact_quote", "speaker", "timestamp", "confidence", "priority"],
        },
      },
    },
    required: ["action_items"],
  },
} as const;

// --- Risk ---
export const RiskSchema = z.object({
  risk: z.string().min(1),
  risk_type: z.enum(["DOUBT", "CONCERN", "BLOCKER", "DEPENDENCY"]),
  exact_quote: z.string().min(1),
  speaker: z.string().min(1),
  timestamp: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  confidence: z.number().min(0).max(1),
  severity: z.enum(["HIGH", "MEDIUM", "LOW"]),
  source_utterance_id: z.string().min(1),
});
export type RiskExtraction = z.infer<typeof RiskSchema>;
export const RISK_MIN_CONFIDENCE = 0.70;

export const riskExtractorTool = {
  name: "extract_risks",
  description: "Extract risks/doubts/concerns/blockers actually expressed — never infer an unstated risk.",
  input_schema: {
    type: "object",
    properties: {
      risks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            risk: { type: "string" },
            risk_type: { type: "string", enum: ["DOUBT", "CONCERN", "BLOCKER", "DEPENDENCY"] },
            exact_quote: { type: "string" },
            speaker: { type: "string" },
            timestamp: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          },
          required: ["risk", "risk_type", "exact_quote", "speaker", "timestamp", "confidence", "severity"],
        },
      },
    },
    required: ["risks"],
  },
} as const;

// --- Disagreement --- operates on utterance PAIRS; orchestrator windows candidates.
export const DisagreementSchema = z.object({
  topic: z.string().min(1),
  position_1: z.string().min(1),
  speaker_1: z.string().min(1),
  timestamp_1: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  exact_quote_1: z.string().min(1),
  position_2: z.string().min(1),
  speaker_2: z.string().min(1),
  timestamp_2: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  exact_quote_2: z.string().min(1),
  resolution: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  source_utterance_id_1: z.string().min(1),
  source_utterance_id_2: z.string().min(1),
});
export type DisagreementExtraction = z.infer<typeof DisagreementSchema>;
export const DISAGREEMENT_MIN_CONFIDENCE = 0.75;

export const disagreementExtractorTool = {
  name: "extract_disagreement",
  description: "Given a pair of utterances, determine if they genuinely conflict. If not, call with found: false.",
  input_schema: {
    type: "object",
    properties: {
      found: { type: "boolean" },
      topic: { type: "string" },
      position_1: { type: "string" },
      exact_quote_1: { type: "string", description: "Verbatim substring from utterance 1" },
      position_2: { type: "string" },
      exact_quote_2: { type: "string", description: "Verbatim substring from utterance 2" },
      resolution: { type: ["string", "null"] },
      confidence: { type: "number", minimum: 0, maximum: 1 },
    },
    required: ["found", "confidence"],
  },
} as const;
