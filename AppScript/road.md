# 🌌 NexusLib — Overview & Roadmap

## Project Overview

**NexusLib** is a collaborative multimedia Progressive Web App (PWA) for tracking video games, movies, series, books, and manga — evolving into a native Android app.

| Layer | v1 (Current) | v2 (Target) |
| :--- | :--- | :--- |
| **Database** | Google Sheets | Cloud PostgreSQL (Supabase) |
| **Backend / API** | Google Apps Script (`WebAPP.gs`) | Edge Functions / Cloudflare Workers |
| **Frontend** | SPA in iframe shell (`Index.html`) | Same SPA via Capacitor Android WebView |
| **Hosting & CI/CD** | GitHub Pages + Actions (weekly `.xlsx` backups) | + automated signed `.apk` releases |

> 📖 Deep technical detail for v2 (schema, guardrails, APK pipeline) lives in [WIKI.md](../WIKI.md#7-v2-target-architecture--roadmap). Full SQL DDL will live in `database/schema.sql` once Phase 4 starts.

---

## 🏗️ Architecture & Components (v1 — Current)

### PWA Shell (GitHub Pages)

- **`index.html`** — Secure container embedding the main app via iframe.
- **`manifest.json` & `service-worker.js`** — Home-screen installability and offline caching of shell resources (`nexuslib-cache-v2`).

### Main Application (SPA)

- **`AppScript/Index.html`** — Vanilla JS SPA: swipe navigation, multi-criteria filtering, instant search, detail modals, per-user tracking.

### Backend & API

- **`AppScript/WebAPP.gs`** — Core API engine and secure proxy for external metadata providers:
  - **Steam** — Store API search, HTML scraper fallback, SteamCMD (PICS), SteamGridDB.
  - **TMDB** — Movie/Series search, details, streaming providers, trailer links.
  - **Open Library** — Book search by title, author, or ISBN.
  - **AniList** — Manga tracking with automatic chapter count updates.

### Automation (CI/CD)

- **GitHub Actions** — Deploys to GitHub Pages on every push; weekly `.xlsx` export of the Google Sheet into `AppScript/GameList.xlsx` (`backup-excel.yml`).

---

## ✨ Notable Features

- **Collaborative Tracking** — Independent per-user state for **Angel** and **Talmai** (status, 1–10 ratings, progress, wishlist, notes). *v2:* personal libraries linked via invite codes — cross-catalog matching without merging private lists.
- **Couple's Match Algorithm** — Surfaces items both users have pending or wishlisted. *v2:* powered by `v_library_matches` (same library) and `v_cross_library_matches` (linked libraries) SQL views.
- **Multimedia Integration** — On-demand trailers (YouTube, MP4, WebM, HLS `.m3u8` via `hls.js`).
- **Data Safety** — Soft-delete "Papelera" (Trash) with restore + automated weekly `.xlsx` backups.

---

## 📊 Current Project Status (Audit vs. Real Code)

> Line numbers verified against the active `AppScript/Index.html` and `AppScript/WebAPP.gs` on 2026-11-20.

### 🛠️ 1. Immediate UI/UX Adjustments

| Requirement | Status | Location | Details |
| :--- | :---: | :--- | :--- |
| **Mobile Top Search (`popstate` Back Button)** | 🔴 **PENDING** | `Index.html` (~L1303, ~L1335) | `#inputBuscar` only calls `cerrarBusquedaAgregar()` on `focus`/`click`; no `history.pushState()`. `popstate` covers modals, `#panel-filtros`, `#inputAgregar`/dropdown — not the top search. Android back button exits instead of blurring search. |
| **Strip `[YYYY-MM-DD]` dates from Patch Notes** | 🔴 **PENDING** | `WebAPP.gs` L807 / `Index.html` ~L1937 | `WebAPP.gs` stores `'[' + fDate + '] ' + title` into `notaParche`; the modal renders it raw in the `rows` array (`'Nota Parche'` row) with no cleanup regex. |
| **Reset modal scroll on open/close** | 🔴 **PENDING** | `Index.html` ~L1855 / ~L2040 | No `scrollTop` usage exists. `.modal-content` is the `overflow-y: auto` container (~L560) shared by `#modal`, `#modal-papelera`, `#modal-match`; `abrirModal()`/`cerrarModal()` don't reset it. |

### 🎨 2. UI Motion & Micro-Interactions (Instagram / X Patterns)

| Pattern | Status | Target | Implementation Notes |
| :--- | :---: | :--- | :--- |
| **Skeleton Shimmer Loading** | 🔴 **PENDING** | `cargarCategoria()` (~L1482) | Replace `.spinner-container` with 6–8 proportion-locked skeleton cards (`460/215` landscape, `2/3` poster). |
| **Spring Micro-Feedback** | 🔴 **PENDING** | `:root` (~L15), `.wish-toggle`, `.star` | Add `--ease-spring` tactile curves + 0ms Optimistic UI updates. |
| **Directional Tab Transitions** | 🔴 **PENDING** | `.category-tabs`, `inicializarGestosSwipe()` (~L1254) | Animate `#grid` entry (`slideInRight`/`slideInLeft`, ±22px) matching swipe direction. |
| **Double-Tap Heart Burst** | 🔴 **PENDING** | `.img-container` (~L404), `renderGrid()` (~L1679) | Double-tap cover → `igHeartBurst` + wishlist toggle without opening the modal. |
| **Bottom Sheet & Pull-to-Dismiss** | 🔴 **PENDING** | `#modal .modal-content` (~L559, ~L754) | Mobile modals as bottom-sheet drawers with drag handle and pull-to-close. |
| **Carousel Scroll-Snap & Dots** | 🔴 **PENDING** | `#m-screenshots` (~L1064, ~L1943) | `scroll-snap-type: x mandatory` + dynamic pagination dots for Steam screenshots. |

### 🧪 3. Backend, Infrastructure & Data Audit

| Evaluation | Status | Technical Details |
| :--- | :---: | :--- |
| **Metadata Recovery (Steam Resilience)** | 🟢 **DONE** | 4-level fallback: Store API ➔ HTML Scraper ➔ SteamCMD ➔ SteamGridDB. |
| **State & Local Cache Consistency** | 🟢 **DONE** | `CACHE_VERSION` (`v19`) with `localStorage` and async RPC refresh. |
| **Batch DB Operations (Backend)** | 🟢 **DONE** | `reconstruirJuegosDesdeIdPorLotes` / `rellenarBuildsJuegos` batch writes (60 rows) + 15s self-rescheduling triggers. |
| **Parallel Fetching (`UrlFetchApp.fetchAll`)** | 🔴 **PENDING** | `resolverAutoresOpenLibrary_` (`WebAPP.gs` ~L930-976) runs up to 4 sequential fetches + title fallback; no `fetchAll` in the project. |
| **API Key Health Check** | 🔴 **PENDING** | Keys load from `ScriptProperties` (`WebAPP.gs` L4-5, TMDB fallback L182-184) but no diagnostic function validates them before use. |
| **Offline Read-Only Mode** | 🔴 **PENDING** | No `navigator.onLine` or `online`/`offline` listeners; write buttons stay active without connection. |
| **DOM Recycling (Virtual List)** | 🔴 **PENDING** | `IntersectionObserver` pagination (36/page) rebuilds the whole fragment via `grid.replaceChildren()` (~L1741). Partial mitigation: `content-visibility: auto` on `.card` (~L392). |
| **Cross-User Library Linking (`library_links`)** | 🔴 **PENDING** *(v2)* | Link separate user libraries via invite code and compute real-time matches across independent catalogs. |

---

## 🔧 Planned Feature: Game Mods Tracker (v1.x — spec only, not implemented)

> **Status:** 📋 **SPEC** — documented 2026-11-21, pending implementation decision.
> Per-user mod lists per game, inspired by titles like *The Binding of Isaac* (many interesting mods outside Steam Workshop).

### Concept

For each **video game**, each user (Angel / Talmai) can save mods they are interested in — **not to install/apply them**, just to track them inside the app (wishlist-style for mods).

### Data model (v1 — Google Sheets)

New sheet `mods` (separate from the main catalog — do **not** alter existing columns):

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | string | row id |
| `game_id` | string | FK → catalog item id (Steam AppID / internal id) |
| `user` | enum | `angel` / `talmai` (per-user, like `estadoAngel`/`estadoTalmai`) |
| `nombre` | string | mod name |
| `fuente` | enum | `nexus_mods` / `steam_workshop` / `curseforge` / `otra_url` |
| `url` | string | direct link to the mod page |
| `version_juego` | string | **per mod** — game version/build the mod supports (free text, e.g. "v1.7.9b"); mods are **grouped by version** in the UI (3 mods @1.2, 1 @1.1) |
| `notas` | string | load order, dependencies, personal notes |
| `fecha` | date | when saved |

> **Decisions (user, 2026-11-21):**
>
> - **No status field** — saving a mod already means "I'm interested / might play it". No descargado/instalado states.
> - **No Couple's Match integration** — mods stay private per user. Optional **1-to-1 sharing**: when opening a game, the user may be asked if they want to view/share mods with the other user — opt-in per session, decided later, never automatic.

### Sources & discovery

- **Save:** source selector (`Nexus Mods`, `Steam Workshop`, `CurseForge`, `Otra URL`) + URL field. Free-text name.
- **Find:** quick-search links per game — buttons opening the game's search page on Nexus Mods / Steam Workshop / CurseForge / Google. No API integration needed (Nexus/CurseForge APIs require keys and approval); plain `https://www.nexusmods.com/<game>/mods?offset=0&limit=20` style links are enough for v1.

### UI (v1)

- **Placement decision (user, 2026-11-21):** mods are an **independent section inside each game's detail modal** — NOT a new top-level category and NOT visible in the main grid/scheme. Access is only via the game itself.
- **Entry point (user, 2026-11-21):** a **"Mods" button in the game modal's action row, positioned below the "Página Steam" and "SteamDB" buttons and above "Reparar"** — opens the Mods section/view for that game.
- Game detail modal → collapsible section **"Mods"** (below existing notes):
  - Per-user view matching the app's profile pattern (Angel / Talmai).
  - **Mods grouped by `version_juego`** — collapsible group headers per version (e.g. "v1.2 — 3 mods"), preserving save order inside.
  - Each mod row: name, source pill, version tag (redundant with group but shown), link-out icon, delete.
  - "Añadir mod" form: name + source dropdown (`Nexus Mods`, `Steam Workshop`, `CurseForge`, `Otra URL`) + URL + version (free text) + notes.
  - Quick-search row: icon buttons (Nexus, Workshop, CurseForge, Google) prefilled with the game title. **Steam Workshop link can be exact** since games already store Steam AppID: `steamcommunity.com/workshop/browse/?appid=<id>&searchtext=<title>`.
  - Optional share prompt on game open: "¿Quieres ver los mods de [otro usuario]?" — opt-in only.

### v2 — SQL mapping (Supabase, Phase 4+)

Designed to migrate cleanly — **do not wire it into the current Sheets schema yet**; this is a standalone new function:

```sql
create table mods (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references media_items(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  nombre text not null,
  fuente text not null check (fuente in ('nexus_mods','steam_workshop','curseforge','otra_url')),
  url text,
  version_juego text,
  notas text,
  fecha timestamptz not null default now(),
  unique (game_id, user_id, url)
);
```

Plus RLS policies mirroring the existing per-user tracking rules, and the same modal section reading from `mods` instead of Sheets.

**Migration path (v1 Sheets → v2 SQL):**

1. ETL alongside the existing `GameList.xlsx` import: each `mods` sheet row resolves `game_id` → canonical `media_items.id` via the same `(category, provider, external_id)` dedup key used for catalog items (Steam AppID → `provider='steam'`).
2. `user` enum (`angel`/`talmai`) maps to `profiles.id` via the same UUID mapping used for `user_media_tracking`.
3. `UNIQUE(game_id, user_id, url)` dedups re-saves; rows missing URL fall back to `(game_id, user_id, lower(nombre))` uniqueness.

**Write path in v2:** the "Añadir mod" form posts to an Edge Function `save_mod` (`UPSERT` on the unique key — same pattern as tracking updates); delete via `delete_mod`. No schema changes needed later: adding a source = extend the `fuente` CHECK constraint; adding fields (e.g. `estado`) = nullable columns, no table rebuild.

### Decisions & open questions

- ~~Version granularity~~ → **resolved:** free text per mod, grouped by version in UI.
- ~~Mod status~~ → **resolved:** none — save = interest only.
- ~~Couple's Match~~ → **resolved:** excluded; optional 1-to-1 opt-in share prompt on game open.
- Still open: share mechanics for v1 Sheets (per-request flag vs. simply letting the other user open the same modal section read-only?).

---

## 🔬 Data Source Audit (verified live 2026-11-21)

Real requests made against every provider the backend uses. Findings per category + v2 SQL mapping improvements.

### Juegos — Steam (`appdetails` JSON, verified Cyberpunk 2079)

Fields returned by API but **NOT extracted** by `obtenerMetadataSteam` (`WebAPP.gs` ~L650):

| Field | Value example | Use |
|---|---|---|
| `recommendations.total` | 916,028 | **≈ positive review count — FREE, no scraping.** Feeds the reviews chart (pos ≈ this; pct still needs store page or derive) |
| `achievements.total` | n/a | Could fill a future "logros" stat |
| `supported_languages` | list | → `plataformas`/language field |
| `ratings` + `content_descriptors` | ESRB/PEGI | Content rating display |
| `dlc` | `[2138330,...]` | Currently only counted ("N DLCs") — could store appids for future DLC links |
| `website` | url | Official site link in modal |
| `pc_requirements` | html | Min specs (collapse section) |
| `background` | url | Hero banner (richer than `header_image`) |

### Peliculas_Series — TMDB

Could not test live (API key lives in Apps Script ScriptProperties, not accessible externally). To verify when implementing: `watch/providers` → `plataformas` column, `videos.results[YouTube]` → `trailer`, `credits` → `creador`. `puntuacion` already uses `vote_average`.

### Libros — OpenLibrary (verified)

- **`puntuacion` is always 'N/A'** — but `https://openlibrary.org/works/{id}/ratings.json` returns `{summary:{average, count}}` (verified: GoT work OL45883W → avg 5.0). **Improvement: fetch ratings → fill `puntuacion`.**
- Search returns huge `isbn` arrays (~150 per book) — code takes first `isbn_13`/`isbn_10`; prefer ES-prefixed ISBNs (`84/97884`) when present.
- Unused: `ocaid`/`ia` (archive.org full-text scans), `edition_key`.

### Mangas — AniList (verified healthy)

Earlier 404s were wrong id types (id:2 is ANIME, not MANGA) — the code's `Media(id:)` usage is correct. Unused fields worth mapping:

- `externalLinks` → contains MAL link → enables `mal-` id cross-reference
- `format` → distinguishes Manga / Novel / One-shot / Doujinshi (useful for `tipo`)
- `popularity`, `studios`, `countryOfOrigin`

### Backup sources tested

| Source | Status | Verdict |
|---|---|---|
| Jikan (MyAnimeList wrapper) | timed out from this network | Keep as fallback only — slow/unreliable |
| Google Books API | `429` without key | Viable backup **with free API key** |
| Steam `appreviews?json=1` | `302 → homepage` | DEAD — use store-page scrape (already in spec) |

### v2 SQL mapping improvements (`media_items`)

- Add generic `metadata jsonb` column — absorbs provider-specific extras (Steam recommendations, OL ratings, AniList format) without schema churn per source.
- Dedicated columns worth promoting: `content_rating` (PEGI/ESRB), `official_website`, `average_rating` + `rating_count` (books), `mal_id` + `format` (mangas), `steam_recommendations` (games).
- `mods` table unaffected.

---

## 🆚 Benchmark vs Similar Apps (2026-11-21)

Reference apps: **Backloggd** (closest — games/anime/books/manga/movies + social), **Trakt.tv** (movies/series scrobbling + lists), **Serializ** (books), **IGDB/Playnite** (game metadata).

| Feature they have | NexusLib status | Priority |
|---|---|---|
| Bulk import/scrobbling (Trakt, Steam, GoodReads) | Manual add only | 🔥 High — v2 ETL, one-time |
| Release calendar for wishlist items | Dates arrive via TMDB/Steam, no view | High — cheap, filter `deseado*` + upcoming `fecha` |
| Shared activity feed (what each played/read) | Couple's Match exists, no feed | Medium — v2, extends match |
| Annual goals/challenges ("100 games this year") | Stats exist, no goals | Medium — aggregation only |
| Per-episode progress for series | Progress exists for books/manga only | Low-Medium |
| Short reviews per entry | `notaAngel/Talmai` free text already | Low — may already cover |
| Per-user tags & custom lists | `Tags` column exists (games) | Low — infra partially there |

### Per-User Visibility Controls (social privacy) — 💡 user idea, v2

> **Superseded by Phase 5A** — final design is **per-relationship** (link_type + visibility matrix on `library_links`) plus per-item `is_private`, not a single global profile setting. See [Phase 5A](#5a--relationship-tags--per-link-visibility-user-idea-2026-11-21).

---

## ✂️ v1 → v2 Cut-over Rule

> **Decisión del usuario (2026-11-21):** todo feature nuevo se implementa bajo la arquitectura destino. El roadmap tiene una **línea de corte dura** en Phase 4 (Cloud SQL & Auth).

**The rule:**

- **Left of the cut (Phases 1–3, v1.x):** Google Sheets + Apps Script only. No feature here may depend on `profiles`, `library_links`, SQL views, or Edge Functions. If a spec needs them, it moves right of the cut.
- **Right of the cut (Phases 4–6, v2.x):** Supabase + Edge Functions. Everything new assumes the SQL schema (`media_items`, `profiles`, `user_media_tracking`, `mods`, `metadata jsonb`, `library_links`). No new Sheets-specific features after the cut — the Sheet survives only as a read-only backup artifact (weekly `.xlsx` export).
- **Trigger:** the cut happens when Phase 4 starts. On that day: run `database/schema.sql`, execute the ETL (`GameList.xlsx` → `media_items`), deploy Edge Functions, flip `Index.html` to the new API base, and retire `WebAPP.gs` read/write paths (keep it only as fallback during transition).
- **Feature placement rule for future ideas:** if it needs per-user privacy, cross-user matching, bulk writes, or scheduled jobs → right of the cut. If it's UI polish, single-user reads, or lazy metadata fetches → left of the cut is still allowed but optional.

**Feature placement map (current roadmap):**

| Feature | Side | Phase |
|---|---|---|
| UX fixes, motion, fetchAll, health, offline RO | v1 | 1–3 |
| Mods Tracker (Sheets read/write) | v1 | 3 |
| Steam Reviews breakdown | v1 | 3 |
| Release calendar (wishlist) | v1 | 3.5 (new) |
| Annual stats/goals | v1 | 3.5 (new) |
| SQL schema, Edge Functions, ETL, auth, metadata refresh | **CUT** | 4 |
| Bulk import (Trakt/Steam/Goodreads), activity feed, visibility controls, mods share, library links | v2 | 5 |
| Capacitor APK, offline write queue | v2 | 6 |
| Coleccionables (⭐ optional, high interest), Podcasts (⭐ optional) | v2 late | 7+ |

---

## 🔀 Branching, Beta & Release Workflow

> **Setup (2026-11-22):** `beta` branch created from `main`. All new feature work happens on `beta` (or short-lived `feat/*` branches merged into it) until promoted.

### Branch model

```text
main   ← production. GitHub Pages + Apps Script /exec serve this.
beta   ← integration & testing. Nothing here reaches users.
feat/* ← optional short-lived branches for a single phase item, merged into beta.
```

### Daily flow

1. Pick a spec from the Execution Roadmap → work on `beta` (or `feat/x` → merge to `beta`).
2. Update `AppScript/BETA.md` with what changed, how to test, and what's pending.
3. Paste the updated `AppScript/Index.html` into the Apps Script editor (manual step — no clasp).
4. **Test on `/dev`** — Apps Script test deployment always serves the latest saved code:
   `https://script.google.com/macros/s/<ID>/dev` — production `/exec` is untouched.
5. When verified → merge `beta` → `main`, push, create a new Apps Script deployment version for `/exec`.

### Promotion checklist (beta → main)

- [ ] Feature tested on `/dev` on Android + desktop browser
- [ ] `BETA.md` entry updated (status → verified)
- [ ] `CHANGELOG.md` Unreleased entry moved under a version
- [ ] If `index.html`/`service-worker.js`/`manifest.json` changed → bump SW cache version
- [ ] Merge `beta` → `main`, push (Pages auto-deploys)
- [ ] New Apps Script version → `/exec` updated
- [ ] Note deploy version string (e.g. `v1.10.0 — Phase 2 motion`) in CHANGELOG + HANDOFF

### Known limitations while on beta

- GitHub Pages only builds `main` — shell-level changes (`index.html`, `manifest.json`, `service-worker.js`, icons) are NOT testable on beta via Pages; test them locally (`python -m http.server`) or wait for merge.
- `WebAPP.gs` changes also require manual paste into Apps Script — same `/dev` flow applies.
- Apps Script quotas are shared between `/dev` and `/exec` — heavy testing counts against the same limits.

### Daily progress log

See [AppScript/BETA.md](BETA.md) — one entry per working session: what was done, test steps, pending items, and anything needed from the user.

---

## 🗺️ Execution Roadmap

> Ordered by **user-visible impact per effort**. Phase 3 (motion) outranks Phase 4 (backend hardening) because backend items are invisible to users.

### 📍 Phase 1: Immediate UX Fixes (v1.x — High Priority) ✅ IMPLEMENTED 2026-11-21

**Spec — implementable as-is:**

1. **Top Search History** — ✅ DONE: `#inputBuscar` `focus` (~L1304) pushes `{sf:true}` state once per focus (`busquedaFiltroActiva` flag); `popstate` (~L1346) has a branch that blurs the input and re-arms state. Android back now dismisses the filter field instead of exiting.
2. **Patch Note Dates** — ✅ DONE: `notaParche` rendered with `replace(/^\[\d{4}-\d{2}-\d{2}\]\s*/, '')` (~L1938). Display-only; DB keeps raw `[date] title`.
3. **Modal Scroll Reset** — ✅ DONE: `.modal-content` `scrollTop = 0` in `abrirModal()` (~L1870) and `cerrarModal()` (~L2043) — covers `#modal`, `#modal-papelera`, `#modal-match`.

> ⚠️ Deploy note: `Index.html` must be pasted into the Apps Script editor (script.google.com → Index.html) for changes to go live — repo push alone doesn't update the `/exec` app.

### 📍 Phase 2: Visual Motion System — Instagram/X Patterns (v1.x)

> **Implementation anchors verified 2026-11-21 against `Index.html`:** the app already has a motion token system in `:root` — `--t-fast/base/slow` + `--ease-inout/ease-out` — used by ~30 transitions, plus `@media (prefers-reduced-motion)` (~L745), `@keyframes fadeIn` (~L452) and `spin` (~L743), card hover lift `.card` (~L399), modal enter/exit `.modal-content` (~L564-570), toast (~L734-736), stat-card accordions (~L532) and touch swipe handlers `inicializarGestosSwipe()` (~L1258-1330). **Reuse these — do not introduce parallel timing values.**

**Concrete instructions per pattern:**

- **2A Skeleton shimmer:** replace `.spinner-container` in `cargarCategoria()` (~L1482) with skeleton cards reusing `.card` aspect ratios (460/215 landscape, 2/3 poster). New keyframes `shimmer` (gradient sweep `background-position`), class `.skeleton` with `content-visibility:auto` like `.card` (~L392). Respect `prefers-reduced-motion` (already global ~L745).
- **2A Spring easing:** add `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)` to `:root`; apply ONLY to `.wish-toggle`, `.star` and `.btn:active` (~L267 already has `scale(0.95)` — swap its timing to spring). Never on scroll/layout transitions.
- **2B Directional tabs:** `inicializarGestosSwipe()` (~L1258) already tracks swipe direction — expose the last direction (e.g. `data-dir="left|right"`) and in `cambiarCategoria()`/`renderGrid()` (~L1679) animate `#grid` children entry with `slideInRight`/`slideInLeft` (±22px translateX + fade, `var(--t-base)`). Extend the existing `.category-tabs` sliding pill (~L214-221 already transitions flex-grow/translateX).
- **2C Double-tap heart:** on `.img-container` (~L404) add `dblclick`/double-tap listener (mobile: two `touchend` <300ms apart, reuse swipe threshold logic ~L1280 to not conflict) → toggle wishlist + `igHeartBurst` keyframe (scale 0→1.2→1 fade, ~500ms, heart SVG overlay centered). Must not trigger card click/modal.
- **2D Bottom sheet:** `.modal-content` (~L559-570) — on `(max-width: 768px)` make it `position:fixed; bottom:0; border-radius:16px 16px 0 0; max-height:85vh` with drag-handle bar; pull-down dismiss via `touchmove` deltaY >80px reusing swipe math. Keep desktop centered modal unchanged.
- **2D Scroll-snap:** `#m-screenshots` (~L1064) add `scroll-snap-type:x mandatory` + `scroll-snap-align:center` on children; generate dots container under it updated on `scroll` event (IntersectionObserver or scrollLeft math).
- **Guardrail:** every new animation must degrade under `prefers-reduced-motion` (the existing ~L745 block already nukes durations globally — verify new keyframes don't bypass it).

### 📍 Phase 3: Backend & Offline Resilience (v1.x)

**Spec — implementable as-is:**

1. **Parallel Open Library** — `resolverAutoresOpenLibrary_` (`WebAPP.gs` ~L930-976): collect all `UrlFetchApp.fetch` calls into an array → single `UrlFetchApp.fetchAll(requests)` → map `responses[i].getContentText()` back to authors in order. Preserve the title-fallback path. No schema change.
2. **API Key Health** — new `doGet` branch `?action=health`: returns JSON `{tmdb: bool, steamdb: bool, steam: bool, sheets: bool}` — `sheets` = `SpreadsheetApp.getActive()` ok; API keys = non-empty `PropertiesService.getScriptProperties().getProperty(...)`. Read-only, no external calls (fast, safe to poll).
3. **Offline Read-Only** — `Index.html`: `window.addEventListener('online'/'offline')` toggling a body class `.offline`; CSS disables `.btn-guardar`, `.btn-eliminar`, wishlist/star buttons (`pointer-events:none; opacity:.5`) + toast "Sin conexión — solo lectura". Reads already served by v19 cache.
4. **Game Mods Tracker** — see [spec above](#-planned-feature-game-mods-tracker-v1x--spec-only-not-implemented): per-user mod lists per game (Nexus Mods / Steam Workshop / CurseForge / URL), version-tagged, quick-search links. New `mods` sheet — standalone, no changes to existing schema.
5. **Steam Reviews Breakdown** — new toggle `#btn-toggle-resenas` styled like `.btn-trailer` (~L609) next to it in `#m-trailer-bar` (~L1045), opening `#m-resenas-box` (same `.trailer-box` pattern ~L616). Backend: the old `appreviews/{appid}?json=1` JSON endpoint is **DEAD** (verified 2026-11-21: all variants return `302 → store homepage`). Real source = scrape `https://store.steampowered.com/app/{appid}/?l=spanish&cc=US` — same HTML fetch + agecheck cookies the resolver already uses as fallback (`WebAPP.gs` ~L686). Extract review summary from the `user_reviews_summary_row` tooltips: `"El X% de las N reseñas ... últimos 30 días son positivas"` (30d window) and `"El Y% de las M reseñas ... en tu idioma son positivas"` (all-time). Store `resenasSteam` as `{pct30, total30, pct, total}` — positive count can come FREE from `recommendations.total` in `appdetails` (see audit §Steam); neg/pos30 derived as `round(pct*total/100)` (approximate, mark with `≈` in UI). Fetch lazily on modal open for `Juegos` only, not at catalog load. Tier = **5-block scale** (client-side, no Steam thresholds): 0-20 "Muy negativas", 20-40 "Mayormente negativas", 40-60 "Neutras", 60-80 "Mayormente positivas", 80-100 "Muy positivas". Frontend renders a **CSS-only chart** (no chart lib — vanilla SPA): (a) a 5-segment gradient bar red→gray→green with a marker/needle at the `pct` position, (b) the tier label under it, (c) big % positive number, pos/neg counts, total reviews, and a **trend chip** comparing `pct30` vs `pct` (↑/↓/→ "vs hace 30 días"). Only for `Juegos` with valid Steam appid; hide otherwise (same guard as `admiteTrailer` ~L1920). Reuse existing motion tokens for bar grow-in (`--t-*`, `transform: scaleX`). Note: Steam's 9-tier label and 5-star histogram are NOT exposed by the public API — this custom 5-block scale is the chosen simplified equivalent.

### 📍 Phase 3.5: Wishlist Release Calendar & Annual Stats (v1.x — read-only, no schema change)

> Both features aggregate data already stored/fetched — **no new columns, no new sheets, no v2 dependency**. Safe to build before the cut.

**3.5A — Release Calendar:**

- Data already arrives: `fecha` column (YYYY-MM-DD or `próximamente`), TMDB `release_date`, Steam `release_date.date` + `coming_soon` flag.
- UI: new collapsible section in `#stats-grid` (~L532 pattern) or a filter chip "Próximos estrenos" → grid filtered to items where `estado*`/wishlist flag is set AND `fecha` parses to a future date within next 90 days, sorted ascending.
- Edge cases: `próximamente`/TBD dates → group under "Sin fecha confirmada" at the bottom; past-dated wishlist items drop out automatically.
- Effort: ~1 frontend function + 1 filter predicate. No backend change.

**3.5B — Annual Stats & Goals:**

- New stats card in `#stats-grid` (accordion pattern ~L532): per user, per year — items completed (`completado`), in-progress count, avg `estrellas`, wishlist size, total played hours equivalent (games: count; books/manga: pages not stored — skip).
- "Retos" v1 simple: auto-generated goals only (e.g. "10 juegos nuevos este mes", "% de wishlist completado") — no custom goal builder yet; if wanted later it belongs right of the cut (needs `goals` table).
- All aggregation client-side over `datosGlobales` — already loaded. Effort: ~1 render function.

### 📍 Phase 4: Cloud SQL & Auth (v2.0) — ✂️ **THE CUT**

**Scope — what will be built:**

1. `database/schema.sql` on Supabase: `profiles`, `libraries`, `library_members`, `library_links`, `media_items`, `library_items`, `user_media_tracking`, `mods` (see WIKI §7.3 for full DDL summary).
2. Edge Functions / Workers replacing `WebAPP.gs` resolvers (Steam Store+fallback chain, TMDB, OpenLibrary, AniList) — same fallback order as v1.
3. ETL `GameList.xlsx` → PostgreSQL: map sheets rows to `media_items` via `(category, provider, external_id)`; `mods` sheet → `mods` table per spec above.
4. Auth: Supabase Auth JWT; Angel/Talmai get `profiles` + auto `libraries` via `bootstrap_user_default_library()` trigger.
5. **Scheduled metadata refresh** — `metadata_updated_at timestamptz` column on `media_items`; weekly cron (pg_cron or scheduled Edge Function) refreshes only stale rows by TTL: **Juegos 7 days** (reviews/prices move fast), **movies/series/books/manga 30 days** (static metadata). Reuses the same resolver fallback chain; review data via free `appreviews` endpoint (no key). Never touches user fields (`user_media_tracking`, notes).
6. **Provider extras → `metadata jsonb`** — per the [Data Source Audit](#-data-source-audit-verified-live-2026-11-21): Steam `recommendations.total`/`achievements`/`supported_languages`/`ratings`/`dlc`/`website`, OL `ratings.json` avg+count (fixes `puntuacion` always N/A), AniList `externalLinks`/`format`. Promote hot fields to real columns (`content_rating`, `steam_recommendations`, `average_rating`, `mal_id`, `format`); keep the rest in `metadata`.
7. **Bulk import pipeline** — Trakt.tv / Steam profile / GoodReads CSV+API → Edge Function `import_external`: map foreign IDs → `(provider, external_id)` dedup key, resolve misses via existing resolvers, write `library_items` + `user_media_tracking` in batches. One-time per user, idempotent (re-run = upsert, no dupes).

### 📍 Phase 5: Cross-User Library Linking (v2.0) — ✂️ right of the cut

**Scope — what will be built:**

1. Invite-code UI: generate/share 10-char `invite_code`, enter code → `request_library_link()` RPC (`pending`).
2. Approval flow: other user accepts → `accepted`; `match_enabled` toggle per link (private notes never cross).
3. Match feed: unified view over `v_library_matches` + `v_cross_library_matches` with realtime subscriptions.

#### 5A — Relationship Tags & Per-Link Visibility (user idea, 2026-11-21)

> **User requirement:** in v2 the user picks **with whom** to match — libraries are tagged by relationship type (pareja / amigos / familia / custom), and **each relationship gets its own visibility matrix** — what that specific person sees and what doesn't. Plus a per-item "private" flag for entries that never cross any link.

**Schema deltas on `library_links`:**

```sql
alter table library_links
  add column link_type text not null default 'amigo'
    check (link_type in ('pareja','amigo','familia','custom')),
  add column link_label text,          -- custom name when link_type='custom' ("compis-del-trabajo")
  add column visibility jsonb not null default
    '{"Juegos":{"status":true,"rating":false,"notes":false,"wishlist":true,"progress":true,"mods":false},
      "Peliculas_Series":{...same...}, "Libros":{...}, "Mangas":{...}}'::jsonb;
  -- visibility is stored on the LINK row = "what the OWNER shares with THAT linked library".
  -- Direction matters: Angel's link row controls what Angel exposes to Talmai's library.
```

**Per-item privacy:** add `is_private boolean not null default false` to `user_media_tracking` — a private entry is excluded from **every** cross-library view regardless of the link's visibility matrix ("entrada privada de manera individual").

**Visibility semantics:**

- Matrix axes: **category** (4) × **field** (`status`, `rating`, `wishlist`, `progress`, `notes`, `mods`).
- Defaults: `status`/`wishlist`/`progress` shared; `rating`/`notes`/`mods` private.
- Enforcement is **server-side in the SQL views** (`v_cross_library_matches` joins `library_links` and filters columns per `visibility` JSONB) — private fields never leave the database; hiding in UI alone is not acceptable.
- `match_enabled=false` on a link = no matching with that library at all (independent of visibility — visibility only applies when matching is on).

**UI:**

- Links settings screen: list of linked libraries, each card shows `link_type` badge (💑 pareja / 👥 amigos / 🏷️ custom label), `match_enabled` toggle, and a **visibility matrix editor** (4 categories × 6 fields toggle grid).
- Per-item: "Privado" toggle in the tracking modal (lock icon) — sets `is_private`; item disappears from all match views and the other user's view of shared catalogs.
- Match feed can be **filtered by link_type** ("ver solo matches con pareja" / "con amigos") — same feed, segmented chips.

#### 5B — Shared Activity Feed

- `user_media_tracking` already has timestamps; surface a chronological "Angel jugó X / Talmai leyó Y" feed across accepted links. Reuses realtime subscriptions — cheap add once links exist.
- Feed respects the same visibility matrix + `is_private` (private activity never appears).

#### 5C — Mods share (opt-in)

- When opening a game, prompt "¿ver mods de [otro]?» — read-only view of their `mods` rows for that `game_id` (no auto-match). Governed by the `mods` field in the link's visibility matrix — if `mods:false`, the prompt never appears.

> **Open question:** with only Angel & Talmai as users, does "linking" mean *linking their two personal libraries* (simpler — `v_library_matches` may already suffice) or *multi-user library sharing* (full `library_links` needed)? Resolve before building the invite-code UI. **Note:** the link_type/visibility design above assumes full `library_links` — with only 2 users a single link row still works (one relationship = one row).

### 📍 Phase 6: Android APK & Release CI/CD (v2.0)

**Scope — what will be built:**

1. `npx cap init/add android` wrapper (`com.nexuslib.app`), dark StatusBar, haptics, `backButton` → modal close (details in WIKI §7.4).
2. Offline-first: IndexedDB write queue → `UPSERT` sync on reconnect.
3. `.github/workflows/build-apk.yml` on `v*` tags → signed release → GitHub Releases.

---

### 📍 Phase 7 (candidate — ⭐ OPTIONAL, HIGH INTEREST): Coleccionables — figuras, juegos de mesa, rompecabezas, LEGO… (v2.x — post-cut)

> **Status:** optional future category — user-marked **high interest** (2026-11-21). Build only after v2 core is stable.
> **User idea (2026-11-21):** a general collecting category — differentiator vs Backloggd/Trakt (neither covers collecting well). Consumption → **ownership** model: `tengo` / `quiero` / `vendido`, condition, acquisition date, estimated value.

- One category `Coleccionables` with `tipo` field — full subtype list:
  `lego`, `juego_mesa`, `figura_estatua`, `funko_pop`, `rompecabezas`, `carta_tcg` (Magic/Pokémon/Yu-Gi-Oh), `miniatura_pintada`, `blind_box`, `vinilo`, `memorabilia_deporte`, `sello_moneda`, `otro_manual`.
- Provider per subtype: Rebrickable/BrickLink (LEGO set nº), BoardGameGeek (board games — free API), **`provider='manual'` for everything without an official API** (funko pops, figures, puzzles…) — user enters name + image URL + fields by hand, same pattern as mods "Otra URL". Manual entry is the norm for most subtypes, not the exception.
- Reuses `user_media_tracking` pattern (status/rating→valoración/notes) — no new tracking table; new resolver(s) in the Edge Function layer.
- Fits right of the cut: needs category enum + provider plumbing in SQL.

**Optional future categories (user-marked ⭐ high interest, 2026-11-21):**

- **Coleccionables** — Phase 7 spec below.
- **Podcasts** — separate late-v2 category if ever wanted: episodic audio via RSS/subscription (iTunes Search API free + feed parsing), progress-per-episode like series. NOT inside Peliculas_Series (different consumption model, no TMDB catalog). Low priority — series episode tracking doesn't exist yet.

**Explicitly discarded:** music (streaming owns it; Last.fm covers scrobbling), shopping list (out of scope).

---

*Last consolidated update: 2026-11-21 — Phase 1 ✅ implemented & verified in production; v1→v2 cut-over rule defined (Phase 4 = the cut); benchmark features placed (calendar+stats → v1 Phase 3.5; import/activity/visibility → v2 Phase 5); Phase 7 candidate = Coleccionables.*
