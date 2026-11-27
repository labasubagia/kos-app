import { expect, type Locator, type Page } from "@playwright/test";
import { fillByLabel, selectOption } from "./harness";
import { type SupabaseClient } from "@supabase/supabase-js";

const MONTHS = [
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December",
];

const dialog = (page: Page) => page.locator("[data-slot=dialog-content]");

export async function pickDate(page: Page, trigger: Locator, date: Date) {
	await trigger.click();
	const cal = page.locator("[data-slot=popover-content]");
	await expect(cal).toBeVisible();
	const label = `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
	await cal.getByRole("button", { name: new RegExp(label) }).click();
	await page.keyboard.press("Escape");
	await expect(cal).toBeHidden();
}
export async function createLocation(page: Page, name: string) {
	await page.goto("/locations");
	await page.getByRole("button", { name: "Add location" }).click();
	await dialog(page).locator("input[placeholder]").fill(name);
	await dialog(page).getByRole("button", { name: "Create" }).click();
	await expect(page.getByText(name)).toBeVisible();
}

export async function createBuilding(page: Page, locationName: string, name: string) {
	await page.goto("/buildings");
	await page.getByRole("button", { name: "Add building" }).click();
	await selectOption(page, "Location", locationName);
	await fillByLabel(page, "Name", name);
	await dialog(page).getByRole("button", { name: "Create" }).click();
	await expect(page.getByText(name)).toBeVisible();
}

export async function createRoom(
	page: Page,
	opts: { building: string; name: string; rent: string },
) {
	await page.goto("/rooms");
	await page.getByRole("button", { name: "Add room" }).click();
	await selectOption(page, "Building *", opts.building);
	await fillByLabel(page, "Name", opts.name);
	await fillByLabel(page, "Capacity", "1");
	await fillByLabel(page, "Monthly rent", opts.rent);
	await dialog(page).getByRole("button", { name: "Create room" }).click();
	await expect(page.getByText(opts.name)).toBeVisible();
}

export async function createRenter(page: Page, name: string) {
	await page.goto("/renters");
	await page.getByRole("button", { name: "Add renter" }).click();
	await fillByLabel(page, "Name", name);
	await fillByLabel(page, "Phone", "081200000001");
	await dialog(page).getByRole("button", { name: /Create renter/ }).click();
	await expect(page.getByText(name)).toBeVisible();
}

export async function checkInContract(
	page: Page,
	opts: { renter: string; room: string; rent: string },
) {
	await page.goto("/contracts");
	await expect(page.getByRole("button", { name: "Check-in" })).toBeVisible({ timeout: 30_000 });
	await page.getByRole("button", { name: "Check-in" }).click();
	await selectOption(page, "Renter", opts.renter);
	await selectOption(page, "Room", opts.room);
	await pickDate(
		page,
		dialog(page).getByRole("button", { name: /Select start date/ }),
		new Date(),
	);
	await fillByLabel(page, "Monthly rent", opts.rent);
	await dialog(page).getByRole("button", { name: "Check in" }).click();
	const row = page.locator("tbody tr", { hasText: opts.renter });
	await expect(row.getByText("Active")).toBeVisible();
}

export async function generateBills(page: Page) {
	await page.goto("/bills");
	// RPC is idempotent (unique contract_id+period); retry guards against a
	// pre-hydration click that fires no request (toast never appears).
	for (let attempt = 0; attempt < 3; attempt++) {
		await page.getByRole("button", { name: /Generate \d{4}-\d{2}/ }).click();
		try {
			await expect(page.getByText(/Generated \d+ bill/)).toBeVisible({ timeout: 10_000 });
			return;
		} catch {
			// no toast yet; retry
		}
	}
	await expect(page.getByText(/Generated \d+ bill/)).toBeVisible({ timeout: 15_000 });
}

export async function recordPayment(page: Page, contractLabel: string, amount: string) {
	await page.getByRole("button", { name: "Record payment" }).click();
	await selectOption(page, "Contract", contractLabel);
	await fillByLabel(page, "Amount (IDR)", amount);
	await dialog(page).getByRole("button", { name: "Record payment" }).click();
}

/** Open the bills month/year picker and select the given year+month. */
export async function pickPeriod(page: Page, y: number, m: number) {
	const month = String(m).padStart(2, "0");
	const period = `${y}-${month}`;
	await page.getByRole("button", { name: /^\d{4}-\d{2}$/ }).first().click();
	const content = page.locator("[data-slot=popover-content]");
	await expect(content).toBeVisible();
	for (let i = 0; i < 15; i++) {
		const shown = Number(await content.locator("span.text-sm.font-medium").textContent());
		if (shown === y) break;
		await content.getByRole("button", { name: shown < y ? "Next year" : "Previous year" }).click();
	}
	await content.getByRole("button", { name: month }).click();
	await expect(page.getByRole("button", { name: period, exact: true })).toBeVisible();
}

export async function expectBillStatus(page: Page, renter: string, status: string) {
	await page.goto("/bills");
	const row = page.locator("tbody tr", { hasText: renter });
	await expect(row.getByText(status)).toBeVisible();
}

/** Create location→building→room→renter→active contract directly via API. */
export async function seedFixtures(
	c: SupabaseClient,
	opts: { location: string; building: string; room: string; renter: string; rent: string; startDate?: string },
): Promise<{ renterId: string; roomId: string; contractId: string }> {
	const { data: member, error: me } = await c.from("memberships").select("tenant_id").limit(1).single();
	if (me || !member) throw new Error(`seed: cannot resolve tenant: ${me?.message ?? "no membership"}`);
	const tid = member.tenant_id;

	const { data: loc, error: le } = await c.from("locations").insert({ tenant_id: tid, name: opts.location }).select().single();
	if (le) throw new Error(`seed: location: ${le.message}`);
	const { data: bld, error: be } = await c.from("buildings").insert({ tenant_id: tid, location_id: loc.id, name: opts.building }).select().single();
	if (be) throw new Error(`seed: building: ${be.message}`);
	const { data: rm, error: re } = await c.from("rooms").insert({ tenant_id: tid, building_id: bld.id, name: opts.room, monthly_rent: Number(opts.rent) }).select().single();
	if (re) throw new Error(`seed: room: ${re.message}`);
	const { data: rnt, error: rne } = await c.from("renters").insert({ tenant_id: tid, name: opts.renter, phone: "081200000001" }).select().single();
	if (rne) throw new Error(`seed: renter: ${rne.message}`);
	const { data: contract, error: ce } = await c.from("contracts").insert({
		tenant_id: tid,
		renter_id: rnt.id,
		room_id: rm.id,
			start_date: opts.startDate ?? new Date().toISOString().slice(0, 10),
		monthly_rent: Number(opts.rent),
	}).select().single();
	if (ce) throw new Error(`seed: contract: ${ce.message}`);
	return { renterId: rnt.id, roomId: rm.id, contractId: contract.id };
}

/** Generate the current month's bills via RPC. */
export async function generateBillsApi(c: SupabaseClient): Promise<void> {
	const period = new Date().toISOString().slice(0, 7);
	const { error } = await c.rpc("generate_bills", { p_period: period, p_contract_id: null });
	if (error) throw new Error(`generate_bills: ${error.message}`);
}
