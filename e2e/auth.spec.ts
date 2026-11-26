import { test, expect } from "@playwright/test";
import { hasCreds, login } from "./harness";

test.skip(!hasCreds(), "E2E credentials not set (E2E_EMAIL/E2E_PASS)");

test("owner signs in and sees dashboard", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByText("Owner Workspace")).toBeVisible();
});
