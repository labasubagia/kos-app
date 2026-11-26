# PRD — Boarding House Management App (SaaS)

## Purpose
Provide a **SaaS multi-tenant** app to manage boarding houses: each owner (tenant) gets an isolated area for rooms, tenants, contracts, monthly bills, and payments. Each tenant can add admins (e.g., spouse/children).

## Personas & tenancy
- **owner** — boarding house owner. Creates the tenant at first signup. Manages members (add/remove admins) and settings.
- **admin** (e.g., spouse/children) — daily operations: rooms, tenant, contracts, bills, payments.
- Each user belongs to one or more tenants; data is isolated per tenant (RLS).
- No tenant portal.

## Confirmed decisions
| Aspect | Decision |
|---|---|
| Architecture | SaaS multi-tenant (tenancy isolation) |
| Scale | One boarding house per tenant, <20 rooms |
| Utilities | Flat rate, included in rent |
| Users | Owner + admin within the same tenant |
| Tenant portal | None — internal only |
| Payments | Manual (cash/transfer), recorded by admin |
| Env | Staging active; prod later |

## Features

### P0 — MVP core
- Onboarding: signup → create tenant → owner; invite admin (email-invite via auth).
- Manage rooms: CRUD + status (Available / Reserved / Occupied / Maintenance).
- Manage renters: CRUD + contract history.
- Contracts: check-in, extend, check-out (terminate).
- Monthly bills: auto-generated per active room per month.
- Payments: record full/partial per period, validate overpayment.
- Track arrears.
- Dashboard: occupancy, monthly income, arrears list, contracts expiring soon.
- Member management (owner): add/remove admins.

### P1
- Income report archive per month/year.
- CSV export (renters, payments, arrears).
- Simple receipt (print view).

### P2 (later, if it grows)
- Due-date reminders (email/WhatsApp).
- Multi-property per tenant after >1 house or >20 rooms.

## Out of scope (for now)
- Tenant portal, online payment gateway.
- Utility meter reading.
- Billing/payment for the SaaS subscription itself.

## Success criteria
- Each tenant's data fully isolated (no cross-tenant leakage).
- All transactions recorded and traceable.
- Income & arrears reports accurate per month.
- No room becomes occupied without an active contract.
