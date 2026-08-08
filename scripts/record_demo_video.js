import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

async function recordDemoVideo() {
  console.log("🎥 Starting Playwright Automated HD Video Recording of MeetingMind...");

  const outputDir = path.resolve(process.cwd(), "demo_recordings");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: false,
    slowMo: 200,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: outputDir,
      size: { width: 1280, height: 720 },
    },
  });

  const page = await context.newPage();

  console.log("Step 1: Navigating to MeetingMind Command Center (http://localhost:3000)");
  await page.goto("http://localhost:3000");
  await page.waitForTimeout(2000);

  console.log("Step 2: Demonstrating Drag & Drop Ingestion with Team Meeting Conflict Conversation");
  await page.click("button:has-text('Upload Transcript')");
  await page.waitForTimeout(1000);

  const fixturePath = path.resolve(process.cwd(), "adapters/fixtures/team_meeting_conflict_conversation.txt");
  const fileInput = page.locator("input[type='file']");
  await fileInput.setInputFiles(fixturePath);

  // Wait for upload modal to finish processing and close automatically
  await page.waitForTimeout(4000);

  console.log("Step 3: Demonstrating Zero-Hallucination Intelligence Cards Filters");
  const typeSelect = page.locator("select").first();
  await typeSelect.selectOption("DISAGREEMENTS");
  await page.waitForTimeout(2000);
  await typeSelect.selectOption("ALL");
  await page.waitForTimeout(1500);

  console.log("Step 4: Demonstrating Draggable & Minimizable Floating HUD Overlay");
  await page.click("button:has-text('Floating HUD')");
  await page.waitForTimeout(2000);

  const hudHeader = page.locator("text=Universal Meeting HUD");
  const box = await hudHeader.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x - 150, box.y + 80, { steps: 10 });
    await page.mouse.up();
  }
  await page.waitForTimeout(1500);

  await page.click("button[title='Minimize to Pill']");
  await page.waitForTimeout(2000);

  await page.click("button[title='Expand HUD']");
  await page.waitForTimeout(1500);

  await page.click("button[title='Close HUD']");
  await page.waitForTimeout(1500);

  console.log("Step 5: Demonstrating Real-Time Live Streaming (Voice ID + Screen OCR + Auto File Generator)");
  await page.click("button:has-text('Live Stream')");
  await page.waitForTimeout(2000);

  await page.click("button:has-text('Auto-Detect Call Stream')");
  await page.waitForTimeout(5000);

  console.log("Completing video recording...");
  await page.close();
  await context.close();
  await browser.close();

  const recordedFiles = fs.readdirSync(outputDir).filter((f) => f.endsWith(".webm"));
  if (recordedFiles.length > 0) {
    const srcPath = path.join(outputDir, recordedFiles[recordedFiles.length - 1]);
    const destPath = path.resolve(process.cwd(), "MeetingMind_Demo_Recording.webm");
    fs.copyFileSync(srcPath, destPath);
    console.log(`✅ Demo Screen Recording Video Successfully Saved To: ${destPath}`);
  }
}

recordDemoVideo().catch(console.error);
