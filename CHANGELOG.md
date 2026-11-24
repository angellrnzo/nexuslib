# Changelog

All notable changes to NexusLib are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Deploy versions for the Apps Script web app are noted per entry.

## [Unreleased]

### Added (shell PWA — pre-launch checklist)

- `robots.txt` + `sitemap.xml` for the GitHub Pages shell.
- `404.html` custom error page matching the app theme.
- Meta description + Open Graph/Twitter card tags in `index.html` (social preview uses `icons/icon-512.png`).
- `window.onerror` / `unhandledrejection` logging in the shell.
- `icons/icon-192.png` is now a real 192×192 render (was a 512×512 file mislabeled in the manifest; 18.9 KB vs 33.5 KB).
- Service worker cache bumped to `v5` so clients pick up the new shell.

### Planned (see `AppScript/road.md`)

- Phase 2: motion system (skeleton shimmer, spring easing, directional tabs, double-tap heart, bottom sheet, scroll-snap) + in-app image lightbox viewer for screenshots
- Phase 2.5: UI i18n — Spanish/English toggle, ES default on open; all new features ship with i18n keys
- Phase 3: `fetchAll` parallelization, API health check, offline read-only, Game Mods Tracker, Steam Reviews breakdown, Game Update History (Steam patch log), Book Editions browser (Open Library editions by translator)
- Phase 3.5: wishlist release calendar, annual stats/goals
- Phase 4+: Supabase migration (the v1→v2 cut), **email-only auth** (password + magic link, no OAuth) + optional TOTP 2FA, user profiles with privacy settings, library links + per-relationship visibility + `is_private`, **shared zone** (zona conjunta — communal library per link), lightweight social layer (Phase 5D toques), activity feed, bulk import, "my edition" ownership field, Capacitor APK
- Phase 7 candidates (⭐ optional, high interest): Coleccionables category (LEGO/board games/figures/puzzles, `manual` provider) and Podcasts (RSS episodic)

## [1.9.0] — 2026-11-21

### Fixed

- Android back button on the top search now dismisses progressively: closes keyboard → removes focus → only then exits the app (was: exited immediately).
- Patch-note dates (`[YYYY-MM-DD]` prefixes) hidden in the game detail modal; raw data preserved in the Sheet.
- Detail/trash/match modals reset scroll position to top on open and close.
- `line-clamp` standard property added alongside `-webkit-line-clamp` for card titles.

### Changed

- PWA icons relocated to `icons/` directory; service-worker cache bumped to `nexuslib-cache-v4`.
- Roadmap reorganized with explicit v1→v2 cut-over rule (Phase 4 = the cut) and benchmark analysis vs Backloggd/Trakt.

## [1.8.x] — earlier

### Added

- Game Mods Tracker spec (per-user mod lists per game, version-grouped, Nexus/Workshop/CurseForge/URL sources) — documented, pending implementation.
- Steam review statistics spec (5-block diverging chart + 30-day trend, store-page scraping since `appreviews` endpoint is dead).
- Per-relationship library linking spec (link_type tags + per-link visibility matrix + per-item `is_private`) for v2.

[Unreleased]: https://github.com/angellrnzo/nexuslib/compare/main...HEAD
[1.9.0]: https://github.com/angellrnzo/nexuslib/releases/tag/v1.9.0
