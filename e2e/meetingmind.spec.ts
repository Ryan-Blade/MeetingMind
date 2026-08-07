import { test, expect } from "@playwright/test";

test.describe("MeetingMind Signal Room E2E Flow", () => {
  test("loads landing page and renders Payment Bug Triage fixture timeline & intelligence cards", async ({ page }) => {
    // Navigate to frontend app
    await page.goto("http://localhost:3000/");

    // Check title and Signal Room branding
    await expect(page.locator("h1")).toContainText("MeetingMind");
    await expect(page.locator("h2")).toContainText("Payment Bug Triage");

    // Verify timeline turn elements exist
    const timelineItems = page.locator("div", { hasText: "Sarah Chen" });
    await expect(timelineItems.first()).toBeVisible();

    // Verify intelligence cards (Decisions, Action Items, Risks, Disagreements)
    await expect(page.locator("text=DECISION")).toBeVisible();
    await expect(page.locator("text=ACTION ITEM")).toBeVisible();
    await expect(page.locator("text=RISK")).toBeVisible();
    await expect(page.locator("text=DISAGREEMENT")).toBeVisible();

    // Click an Intelligence Card and verify source quote selection
    await page.click("text=Run database index migration script");
    const sourceQuote = page.locator("text=Marcus Vance will run the database index migration script");
    await expect(sourceQuote).toBeVisible();
  });
});
