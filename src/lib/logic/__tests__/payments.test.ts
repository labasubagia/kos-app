import { describe, expect, it } from "vitest";
import { applyPaymentFifo, statusFor, type BillBalance } from "../payments";

const bill = (id: string, period: string, amount: number, paid = 0): BillBalance => ({
	id,
	period,
	amount,
	paid,
	status: statusFor(amount, paid),
});

describe("applyPaymentFifo", () => {
	it("applies to oldest unpaid bill first", () => {
		const bills = [bill("a", "2026-01", 100), bill("b", "2026-02", 100)];
		const { bills: out } = applyPaymentFifo(bills, 120);
		expect(out[0]).toMatchObject({ id: "a", paid: 100, status: "paid" });
		expect(out[1]).toMatchObject({ id: "b", paid: 20, status: "partial" });
	});

	it("carries to next bill when prior is fully paid", () => {
		const bills = [bill("a", "2026-01", 100), bill("b", "2026-02", 100), bill("c", "2026-03", 50)];
		const { bills: out } = applyPaymentFifo(bills, 250);
		expect(out.map((b) => b.status)).toEqual(["paid", "paid", "paid"]);
	});

	it("reports overpayment beyond total outstanding", () => {
		const bills = [bill("a", "2026-01", 100)];
		const { bills: out, overpayment } = applyPaymentFifo(bills, 140);
		expect(out[0]).toMatchObject({ paid: 100, status: "paid" });
		expect(overpayment).toBe(40);
	});

	it("skips already-paid bills", () => {
		const bills = [bill("a", "2026-01", 100, 100), bill("b", "2026-02", 100)];
		const { bills: out } = applyPaymentFifo(bills, 80);
		expect(out[0].paid).toBe(100);
		expect(out[1]).toMatchObject({ paid: 80, status: "partial" });
	});

	it("throws on non-positive amount", () => {
		expect(() => applyPaymentFifo([bill("a", "2026-01", 100)], 0)).toThrow();
		expect(() => applyPaymentFifo([bill("a", "2026-01", 100)], -5)).toThrow();
	});
});

describe("statusFor", () => {
	it("maps unpaid/partial/paid", () => {
		expect(statusFor(100, 0)).toBe("unpaid");
		expect(statusFor(100, 50)).toBe("partial");
		expect(statusFor(100, 100)).toBe("paid");
		expect(statusFor(100, 120)).toBe("paid");
	});
});
