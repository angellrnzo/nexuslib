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

## 🗺️ Execution Roadmap

> Ordered by **user-visible impact per effort**. Phase 3 (motion) outranks Phase 4 (backend hardening) because backend items are invisible to users.

### 📍 Phase 1: Immediate UX Fixes (v1.x — High Priority)

**Spec — implementable as-is:**

1. **Top Search History** — in `Index.html`: on `#inputBuscar` `focus` (~L1303) call `history.pushState({search:true},'')` before showing results; in the existing `popstate` handler (~L1335) add a branch: if state/search active → `input.blur()` + close search dropdown instead of exiting. Verify on Android hardware back.
2. **Patch Note Dates** — in the modal `rows` renderer (~L1937) wrap `it.notaParche` with `replace(/^\[\d{4}-\d{2}-\d{2}\]\s*/, '')`. Display-only change; DB keeps raw `[date] title` (WebAPP.gs L807 unchanged).
3. **Modal Scroll Reset** — `.modal-content` is shared by `#modal`, `#modal-papelera`, `#modal-match`: set `scrollTop = 0` inside `abrirModal()` (~L1855) and `cerrarModal()` (~L2040). One-line each; verify trash modal doesn't rely on preserved scroll.

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
5. **Steam Reviews Breakdown** — new toggle `#btn-toggle-resenas` styled like `.btn-trailer` (~L609) next to it in `#m-trailer-bar` (~L1045), opening `#m-resenas-box` (same `.trailer-box` pattern ~L616). Backend: in the Steam resolver (`WebAPP.gs` ~L650, `appdetails`) add fetches to `https://store.steampowered.com/appreviews/{appid}?json=1&language=spanish&purchase_type=all&filter=summary` — **free, no API key** — twice: all-time and `&day_range=30` (last 30 days). Store `resenasSteam` as compact JSON `{pos, neg, pos30, neg30, score_desc, pct, pct30, total}` parsed from each `query_summary`. Tier = **5-block scale** (client-side, no Steam thresholds): 0-20 "Muy negativas", 20-40 "Mayormente negativas", 40-60 "Neutras", 60-80 "Mayormente positivas", 80-100 "Muy positivas". Frontend renders a **CSS-only chart** (no chart lib — vanilla SPA): (a) a 5-segment gradient bar red→gray→green with a marker/needle at the `pct` position, (b) the tier label under it, (c) big % positive number, pos/neg counts, total reviews, and a **trend chip** comparing `pct30` vs `pct` (↑/↓/→ "vs hace 30 días"). Only for `Juegos` with valid Steam appid; hide otherwise (same guard as `admiteTrailer` ~L1920). Reuse existing motion tokens for bar grow-in (`--t-*`, `transform: scaleX`). Note: Steam's 9-tier label and 5-star histogram are NOT exposed by the public API — this custom 5-block scale is the chosen simplified equivalent.

### 📍 Phase 4: Cloud SQL & Auth (v2.0)

**Scope — what will be built:**

1. `database/schema.sql` on Supabase: `profiles`, `libraries`, `library_members`, `library_links`, `media_items`, `library_items`, `user_media_tracking`, `mods` (see WIKI §7.3 for full DDL summary).
2. Edge Functions / Workers replacing `WebAPP.gs` resolvers (Steam Store+fallback chain, TMDB, OpenLibrary, AniList) — same fallback order as v1.
3. ETL `GameList.xlsx` → PostgreSQL: map sheets rows to `media_items` via `(category, provider, external_id)`; `mods` sheet → `mods` table per spec above.
4. Auth: Supabase Auth JWT; Angel/Talmai get `profiles` + auto `libraries` via `bootstrap_user_default_library()` trigger.
5. **Scheduled metadata refresh** — `metadata_updated_at timestamptz` column on `media_items`; weekly cron (pg_cron or scheduled Edge Function) refreshes only stale rows by TTL: **Juegos 7 days** (reviews/prices move fast), **movies/series/books/manga 30 days** (static metadata). Reuses the same resolver fallback chain; review data via free `appreviews` endpoint (no key). Never touches user fields (`user_media_tracking`, notes).

### 📍 Phase 5: Cross-User Library Linking (v2.0) — ⚠️ Decision pending

**Scope — what will be built:**

1. Invite-code UI: generate/share 10-char `invite_code`, enter code → `request_library_link()` RPC (`pending`).
2. Approval flow: other user accepts → `accepted`; `match_enabled` toggle per link (private notes never cross).
3. Match feed: unified view over `v_library_matches` + `v_cross_library_matches` with realtime subscriptions.
4. **Mods share (opt-in):** when opening a game, prompt "¿ver mods de [otro]?» — read-only view of their `mods` rows for that `game_id` (no auto-match).

> **Open question:** with only Angel & Talmai as users, does "linking" mean *linking their two personal libraries* (simpler — `v_library_matches` may already suffice) or *multi-user library sharing* (full `library_links` needed)? Resolve before building the invite-code UI.

### 📍 Phase 6: Android APK & Release CI/CD (v2.0)

**Scope — what will be built:**

1. `npx cap init/add android` wrapper (`com.nexuslib.app`), dark StatusBar, haptics, `backButton` → modal close (details in WIKI §7.4).
2. Offline-first: IndexedDB write queue → `UPSERT` sync on reconnect.
3. `.github/workflows/build-apk.yml` on `v*` tags → signed release → GitHub Releases.

---

*Last consolidated update: 2026-11-20 — v1 audit verified against live code; v2 sections are planned.*
