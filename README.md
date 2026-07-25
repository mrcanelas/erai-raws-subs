# Erai-Raws Subs

Stremio subtitle addon that serves **ASS** subtitles from [Erai-Raws](https://www.erai-raws.info), preserving karaoke, signs, fonts, and effects.

Credentials never leave the server. Stremio only receives an opaque config token.

The addon is **stateless**: subtitle bytes and Erai sessions live in **PostgreSQL** (gzip `BYTEA` + cookie jars). Suitable for [Beamup](https://github.com/Stremio/stremio-beamup-cli) (ephemeral disk).

## Local development

1. Create a free [Neon](https://neon.tech) Postgres database (or any Postgres).
2. Copy env and fill secrets:

```bash
cp .env.example .env
# DATABASE_URL, ERAI_USERNAME, ERAI_PASSWORD, CONFIG_SECRET
npm install
npx prisma db push
npm run dev
```

- Configure UI: http://127.0.0.1:7000/configure
- Manifest: http://127.0.0.1:7000/manifest.json

Generate `CONFIG_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Deploy on Beamup

Beamup is free Stremio hosting (Dokku). Disk is ephemeral — use Neon for persistence.

### Prerequisites

- GitHub account with an SSH key
- Neon `DATABASE_URL`
- [beamup-cli](https://github.com/Stremio/stremio-beamup-cli)

```bash
npm install -g beamup-cli
beamup config
# Host: a.baby-beamup.club
# GitHub username: yours
```

### App name

This repo ships a **Dockerfile**. Beamup’s Dockerfile buildpack is selected when the project name contains `docker`, e.g. `erai-raws-subs-docker`.

### Deploy

```bash
# From the repo root — first run creates the Beamup app + git remote
beamup
```

Set secrets (replace the public URL with the one Beamup prints):

```bash
beamup secrets DATABASE_URL "postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
beamup secrets CONFIG_SECRET "$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
beamup secrets ERAI_USERNAME "your-erai-email"
beamup secrets ERAI_PASSWORD "your-erai-password"
beamup secrets ADDON_PUBLIC_URL "https://<github-user>-erai-raws-subs-docker.a.baby-beamup.club"
beamup secrets CONFIGURATION_REQUIRED "true"
```

- `CONFIG_SECRET` — encrypts user credentials from `/configure`
- `ERAI_USERNAME` / `ERAI_PASSWORD` — **crawler** indexing only (not sent to Stremio)
- `CONFIGURATION_REQUIRED=true` — Stremio still opens `/configure` even with crawler secrets

Redeploy after secrets:

```bash
beamup
# or: git push beamup master
beamup logs
```

Open `https://<your-addon>.a.baby-beamup.club/configure`, sign in, install the Stremio link.

## Cache layers

1. **Memory LRU** — decompressed ASS (optional, disposable)
2. **PostgreSQL** — gzip-compressed ASS (`subtitle_cache`)
3. **Erai-Raws** — origin on cache miss

Sessions (`erai_session`) are also stored in Postgres so logins survive container restarts.

## Architecture notes

- Subtitle requests never crawl Erai; the indexer runs on a schedule inside the addon process.
- Changing `CONFIG_SECRET` invalidates all stored configure tokens.
