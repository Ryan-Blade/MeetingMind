import { describe, it, expect } from "vitest";
import { zoomAdapter } from "./zoom.js";
import { teamsAdapter } from "./teams.js";
import { textAdapter } from "./text.js";
import { parserRegistry } from "./registry.js";
import fs from "node:fs";
import path from "node:path";

describe("Parser Adapters Unit Tests", () => {
  const meetingId = "mtg_test_123";

  it("parses Zoom JSON transcript fixture correctly", async () => {
    const fixturePath = path.join(__dirname, "fixtures", "zoom_2026_08_07_001.json");
    const content = fs.readFileSync(fixturePath, "utf-8");

    expect(zoomAdapter.canParse(content, "zoom_2026_08_07_001.json")).toBe(true);

    const parsed = await zoomAdapter.parse(meetingId, content);
    expect(parsed.title).toBe("Payment Bug Triage");
    expect(parsed.sourceFormat).toBe("zoom-json");
    expect(parsed.attendees).toContain("Sarah Chen");
    expect(parsed.attendees).toContain("Alex Rivera");
    expect(parsed.attendees).toContain("Marcus Vance");
    expect(parsed.utterances.length).toBe(7);
    expect(parsed.utterances[0].utteranceId).toBe(`${meetingId}:utt_1`);
    expect(parsed.utterances[0].speaker).toBe("Sarah Chen");
  });

  it("parses Teams export format correctly", async () => {
    const teamsContent = `[00:01:10] Jane Doe: We need to update the Qdrant connection pool.
[00:01:25] Bob Smith: Agreed, I'll take care of that today.`;

    expect(teamsAdapter.canParse(teamsContent, "meeting_teams.txt")).toBe(true);

    const parsed = await teamsAdapter.parse(meetingId, teamsContent);
    expect(parsed.sourceFormat).toBe("teams-export");
    expect(parsed.attendees).toEqual(["Jane Doe", "Bob Smith"]);
    expect(parsed.utterances.length).toBe(2);
    expect(parsed.utterances[0].timestamp).toBe("00:01:10");
  });

  it("parses Plain text format correctly", async () => {
    const textContent = `Alice (00:02:00): Let's approve the architecture document.
Bob (00:02:15): Document approved.`;

    const adapter = parserRegistry.getAdapter(textContent, "notes.txt");
    expect(adapter.format).toBe("plain-text");

    const parsed = await adapter.parse(meetingId, textContent);
    expect(parsed.utterances.length).toBe(2);
    expect(parsed.utterances[0].speaker).toBe("Alice");
    expect(parsed.utterances[0].text).toBe("Let's approve the architecture document.");
  });
});
