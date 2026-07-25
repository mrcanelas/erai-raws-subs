# Erai-Raws Subs

Stremio subtitle addon that serves **ASS** subtitles from [Erai-Raws](https://www.erai-raws.info), preserving karaoke, signs, fonts, and effects.

Credentials never leave the server. Stremio only receives an opaque config token.

Subtitles and Erai sessions are stored in **PostgreSQL** (gzip `BYTEA` + cookie jars). The crawler runs **inside** the addon process.

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

## Deploy on OVHcloud (recommended)

Stack: **Docker Compose** (addon + Caddy) with automatic HTTPS. Crawler is enabled in-process (`CRAWL_ENABLED=true`).

### 1. Create the VPS

- Plan: **VPS-1 2027** (2 vCPU / 4 GB / 40 GB NVMe is enough)
- OS: **Ubuntu 24.04**
- Open firewall / security group for **TCP 22, 80, 443**

### 2. Point DNS

Create an `A` record for your domain (e.g. `erai.example.com`) to the VPS public IPv4. Wait for propagation before starting Caddy.

### 3. Install Docker on the VPS

```bash
sudo apt update
sudo apt install -y ca-certificates curl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
# log out and back in so docker works without sudo
```

### 4. Clone and configure

```bash
git clone https://github.com/mrcanelas/erai-raws-subs.git
cd erai-raws-subs
cp .env.example .env
nano .env
```

Fill at least:

```bash
DOMAIN=erai.example.com
ACME_EMAIL=you@example.com
ADDON_PUBLIC_URL=https://erai.example.com
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
CONFIG_SECRET=...          # long random hex
ERAI_USERNAME=...          # crawler account
ERAI_PASSWORD=...
CONFIGURATION_REQUIRED=true
CRAWL_ENABLED=true
CRAWL_RUN_ON_START=true
```

### 5. Start

```bash
docker compose up -d --build
docker compose logs -f
```

Caddy issues the Let's Encrypt certificate on first boot (~30s after DNS is correct).

### 6. Verify

```bash
curl -I https://erai.example.com/health
curl -I https://erai.example.com/manifest.json
curl -I https://erai.example.com/configure
```

Open `/configure`, sign in with your Erai account, install the Stremio link.

### Updating

```bash
cd erai-raws-subs
git pull
docker compose up -d --build
```

### Useful commands

```bash
docker compose ps
docker compose logs -f addon
docker compose restart addon
```

## Cache layers

1. **Memory LRU** — decompressed ASS (optional, disposable)
2. **PostgreSQL** — gzip-compressed ASS (`subtitle_cache`)
3. **Erai-Raws** — origin on cache miss

Sessions (`erai_session`) are also stored in Postgres so logins survive container restarts.

## Architecture notes

- Subtitle requests never crawl Erai; the indexer runs on a schedule inside the addon process.
- Changing `CONFIG_SECRET` invalidates all stored configure tokens.
- Neon (or any Postgres) is required; the VPS disk is only for Docker/Caddy state.
