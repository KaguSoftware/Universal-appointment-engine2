@AGENTS.md

# Universal Appointment Engine

Multi-tenant SaaS booking platform. One "calendar core", swappable vertical
skins (barbershop, dentist, tutor, therapist, mechanic).

## Stack
- Next.js 16.2 (App Router, Turbopack). **Middleware is `proxy.ts`** in Next 16.
  Route `params` are async (`await params`). Read `node_modules/next/dist/docs`
  before using an unfamiliar API — this Next version has breaking changes.
- Supabase (Postgres + Auth + RLS). Iyzico for platform subscription billing.
- Package manager: npm. Tests: Vitest (`npm test`).

## Conventions
- **OOP, small files.** Domain logic lives in service/repository/adapter classes
  under `src/lib/*`, one class per file, ~200-line soft cap. React components
  stay presentational; call server actions that delegate to `lib/` classes.
- Booking math is pure and lives in `src/lib/booking/` (unit-tested). Always
  store times as UTC; render in the tenant timezone.
- Tenant isolation is enforced by Postgres RLS keyed on `tenant_id`. Never use
  the service-role client (`lib/supabase/admin.ts`) in browser-reachable code.
- Plan gating goes through `src/lib/feature-gate.ts`.

## Key directories
- `src/lib/booking/` — SlotEngine, AvailabilityResolver, time utils.
- `src/lib/verticals/` — vertical presets + terminology/theme resolution.
- `src/lib/supabase/` — browser/server/admin clients + proxy session helper.
- `supabase/migrations/` — schema, RLS, RPCs, seed.
