# Friends of Figma Abeokuta — Event Platform

Multi-event platform for FOF Abeokuta. Host many events from one deployment.

## Stack

- Next.js 16 + custom Node server (Socket.io)
- Prisma 7 + PostgreSQL
- Optional Upstash Redis (read cache + rate limits; in-memory fallback when unset)
- pnpm
- Global accounts: email + username + password (same credentials across events)
- Platform admin: email + password at `/fg-admin` (requires `platform.admin` permission)
- Event access: email + password at `/login` (current event) or `/{slug}/login`

## URLs

| Area | Path |
|------|------|
| Current event landing | `/` |
| Current event sign-in | `/login` |
| Past / all events | `/all-event` |
| Event landing (any slug) | `/{slug}` |
| Event sign-in (any slug) | `/{slug}/login` |
| Platform admin | `/fg-admin` |
| Event admin | `/{slug}/admin` |

Set an event’s status to **LIVE** in platform admin to make it the current event at `/` and `/login`.

If no events exist yet, `/` redirects to `/fg-admin/login`.

## Accounts

- Each person has one global **Account** (email, username, password).
- Event membership is a **User** row linking an account to an event + role.
- Passwords are auto-generated when creating users; sign-in details are emailed when SMTP and the queue are configured. Recipients must change password on first sign-in.
- Only checked-in participants can sign in to an event.

## Local Development

```bash
cp .env.example .env
pnpm install
pnpm run db:migrate
pnpm dev
```

On first startup the server bootstraps activity types and a platform admin (no manual seed required).

**Platform admin** (defaults): `boyesiji@gmail.com` — password is generated on first bootstrap and emailed when SMTP + queue are configured. Override with `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_USERNAME`.

Create events at `/fg-admin` after signing in.

## Redis (optional, recommended for production)

Add Upstash REST credentials to cache hot reads and rate-limit login attempts. All cached keys use TTLs and fall back to PostgreSQL if Redis is unavailable or evicts entries.

```env
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

## Media storage (optional)

Uploads for pin-answer images, audio questions, and survey images use a pluggable storage adapter.

```env
STORAGE_PROVIDER=cloudinary   # or r2
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

## Transactional emails (optional)

Account credentials (welcome, reset, check-in) and check-in welcome emails are sent asynchronously via RabbitMQ + SMTP. APIs only enqueue jobs; the custom server processes the queue in the background so requests stay fast.

```env
PLATFORM_ADMIN_EMAIL=boyesiji@gmail.com   # bootstrap platform admin
PLATFORM_ADMIN_USERNAME=platform_admin
CLOUDAMQP_URL=amqps://...                 # CloudAMQP connection URL
SMTP_HOST=smtp.example.com
SMTP_PORT=587                             # 465 with SMTP_SECURE=true
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=noreply@example.com
SMTP_FROM_NAME=Friends of Figma Abeokuta
```

If `CLOUDAMQP_URL` or SMTP settings are missing, user creation and check-in still work; emails are skipped (bootstrap logs the dev password locally).

CSV/ticket imports without email send credentials when the person checks in and provides an email, then the usual check-in welcome email.

## Deploy

Build: `pnpm run build` (runs `prebuild`: `prisma generate` + `prisma migrate deploy`, then `next build`)

Start: `pnpm start`

Configure env vars on your host (Render, etc.): `DATABASE_URL`, JWT secrets, `NEXT_PUBLIC_APP_URL`, platform admin credentials, and optionally Upstash Redis, CloudAMQP, and SMTP for check-in emails.
