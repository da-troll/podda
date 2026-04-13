# CLAUDE.md — Podda

Podda is a self-hosted family podcast app. React + TypeScript frontend, Node.js/Express backend, PostgreSQL. Served at `pod.trollefsen.com`.

---

## Before You Touch Anything

- Read this file fully before making changes.
- The companion mobile project is at `/opt/apps/podda-mobile`. Web changes that affect UX **also need a new APK** — see the release checklist below.
- Direct push to `master` is blocked. All changes go through feature branches + PRs. Merge them yourself (`gh pr merge --merge --delete-branch`).

---

## Build Commands

**⚠️ Never run `npm run build` directly.** Use the build script:

```bash
build-podda
```

This runs the Vite build, then restores `podda-app-version.json` from shared images (wiped by every build), then restarts the systemd service. Raw `npm run build` breaks the info page.

**Rule for static assets:**
- Survives builds automatically → put in `public/` (committed to git, copied by Vite)
- Generated/runtime files that can't be committed → put in `~/workspaces/shared/images/`, restored by `build-podda`

---

## Architecture

```
/opt/apps/podda/
├── src/
│   ├── App.tsx              # Root — routing, sidebar state, swipe gesture, onboarding hints
│   ├── app.css              # All styles — design system tokens at top
│   ├── components/          # Shared UI components
│   ├── hooks/               # Custom hooks (useAuth, usePlayer, useSwipeGesture)
│   ├── pages/               # Page components (Library, History, etc.)
│   └── types.ts             # Shared TypeScript types
├── server/
│   ├── index.cjs            # Express server entry point
│   ├── routes/              # API route handlers
│   ├── db.cjs               # DB pool + schema init
│   └── poller.cjs           # RSS feed poller
└── public/                  # Static assets that survive builds (info.html, icons, etc.)
```

**Server:** Node.js/Express, runs as `podda.service` (systemd user service). Serves both the API and static frontend from `dist/`.

**Database:** PostgreSQL (same Postgres container as n8n). Schema auto-migrated on server start.

---

## Design System

All colours use CSS variables defined in `:root` at the top of `app.css`:

| Variable | Use |
|----------|-----|
| `--accent` | Primary brand colour (indigo `#6366f1`) |
| `--accent-05` … `--accent-55` | Opacity steps |
| `--bg`, `--bg-surface`, `--bg-hover` | Background layers |
| `--text`, `--text-muted` | Text colours |
| `--glass-border` | Glassmorphism borders |

**Never hardcode `rgba(99, 102, 241, …)`.** Always use the variables. If you add a new colour, add a variable first.

---

## Onboarding Hints (Coach Marks) — MANDATORY PATTERN

Whenever a **new gesture, hidden feature, or non-obvious interaction** is introduced, you **must ask Daniel** whether an onboarding hint is needed before shipping.

### The pattern

Use `src/components/SwipeHint.tsx` as the reference implementation. The pattern is:

1. **Component** — full-screen portal overlay (`createPortal(…, document.body)`), dark backdrop, animated visual cue, short instruction text, "Tap anywhere to dismiss"
2. **Persistence** — `localStorage` key named `podda:hint-<feature>-v<N>` (e.g. `podda:swipe-hint-v1`)
3. **Check** — `!localStorage.getItem(key)` → show; on dismiss → `localStorage.setItem(key, '1')`
4. **Wire-up** — state in `App.tsx` (or the relevant parent), initialised lazily from localStorage
5. **Re-trigger on future change** — increment the key version (`v1` → `v2`). Never reuse the same key for a different hint.

### Checklist for new features

Before shipping any new feature, ask:
- [ ] Is there a gesture or non-obvious interaction the user needs to discover?
- [ ] If yes → build a coach mark overlay following the pattern above
- [ ] Key name decided and agreed with Daniel
- [ ] Overlay dismissed by the relevant action OR by tapping anywhere
- [ ] Tested by clearing the key in DevTools (`localStorage.removeItem('podda:hint-…')`) and reloading

---

## APK Release Checklist

Any web change that affects UX needs a new APK. Full steps:

```bash
# 1. Build and verify web changes
build-podda

# 2. Bump version (updates version JSON, updateChecker.ts, build.gradle, index.ts)
cd /opt/apps/podda-mobile
bash scripts/publish-update.sh 1.0.X "Short changelog"

# 3. Sync web into Android project (builds from GitHub master — commit+push first)
bash scripts/sync-web.sh

# 4. Build signed release APK (must source .env in same shell invocation)
set -a && source .env && set +a && cd android && ./gradlew clean assembleRelease

# 5. Copy APK to shared images
cp android/app/build/outputs/apk/release/app-release.apk \
   ~/workspaces/shared/images/podda-v1.0.X.apk

# 6. Trash previous version's APK
gio trash ~/workspaces/shared/images/podda-v1.0.<PREV>.apk

# 7. Commit version bump (feature branch + PR)
git checkout -b chore/bump-1.0.X
git add android/app/build.gradle src/native/index.ts src/native/updateChecker.ts
git commit -m "chore: bump to v1.0.X — <description>"
git push origin chore/bump-1.0.X
gh pr create … && gh pr merge --merge --delete-branch

# 8. Tag and push
git checkout master && git pull origin master
git tag -a v1.0.X -m "v1.0.X — <description>"
git push origin v1.0.X

# 9. GitHub release with APK attached
gh release create v1.0.X ~/workspaces/shared/images/podda-v1.0.X.apk \
  --repo da-troll/podda-mobile \
  --title "v1.0.X" \
  --notes "- What changed"
```

**Key rule:** `sync-web.sh` builds from **GitHub master**, not local `dist/`. Always commit and push web changes before syncing.

---

## Key Files

| Path | Purpose |
|------|---------|
| `/opt/apps/podda/public/info.html` | APK download page at `pod.trollefsen.com/info.html` — lives in `public/`, survives builds |
| `~/workspaces/shared/images/podda-app-version.json` | Version manifest fetched by `info.html` and the in-app update checker |
| `~/bin/build-podda` | The canonical build script |
| `/opt/apps/podda-mobile/scripts/publish-update.sh` | Bumps all version numbers and syncs JSON |
| `/opt/apps/podda-mobile/scripts/sync-web.sh` | Clones + builds podda web from GitHub, syncs to Android |
| `/home/eve/.config/systemd/user/podda.service` | Podda systemd service |

---

## Git Conventions

- **Podda web** (`da-troll/podda`): direct push to master blocked → feature branches + PRs
- **Podda mobile** (`da-troll/podda-mobile`): same — feature branches + PRs
- **Annotated tags only** (`git tag -a`) — no lightweight tags
- **Co-author line:** `Co-Authored-By: Wilson <wilson@trollefsen.household>`
- **GitHub release** for every APK tag, with APK attached as asset

---

## Gotchas

- `sync-web.sh` builds from **GitHub**, not your local `dist/`. Push before syncing.
- `npm run build` wipes `dist/` — always use `build-podda`.
- Podda server does **not** need restart for frontend-only changes (Express serves files from disk). `build-podda` restarts it anyway for safety.
- Modal overlays **must** use `createPortal(…, document.body)` — anything rendered inside the sidebar or a nested component will be clipped to that stacking context.
- Gradle must be invoked with `.env` sourced in the **same shell call** — env vars don't survive between separate Bash tool calls.
