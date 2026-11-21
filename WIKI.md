# 📚 NexusLib Technical Wiki
### *Comprehensive Architecture, API Specification, and Development Guide*

This document is the technical and architectural reference manual for **NexusLib**, detailing the end-to-end design, the client-server communication protocol, external service integrations, failure-recovery strategies, and mobile optimization patterns.

---

## 📑 Table of Contents
1. [System Overview](#1-system-overview)
2. [Backend Layer (Google Apps Script)](#2-backend-layer-google-apps-script)
   - [Entry Point & Security Policies](#21-entry-point--security-policies)
   - [Dynamic Header Relational Mapping](#22-dynamic-header-relational-mapping)
   - [External API Ecosystem & Robust Fallback](#23-external-api-ecosystem--robust-fallback)
   - [Batch Processing & Beating the 6-Minute Timeout](#24-batch-processing--beating-the-6-minute-timeout)
   - [Trash System & Data Restoration](#25-trash-system--data-restoration)
3. [Frontend Layer (Self-Contained SPA)](#3-frontend-layer-self-contained-spa)
   - [v19 Cache Strategy with LocalStorage](#31-v19-cache-strategy-with-localstorage)
   - [Grid Virtualization & IntersectionObserver](#32-grid-virtualization--intersectionobserver)
   - [Rating Scale & Sort Normalization](#33-rating-scale--sort-normalization)
   - [Couple Match Algorithm](#34-couple-match-algorithm)
   - [Chapter Tracking for Books & Manga](#35-chapter-tracking-for-books--manga)
   - [Trailer Integration & HLS Playback](#36-trailer-integration--hls-playback)
4. [PWA Deployment Layer (GitHub Pages)](#4-pwa-deployment-layer-github-pages)
   - [Iframe Container Structure](#41-iframe-container-structure)
   - [Service Worker & Offline Cache Strategy](#42-service-worker--offline-cache-strategy)
   - [PWA Manifest & Adaptive Iconography](#43-pwa-manifest--adaptive-iconography)
5. [Automation & CI/CD (GitHub Actions)](#5-automation--cicd-github-actions)
   - [Continuous Deployment (deploy.yml)](#51-continuous-deployment-deployyml)
   - [Automated Weekly Excel Backup (backup-excel.yml)](#52-automated-weekly-excel-backup-backupexcylyml)
6. [Troubleshooting Guide](#6-troubleshooting-guide)
7. [v2 Target Architecture & Roadmap](#7-v2-target-architecture--roadmap)
   - [Migration Overview (v1 ➔ v2)](#71-migration-overview-v1--v2)
   - [UI Guardrails & Motion Tokens](#72-ui-guardrails--motion-tokens)
   - [PostgreSQL Schema Summary (Supabase)](#73-postgresql-schema-summary-supabase)
   - [Android APK Pipeline (Capacitor + GitHub Actions)](#74-android-apk-pipeline-capacitor--github-actions)
   - [Phase Ordering Rationale](#75-phase-ordering-rationale)

---

## 1. System Overview

NexusLib is built on a **decoupled hybrid architecture**:

```text
┌─────────────────────────────────────────────────────────────────┐
│                     USER (Browser / PWA)                       │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                   [HTTPS / Standalone Window]
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│          FRONTEND HOSTING: GitHub Pages (PWA Wrapper)           │
│   - index.html (Secure iframe with allow="fullscreen; autoplay")│
│   - manifest.json (PWA config, display: standalone)             │
│   - service-worker.js (Static shell caching)                    │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                 [postMessage / Async RPC]
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│         BACKEND & SPA CLIENT: Google Apps Script (GAS)          │
│   - doGet() serves the full SPA (AppScript/Index.html)          │
│   - WebAPP.gs exposes RPC functions via google.script.run       │
│   - Business logic, serialization, and type validation          │
└──────────────┬──────────────────────────────────┬───────────────┘
               │                                  │
       [REST / GraphQL]                     [Google Sheets API]
               ▼                                  ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│        EXTERNAL APIs         │   │      PERSISTENCE / DB        │
│ - Steam API & SteamCMD PICS  │   │ - Juegos sheet (486+ rows)   │
│ - TMDB API v3                │   │ - Peliculas_Series sheet     │
│ - Open Library REST API      │   │ - Libros sheet               │
│ - AniList GraphQL API        │   │ - Mangas sheet               │
│ - SteamGridDB                │   │ - Papelera sheet (JSON)      │
└──────────────────────────────┘   └──────────────────────────────┘
```

---

## 2. Backend Layer (Google Apps Script)

The file [AppScript/WebAPP.gs](AppScript/WebAPP.gs) acts as the application backend, running on Google's V8 engine.

### 2.1. Entry Point & Security Policies
The `doGet(e)` function initializes and dispatches the web app:
```javascript
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('NexusLib')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}
```
* **`XFrameOptionsMode.ALLOWALL`:** Required to allow clean embedding from the GitHub Pages domain (`angellrnzo.github.io`) without the browser blocking the page due to `X-Frame-Options: SAMEORIGIN` header directives.

### 2.2. Dynamic Header Relational Mapping
To let spreadsheets evolve (added columns, reordering, or minor name variations such as `AppID` vs `App ID` or `Fecha` vs `Lanzamiento`), a canonical `HEADER_TO_KEY` dictionary and normalizer are used:
```javascript
function mapearHeaderAKey_(rawHeader) {
  var clean = String(rawHeader || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (HEADER_TO_KEY[clean]) return HEADER_TO_KEY[clean];
  var sinGuiones = clean.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (HEADER_TO_KEY[sinGuiones]) return HEADER_TO_KEY[sinGuiones];
  return String(rawHeader || '').trim();
}
```
This guarantees that reads (`getItems`) and writes (`guardarFilaSheet`, `guardarProgresoItem`) don't depend on fixed column indexes, but on dynamic lookups via `buscarColumna_(headers, key)`.

### 2.3. External API Ecosystem & Robust Fallback

| Category | Primary API | Fallback / Backup Mechanisms | Required Key |
| :--- | :--- | :--- | :--- |
| **Games** | Valve Store API (`appdetails`) | 1. HTML scraper with age cookies (`mature_content=1`)<br>2. SteamCMD PICS API (`api.steamcmd.net`)<br>3. Steam News API<br>4. SteamGridDB | Optional (`STEAMGRIDDB_API_KEY`) |
| **Movies/Series** | TMDB API v3 (`search/multi`, `movie`, `tv`) | Crew director extraction, streaming platforms via region-based `watch/providers`, and YouTube trailers. | Required (`TMDB_API_KEY`) |
| **Books** | Open Library REST API | Search by ISBN, Work ID (`OL...W`), or Book ID (`OL...M`). Parallel author name resolution via `/authors/`. | None (Public) |
| **Manga** | AniList GraphQL API | Dual identifier support (native AniList IDs and MyAnimeList IDs via `idMal`). | None (Public) |

#### The Steam Fallback Mechanism:
When a classic or age-restricted game (e.g. AppID `238960` or delisted titles) is queried, Valve's standard API usually responds `{ success: false }`. `WebAPP.gs` cascades through:
1. **Step 1:** Browser simulation with an age-verification bypass cookie (`birthtime=283993201; mature_content=1`).
2. **Step 2:** Query to SteamCMD PICS records (`api.steamcmd.net/v1/info/{id}`) to extract the real name, developer, Steam Deck compatibility (`steam_deck_compatibility`), and public/beta branch builds (`depots.branches`).
3. **Step 3:** If no official artwork is available, query SteamGridDB for banners in `460x215` or `920x430` aspect ratios.

### 2.4. Batch Processing & Beating the 6-Minute Timeout
Google Apps Script imposes a **6-minute** synchronous execution limit per request. To update metadata and builds for large catalogs (486+ games):
* Processing is segmented into batches of 60 items (`LOTE_BUILDS_JUEGOS = 60`).
* After each batch, the numeric cursor is stored in `PropertiesService` and an async time-based trigger is scheduled with `ScriptApp.newTrigger`:
  ```javascript
  ScriptApp.newTrigger(TRIGGER_HANDLER_BUILDS)
    .timeBased()
    .after(15 * 1000)
    .create();
  ```
* The process self-resumes 15 seconds later, repeating the cycle until 100% of the sheet is covered without ever exceeding the time limit.

### 2.5. Trash System & Data Restoration
When an item is deleted via `eliminarItem(categoria, id)`:
1. The row is located by its ID or row key.
2. All its fields are extracted into a flat object and serialized to JSON.
3. It is inserted into the `Papelera` sheet storing `[categoria, id, titulo, datosJson]`.
4. When `restaurarItem(categoria, id)` is called, the backend rebuilds the row based on the current headers of the target category, guaranteeing lossless restoration.

---

## 3. Frontend Layer (Self-Contained SPA)

The file [AppScript/Index.html](AppScript/Index.html) is a Single Page Application (SPA) built in pure vanilla JavaScript without heavy frameworks, guaranteeing maximum execution speed on any device.

### 3.1. v19 Cache Strategy with LocalStorage
To avoid redundant requests to Google Sheets and guarantee instant loading:
* Each category is stored in `localStorage` under the key `media_lib_v19_{categoria}` with its timestamp `media_lib_time_v19_{categoria}`.
* Reads have a lifespan (`MAX_CACHE_AGE`) of **12 hours**.
* The **Sync** button forces a refresh with `forzarSincronizacion()`, bypassing the local cache and saving the latest server version.

### 3.2. Grid Virtualization & IntersectionObserver
Rendering 500+ cards with images saturates the mobile DOM. NexusLib applies lightweight virtualization:
* Only **36 cards** are rendered initially (`elementosPorPagina = 36`).
* A `#scroll-sentinel` sentinel is placed at the end of the grid.
* An `IntersectionObserver` with `rootMargin: '250px'` detects when the user approaches the end of the scroll and dynamically renders the next block of 36 cards:
  ```javascript
  observer = new IntersectionObserver(function(entries) {
    if (entries[0].isIntersecting) { 
      paginaActual++; 
      renderGrid(filteredItems); 
    }
  }, { rootMargin: '250px' });
  ```
* Each card has `content-visibility: auto; contain-intrinsic-size: 0 320px;` in CSS, letting the browser skip layout for off-screen cards.

### 3.3. Rating Scale & Sort Normalization
* **Rating Scale:** The 10 visual stars represent a direct **1-to-10** scale (`idx`). Clicking star 10 saves `10`, lights all 10 stars, and displays `10/10`.
* **Rating Filters:** Allow selecting minimum ratings of `5+`, `7+`, and `9+` (evaluated via `pts >= notaMinima`).
* **Global Rating Normalization:** When sorting by rating (`fOrden === 'puntuacion'`), the `obtenerPuntuacionNormalizada()` function divides by 10 any ratings expressed as percentages (e.g. `94% Steam` → `9.4`) so they compete fairly against TMDB and AniList scores (`8.5`).

### 3.4. Couple Match Algorithm
The `renderMatchGrid(cat)` function evaluates matches between the **Angel** and **Talmai** profiles:
$$\text{Match} = (\text{Pending}_A \land \text{Pending}_T) \lor (\text{Wishlisted}_A \land \text{Wishlisted}_T)$$
It shows a category-filterable grid with all titles both users have queued or both want to watch, play, or read.

### 3.5. Chapter Tracking for Books & Manga
For titles with sequential progress:
* **Manga:** Total chapter count syncs automatically from the AniList API.
* **Books:** Total pages/chapters can be edited manually in the modal.
* The reading bar calculates the percentage in real time:
  $$\text{Percentage} = \min\left(100, \text{round}\left(\frac{\text{Current}}{\text{Total}} \times 100\right)\right)$$
* It is displayed both on the main grid card and in each user's control panels.

### 3.6. Trailer Integration & HLS Playback
* **YouTube:** Automatically extracts the 11-character ID and embeds the secure player via `youtube-nocookie.com/embed/{id}?autoplay=1`.
* **Steam MP4 / WebM:** Plays directly in a `<video controls autoplay playsinline>` element.
* **HLS Streams (`.m3u8`):** If the trailer is an HTTP Live Streaming playlist, it asynchronously injects the `hls.js` library from CDN and binds it to the video element.

---

## 4. PWA Deployment Layer (GitHub Pages)

The static web files (`index.html`, `manifest.json`, `service-worker.js`, icons) live at the repository root to be served directly by GitHub Pages as an installable PWA.

### 4.1. Iframe Container Structure
The `index.html` file serves an iframe at 100% of the viewport:
```html
<iframe 
    src="https://script.google.com/macros/s/.../exec" 
    allow="clipboard-write; fullscreen; autoplay" 
    allowfullscreen>
</iframe>
```
* **`allow="clipboard-write; fullscreen; autoplay"`:** Grants the inner iframe permission to play trailers fullscreen and manage the clipboard.

### 4.2. Service Worker & Offline Cache Strategy
The `service-worker.js` file implements the `nexuslib-cache-v2` cache version:
* On `install`: Calls `self.skipWaiting()` and precaches essential local resources (`index.html`, `manifest.json`, icons).
* On `activate`: Iterates over cache keys and purges any obsolete versions.
* On `fetch`: Responds with a *Cache First* strategy for local resources, with network fallback.

### 4.3. PWA Manifest & Adaptive Iconography
The `manifest.json` file defines:
* `display: standalone`: Hides the browser address bar on mobile.
* `theme_color: #0b0e14` and `background_color: #0b0e14`: Visual coherence with the app palette.
* `"purpose": "any maskable"`: Adaptive icon support on Android, avoiding white borders or unnecessary padding.

---

## 5. Automation & CI/CD (GitHub Actions)

### 5.1. Continuous Deployment (deploy.yml)
Located at [.github/workflows/deploy.yml](.github/workflows/deploy.yml):
* Triggers automatically on every `push` to the `main` branch (plus manual `workflow_dispatch`).
* Uses the official `actions/upload-pages-artifact@v3` and `actions/deploy-pages@v4` actions.
* **Deployment scope:** Configured with `path: '.'`, so the **entire repository root** is published to GitHub Pages — including `AppScript/` sources, which are publicly reachable as static files (harmless, but worth knowing).

### 5.2. Automated Weekly Excel Backup (backup-excel.yml)
Located at [.github/workflows/backup-excel.yml](.github/workflows/backup-excel.yml):
* **Frequency:** `cron: '0 3 * * 0'` (every Sunday at 3:00 AM UTC).
* **Manual trigger:** `workflow_dispatch` allows running it on demand from the GitHub UI.
* **Execution flow:**
  1. Downloads the live file from Google Sheets in binary Excel format:
     ```bash
     curl -L -o "AppScript/GameList.xlsx" "https://docs.google.com/spreadsheets/d/13ZoOAVmoksF3jyNvFScscnBWhNHxXdOMAiXSlPImYnk/export?format=xlsx"
     ```
  2. Checks for modifications via `git diff --staged`.
  3. If the sheet changed, performs an automatic commit signed by `github-actions[bot]` and pushes to `main`.

---

## 6. Troubleshooting Guide

### The site shows a blank screen or CORS error
* **Cause:** The Apps Script deployment URL (`/exec`) has changed or doesn't have public access configured.
* **Fix:** In Apps Script, verify the deployment is set to: *Execute as: Me* and *Who has access: Anyone*. Make sure the URL in `index.html` exactly matches the latest deployed version URL.

### No results appear when searching for movies or series
* **Cause:** The TMDB API key is missing.
* **Fix:** In the Apps Script editor, go to **Project Settings** → **Script Properties** and create the `TMDB_API_KEY` property with your personal The Movie Database key.

### The weekly backup workflow fails with error 401 or downloads an HTML file
* **Cause:** The Google Sheet doesn't have link-based public read permission.
* **Fix:** Open the sheet in Google Sheets, click **Share** → under *General access* select **Anyone with the link** and keep the role as **Viewer**.

### Changes to Apps Script code don't show up in the PWA
* **Cause:** In Google Apps Script, editing code doesn't automatically update the active `/exec` URL.
* **Fix:** Click **Deploy** → **Manage deployments** → pencil icon → under *Version* select **New version** → click **Deploy**.

---

## 7. v2 Target Architecture & Roadmap

> Everything in this section is **planned**, not yet implemented. See [road.md](AppScript/road.md) for the living audit and phase status.

### 7.1. Migration Overview (v1 ➔ v2)

```text
LEGACY (v1.x)                          TARGET (v2.0)
GitHub Pages PWA                       Android Native App (.apk)
  └─ iframe                            └─ Capacitor WebView Shell
       └─ GAS doGet()                       └─ HTTPS / WSS (Realtime)
            └─ Google Sheets                    └─ Supabase Postgres (RLS)
                 ▲                                 ▲
                 └─ Weekly .xlsx backup            └─ Edge Functions / Workers
                                                        ▲
                                              GitHub Releases (signed .apk)
```

Key shifts:
- **Database:** Google Sheets ➔ PostgreSQL (Supabase) with Row-Level Security.
- **Backend:** `WebAPP.gs` RPC ➔ Edge Functions / Cloudflare Workers proxying Steam/TMDB/OpenLibrary/AniList.
- **Auth:** implicit shared sheet ➔ multi-user JWT (`auth.users`) with personal libraries.
- **Libraries:** single shared catalog ➔ per-user `libraries` linkable via `invite_code`, enabling cross-library match views without merging private lists.

### 7.2. UI Guardrails & Motion Tokens

Rules for all frontend work (v1 and v2):

1. **Zero Layout Shift (GPU-only):** Animate strictly `transform`/`opacity`; never animate `height`/`width`/`margin`/`padding` inside `#grid` (avoids `IntersectionObserver` drift).
2. **Respect `content-visibility: auto`:** Keep burst/particle animations inside `.img-container` (`overflow: hidden`).
3. **Touch Gesture Isolation:** Isolate vertical modal drags vs. horizontal carousels with `e.stopPropagation()` and axis-locking (`|dy| > |dx| * 1.8`).
4. **Navigation Stack Integrity:** Sync modal dismissals with `history.popstate` on web and Capacitor `App.addListener('backButton')` on Android.
5. **Backdrop Blur Budget:** `backdrop-filter: blur()` only on static modal backdrops; never on scrolling grid cards.
6. **Reduced-Motion Compliance:** Override all keyframe animations under `@media (prefers-reduced-motion: reduce)`.

```css
:root {
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-sheet: cubic-bezier(0.32, 0.72, 0, 1);
}

@keyframes igHeartBurst {
  0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.2) rotate(-12deg); }
  25%  { opacity: 1; transform: translate(-50%, -50%) scale(1.22) rotate(6deg); }
  55%  { opacity: 1; transform: translate(-50%, -50%) scale(0.95) rotate(-2deg); }
  80%  { opacity: 1; transform: translate(-50%, -50%) scale(1.04) rotate(0deg); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1.35); }
}
@keyframes slideInRight { from { opacity: 0; transform: translateX(22px); }  to { opacity: 1; transform: translateX(0); } }
@keyframes slideInLeft  { from { opacity: 0; transform: translateX(-22px); } to { opacity: 1; transform: translateX(0); } }
@keyframes shimmerWave  { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
```

### 7.3. PostgreSQL Schema Summary (Supabase)

> Full DDL will live in `database/schema.sql` when Phase 4 starts.

**How cross-user linking works:** each user owns a personal `libraries` workspace. Exchanging a 10-char `invite_code` creates a `library_links` row (`pending` → `accepted`). Since both libraries reference the same canonical `media_items.id`, the views detect titles both linked users marked `is_wishlisted` or `status = 'backlog'` — without exposing private `personal_notes`.

| Table | Purpose |
| :--- | :--- |
| `profiles` | User accounts (UUID → `auth.users`), username, avatar, accent color, preferences JSONB. |
| `libraries` | Personal workspaces with unique `invite_code`. |
| `library_members` | Membership + role (`owner`/`editor`/`viewer`). |
| `library_links` | Bidirectional library links (`pending`/`accepted`/`blocked`, `match_enabled`); unique index prevents duplicate pairs in either direction. |
| `media_items` | Global deduplicated catalog — `UNIQUE(category, provider, external_id)`, metadata JSONB, cover/banner/trailer URLs. |
| `library_items` | Per-library catalog entries + soft-delete Trash (`deleted_at`). |
| `user_media_tracking` | Per-user status, rating (1.0–10.0), progress, `is_wishlisted`, notes. |
| `mods` *(planned)* | Per-user mod lists per game — name, source (`nexus_mods`/`steam_workshop`/`curseforge`/`otra_url`), URL, `version_juego` (grouped in UI), notes. Spec in `road.md` → "Game Mods Tracker". |

**Key DB objects:**
- `v_library_matches` — intra-library match (≥2 members wishlist/backlog the same item).
- `v_cross_library_matches` — cross-library match with `mutual_wishlist` flag and user display names.
- `request_library_link(my_library_id, invite_code)` — `SECURITY DEFINER` RPC creating a pending link.
- `bootstrap_user_default_library()` trigger — auto-creates a personal library on signup.
- RLS on all tables; `pg_trgm` + GIN indexes on title/genres/metadata.

**⚠️ Dedup caveat:** `UNIQUE(category, provider, external_id)` must keep `movie` and `series` strictly separated for TMDB — the same TMDB id space is shared, so the ETL must map `search/multi` results to the correct category before insert.

### 7.4. Android APK Pipeline (Capacitor + GitHub Actions)

1. **Init wrapper:** `npm i @capacitor/{core,cli,android,app,haptics,status-bar,splash-screen,network}` → `npx cap init "NexusLib" com.nexuslib.app --web-dir=www` → `npx cap add android`.
2. **Native bridge:** `backgroundColor: '#0b0e14'` + dark StatusBar (no white flash); haptics on wishlist/star actions; `backButton` listener closes modals/filters.
3. **Signing:** `keytool` release keystore → GitHub Secrets (`ANDROID_KEYSTORE_BASE64`, passwords, alias).
4. **CI/CD:** `.github/workflows/build-apk.yml` on `v*` tags — Node 20 + Java 17 + Android SDK → `npx cap sync android` → `./gradlew assembleRelease` → publish `app-release.apk` to GitHub Releases.

### 7.5. Phase Ordering Rationale

Phases are ordered by **user-visible impact per effort**: UX fixes and motion deliver immediate perceived quality; backend hardening (fetchAll, health checks, offline mode) is invisible until something breaks; the v2 migration is the largest bet and only makes sense once v1 feels polished. See `AppScript/road.md` for the full phase checklist.

---

*Last updated: 2026-11-21 — added mods table to v2 schema summary (spec in AppScript/road.md).*
