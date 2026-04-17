# Changelog

All user-facing changes to Podda. The most recent entry is shown to users
in the "What's New" sheet on first launch after an update.

Format: one `## v<major>.<minor>.<patch> — <YYYY-MM-DD>` header per release,
followed by bullet points. `publish-update.sh` requires an entry matching
the version being published — releases without an entry fail.

## v1.0.42 — 2026-04-17

- Player redesign: compact mini bar + full-screen expanded view — tap the mini bar to open
- Scrub bar: much larger touch target with end-snap, so reaching 0:00 and the end of an episode actually works on mobile
- Variable-speed scrubbing: drag the scrubber vertically for half / quarter / fine precision, like Apple Podcasts
- Swipe down on the expanded player to collapse it
- New overflow menu (⋮) on the expanded player: Mark played, Go to podcast, Share
- Haptic feedback on scrub, speed change, sleep timer, and transport buttons (Android)
- Android hardware back button now collapses the expanded player before leaving the page

## v1.0.41 — 2026-04-17

- Sleep timer: auto-pause after 5, 15, 30, 45, or 60 minutes, or at end of episode
- Player state now persists across cold starts — reopen the app and the last episode is ready to resume
- "Continue Listening" dismiss now resets at the start of each day instead of being permanent
- Help page added — find icon and gesture reference in Settings
- "What's New" now appears once per release

## v1.0.40 — 2026-04-16

- Fix autoplay crash on episode transition (native Android)
