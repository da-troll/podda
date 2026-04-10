# PappaPod

Self-hosted family podcast app. Subscribe to RSS feeds, discover new podcasts via iTunes search, stream episodes directly from publisher CDNs, and track listening progress across devices.

Built as a Castbox replacement for the Trollefsen household.

**Live:** https://pod.trollefsen.com

## Features

- **Podcast subscriptions** — subscribe by RSS URL or search iTunes
- **OPML import** — migrate from Castbox/Pocket Casts/any podcast app in one click
- **Multi-user** — each family member gets their own subscriptions, listen progress, and queue
- **Persistent audio player** — play/pause, skip 15s, playback speed (0.5x–3x), seekable progress bar
- **Progress tracking** — saves position every 15s, on pause, and on page unload (via `sendBeacon`)
- **Background feed polling** — checks all subscriptions every 30 minutes for new episodes
- **Feed resilience** — follows 301 redirects, detects `itunes:new-feed-url`, GUID fallback for broken feeds, 10s fetch timeout with error backoff
- **Media Session API** — lock screen controls on mobile (title, artwork, play/pause/seek)
- **Mobile responsive** — collapsible sidebar, works on phone browsers
- **Hash-based routing** — hardware back button works correctly on mobile/PWA
- **Direct CDN streaming** — no audio proxying, bypasses middleman ad-insertion

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Backend | Express 5 (CommonJS) |
| Database | PostgreSQL 16 |
| RSS | rss-parser |
| Audio | Native HTML5 `<audio>` |
| Auth | express-session + bcrypt + connect-pg-simple |
| Icons | lucide-react |
| Process | systemd user service |
| Proxy | Caddy (auto TLS) |

No ORM. No CSS framework. No router library. No state management library. ~222 KB gzipped frontend bundle.

## Project Structure

```
/opt/apps/pappapod/
├── server/
│   ├── index.cjs          Express entry, middleware, static serving, feed poller
│   ├── db.cjs             PostgreSQL pool, schema migration
│   ├── auth.cjs           Session auth, bcrypt, login/logout
│   ├── feed-utils.cjs     RSS fetch, duration parsing, GUID fallback
│   ├── poller.cjs         Background feed refresh (30min interval)
│   └── routes/
│       ├── podcasts.cjs   Subscribe, unsubscribe, list, refresh, OPML import
│       ├── episodes.cjs   Episode listing, detail, recent across subscriptions
│       ├── player.cjs     Progress upsert/load, in-progress list
│       └── search.cjs     iTunes Search API proxy
├── src/
│   ├── App.tsx            Root component, hash router, contexts
│   ├── main.tsx           React entry
│   ├── app.css            All styles (single file)
│   ├── api.ts             Fetch wrapper for all API calls
│   ├── types.ts           Shared TypeScript types
│   ├── hooks/
│   │   ├── usePlayer.ts   Audio state, progress persistence, Media Session API
│   │   └── useAuth.ts     Auth state, login/logout
│   ├── components/
│   │   ├── Player.tsx     Persistent bottom audio player
│   │   ├── EpisodeRow.tsx Episode list item with play button + progress
│   │   └── Sidebar.tsx    Navigation sidebar
│   └── pages/
│       ├── Library.tsx    Subscribed podcasts grid + recent episodes
│       ├── PodcastDetail.tsx  Episode list for one podcast
│       ├── Discover.tsx   iTunes search + direct URL subscribe
│       ├── Settings.tsx   OPML import, account info
│       └── Login.tsx      Login form
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── build.sh
└── .env                   (not committed)
```

## Database Schema

Six tables, all using `TIMESTAMPTZ` and `ON DELETE CASCADE`:

- **users** — family accounts (username, bcrypt hash, admin flag)
- **podcasts** — shared RSS feeds (feed URL, title, artwork, polling metadata)
- **episodes** — shared episodes keyed by `(podcast_id, guid)`
- **subscriptions** — per-user podcast subscriptions
- **listen_progress** — per-user, per-episode playback position
- **queue** — per-user ordered play queue
- **session** — PostgreSQL-backed session store (connect-pg-simple)

Schema auto-migrates on server startup.

## API

All endpoints require authentication via session cookie (except login).

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` | Authenticate |
| POST | `/api/auth/logout` | End session |
| GET | `/api/auth/me` | Current user |
| GET | `/api/podcasts` | User's subscribed podcasts |
| POST | `/api/podcasts/subscribe` | Subscribe to RSS feed |
| DELETE | `/api/podcasts/:id/unsubscribe` | Remove subscription |
| POST | `/api/podcasts/:id/refresh` | Force re-fetch feed |
| POST | `/api/podcasts/import-opml` | Bulk import from OPML XML |
| GET | `/api/episodes/podcast/:id` | Episodes for one podcast (paginated) |
| GET | `/api/episodes/recent` | Recent episodes across all subscriptions |
| GET | `/api/episodes/:id` | Single episode detail |
| PUT | `/api/progress/:episodeId` | Save listen position |
| GET | `/api/progress/in-progress` | Episodes with partial progress |
| GET | `/api/search?q=term` | iTunes podcast search proxy |

## Deployment

### Prerequisites

- Node.js 22+
- PostgreSQL 16 (accessible from the host)
- Caddy reverse proxy (for HTTPS)

### Setup

```bash
# 1. Clone
git clone git@github.com:da-troll/pappapod.git /opt/apps/pappapod
cd /opt/apps/pappapod

# 2. Install dependencies
npm install

# 3. Create database
psql -U postgres -c "CREATE ROLE pappapod WITH LOGIN PASSWORD 'your_password';"
psql -U postgres -c "CREATE DATABASE pappapod OWNER pappapod;"

# 4. Configure environment
cp .env.example .env
# Edit .env with your database credentials, session secret, admin user

# 5. Build frontend
npm run build

# 6. Start
node server/index.cjs
# Or use the systemd service (see below)
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 18892) |
| `PGUSER` | Yes | PostgreSQL username |
| `PGPASSWORD` | Yes | PostgreSQL password |
| `PGHOST` | Yes | PostgreSQL host |
| `PGPORT` | No | PostgreSQL port (default: 5432) |
| `PGDATABASE` | Yes | PostgreSQL database name |
| `SESSION_SECRET` | Yes | Session encryption secret |
| `ADMIN_USERNAME` | No | Seed admin user on first run |
| `ADMIN_PASSWORD` | No | Seed admin password on first run |

### Systemd Service

```ini
# ~/.config/systemd/user/pappapod.service
[Unit]
Description=PappaPod - Family Podcast App
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/apps/pappapod
EnvironmentFile=/opt/apps/pappapod/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /opt/apps/pappapod/server/index.cjs
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now pappapod
```

### Caddy Configuration

```caddyfile
pod.trollefsen.com {
    encode gzip zstd

    @api path /api/*
    handle @api {
        reverse_proxy host.docker.internal:18892
    }

    handle {
        root * /opt/apps/pappapod/dist
        try_files {path} /index.html
        file_server
    }
}
```

### Build Script

```bash
~/bin/build-pappapod   # Builds frontend + restarts service
```

## Development

```bash
# Terminal 1: Backend
node server/index.cjs

# Terminal 2: Frontend (with HMR + API proxy)
npm run dev
```

Vite proxies `/api` requests to `localhost:18892` during development.

## License

Private. Trollefsen household use only.
