## Description
Adds edit workspace feature: owners can rename their workspace/tenant via a Settings page.

## Type of change
- [x] New feature (non-breaking change which adds functionality)

## Changes
- `supabase/migrations/20260101000014_tenant_update_policy.sql` - RLS UPDATE policy for tenants (owner-only)
- `src/lib/db.ts` - `updateTenant(tenantId, { name })` function
- `src/routes/(app)/settings/+page.svelte` - Settings page with workspace name form
- `src/routes/(app)/+layout.svelte` - Settings link in sidebar (owner-only)
- `.env.example` - Added `SUPABASE_DB_PASSWORD` placeholder

## Testing
- Lint, typecheck, build pass locally
- Migration applied to Supabase staging
- Manual test: owner can access /settings, edit name, see update in sidebar

## Checklist
- [x] Code follows project conventions
- [x] Self-reviewed
- [x] No breaking changes
- [x] Related issue linked (fixes #67)

