import { test, expect } from "@playwright/test";
import { cleanupArtifacts, client, hasCreds, login, uniqueName } from "./harness";
import {
	generateBills,
	seedFixtures,
} from "./helpers";

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
