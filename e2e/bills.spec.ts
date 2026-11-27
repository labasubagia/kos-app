import { test, expect } from "@playwright/test";
import { cleanupArtifacts, client, hasCreds, login, uniqueName } from "./harness";
import { generateBills, generateBillsApi, recordPayment, seedFixtures } from "./helpers";
const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

test.skip(!hasCreds(), "E2E credentials not set");

test("bills table exposes amount/paid/balance; new bill is unpaid with zero paid", async ({ page }) => {
	test.setTimeout(120_000);
	const room = uniqueName("Rm");
	const renter = uniqueName("Rnt");
	const rent = "800000";

	await login(page);
	await seedFixtures(await client(), {
		location: uniqueName("Loc"),
		building: uniqueName("Bld"),
		room,
		renter,
		rent,
	});
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
	const roomA = uniqueName("RmA");
	const roomB = uniqueName("RmB");
	const renterA = uniqueName("RntA");
	const renterB = uniqueName("RntB");
	const rent = "800000";

	const c = await client();
	await login(page);
	await seedFixtures(c, { location: uniqueName("Loc"), building: uniqueName("Bld"), room: roomA, renter: renterA, rent });
	await seedFixtures(c, { location: uniqueName("Loc2"), building: uniqueName("Bld2"), room: roomB, renter: renterB, rent });
	await generateBillsApi(c);

	// list defaults to the current month
	await page.goto("/bills");
	const now = new Date();
	const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	await expect(page.getByRole("button", { name: month, exact: true })).toBeVisible();

	// pay renterA fully → becomes paid; renterB stays unpaid
	await recordPayment(page, `${renterA} — ${roomA}`, rent);
	await expect(page.getByText("Payment recorded")).toBeVisible();

	// unpaid (renterB) must render above paid (renterA)
	await page.goto("/bills");
	const rowA = page.locator("tbody tr", { hasText: renterA });
	const rowB = page.locator("tbody tr", { hasText: renterB });
	await expect(rowB.getByText("unpaid")).toBeVisible();
	await expect(rowA.getByText("paid")).toBeVisible();
	expect(await rowB.evaluate((el) => el.rowIndex)).toBeLessThan(await rowA.evaluate((el) => el.rowIndex));

	await cleanupArtifacts(c, renterA, roomA);
	await cleanupArtifacts(c, renterB, roomB);
});
test("generate is blocked before any contract's check-in month", async ({ page }) => {
	test.setTimeout(120_000);
	const c = await client();
	const now = new Date();
	const nextMonth = `${ym(new Date(now.getFullYear(), now.getMonth() + 1, 1))}-01`;
	const renter = uniqueName("RntG");
	const room = uniqueName("RmG");
	await seedFixtures(c, {
		location: uniqueName("LocG"),
		building: uniqueName("BldG"),
		room,
		renter,
		rent: "800000",
		startDate: nextMonth,
	});
	await login(page);
	await page.goto("/bills");
	await page.getByRole("button", { name: /Generate/ }).click();
	await expect(page.getByText("No active contract covers")).toBeVisible();
	await cleanupArtifacts(c, renter, room);
});
