# Universal Appointment Engine

A multi-tenant SaaS booking platform with one shared scheduling core and
swappable vertical "skins" — barbershops, dentists, tutors, therapists and
mechanics. Each business (tenant) picks a vertical preset that seeds services
and sets terminology/theme, then customizes it.

Built with **Next.js 16.2** (App Router), **Supabase** (Postgres + Auth + RLS)
and deployed on **Vercel**. Platform subscription billing runs on **Iyzico**.

## Features

- **Multi-tenant** — path-based tenants at `/book/[slug]`, isolated by Postgres
  RLS keyed on `tenant_id`.
- **Booking core** — services with durations + buffers, per-staff weekly
  availability and one-off overrides, timezone-aware slot generation, and
  double-booking made impossible by a DB exclusion constraint.
- **Roles** — customer, staff, business admin, and platform super-admin.
- **Vertical skins** — five presets driving terminology, theme and seed
  services; editable per tenant.
- **Plan tiers** — Free (1 staff, email confirmations) and Pro (unlimited
  staff, SMS + email reminders, Google Calendar sync, custom branding).
- **Integrations** — Resend (email), Twilio (SMS), Google Calendar two-way
  sync, and hourly reminder cron.

## Getting started

### 1. Install

```bash
npm install
cp .env.example .env.local   # then fill in the values
```

### 2. Database (Supabase)

Apply the migrations in `supabase/migrations/` to a Supabase project.

```bash
# Hosted project:
supabase link --project-ref <your-ref>
supabase db push

# Or locally (requires Docker):
supabase start
supabase db reset            # runs migrations + seed
```

The seed creates one demo tenant per vertical (e.g. `/book/demo-barbershop`).

### 3. Auth

Enable Email and Google providers in the Supabase dashboard and add
`<APP_URL>/auth/callback` as a redirect URL.

### 4. Run

```bash
npm run dev      # http://localhost:3000
npm test         # slot-engine unit tests (Vitest)
```

## Configuration

See `.env.example`. Notable variables:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin client (webhooks, seeding) |
| `SUPERADMIN_EMAILS` | Comma-separated platform super-admins |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Email notifications |
| `TWILIO_*` | SMS notifications (Pro) |
| `GOOGLE_CLIENT_ID` / `_SECRET` / `_REDIRECT_URI` | Calendar sync (Pro) |
| `IYZICO_*` + `IYZICO_PRO_PLAN_REF` | Platform subscription billing |
| `CRON_SECRET` | Protects the reminders cron endpoint |

## Architecture

- `src/lib/booking/` — pure, unit-tested `SlotEngine` / `AvailabilityResolver`
  plus `BookingService` / `BookingRepository`.
- `src/lib/verticals/` — vertical presets and terminology/theme resolution.
- `src/lib/repositories/` — tenant-scoped data access (services, staff,
  appointments).
- `src/lib/integrations/` — swappable adapter classes: notification channels
  (email/SMS), Google Calendar, and Iyzico billing.
- `src/lib/supabase/` — browser/server/admin clients; session refresh lives in
  `src/proxy.ts` (Next 16 renamed Middleware to Proxy).

## Deploy

Push to a Vercel project, set the environment variables, and the hourly
reminders cron in `vercel.json` registers automatically.
