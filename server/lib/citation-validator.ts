// MeetingMind — citation validator: the "zero hallucinations" gate.
// Every extraction MUST pass through here before it's persisted.
// A bug here silently breaks the product's core guarantee while tests still
// pass — spot-check output against the raw transcript by eye occasionally.

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

// Whitespace-only normalization — never fuzzy-match. "Verbatim" means verbatim.
function normalize(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

export function validateQuoteAgainstSource(
  exactQuote: string,
  sourceUtteranceText: string
): ValidationResult {
  if (!exactQuote || exactQuote.trim().length === 0) {
    return { valid: false, reason: "empty exact_quote" };
  }
  const quote = normalize(exactQuote);
  const source = normalize(sourceUtteranceText);
  if (!source.includes(quote)) {
    return { valid: false, reason: `quote not found verbatim in source (quote="${quote}")` };
  }
  return { valid: true };
}

export function validateConfidence(confidence: number, minConfidence: number): ValidationResult {
  if (confidence < minConfidence) {
    return { valid: false, reason: `confidence ${confidence} below threshold ${minConfidence}` };
  }
  return { valid: true };
}

// Combined gate for single-utterance extractors (Decision, ActionItem, Risk).
// Rejects — never truncates/fixes — on any failure; caller must skip the write.
export function validateExtraction(params: {
  exactQuote: string;
  sourceUtteranceText: string;
  confidence: number;
  minConfidence: number;
  requiredFields?: Record<string, unknown>;
}): ValidationResult {
  const { exactQuote, sourceUtteranceText, confidence, minConfidence, requiredFields } = params;

  if (requiredFields) {
    for (const [key, value] of Object.entries(requiredFields)) {
      if (value === undefined || value === null || value === "") {
        return { valid: false, reason: `required field "${key}" missing` };
      }
    }
  }
  const confidenceCheck = validateConfidence(confidence, minConfidence);
  if (!confidenceCheck.valid) return confidenceCheck;
  return validateQuoteAgainstSource(exactQuote, sourceUtteranceText);
}

// Disagreement variant: both quotes must independently validate.
// Rejects — never truncates/fixes — on any failure; caller must skip the write.
export function validateDisagreement(params: {
  exactQuote1: string;
  sourceUtteranceText1: string;
  exactQuote2: string;
  sourceUtteranceText2: string;
  confidence: number;
  minConfidence: number;
}): ValidationResult {
  const confidenceCheck = validateConfidence(params.confidence, params.minConfidence);
  if (!confidenceCheck.valid) return confidenceCheck;
  const q1 = validateQuoteAgainstSource(params.exactQuote1, params.sourceUtteranceText1);
  if (!q1.valid) return { valid: false, reason: `position_1: ${q1.reason}` };
  const q2 = validateQuoteAgainstSource(params.exactQuote2, params.sourceUtteranceText2);
  if (!q2.valid) return { valid: false, reason: `position_2: ${q2.reason}` };
  return { valid: true };
}
