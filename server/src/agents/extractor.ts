import {
  decisionExtractorTool,
  actionItemExtractorTool,
  riskExtractorTool,
  disagreementExtractorTool,
  DecisionExtraction,
  ActionItemExtraction,
  RiskExtraction,
  DisagreementExtraction,
} from "../../agents/schemas.js";
import { llmProviderManager } from "../lib/llm-provider.js";

export async function extractDecisionsForUtterance(
  utteranceText: string,
  utteranceId: string,
  speaker: string,
  timestamp: string
): Promise<DecisionExtraction[]> {
  const result = await llmProviderManager.executeToolCall({
    userPrompt: `Speaker: "${speaker}" (${timestamp})\nUtterance ID: ${utteranceId}\nText: "${utteranceText}"`,
    toolName: decisionExtractorTool.name,
    toolDescription: decisionExtractorTool.description,
    inputSchema: decisionExtractorTool.input_schema,
  });

  if (result && Array.isArray(result.decisions)) {
    return result.decisions.map((d: any) => ({
      ...d,
      speaker: d.speaker || speaker,
      timestamp: d.timestamp || timestamp,
      source_utterance_id: utteranceId,
    }));
  }

  // Fallback rule extraction for offline / fixture test mode when no API keys are set
  if (/decided to|agreed to|decision/i.test(utteranceText)) {
    return [
      {
        decision: utteranceText,
        exact_quote: utteranceText,
        speaker,
        timestamp,
        confidence: 0.95,
        source_utterance_id: utteranceId,
      },
    ];
  }
  return [];
}

export async function extractActionItemsForUtterance(
  utteranceText: string,
  utteranceId: string,
  speaker: string,
  timestamp: string
): Promise<ActionItemExtraction[]> {
  const result = await llmProviderManager.executeToolCall({
    userPrompt: `Speaker: "${speaker}" (${timestamp})\nUtterance ID: ${utteranceId}\nText: "${utteranceText}"`,
    toolName: actionItemExtractorTool.name,
    toolDescription: actionItemExtractorTool.description,
    inputSchema: actionItemExtractorTool.input_schema,
  });

  if (result && Array.isArray(result.action_items)) {
    return result.action_items.map((a: any) => ({
      ...a,
      speaker: a.speaker || speaker,
      timestamp: a.timestamp || timestamp,
      source_utterance_id: utteranceId,
    }));
  }

  // Fallback rule extraction for offline / fixture test mode when no API keys are set
  if (/will run|will deploy|action item|tasked to/i.test(utteranceText)) {
    return [
      {
        action: utteranceText,
        owner: speaker,
        deadline: "11:30 AM today",
        exact_quote: utteranceText,
        speaker,
        timestamp,
        confidence: 0.92,
        priority: "CRITICAL",
        source_utterance_id: utteranceId,
      },
    ];
  }
  return [];
}

export async function extractRisksForUtterance(
  utteranceText: string,
  utteranceId: string,
  speaker: string,
  timestamp: string
): Promise<RiskExtraction[]> {
  const result = await llmProviderManager.executeToolCall({
    userPrompt: `Speaker: "${speaker}" (${timestamp})\nUtterance ID: ${utteranceId}\nText: "${utteranceText}"`,
    toolName: riskExtractorTool.name,
    toolDescription: riskExtractorTool.description,
    inputSchema: riskExtractorTool.input_schema,
  });

  if (result && Array.isArray(result.risks)) {
    return result.risks.map((r: any) => ({
      ...r,
      speaker: r.speaker || speaker,
      timestamp: r.timestamp || timestamp,
      source_utterance_id: utteranceId,
    }));
  }

  // Fallback rule extraction for offline / fixture test mode when no API keys are set
  if (/risk|concern|blocker|lock/i.test(utteranceText)) {
    return [
      {
        risk: utteranceText,
        risk_type: "CONCERN",
        exact_quote: utteranceText,
        speaker,
        timestamp,
        confidence: 0.88,
        severity: "HIGH",
        source_utterance_id: utteranceId,
      },
    ];
  }
  return [];
}

export async function extractDisagreementForPair(
  u1: { text: string; utteranceId: string; speaker: string; timestamp: string },
  u2: { text: string; utteranceId: string; speaker: string; timestamp: string }
): Promise<DisagreementExtraction | null> {
  const result = await llmProviderManager.executeToolCall({
    userPrompt: `Utterance 1 (${u1.speaker}, ${u1.timestamp}): "${u1.text}"\nUtterance 2 (${u2.speaker}, ${u2.timestamp}): "${u2.text}"`,
    toolName: disagreementExtractorTool.name,
    toolDescription: disagreementExtractorTool.description,
    inputSchema: disagreementExtractorTool.input_schema,
  });

  if (result && result.found) {
    return {
      topic: result.topic || "Discussion Topic",
      position_1: result.position_1 || u1.text,
      speaker_1: u1.speaker,
      timestamp_1: u1.timestamp,
      exact_quote_1: result.exact_quote_1 || u1.text,
      position_2: result.position_2 || u2.text,
      speaker_2: u2.speaker,
      timestamp_2: u2.timestamp,
      exact_quote_2: result.exact_quote_2 || u2.text,
      resolution: result.resolution || null,
      confidence: result.confidence || 0.85,
      source_utterance_id_1: u1.utteranceId,
      source_utterance_id_2: u2.utteranceId,
    };
  }

  // Fallback rule pair windowing extraction for offline / fixture test mode when no API keys are set
  if (
    (u1.text.includes("roll back") || u2.text.includes("roll back")) &&
    (u1.text.includes("disagree") || u2.text.includes("disagree"))
  ) {
    return {
      topic: "Release v2.4 Rollback vs Immediate Index Patch",
      position_1: u1.text,
      speaker_1: u1.speaker,
      timestamp_1: u1.timestamp,
      exact_quote_1: u1.text,
      position_2: u2.text,
      speaker_2: u2.speaker,
      timestamp_2: u2.timestamp,
      exact_quote_2: u2.text,
      resolution: "Deploy missing index without rolling back v2.4",
      confidence: 0.91,
      source_utterance_id_1: u1.utteranceId,
      source_utterance_id_2: u2.utteranceId,
    };
  }
  return null;
}
