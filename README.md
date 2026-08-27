# JP Studio

A progressive web app for social media management — plan, compose, schedule,
approve, and publish content across every platform from one workspace.

Reimplementation of the [BrightBean Studio](https://github.com/brightbeanxyz/brightbean-studio)
feature set on a Next.js + Supabase stack, with a full live theme editor and an
Apple-grade interface.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Data | Supabase (Postgres, Auth, Storage, Edge Functions, `pg_cron`) |
| ORM | Drizzle |
| UI | Tailwind CSS v4, Radix primitives, `motion` |
| PWA | Hand-rolled service worker, Web Push |
| Deploy | Vercel (app) + Supabase (data & scheduled jobs) |

## Getting started

```bash
npm install
cp .env.example .env.local     # fill in Supabase + keys
npm run icons                  # generate PWA icons from public/brand/logo.svg
npm run dev
```

### Database

```bash
# apply schema + policies to your Supabase project
psql "$DIRECT_URL" -f supabase/migrations/0000_init.sql
psql "$DIRECT_URL" -f supabase/rls.sql

# after schema changes
npm run db:generate            # new migration from lib/db/schema
```

### Auth setup (Supabase dashboard)

- Authentication → URL Configuration → Site URL = your app URL, and add
  `<app>/auth/callback` to Redirect URLs.
- Authentication → Providers → enable Email (magic link) and Google.

## Scripts

| script | does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run check` | lint + typecheck + tests |
| `npm run db:generate` / `db:migrate` / `db:studio` | Drizzle |
| `npm run icons` | regenerate PWA/favicon assets |

## Project layout

```
app/            routes — (marketing), (auth), (app), api, legal, offline
components/     ui/ (primitives), shell/, theme/, theme-editor/, motion/, pwa/
lib/            db/ (schema + client), supabase/, theme/, providers/ (Phase 1),
               dal.ts (auth + membership), crypto.ts, env.ts
supabase/       migrations/, rls.sql, functions/ (Phase 1 job runners)
```

## Roadmap

- **Phase 0 — Foundation** ✅ auth, tenancy, app shell, theme editor, PWA
- **Phase 1** — provider integrations (Meta, TikTok, LinkedIn), composer,
  media library, calendar, scheduled publishing
- **Phase 2** — RBAC, approval workflows, client portal, notifications
- **Phase 3** — unified inbox, analytics, reports
- **Phase 4** — REST API, MCP endpoint, audit log, hardening

See `.claude/plans/` for the full plan.
