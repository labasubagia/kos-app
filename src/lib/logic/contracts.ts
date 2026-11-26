// Deposit refund math per docs/02-business-rules.md.

/** Refund = deposit − arrears − deductions, floored at 0. */
export function depositRefund(deposit: number, arrears: number, deductions: number): number {
	return Math.max(0, deposit - arrears - deductions);
}

/** Net owed by renter at check-out (negative refund means renter owes). */
export function checkoutBalance(deposit: number, arrears: number, deductions: number): number {
	return arrears + deductions - deposit;
}

export function isValidContractDates(start: string, end: string | null): boolean {
	if (!end) return true;
	return end > start;
}
