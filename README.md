# Friends of Figma Abeokuta — Event Platform

Multi-event platform for FOF Abeokuta. Host many events from one deployment.

## Stack

- Next.js 16 + custom Node server (Socket.io)
- Prisma 7 + PostgreSQL
- pnpm
- Platform admin: email + password at `/fg-admin`
- Event access: username + password at `/login` (current event) or `/{slug}/login`

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

## Roles & passwords (per event)

| Role | Password range |
|------|----------------|
| Admin | 0000–0999 |
| Staff | 1000–1999 |
| Judge | 2000–2999 |
| Participant | 3000–3999 |

Usernames are auto-assigned (`firstname.design-phrase`). Staff share credentials at check-in.

## Local Development

```bash
cp .env.example .env
pnpm install
pnpm run db:migrate
pnpm run db:seed
pnpm dev
```

**Platform admin** (after seed): `admin@fofabeokuta.com` / `fofadmin123`

**Current event admin**: `/login` — username `admin.portal`, password `0001`

## Create Events

1. Sign in at `/fg-admin` with platform credentials
2. Create an event — slug is auto-generated from the title
3. Set status to **LIVE** when it should be the public homepage
4. Share `/` and `/login`, or `/{slug}` and `/{slug}/login` for direct links

## Deploy to Render

Build: `corepack enable && pnpm install && pnpm exec prisma generate && pnpm exec prisma migrate deploy && pnpm run build`

Start: `pnpm start`
