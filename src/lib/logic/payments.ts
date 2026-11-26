// Pure business logic — no Supabase I/O. Kept framework-free for direct unit testing.

export type BillStatus = "unpaid" | "partial" | "paid";

export interface BillBalance {
	id: string;
	period: string; // YYYY-MM
	amount: number;
	paid: number;
	status: BillStatus;
}

export const billBalance = (b: BillBalance): number => b.amount - b.paid;
export const isFullyPaid = (b: BillBalance): boolean => billBalance(b) <= 0;

/**
 * Apply a payment FIFO across the oldest unpaid bills. Returns updated bills
 * and the leftover amount that exceeds total outstanding (overpayment).
 * Throws if `amount` is not positive.
 */
export function applyPaymentFifo(bills: BillBalance[], amount: number): {
	bills: BillBalance[];
	overpayment: number;
} {
	if (!(amount > 0)) throw new Error("payment amount must be > 0");
	const sorted = [...bills]
		.filter((b) => b.status !== "paid")
		.toSorted((a, b) => a.period.localeCompare(b.period) || a.id.localeCompare(b.id));

	let remaining = amount;
	const allocated = new Map<string, BillBalance>();
	for (const b of sorted) {
		if (remaining <= 0) break;
		const due = billBalance(b);
		const applied = Math.min(due, remaining);
		remaining -= applied;
		const paid = b.paid + applied;
		allocated.set(b.id, {
			...b,
			paid,
			status: paid >= b.amount ? ("paid" as const) : ("partial" as const),
		});
	}

	// preserve original order/paid bills untouched
	const out = bills.map((b) => allocated.get(b.id) ?? { ...b });
	return { bills: out, overpayment: remaining };
}

/** Recompute a single bill's status from its paid/amount. */
export function statusFor(amount: number, paid: number): BillStatus {
	if (amount <= 0) return "paid";
	if (paid >= amount) return "paid";
	if (paid > 0) return "partial";
	return "unpaid";
}
