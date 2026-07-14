# AGENTS.md

Guidance for AI agents working in this repo. For product/setup docs see [README.md](README.md).

## What this is

Parent-controlled, AI-assisted kids' coloring app. Visitors color curated line art without an
account; members generate age-appropriate pages via Gemini / OpenAI / local SDXL and other
providers. Turkish is the primary language (English is fully translated too).

## Stack & layout

- **Frontend**: React 19 + TypeScript + Vite + Tailwind v4. Neobrutalism style (thick black
  borders, hard offset shadows via `card-shadow` / `border-ink` utilities in `src/index.css`).
- **Backend**: Express (`server/`) + Supabase (Postgres + storage + RLS). A separate AI **worker**
  (`server/worker.ts`) processes generation jobs.
- `src/` app, `src/components/` UI, `src/features/` domain logic + hooks, `src/pages/` routes,
  `server/routes/` API, `server/services/` domain services, `supabase/migrations/` schema.

## Commands

- `npm run dev` — web+API (tsx server.ts) on :3000. `npm run worker` — AI worker.
- `npm run lint` — **`tsc --noEmit`** (typechecks the whole repo, incl. `server/`). Always run before committing.
- `npm test` — Vitest. Tests live next to sources as `*.test.ts`.
- `npm run build` — SEO gen + `vite build` + esbuild-bundles the server/worker/cleanup.
- `npm run db:migrate` — apply `supabase/migrations/*.sql` (tracked in `schema_migrations`, one-time
  each) against `SUPABASE_DB_URL` (the direct Postgres string). Safe to adopt an existing DB: migrations
  whose objects already exist are baselined. Write new migrations idempotently. Not needed at runtime.

## Conventions

- Reference files as `path:line`. Match surrounding code style; JSX in this repo is often dense/inline.
- i18n: user-facing strings go through `t()` with keys in `src/i18n.ts` (both `tr` and `en` blocks).
  The Admin page (`src/pages/AdminPage.tsx`) is intentionally Turkish-only for now.
- Commits go directly to `main` (solo workflow). Do not add AI co-author trailers to commit messages.

## Domain notes / gotchas

- **Categories are data-driven.** The home category bar is derived from the pages that exist
  (`src/features/app/categories.ts` → `buildCategoryTabs`): a category tab only shows if it has ≥1
  page, so empty categories disappear and admin-created ones appear automatically. Admin adds a
  category simply by typing a new slug on a catalog page. Category is a slug (`^[a-z0-9-]{2,24}$`),
  validated by `categorySlug` in `server/validation.ts`; the `coloring_page_overrides.category`
  CHECK constraint allows any such slug (migration `202607140001`).
- **Coloring canvas** uses a stamp-based brush engine (`src/features/coloring/brushEngine.ts`) driven
  by Pointer Events with stylus pressure. See the `project-brush-engine` memory for details.
- Curated line art currently points at Google `aida-public` URLs in `src/data.ts` — fragile/temporary.
- `src/data/aiGeneratedPages.ts` is used only by `scripts/generate-curated-catalog.ts`, not at runtime.

## Verifying UI changes in a browser

The MCP browser runs in Docker and **cannot reach `localhost`**. Use the Mac's LAN IP
(`ipconfig getifaddr en0`) — Vite blocks non-IP hosts, so `host.docker.internal` is rejected but the
IP works. Screenshots save inside the container at `/home/node/*.jpeg`; `docker cp` them out to read.
