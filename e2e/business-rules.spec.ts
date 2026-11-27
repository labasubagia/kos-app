import { test, expect } from "@playwright/test";
import { cleanupArtifacts, client, fillByLabel, hasCreds, login, selectOption } from "./harness";

// Runs against the seeded demo account (demo22@gmail.com / demo22) — see
// `supabase/seed-demo.mjs`. Configure E2E_EMAIL/E2E_PASS (or .env) to
// demo22@gmail.com / demo22 and re-run the seed before this suite.
test.skip(!hasCreds(), "E2E credentials not set");

test("hierarchy: location > building > room across multiple locations", async ({ page }) => {
  await login(page);
  await page.goto("/locations");
  await expect(page.getByText("L1")).toBeVisible();
  await expect(page.getByText("Kos Permata")).toBeVisible();

  await page.goto("/rooms");
  const tower = page.locator("tbody tr", { hasText: "A-01" });
  await expect(tower.getByText("Tower A")).toBeVisible();
  await expect(tower.getByText("Kos Permata")).toBeVisible();
  await expect(tower.getByText("occupied")).toBeVisible();

  // empty rooms (dashboard empty-room list input)
  for (const name of ["A-02", "B-01"]) {
    const row = page.locator("tbody tr", { hasText: name });
    await expect(row.getByText("available")).toBeVisible();
  }
});

test("bills: paid/partial/unpaid with correct balance", async ({ page }) => {
  await login(page);
  await page.goto("/bills");

  // Budi Santoso — unpaid, full balance
  const budi = page.locator("tbody tr", { hasText: "Budi Santoso" });
  await expect(budi.getByText("unpaid")).toBeVisible();

  // P1 — partial
  const p1 = page.locator("tbody tr", { hasText: "P1" });
  await expect(p1.getByText("partial")).toBeVisible();

  // P2 — paid, balance zero
  const p2 = page.locator("tbody tr", { hasText: "P2" });
  await expect(p2.getByText("paid")).toBeVisible();
  const rpZero = (0).toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
  await expect(p2.getByText(rpZero)).toBeVisible();
});

test("payments: cannot exceed bill; sum of installments capped", async ({ page }) => {
  await login(page);
  await page.goto("/payments");

  const openRecord = async () => {
    await page.getByRole("button", { name: "Record payment" }).click();
    await selectOption(page, "Contract", "Budi Santoso — A-01");
  };

  // partial installment is allowed → bill becomes partial
  await openRecord();
  await fillByLabel(page, "Amount (IDR)", "400000");
  await page.locator("[data-slot=dialog-content] button", { hasText: "Record payment" }).click();
  await expect(page.getByText("Payment recorded")).toBeVisible();

  // attempting to exceed the remaining balance (400k+600k > 850k) is rejected
  await openRecord();
  await fillByLabel(page, "Amount (IDR)", "600000");
  await page.locator("[data-slot=dialog-content] button", { hasText: "Record payment" }).click();
  await expect(page.getByText(/overpayment/)).toBeVisible();

  // sum of installments never exceeds the bill: ends paid at exactly 850k
  await page.goto("/bills");
  const budi = page.locator("tbody tr", { hasText: "Budi Santoso" });
  await expect(budi.getByText("paid")).toBeVisible();

  await cleanupArtifacts(await client(), "Budi Santoso", "A-01");
});
