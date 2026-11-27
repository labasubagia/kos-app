import { test, type Locator, type Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { E2E_EMAIL, E2E_PASS, hasCreds } from "../tests/support/db";

/**
 * Skip locally when credentials are absent, but fail loudly in CI so a PR
 * never goes green on silently-skipped coverage.
 */
export function ensureCreds(): void {
	if (hasCreds()) return;
	if (process.env.CI) throw new Error("E2E credentials not set (E2E_EMAIL/E2E_PASS)");
	test.skip(true, "E2E credentials not set");
}

/**
 * Svelte $state bindings update on real keystrokes; locator.fill()/evaluate
 * setters do not reliably trigger them. Use native typing.
 */
async function typeInto(locator: Locator, value: string): Promise<void> {
  await locator.click();
  await locator.pressSequentially(value);
}

/**
 * Resolve the control for a form field: prefer the label's `for` id; when the
 * label has none (e.g. check-in dialog), search the label's nearest container
 * for the input or select trigger.
 */
async function fieldControl(page: Page, text: string): Promise<Locator> {
  const label = page.locator("[data-slot=dialog-content] label", { hasText: text }).first();
  const id = await label.getAttribute("for");
  if (id) return page.locator(`#${id}`);
  return label
    .locator("xpath=ancestor::div[1]")
    .locator('input, [data-slot="select-trigger"]')
    .first();
}

export async function login(page: Page): Promise<void> {
  // Warm up the network path so the first Supabase call doesn't trip
  // Chromium's transient ERR_NETWORK_CHANGED.
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.goto("/login");
    try {
      await page.evaluate(() =>
        fetch("https://kezznnslybhygpwqxlhg.supabase.co/auth/v1/health").catch(() => {}),
      );
    } catch {
      /* ignore */
    }
    await typeInto(page.locator('input[type="email"]'), E2E_EMAIL);
    await typeInto(page.locator('input[type="password"]'), E2E_PASS);
    await page.getByRole("button", { name: "Sign in" }).click();
    try {
      await page.waitForURL(/dashboard|create-tenant/, { timeout: 20000 });
      return;
    } catch {
      /* transient network; retry */
    }
  }
  throw new Error("login: could not authenticate after 5 attempts");
}

export async function fillByLabel(page: Page, text: string, value: string): Promise<void> {
  await (await fieldControl(page, text)).fill(value);
}

export async function selectOption(page: Page, labelText: string, optionText: string): Promise<void> {
  const control = await fieldControl(page, labelText);
  await control.click();
  await page.locator("[role=option]", { hasText: optionText }).first().click();
}

export function uniqueName(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

/**
 * Best-effort cleanup of artifacts created during the full loop.
 * Order matters: payments -> bills -> contracts -> rooms -> renters.
 */
export async function cleanupArtifacts(
  c: SupabaseClient,
  renterName: string,
  roomName: string,
): Promise<void> {
  const { data: renters } = await c.from("renters").select("id").eq("name", renterName);
  if (!renters?.length) return;
  const renterIds = renters.map((r) => r.id);

  const { data: contracts } = await c.from("contracts").select("id").in("renter_id", renterIds);
  const contractIds = (contracts ?? []).map((x) => x.id);

  if (contractIds.length) {
    const { data: bills } = await c.from("bills").select("id").in("contract_id", contractIds);
    const billIds = (bills ?? []).map((x) => x.id);
    if (billIds.length) await c.from("payments").delete().in("bill_id", billIds);
    await c.from("bills").delete().in("contract_id", contractIds);
    await c.from("contracts").delete().in("id", contractIds);
  }

  const { data: rooms } = await c.from("rooms").select("id").eq("name", roomName);
  if (rooms?.length) await c.from("rooms").delete().in("id", rooms.map((x) => x.id));

  await c.from("renters").delete().in("id", renterIds);
}
