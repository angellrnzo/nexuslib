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
| `version_juego` | string | game version/build the mod is confirmed for (e.g. "v1.7.9b", "repentance+") |
| `notas` | string | load order, dependencies, personal notes |
| `fecha` | date | when saved |

### Sources & discovery

- **Save:** source selector (`Nexus Mods`, `Steam Workshop`, `CurseForge`, `Otra URL`) + URL field. Free-text name.
- **Find:** quick-search links per game — buttons opening the game's search page on Nexus Mods / Steam Workshop / CurseForge / Google. No API integration needed (Nexus/CurseForge APIs require keys and approval); plain `https://www.nexusmods.com/<game>/mods?offset=0&limit=20` style links are enough for v1.

### UI (v1)

- Game detail modal → new collapsible section **"Mods"** below existing notes:
  - Per-user tab or badge (Angel / Talmai) matching the app's profile pattern.
  - List of saved mods: name, source icon/pill, version tag, link-out icon, delete.
  - "Añadir mod" form: name + source dropdown + URL + version + notes.
  - Quick-search row: 3–4 icon buttons (Nexus, Workshop, CurseForge, Google) prefilled with the game title.

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

### Open questions

- Version tracking granularity: free text vs. parsed from the game's stored build field?
- Should mods appear in Couple's Match ("mods both users saved")? Probably yes later via the same matching pattern.

---

## 🗺️ Execution Roadmap

> Ordered by **user-visible impact per effort**. Phase 3 (motion) outranks Phase 4 (backend hardening) because backend items are invisible to users.

### 📍 Phase 1: Immediate UX Fixes (v1.x — High Priority)
1. **Top Search History** — `focus` → `pushState` on `#inputBuscar` (~L1303); `blur()` on `popstate` (~L1335).
2. **Patch Note Dates** — strip `[YYYY-MM-DD]` via regex when rendering `it.notaParche` (~L1937).
3. **Modal Scroll Reset** — `.modal-content.scrollTop = 0` in `abrirModal()`/`cerrarModal()` (~L1855/~L2040).

### 📍 Phase 2: Visual Motion System — Instagram/X Patterns (v1.x)
- **2A:** Skeleton shimmer cards + `--ease-spring` micro-interactions.
- **2B:** Directional swipe transitions (`slideInRight`/`slideInLeft`) + sliding tab pill.
- **2C:** Double-tap heart burst in `.img-container` for instant wishlist.
- **2D:** Bottom-sheet modals with pull-to-dismiss + scroll-snap screenshot carousel.
- *Follow the UI guardrails in [WIKI.md](../WIKI.md#7-v2-target-architecture--roadmap).*

### 📍 Phase 3: Backend & Offline Resilience (v1.x)
1. **Parallel Open Library** — refactor `resolverAutoresOpenLibrary_` with `UrlFetchApp.fetchAll()`.
2. **API Key Health** — `?action=health` diagnostic for `TMDB_API_KEY` / `STEAMGRIDDB_API_KEY`.
3. **Offline Read-Only** — `online`/`offline` listeners disabling write actions + toast.
4. **Game Mods Tracker** — see [spec above](#-planned-feature-game-mods-tracker-v1x--spec-only-not-implemented): per-user mod lists per game (Nexus Mods / Steam Workshop / CurseForge / URL), version-tagged, quick-search links. New `mods` sheet — standalone, no changes to existing schema.

### 📍 Phase 4: Cloud SQL & Auth (v2.0)
1. Deploy `database/schema.sql` on Supabase (Auth + profiles/libraries/media_items/tracking).
2. Migrate Steam/TMDB/OpenLibrary/AniList resolvers from `WebAPP.gs` to Edge Functions / Workers.
3. ETL: import `GameList.xlsx` into PostgreSQL mapped to user UUIDs.

### 📍 Phase 5: Cross-User Library Linking (v2.0) — ⚠️ Decision pending
1. Invite-code UI + `library_links` (`request_library_link()`).
2. Link approval/revocation + `match_enabled` toggle (private notes never exposed).
3. Unified Match feed querying `v_library_matches` + `v_cross_library_matches` with realtime subscriptions.

> **Open question:** with only Angel & Talmai as users, does "linking" mean *linking their two personal libraries* (simpler — `v_library_matches` may already suffice) or *multi-user library sharing* (full `library_links` needed)? Resolve before building the invite-code UI.

### 📍 Phase 6: Android APK & Release CI/CD (v2.0)
1. Capacitor integration (Haptics, StatusBar, Network, BackButton).
2. Offline-first sync queue (IndexedDB → PostgreSQL `UPSERT` on reconnect).
3. Signed `.apk` builds on every `v*` tag → GitHub Releases.

---

*Last consolidated update: 2026-11-20 — v1 audit verified against live code; v2 sections are planned.*
