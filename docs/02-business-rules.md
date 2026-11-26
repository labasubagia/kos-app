# Business Rules — Boarding House Management

## Core invariants
1. **One active contract per room.** Two active contracts must never reference the same room.
2. **Check-in** is only allowed on a room with status `Available`. On success the room becomes `Occupied`.
3. **Check-out / termination** closes the active contract → the room becomes `Available`.
4. **Deposit (security deposit)** is received at check-in; returned at check-out minus arrears and damage deductions.
5. **Monthly bill** is created one per active contract per period (month). Amount = monthly rent + late fee if the previous period was unpaid past the grace period.

## Room status
```
Available → Reserved → Occupied → Available
Available → Maintenance → Available
```
Transitions happen only via contracts (Occupied) or admin action (Available/Maintenance).

## Bills & payments
- One bill per period per contract. Period is marked `year-month`.
- Payments **can be partial**. Bill status: `Unpaid` / `Partial` / `Paid`.
- Payments are applied to the oldest unpaid bill first (FIFO).
- **Arrears** = total open balance of unpaid bills (unpaid periods).
- **Late fee**: applies if past `due_date + grace_period`. Configurable formula (e.g., IDR/day or flat per month).

## Deposit calculation at check-out
```
Refund = Deposit − (Σ arrears) − damage deductions
```
Must be ≥ 0; if negative, the renter covers the remainder.

## Reports
- **Occupancy** = occupied rooms ÷ total rooms.
- **Monthly income** = Σ payments in that month.
- **Contract alerts** = active contracts ending within 30/60 days (or with no end date).

## Input validation
- Check-out date ≥ check-in date.
- Payment amount > 0.
- No payment may exceed the total bill balance (reject overpayment, or record as advance balance if approved).
