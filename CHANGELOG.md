# Changelog

All notable changes to NexusLib are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Deploy versions for the Apps Script web app are noted per entry.

## [Unreleased]

### Improved (web verifications 2026-11-27)

- Service Worker: navegaciones ahora network-first con fallback a cache (estandar web.dev/MDN) — el HTML ya no queda stale tras un deploy; assets siguen cache-first.
- OpenLibrary: User-Agent identificado (app + repo URL) en TODOS los fetchers de providers.ts y book-editions — antes iban sin UA (rate limit base 1 req/s, riesgo de block). Email de contacto incluido (angellrnzo@gmail.com) -> rate limit OL 3x activo.
- Verificado sin cambios: Steam appdetails sigue keyless/vivo; AniList en rate limit degradado 30 req/min (uso actual muy por debajo); pg_cron+pg_net disponibles en Supabase free tier (scheduler TTL refresh ya no esta bloqueado por plataforma).

### Fixed (critical visual regression)

- `:root` CSS vars quedaron auto-referenciadas (`--text: var(--text)`) tras el sweep de tokens -> todo el texto invisible (negro sobre fondo oscuro). Valores literales restaurados; SW v61.

### Security (RLS hardening)

- library_links: la policy 'for all' permitia al lado invitado UPDATE/DELETE sobre la fila del owner (auto-aceptar links, exponer visibility/tracking ajeno). Nueva migracion 07_links_rls_fix.sql con policies granulares: SELECT ambos lados, UPDATE/DELETE solo owner_library_id, INSERT denegado (solo RPCs security definer). Aplicada a prod.
- Editor de visibilidad: la direccion 'in' (lo que el otro comparte) ahora es solo lectura — el owner es quien controla su exposicion.

### Fixed (Edge Functions audit)

- i18n capa 2 completada: steam-updates y book-editions aceptan lang (updates/news en ingles, idiomas de ediciones EN); steam-reviews devuelve tier_idx language-neutral y el frontend lo traduce via STR.
- Frontend pasa lang: NEXUS_LANG a las 3 functions que faltaban; toLocaleString/toLocaleDateString ya no hardcodean 'es'.
- catalog-add: check "ya existe" ahora usa el external_id canonico post-metadata — re-anadir por ISBN o MAL ya no miente "Anadido!".
- Hardening: query/idOrUrlOrName con cap de longitud en catalog-search/catalog-add.

### Fixed (visual/responsive audit)

- Tracking accordion: single-persona items now span full modal width (`.tracking-container.single`).
- Match modal grid: `minmax(110px,1fr)` under 600px so phones get 2 columns instead of 1.
- `.stat-detail-line`: `overflow-wrap:anywhere` prevents overflow with long unbroken titles.
- Unified residual `#ff6b6b` rgba values to `--danger-text` (#ff8585).

### Added (i18n ES/EN — Phase 2.5 complete)

- Full UI internationalization: `STR` dictionary (338 keys, ES/EN parity), `t()`/`tf()` interpolation, `data-i18n`/`data-i18n-ph`/`data-i18n-title` static pass, `catText()` per-category labels/placeholders.
- Language toggle (English/Español) in the hamburger menu; persisted in `localStorage nexus_lang`.
- `metaTr()`/`metaTrList()` render-time translation of closed-vocabulary metadata (genres, platforms, statuses, demographics) — DB keeps canonical Spanish.
- Edge Functions `catalog-search`/`catalog-add`/`item-refresh` accept `lang` and fetch provider metadata in the UI language (Steam `l=`, TMDB `language=`, OL fields); frontend sends `NEXUS_LANG`.
- `TESTING.md`: absolute E2E checklist (~90 checkpoints) for the pre-deploy round.

### Changed (UI/UX iteration — beta)

- Profile editing is now an inline accordion (`.perfil-accordion`) instead of a modal: public name + editable unique username, centered invite-code field with copy button, sign-out/save actions.
- Unified "accordion-unit" pattern for expandable sections: `.player-accordion` (per-persona, accent = persona color), `.mods-accordion` and `.perfil-accordion` (single bordered container, section-colored ring+glow when open). Trailer/updates/reviews bars unchanged.
- Stats: "Balance y Retos" card spans full grid width with two columns; card details respect the persona selector and hide redundant persona names when a single persona is selected.

### Changed (Mods Tracker UI refinement — 2026-11-26)

- Layout reorganizado: Nombre/Fuente/Versión en fila de 3 columnas proporcional (2fr 1.2fr 1fr), URL full-width debajo, Notas full-width debajo. Responsive: apilar en 1 columna bajo 600px.
- Espaciado uniforme: gap 10px vertical/horizontal, padding inputs 10px 12px, notas min-height 80px (expandible).
- Botón Guardar mod: validación en tiempo real (deshabilitado hasta Nombre+URL llenos, Nota opcional), estado apagado (opacity 0.4), hover funcional con glow morado y borde visible.
- Acordeón Mods: animación reforzada al abrir (box-shadow glow), botón "Mods" del acordeón con estilo morado consistente.
- Bordes/buttons: uniformidad con acordeón (border-radius 12px, borde sutil, hover glow sin ring 0 0 0 1px para evitar doble borde).
- Icono papelera en mods: hover con fondo rojo y texto rojo (ya implementado).
- Share button renamed to "Vínculos" with green accent matching the menu.
- Responsive hardening: dynamic header spacing (`nexusSyncHeaderSpace`), 16px inputs on mobile (iOS zoom fix), larger touch targets, bottom-sheet modals with scroll-lock.
- Multi-provider cover `srcset`/`sizes` (OpenLibrary `-S/-M/-L`, TMDB `w342–w780`, Steam header/capsule) via `nexusCoverSrcset`/`nexusCoverFull`; Cine/Series sub-filter moved into the filter panel ("Tipo" group).
- Supabase GitHub integration configured (prod + standby → `main`): Edge Functions auto-deploy on merge; manual deploy no longer needed.
- Dead Apps Script path removed from `RUN` (`RUN = nexusRun`); Sheets code frozen in `WebAPP.legacy.gs`.
- Supabase free-tier pause handling: `cargarCategoria` detects wake/network errors, shows `err.pause` state and auto-retries once after 35 s.
- Fixed: global string replacements had poisoned `STR` dictionary values with self-referencing `t()` calls (would have crashed the whole script at runtime); restored literals.
- Fixed: `nexusRun._exec` returned `undefined`, so post-call chaining `RUN.method(...).withFailureHandler(fn)` threw a TypeError — tracking error toasts never fired. `_exec` now returns a chainable promise; all 11 methods return it.
- i18n sweep 2: stats-bar pills (`Mostrando`/`Deseados`/`completados`), remaining `toast.savefail` literals.
- Visual token unification: new CSS vars `--muted`, `--bright`, `--danger-text`, `--links`, `--mods`, `--on-accent`, `--positive`; ~44 style contexts migrated from hardcoded hexes. JS color data (persona palette, badge colors, review scale) intentionally kept as hex for alpha-suffix concatenation. Dead symbols `i-check`/`i-stats` removed.
- Bug sweep 3: username change now clears `media_lib_*` caches and reloads (persona suffixes derive from username — stale cache showed wrong personas); stats aggregation respects `visible{Persona}` privacy flag (private items no longer counted); Match modal filters out personas hidden from viewer; `Error:` prefixes in share/send panels via `t('err.prefix')`.

### Added (shell PWA — pre-launch checklist)

- `robots.txt` + `sitemap.xml` for the GitHub Pages shell.
- `404.html` custom error page matching the app theme.
- Meta description + Open Graph/Twitter card tags in `index.html` (social preview uses `icons/icon-512.png`).
- `window.onerror` / `unhandledrejection` logging in the shell.
- `icons/icon-192.png` is now a real 192×192 render (was a 512×512 file mislabeled in the manifest; 18.9 KB vs 33.5 KB).
- Service worker cache bumped to `v5` so clients pick up the new shell.

### Planned (see `AppScript/road.md`)

- ~~Phase 2 motion system~~ — DONE (snap+dots, spring easing, lightbox, a11y, optimistic UI, state boxes)
- ~~Phase 2.5 i18n~~ — DONE (see Added above; pending: user EN review)
- ~~Phase 3~~ — DONE (`fetchAll`, health check, offline read-only, Mods Tracker, Steam Reviews, Update History, Book Editions verified)
- ~~Phase 3.5~~ — DONE (release calendar + Balance y Retos stats)
- Phase 4: Supabase migration in progress — data migrated, auth live, per-category frontend cut; deploy pending (`beta`→`main`)
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
