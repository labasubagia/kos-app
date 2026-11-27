// End-to-end business flow exercised against a live Supabase (local Docker
// stack or a disposable test project), without a browser. Covers the DB
// RPCs that drive check-in → bill → pay → check-out and the invariant
// transitions. Skips locally when credentials are absent; fails in CI.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type SupabaseClient } from "@supabase/supabase-js";
import { dbClient, generateBillsApi, hasCreds, requireCreds } from "./support/db";
requireCreds();

const today = () => new Date().toISOString().slice(0, 10);
const corr = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

type Kind = "bills" | "contracts" | "rooms" | "renters" | "buildings" | "locations";

/** Read a string field from an RPC result after `in`-narrowing the shape. */
function fieldString(v: unknown, key: string): string {
	if (!v || typeof v !== "object" || !(key in v)) {
		throw new Error(`missing ${key} in RPC result`);
	}
	const val = (v as Record<string, unknown>)[key];
	if (typeof val !== "string") throw new Error(`${key} is not a string`);
	return val;
}

describe.skipIf(!hasCreds)("billing flow against live Supabase", () => {
	let c: SupabaseClient;
	let tid: string;
	const created: { kind: Kind; id: string }[] = [];

	beforeAll(async () => {
		c = await dbClient();
		const { data: member } = await c.from("memberships").select("tenant_id").limit(1).single();
		if (!member) throw new Error("no membership for test account");
		tid = member.tenant_id as string;
	}, 30_000);

	async function seedRenterRoom(rent: number): Promise<{ renterId: string; roomId: string }> {
		const loc = await c.from("locations").insert({ tenant_id: tid, name: `Loc_${corr}` }).select().single();
		if (loc.error) throw loc.error;
		created.push({ kind: "locations", id: loc.data.id });
		const bld = await c.from("buildings").insert({ tenant_id: tid, location_id: loc.data.id, name: `Bld_${corr}` }).select().single();
		if (bld.error) throw bld.error;
		created.push({ kind: "buildings", id: bld.data.id });
		const rm = await c.from("rooms").insert({ tenant_id: tid, building_id: bld.data.id, name: `Rm_${corr}`, monthly_rent: rent }).select().single();
		if (rm.error) throw rm.error;
		created.push({ kind: "rooms", id: rm.data.id });
		const rnt = await c.from("renters").insert({ tenant_id: tid, name: `Rnt_${corr}`, phone: "081200000001" }).select().single();
		if (rnt.error) throw rnt.error;
		created.push({ kind: "renters", id: rnt.data.id });
		return { renterId: rnt.data.id, roomId: rm.data.id };
	}

	it("check-in → bill → exact pay marks paid; overpayment rejected atomically; check-out frees room", async () => {
		const { renterId, roomId } = await seedRenterRoom(850000);
		const startDate = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);


		const { data: contract, error: ci } = await c.rpc("check_in_contract", {
			p_renter_id: renterId,
			p_room_id: roomId,
			p_start_date: startDate,
			p_end_date: null,
			p_monthly_rent: 850000,
			p_deposit: 500000,
			p_due_day: 1,
			p_grace_days: 3,
			p_late_fee_per_period: 25000,
		});
		expect(ci).toBeNull();
		expect(typeof contract).toBe("string");
		const contractId = contract as string;
		created.push({ kind: "contracts", id: contractId });

		const { data: room, error: re } = await c.from("rooms").select("status").eq("id", roomId).single();
		expect(re).toBeNull();
		expect(fieldString(room, "status")).toBe("occupied");

		await generateBillsApi(c);

		const { data: bills } = await c.from("bills").select("id, amount, status").eq("contract_id", contractId);
		expect(bills?.length).toBeGreaterThan(0);
		const bill = bills![0];
		expect(bill.status).toBe("unpaid");
		created.push({ kind: "bills", id: bill.id });

		const pay = await c.rpc("record_payment", {
			p_contract_id: contractId,
			p_amount: bill.amount,
			p_method: "cash",
			p_date: today(),
		});
		expect(pay.error).toBeNull();
		const { data: paidBill } = await c.from("bills").select("status").eq("id", bill.id).single();
		expect(fieldString(paidBill, "status")).toBe("paid");

		const over = await c.rpc("record_payment", {
			p_contract_id: contractId,
			p_amount: bill.amount + 1,
			p_method: "cash",
			p_date: today(),
		});
		expect(over.error).not.toBeNull();
		const { data: afterOver } = await c.from("bills").select("status").eq("id", bill.id).single();
		expect(fieldString(afterOver, "status")).toBe("paid");

		const co = await c.rpc("check_out_contract", { p_contract_id: contractId, p_deductions: 0 });
		expect(co.error).toBeNull();
		expect(Number(co.data)).toBeGreaterThanOrEqual(0);
		const { data: roomAfter } = await c.from("rooms").select("status").eq("id", roomId).single();
		expect(fieldString(roomAfter, "status")).toBe("available");
	}, 60_000);

	afterAll(async () => {
		for (const x of created.filter((a) => a.kind === "bills")) {
			await c.from("payments").delete().eq("bill_id", x.id);
		}
		for (const x of created.toReversed()) {
			await c.from(x.kind).delete().eq("id", x.id);
		}
	}, 30_000);
});
