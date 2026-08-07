import { describe, it, expect } from "vitest";
import {
  validateQuoteAgainstSource,
  validateConfidence,
  validateExtraction,
  validateDisagreement,
} from "./citation-validator.js";

describe("Citation Validator Gate", () => {
  const sampleUtterance = "We agreed to deploy the payment fix to production by 5 PM today.";

  it("validates exact verbatim quotes with whitespace normalization", () => {
    const result = validateQuoteAgainstSource(
      "deploy the payment fix to production",
      sampleUtterance
    );
    expect(result.valid).toBe(true);
  });

  it("rejects non-verbatim / hallucinated quotes", () => {
    const result = validateQuoteAgainstSource(
      "deploy the security patch to production",
      sampleUtterance
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("quote not found verbatim");
  });

  it("enforces minimum confidence threshold", () => {
    const pass = validateConfidence(0.85, 0.75);
    expect(pass.valid).toBe(true);

    const fail = validateConfidence(0.60, 0.75);
    expect(fail.valid).toBe(false);
    expect(fail.reason).toContain("below threshold");
  });

  it("validates single-utterance extraction gate end-to-end", () => {
    const validExtraction = validateExtraction({
      exactQuote: "deploy the payment fix to production by 5 PM today",
      sourceUtteranceText: sampleUtterance,
      confidence: 0.9,
      minConfidence: 0.75,
      requiredFields: { decision: "Deploy fix" },
    });
    expect(validExtraction.valid).toBe(true);
  });

  it("rejects extraction missing required fields", () => {
    const invalidExtraction = validateExtraction({
      exactQuote: "deploy the payment fix",
      sourceUtteranceText: sampleUtterance,
      confidence: 0.9,
      minConfidence: 0.75,
      requiredFields: { decision: "" },
    });
    expect(invalidExtraction.valid).toBe(false);
    expect(invalidExtraction.reason).toContain("required field \"decision\" missing");
  });

  it("validates disagreement with dual quote verification", () => {
    const utterance1 = "I think we should migrate the database immediately.";
    const utterance2 = "I strongly object to migrating without a full backup.";

    const validDisagreement = validateDisagreement({
      exactQuote1: "migrate the database immediately",
      sourceUtteranceText1: utterance1,
      exactQuote2: "object to migrating without a full backup",
      sourceUtteranceText2: utterance2,
      confidence: 0.88,
      minConfidence: 0.75,
    });
    expect(validDisagreement.valid).toBe(true);

    const invalidDisagreement = validateDisagreement({
      exactQuote1: "migrate the database immediately",
      sourceUtteranceText1: utterance1,
      exactQuote2: "object to migrating without testing", // hallucinated quote
      sourceUtteranceText2: utterance2,
      confidence: 0.88,
      minConfidence: 0.75,
    });
    expect(invalidDisagreement.valid).toBe(false);
    expect(invalidDisagreement.reason).toContain("position_2");
  });
});
