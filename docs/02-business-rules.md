# Business Rules — Boarding House Management

## Core invariants
1. **One active contract per room.** Two active contracts must never reference the same room.
2. **Check-in** is only allowed on a room with status `Available`. On success the room becomes `Occupied`.
3. **Check-out / termination** closes the active contract → the room becomes `Available`.
4. **Deposit (security deposit)** is received at check-in; returned at check-out minus arrears and damage deductions.
5. **Monthly bill** is created one per active contract per period (month). Amount = monthly rent + late fee if the previous period was unpaid past the grace period.
## Data hierarchy
- `location` > `building` > `room`; every room belongs to exactly one building, every building to exactly one location.
- One tenant may own multiple locations (multiple properties/kos-kosan).

## Room status
```
Available → Reserved → Occupied → Available
Available → Maintenance → Available
```
Transitions happen only via contracts (Occupied) or admin action (Available/Maintenance).

## Bills & payments
- One bill per period per contract. Period is marked `year-month`.
- Bill generation is restricted to periods inside the contract's stay window — never earlier than the check-in month and never after the check-out month (`generate_bills` rejects such periods).
- Bills can be deleted from the bills list for corrections; deleting a bill also deletes its payments.
- Payments **can be partial**. Bill status: `Unpaid` / `Partial` / `Paid`.
- Payments are applied to the oldest unpaid bill first (FIFO).
- No single payment exceeds the bill amount, and the sum of payments against a bill never exceeds it (overpayment rejected by `record_payment`).
- Bills list shows all billing data, default-filtered to the current month; unpaid bills appear at the top.
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
## Dashboard
- List renters who have not paid in full or have not paid at all:
  - sort by highest arrears amount;
  - among those paid partially, sort by percent paid.
- List rooms that are empty (`status = available`).

## Input validation
- Check-out date ≥ check-in date.
- Payment amount > 0.
- No payment may exceed the remaining bill balance, and the sum of installments per bill may never exceed the bill amount (overpayment rejected by `record_payment`).
