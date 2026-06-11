# Friends of Figma Abeokuta — Event Platform

Multi-event platform for FOF Abeokuta. Host many events from one deployment.

## Stack

- Next.js 16 + custom Node server (Socket.io)
- Prisma 7 + PostgreSQL
- pnpm
- Platform admin: email + password at `/fg-admin`
- Event access: PIN-based roles at `/{event-slug}/login`

## URLs

| Area | Path |
|------|------|
| Public home | `/` |
| Platform admin | `/fg-admin` |
| Event login | `/{slug}/login` |
| Event admin | `/{slug}/admin` |

## PIN Roles (per event)

| Role | PIN Range |
|------|-----------|
| Admin | 0000–0999 |
| Staff | 1000–1999 |
| Judge | 2000–2999 |
| Participant | 3000–3999 |

## Local Development

```bash
cp .env.example .env
pnpm install
pnpm run db:migrate
pnpm run db:seed
pnpm dev
```

**Platform admin** (after seed): `admin@fofabeokuta.com` / `fofadmin123`

**Event admin login** at `/your-start-up-in-x-hours/login`: username `admin.portal`, password `0001`

Event users sign in with **username + password** (e.g. `ada.wireframe` + 4-digit password). Usernames are `firstname` + a random design phrase; passwords are assigned per role range on import.

## Create Events

1. Sign in at `/fg-admin` with platform credentials
2. Create an event — slug is auto-generated from the title via `slugify`
3. Open **Event Admin** or share `/{slug}/login` with attendees

## Deploy to Render

Build: `corepack enable && pnpm install && pnpm exec prisma generate && pnpm exec prisma migrate deploy && pnpm run build`

Start: `pnpm start`
