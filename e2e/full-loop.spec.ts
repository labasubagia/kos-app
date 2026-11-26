import { test, expect } from "@playwright/test";
import {
  cleanupArtifacts,
  client,
  fillByLabel,
  hasCreds,
  login,
  selectOption,
  uniqueName,
} from "./harness";

test.skip(!hasCreds(), "E2E credentials not set");

test("full loop: check-in -> bill -> pay -> check-out", async ({ page }) => {
  const renter = uniqueName("R");
  const room = uniqueName("K");
  const rent = "500000";

  await login(page);

  // create renter
  await page.goto("/renters");
  await page.getByRole("button", { name: "Add renter" }).click();
  await fillByLabel(page, "Name", renter);
  await fillByLabel(page, "Phone", "081200000002");
  await page.locator("[data-slot=dialog-content] button", { hasText: /Create renter/ }).click();
  await expect(page.getByText(renter)).toBeVisible();

  // create room
  await page.goto("/rooms");
  await page.getByRole("button", { name: "Add room" }).click();
  await selectOption(page, "Building *", "Bangunan A");
  await fillByLabel(page, "Name", room);
  await fillByLabel(page, "Capacity", "2");
  await fillByLabel(page, "Monthly rent", rent);
  await page.locator("[data-slot=dialog-content] button", { hasText: "Create room" }).click();
  await expect(page.getByText(room)).toBeVisible();

  // check-in
  await page.goto("/contracts");
  await page.getByRole("button", { name: "Check-in" }).click();
  await selectOption(page, "Renter", renter);
  await selectOption(page, "Room", room);
  const start = new Date();
  await fillByLabel(page, "Start date", start.toISOString().slice(0, 10));
  const end = new Date();
  end.setDate(end.getDate() + 90);
  await fillByLabel(page, "End date", end.toISOString().slice(0, 10));
  await fillByLabel(page, "Monthly rent", rent);
  await fillByLabel(page, "Deposit", "200000");
  await page.locator("[data-slot=dialog-content] button", { hasText: "Check in" }).click();
  const contractRow = page.locator("tbody tr", { hasText: renter });
  await expect(contractRow.getByText("Active")).toBeVisible();

  // generate this month's bill
  await page.goto("/bills");
  await page.getByRole("button", { name: /Generate this month/ }).click();
  await expect(page.getByText(/Generated \d+ bill/)).toBeVisible();

  // record payment against the contract
  await page.goto("/payments");
  await page.getByRole("button", { name: "Record payment" }).click();
  await selectOption(page, "Contract", `${renter} — ${room}`);
  await fillByLabel(page, "Amount", rent);
  await page.locator("[data-slot=dialog-content] button", { hasText: "Record payment" }).click();
  await expect(page.getByText(renter)).toBeVisible();
  const payRow = page.locator("tbody tr", { hasText: renter });
  await expect(payRow.getByText(Number(rent).toLocaleString("id-ID"))).toBeVisible();

  // check-out
  await page.goto("/contracts");
  const row = page.locator("tbody tr", { hasText: renter });
  await row.getByRole("button", { name: "Check out" }).click();
  await page.locator("[data-slot=dialog-content] button", { hasText: /Check out/ }).click();
  await expect(page.getByText(/Checked out/)).toBeVisible();
  await expect(row.getByText("Closed")).toBeVisible();

  // cleanup created data via API
  const c = await client();
  await cleanupArtifacts(c, renter, room);
});
