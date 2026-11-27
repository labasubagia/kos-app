import { test, expect } from "@playwright/test";
import { ensureCreds, login } from "./support/harness";

ensureCreds();

test("owner signs in and sees dashboard", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByText("Owner Workspace")).toBeVisible();
});
