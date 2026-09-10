# Erai-Raws Subs

Stremio subtitle addon that serves **ASS** subtitles from [Erai-Raws](https://www.erai-raws.info), preserving karaoke, signs, fonts, and effects.

Credentials never leave the server. Stremio only receives an opaque config token.

Subtitles and Erai sessions are stored in **PostgreSQL** (gzip `BYTEA` + cookie jars).

## Local development

1. Create a free [Neon](https://neon.tech) Postgres database (or any Postgres).
2. Copy env and fill secrets:

```bash
cp .env.example .env
# DATABASE_URL, ERAI_USERNAME, ERAI_PASSWORD, CONFIG_SECRET, CRON_SECRET
npm install
npx prisma db push
npm run dev
```

- Configure UI: http://127.0.0.1:7000/configure
- Manifest: http://127.0.0.1:7000/manifest.json

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Deploy on Vercel (Container Function) — recommended

Uses [`Dockerfile.vercel`](./Dockerfile.vercel): Vercel builds an OCI image, stores it in Vercel Container Registry, and serves it as a Fluid Function.

The container **scales to zero**, so the crawler is **not** an in-process loop. Vercel Cron calls `GET /api/cron/crawl` every 6 hours with a soft time budget (`CRAWL_BUDGET_MS`, default 4 minutes). Progress is incremental across runs.

### Prerequisites

- Vercel project (Pro recommended for frequent crons / longer `maxDuration`)
- Neon `DATABASE_URL`
- Docker available locally only if you use `vercel dev`

### 1. Import the repo

Connect the GitHub repo in the Vercel dashboard (or `vercel link`).

### 2. Environment variables

Set for Production (and Preview if needed):

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Neon connection string (`?sslmode=require`) |
| `CONFIG_SECRET` | Long random hex |
| `CRON_SECRET` | Same value Vercel Cron will send as `Authorization: Bearer …` |
| `ERAI_USERNAME` / `ERAI_PASSWORD` | Crawler account |
| `ADDON_PUBLIC_URL` | `https://<project>.vercel.app` (or custom domain) |
| `CONFIGURATION_REQUIRED` | `true` |
| `CRAWL_ENABLED` | `false` (Dockerfile already sets this) |
| `CRAWL_ROOT_DIRECTORY` | e.g. `Sub` or `Sub/2026` |
| `CRAWL_BUDGET_MS` | `240000` (stay under Function max duration) |

Vercel automatically injects `CRON_SECRET` into Cron invocations when you define it in project settings — ensure the Cron job Authorization header matches (`Bearer $CRON_SECRET`). With `vercel.json` crons, Vercel sends `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is set.

### 3. Deploy

```bash
git push
# or: vercel --prod
```

Vercel detects `Dockerfile.vercel`, builds the image, and routes all traffic to it.

### 4. Verify

```bash
curl -I https://your-project.vercel.app/health
curl -I https://your-project.vercel.app/manifest.json
curl -H "Authorization: Bearer $CRON_SECRET" https://your-project.vercel.app/api/cron/crawl
```

Open `/configure`, sign in, install the Stremio link.

### Cron notes

- Schedule in `vercel.json`: `0 */6 * * *` (every 6 hours). Hobby plans may only allow daily crons — adjust the schedule if deploy validation fails.
- Each run indexes until `CRAWL_BUDGET_MS` elapses, then stops cleanly; the next Cron continues.

## Deploy on OVHcloud (optional VPS)

Long-lived Docker Compose with in-process crawler (`CRAWL_ENABLED=true`). See `docker-compose.yml` + `Caddyfile`.

```bash
cp .env.example .env
# DOMAIN, ACME_EMAIL, DATABASE_URL, CONFIG_SECRET, ERAI_*, CRAWL_ENABLED=true
docker compose up -d --build
```

## Cache layers

1. **Memory LRU** — decompressed ASS (optional, disposable across cold starts)
2. **PostgreSQL** — gzip-compressed ASS (`subtitle_cache`)
3. **Erai-Raws** — origin on cache miss

Sessions (`erai_session`) live in Postgres so logins survive scale-to-zero.

## Architecture notes

- Subtitle requests never crawl Erai.
- On Vercel, indexing is Cron-driven (`/api/cron/crawl`).
- Changing `CONFIG_SECRET` invalidates all stored configure tokens.
