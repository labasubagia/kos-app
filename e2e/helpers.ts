import { expect, type Locator, type Page } from "@playwright/test";
import { fillByLabel, selectOption } from "./harness";

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
	await page.getByRole("button", { name: /Generate this month/ }).click();
	await expect(page.getByText(/Generated \d+ bill/)).toBeVisible();
}

export async function recordPayment(page: Page, contractLabel: string, amount: string) {
	await page.goto("/payments");
	await page.getByRole("button", { name: "Record payment" }).click();
	await selectOption(page, "Contract", contractLabel);
	await fillByLabel(page, "Amount (IDR)", amount);
	await dialog(page).getByRole("button", { name: "Record payment" }).click();
}

export async function expectBillStatus(page: Page, renter: string, status: string) {
	await page.goto("/bills");
	const row = page.locator("tbody tr", { hasText: renter });
	await expect(row.getByText(status)).toBeVisible();
}
