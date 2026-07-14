# Coloring Fun

[![CI](https://github.com/yucel-yilmaz/Coloring-Fun/actions/workflows/ci.yml/badge.svg)](https://github.com/yucel-yilmaz/Coloring-Fun/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/react-19-149eca?logo=react&logoColor=white)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> Other languages: [Türkçe](README.md)

A parent-controlled, AI-assisted coloring app. Visitors can color ready-made
line art without creating an account; members can generate age-appropriate
coloring pages with Gemini, OpenAI, or a local SDXL pipeline running on Apple
Silicon.

## Screenshots

### Turkish home page

![Turkish home page](docs/screenshots/home-tr.png)

### English settings

![English settings page](docs/screenshots/settings-en.png)

### English home page

![English home page](docs/screenshots/home-en.png)

## Features

- Touch-friendly coloring canvas with pencil, marker, crayon, and spray brushes (a pressure-aware, stamp-based paint engine with Apple Pencil support), paint bucket, eraser, undo/redo, and gallery support
- A local drawing catalog usable without an account; categories are derived from content (empty ones are hidden automatically) and admins can add new categories
- Parent-linked child profiles and age bands
- Gemini, OpenAI, fal.ai, Replicate, Hugging Face, Stability AI, and local SDXL providers
- Personal gallery plus moderated community sharing
- Encrypted user API keys, content moderation, and Supabase RLS
- An admin area with skill versioning, publishing, and rollback tools

## Tech stack

React 19, TypeScript, Vite, Express, Supabase, Vitest, Sharp, and an optional
Python/SDXL pipeline. The web/API process and the AI worker can run
independently.

## Requirements

- Node.js 22 or later
- npm 10 or later
- A Supabase project for cloud features
- Docker for local Supabase
- Apple Silicon, `uv`, and enough disk space for local SDXL

## Quick start

```bash
git clone https://github.com/yucel-yilmaz/Coloring-Fun.git
cd Coloring-Fun
npm ci
cp .env.example .env.local
npm run dev
```

The app opens at <http://localhost:3000> by default. The ready-made catalog and
coloring screen work without Supabase configured; membership and AI features
show a configuration warning until it is set up.

## Configuration

Copy `.env.example` to `.env.local`. Values prefixed with `VITE_` are bundled
into the browser build; never use that prefix for secrets.

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase URL the browser connects to |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable/anon key usable in the browser |
| `VITE_GOOGLE_AUTH_ENABLED` | Enables the Google sign-in button |
| `SUPABASE_URL` | Supabase URL for the API and worker |
| `SUPABASE_PUBLIC_URL` | External address returned for Storage URLs |
| `SUPABASE_SECRET_KEY` | Server-only secret/service-role key |
| `AI_KEYS_MASTER_KEY` | 32-byte hex key encrypting user AI keys |
| `OPENAI_MODERATION_API_KEY` | Separate OpenAI key for platform moderation |
| `ADMIN_EMAILS` | Emails promoted to admin on first verified request |
| `SUPPORT_EMAIL` | Support email shown in the “Contact admin” card on Settings page |
| `LOCAL_IMAGE_API_URL` | Address of the local image generation service |

You can generate an encryption key with:

```bash
openssl rand -hex 32
```

Never commit real secrets. Use GitHub Actions secrets or your cloud provider's
Secret Manager in production.

## Supabase setup

1. Create a Supabase project.
2. Apply the migrations under `supabase/migrations/` (see below).
3. Enable email/password (and Google, if needed) in Supabase Auth.
4. Set the Site URL and OAuth callback URL to your app's address.
5. Add the public and backend values to `.env.local`.

### Applying migrations

`npm run db:migrate` applies the files under `supabase/migrations/` in order and
records them in a `schema_migrations` table, so each file runs exactly once.
Adopting an existing database whose migrations were applied by hand is safe: a
migration whose objects already exist is skipped with an "already exists" error
and recorded as baselined, while new migrations apply cleanly.

Provide the project's **direct** Postgres connection string as `SUPABASE_DB_URL`
(Supabase → Project Settings → Database):

```bash
SUPABASE_DB_URL="postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres" npm run db:migrate
```

This is the only variable the app does not need at runtime — it is used only when
applying migrations. Write new migration files idempotently (e.g. `create ... if
not exists`, `drop ... if exists`) so they work on both fresh and adopted
databases.

In Docker Compose, when `SUPABASE_DB_URL` is set, a one-shot `migrate` service
applies pending migrations on every deploy. It does **not** block `web`/`worker`
(they don't depend on it), so a migration hiccup can't take the app down. For a
self-hosted Supabase, point it at the internal DB (e.g.
`postgresql://postgres:PASS@supabase-db:5432/postgres`).

While Docker is running for local Supabase:

```bash
npm run supabase:start
npm run dev
```

To verify the auth, API/RLS, private Storage, admin bootstrap, and skill seed
flow, use the same test account as `ADMIN_EMAILS` in `.env.local`:

```bash
export TEST_ADMIN_EMAIL="admin@example.test"
export TEST_ADMIN_PASSWORD="a-strong-local-only-password"
npm run verify:supabase
```

You can check local services with `npm run supabase:status` and stop them with
`npm run supabase:stop`.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the web app and API in development mode |
| `npm run worker` | Starts the AI generation queue worker |
| `npm run cleanup` | Cleans up data past its retention period |
| `npm run db:migrate` | Applies pending SQL migrations (see Supabase setup) |
| `npm run lint` | Runs the TypeScript type check |
| `npm test` | Runs unit and API tests |
| `npm run build` | Builds the web, API, worker, cleanup, and migrate outputs |
| `npm run svg:evaluate -- <dir>` | Produces an SVG engine evaluation report |

## Local SDXL

Local image generation uses SDXL Base, SDXL-Lightning, ColoringBookRedmond, and
an FP16-compatible SDXL VAE on Apple Silicon. The model and Python environment
are stored under `~/.cache/coloring-fun-ai` by default; set `LOCAL_AI_HOME` to
use a different disk.

```bash
export LOCAL_AI_HOME="/path/to/coloring-fun-ai"
npm run local-ai:setup
npm run local-ai:start
```

Then start the worker and the app in separate terminals:

```bash
npm run worker
PORT=3002 npm run dev
```

The default local service listens on `127.0.0.1:7861`. If ComfyUI is running on
`127.0.0.1:8188`, add the following line to `.env.local`:

```bash
LOCAL_IMAGE_API_URL="http://127.0.0.1:8188"
```

When generating with ComfyUI, the default checkpoint name expected is
`sd_xl_base_1.0.safetensors`. You can optionally set `COMFYUI_CHECKPOINT` for a
different checkpoint.

See [`local-ai/README.md`](local-ai/README.md) for details.

## Production

```bash
npm ci
npm run build
NODE_ENV=production npm start
```

`dist/server.cjs` contains the web/API service, `dist/worker.cjs` the
long-running worker, `dist/cleanup.cjs` the scheduled cleanup task, and
`dist/migrate.cjs` the migration runner. Run the worker in a separate process
with `npm run start:worker`, call the cleanup task periodically with
`npm run start:cleanup`, and apply migrations with `npm run start:migrate`
(requires `SUPABASE_DB_URL`).

## Security model

- Children never create accounts; only a parent-linked nickname and age band
  are stored.
- User AI keys are encrypted with AES-256-GCM and never returned in API
  responses.
- Prompts and image output are not persisted until they pass moderation.
- Generated content is private by default.
- Community publishing only happens through a moderator/admin decision.
- Supabase tables and storage buckets are protected with RLS.
- The image proxy only reaches allow-listed HTTPS hosts.

If you find a security vulnerability, do not open a public issue; contact the
repository owner privately through GitHub instead.

## Tests

```bash
npm run lint
npm test
npm run build
```

Browser smoke tests require Python Playwright and Chromium. Example against a
running production server:

```bash
BASE_URL=http://127.0.0.1:3000 python3 tests/browser_smoke.py
```

For authenticated smoke tests, also provide the `TEST_ADMIN_EMAIL` and
`TEST_ADMIN_PASSWORD` environment variables.

## Contributing and assets

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the contribution process.
Third-party image assets in this repo may have usage terms separate from the
source code; document the source and usage permission in your pull request
description when adding new images/assets.

## Image Titles

- Gallery and catalog titles were cleaned up to be meaningful for users.
- When adding or editing catalog assets, update titles from the Admin panel “Boyama Seç” section with clear child-friendly wording.
- For generated content, review and polish titles before submitting to community publication.

## License

No open source license has been chosen for this repository yet. Until a
`LICENSE` file is added, all rights are reserved unless stated otherwise.
