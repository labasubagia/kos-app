import { test, expect } from "@playwright/test";
import { cleanupArtifacts, client, hasCreds, login, uniqueName } from "./harness";
import {
	checkInContract,
	createBuilding,
	createLocation,
	createRenter,
	createRoom,
	generateBills,
	recordPayment,
} from "./helpers";

test.skip(!hasCreds(), "E2E credentials not set");

test("bills table exposes amount/paid/balance; new bill is unpaid with zero paid", async ({ page }) => {
	test.setTimeout(120_000);
	const location = uniqueName("Loc");
	const building = uniqueName("Bld");
	const room = uniqueName("Rm");
	const renter = uniqueName("Rnt");
	const rent = "800000";

	await login(page);
	await createLocation(page, location);
	await createBuilding(page, location, building);
	await createRoom(page, { building, name: room, rent });
	await createRenter(page, renter);
	await checkInContract(page, { renter, room, rent });
	await generateBills(page);

	const heads = page.locator("thead th");
	await expect(heads).toContainText(["Paid", "Balance"]);

	const billRow = page.locator("tbody tr", { hasText: renter });
	await expect(billRow.getByText("unpaid")).toBeVisible();
	const zero = (0).toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
	await expect(billRow.getByText(zero)).toBeVisible();
	await expect(billRow.getByText(Number(rent).toLocaleString("id-ID"))).toHaveCount(2); // Amount + Balance

	await cleanupArtifacts(await client(), renter, room);
});

test("unpaid bills sort above paid; list defaults to current month", async ({ page }) => {
	test.setTimeout(120_000);
	const location = uniqueName("Loc");
	const building = uniqueName("Bld");
	const roomA = uniqueName("RmA");
	const roomB = uniqueName("RmB");
	const renterA = uniqueName("RntA");
	const renterB = uniqueName("RntB");
	const rent = "800000";

	await login(page);
	await createLocation(page, location);
	await createBuilding(page, location, building);
	await createRoom(page, { building, name: roomA, rent });
	await createRoom(page, { building, name: roomB, rent });
	await createRenter(page, renterA);
	await createRenter(page, renterB);
	await checkInContract(page, { renter: renterA, room: roomA, rent });
	await checkInContract(page, { renter: renterB, room: roomB, rent });
	await generateBills(page);

	// list defaults to the current month
	const now = new Date();
	const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	await expect(page.locator('input[type="month"]')).toHaveValue(month);

	// pay renta fully → becomes paid; renterB stays unpaid
	await recordPayment(page, `${renterA} — ${roomA}`, rent);
	await expect(page.getByText("Payment recorded")).toBeVisible();

	// unpaid (renterB) must render above paid (renterA)
	await page.goto("/bills");
	const rows = page.locator("tbody tr");
	await expect(rows.nth(0)).toContainText(renterB);
	await expect(rows.nth(0).getByText("unpaid")).toBeVisible();
	await expect(rows.nth(1).getByText("paid")).toBeVisible();

	await cleanupArtifacts(await client(), renterA, roomA);
	await cleanupArtifacts(await client(), renterB, roomB);
});
