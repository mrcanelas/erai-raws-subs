# AGENTS.md

# Erai-Raws Stremio Subtitle Addon

## Project Goal

Develop a Stremio subtitle addon that provides ASS subtitles from Erai-Raws.

Unlike generic subtitle providers, this addon preserves styled ASS subtitles exactly as released by Erai-Raws, including karaoke, signs, positioning, fonts and effects.

The addon exposes subtitles using the official Stremio Subtitle API.

---

# Core Principles

- Never crawl Erai-Raws during subtitle requests.
- Never expose Erai URLs to Stremio clients.
- Never expose authentication cookies.
- Always preserve ASS subtitles without conversion.
- Prefer deterministic ID matching over fuzzy matching.
- Cache aggressively.
- Every component must be independently testable.

---

# High Level Architecture

```text
                     +----------------------+
                     |      Stremio         |
                     +----------+-----------+
                                |
                                |
                    subtitles/{type}/{id}.json
                                |
                                ▼
                     +----------------------+
                     |    Subtitle Addon    |
                     +----------+-----------+
                                |
               +----------------+----------------+
               |                                 |
               ▼                                 ▼
      Metadata Resolver                 Subtitle Resolver
               |                                 |
               ▼                                 ▼
      IMDb → Kitsu Cache                 PostgreSQL / Redis
               |                                 |
               +----------------+----------------+
                                |
                                ▼
                          Erai Client
                                |
                                ▼
                      https://www.erai-raws.info
```

---

# Components

## 1. Erai Client

Responsible for every interaction with Erai-Raws.

Responsibilities

- Login
- Cookie management
- Session renewal
- Directory browsing
- Subtitle downloads

No other module should communicate directly with Erai.

---

## 2. Crawler

Runs periodically.

Responsibilities

- Browse all directories
- Detect new anime
- Detect new episodes
- Detect new languages
- Detect removed subtitles
- Update database

Never executed during subtitle requests.

---

## 3. Metadata Resolver

Responsible for mapping metadata.

Preferred order

```
IMDb
    ↓
Local cache
    ↓
imdb_mapping.json
    ↓
Kitsu API
    ↓
AniList
    ↓
TMDB
    ↓
TVDB
```

Never perform expensive metadata lookups during subtitle requests.

---

## 4. Subtitle Resolver

Receives

```
tt1234567:season:episode
```

Returns

```
Subtitle IDs

↓

Cached subtitle

or

Erai download
```

---

# Authentication

Authentication uses the standard WordPress login endpoint.

```
POST /account-login/
```

Payload

```
log
pwd
rememberme
wp-submit
redirect_to
testcookie
```

The implementation must use a persistent CookieJar.

Never manually build Cookie headers.

Required cookies include

- wordpress_logged_in
- PHPSESSID
- __ddg8__
- __ddg9__
- __ddg10__

If authentication expires

- automatically login again
- retry the request

---

# HTTP Client

Preferred libraries

- undici
- got
- tough-cookie

Requirements

- Brotli support
- gzip support
- Redirect support
- Cookie persistence
- Browser User-Agent

Avoid Puppeteer unless absolutely necessary.

---

# DDoS Guard

Erai is protected by DDoS Guard.

The client must preserve

- cookies
- redirects
- browser headers

Do not attempt to bypass DDoS protection.

Behave like a normal browser.

---

# Database

## anime

```
id

imdb

kitsu

anilist

mal

tmdb

tvdb

canonical_title

aliases (json)

start_date

episode_count
```

---

## subtitles

```
id

anime_id

season

episode

language

release

file_name

hash

download_url

cached_path

cached

last_verified
```

---

## sync_state

```
last_sync

last_directory

status
```

---

# Metadata Sources

Priority

1. Local cache

2. IMDb → Kitsu mapping

https://github.com/TheBeastLT/stremio-kitsu-anime

3. Kitsu API

4. AniList

5. TMDB

6. TVDB

Never rely solely on title matching.

---

# Title Matching

Collect every available title.

Examples

- canonical title
- English
- Japanese
- Romaji
- slug
- abbreviated titles
- aliases

Normalize

- lowercase
- remove punctuation
- remove accents
- collapse whitespace

Only use fuzzy matching as the final fallback.

---

# Crawling Strategy

Crawler recursively indexes

```
Sub

↓

Year

↓

Season

↓

Anime

↓

Episode Range

↓

Language

↓

Subtitle Files
```

The crawler must be incremental.

Never rebuild the entire database unnecessarily.

---

# Language Detection

Language should always come from the directory name.

Examples

```
Portuguese(Brazil)

English

Spanish

French

Italian
```

Avoid guessing language from filenames.

---

# Subtitle Delivery

## IMPORTANT

The Stremio Subtitle API cannot send authentication cookies.

Unlike Streams, subtitles do **not** support proxy headers or custom request headers.

Therefore **the addon must never return direct Erai-Raws URLs**.

Instead, every subtitle must be served through the addon itself.

Flow

```
Stremio

↓

Addon

↓

Erai Client

↓

ASS subtitle

↓

Addon

↓

Stremio
```

The addon acts as an authenticated reverse proxy.

Cookies never leave the server.

---

# Subtitle Cache

Downloaded subtitles should be cached locally.

Flow

```
First request

Stremio

↓

Addon

↓

Erai

↓

Cache

↓

Stremio
```

Subsequent requests

```
Stremio

↓

Cache

↓

Stremio
```

Benefits

- avoids repeated downloads
- minimizes Erai traffic
- reduces DDoS Guard interactions
- faster responses
- subtitles remain available if Erai is temporarily offline

Recommended cache backends

- Local filesystem
- Cloudflare R2
- S3-compatible storage

The cache should be considered the primary serving layer.

Erai should be treated as the origin server.

---

# Stremio API

Manifest

Resources

```
subtitles
```

Supported types

```
movie

series
```

Example

```json
{
  "subtitles": [
    {
      "id": "erai-123",
      "lang": "por",
      "url": "https://addon.example/subtitle/erai-123",
      "label": "Portuguese (Brazil) • Erai-Raws • ASS"
    }
  ]
}
```

The subtitle endpoint

```
GET /subtitle/:id
```

must

- authenticate if necessary
- download if not cached
- cache the subtitle
- stream or return the cached file

Never expose Erai URLs.

Never expose cookies.

Never redirect clients to Erai.

---

# Error Handling

Authentication expired

→ login again

403

→ refresh session

404

→ subtitle removed

Timeout

→ retry

Unexpected HTML

→ log the error

Crawler failures must never stop the synchronization process.

---

# Logging

Use structured logs.

Include

- login
- cookie renewal
- crawler
- metadata resolution
- subtitle lookup
- cache hit
- cache miss
- download
- retries

---

# Testing

Include tests for

- WordPress login
- Cookie persistence
- Automatic session renewal
- Metadata resolver
- Parser
- Crawler
- Subtitle matching
- Cache
- Subtitle proxy endpoint
- Stremio Subtitle API responses

---

# Future Improvements

- Multi-provider subtitle support
- User language preferences
- Automatic subtitle integrity verification
- Cloudflare R2 integration
- Redis distributed cache
- Incremental metadata synchronization
- Automatic IMDb mapping generation
- Shared metadata service for other Stremio addons

---

# Development Principles

- Request latency should remain under 100ms for cached subtitles.
- Never crawl Erai during user requests.
- Never expose authentication cookies.
- Never expose Erai download URLs.
- Preserve ASS subtitles exactly as released.
- Cache aggressively.
- Prefer IDs over title matching.
- Favor deterministic behavior over heuristics.
- Build reusable metadata components for future addons.
- Keep the architecture modular and independently testable.