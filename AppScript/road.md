# 🌌 NexusLib — Overview & Roadmap

## Project Overview

**NexusLib** is a collaborative multimedia Progressive Web App (PWA) for tracking video games, movies, series, books, and manga — evolving into a native Android app.

| Layer | v1 (Current) | v2 (Target) |
| :--- | :--- | :--- |
| **Database** | Google Sheets | Cloud PostgreSQL (Supabase) |
| **Backend / API** | Google Apps Script (`WebAPP.gs`) | Edge Functions / Cloudflare Workers |
| **Frontend** | SPA in iframe shell (`Index.html`) | Same SPA via Capacitor Android WebView |
| **Hosting & CI/CD** | GitHub Pages + Actions (weekly `.xlsx` backups) | + automated signed `.apk` releases |

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
| **Cross-User Library Linking (`library_links`)** | 🔴 **PENDING** *(v2)* | New capability: link separate user libraries via invite code and compute real-time matches across independent catalogs. |

---

## 🛡️ UI Architecture Guardrails

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

@keyframes igHeartBurst { /* scale 0.2 → 1.22 → 0.95 → 1.04 → fade */ }
@keyframes slideInRight  { from { opacity: 0; transform: translateX(22px); }  to { opacity: 1; transform: translateX(0); } }
@keyframes slideInLeft   { from { opacity: 0; transform: translateX(-22px); } to { opacity: 1; transform: translateX(0); } }
@keyframes shimmerWave   { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
```

---

## 🗄️ v2 Database Schema (PostgreSQL / Supabase — Planned)

> Full DDL will live in `database/schema.sql` when Phase 4 starts. Summary below.

**How cross-user linking works:** each user owns a personal `libraries` workspace. Exchanging a 10-char `invite_code` creates a bidirectional `library_links` row. Since both libraries reference the same canonical `media_items.id`, the views automatically detect titles both linked users marked `is_wishlisted` or `status = 'backlog'` — without exposing private notes.

| Table | Purpose |
| :--- | :--- |
| `profiles` | User accounts (UUID → `auth.users`), username, avatar, accent color, preferences JSONB. |
| `libraries` | Personal workspaces with unique `invite_code`. |
| `library_members` | Membership + role (`owner`/`editor`/`viewer`). |
| `library_links` | Bidirectional links between libraries (`pending`/`accepted`/`blocked`, `match_enabled`); unique index prevents duplicate pairs either direction. |
| `media_items` | Global deduplicated catalog (`UNIQUE(category, provider, external_id)`), metadata JSONB, cover/banner/trailer URLs. |
| `library_items` | Per-library catalog entries + soft-delete Trash (`deleted_at`). |
| `user_media_tracking` | Per-user status, rating (1.0–10.0), progress, `is_wishlisted`, notes. |

**Key DB objects:**
- `v_library_matches` — intra-library match view (≥2 users wishlist/backlog same item).
- `v_cross_library_matches` — cross-library match view with `mutual_wishlist` flag and user display names.
- `request_library_link(my_library_id, invite_code)` — SECURITY DEFINER RPC to create a pending link.
- `bootstrap_user_default_library()` trigger — auto-creates a personal library on profile signup.
- RLS enabled on all tables; `pg_trgm` + GIN indexes for title/genre/metadata search.

---

## 📱 v2 Android APK Pipeline (Capacitor + GitHub Actions — Planned)

1. **Init wrapper:** `npm i @capacitor/{core,cli,android,app,haptics,status-bar,splash-screen,network}` → `npx cap init "NexusLib" com.nexuslib.app --web-dir=www` → `npx cap add android`.
2. **Native bridge:** `backgroundColor: '#0b0e14'` + dark StatusBar (no white flash); haptics on wishlist/star actions; `backButton` listener closes modals/filters.
3. **Signing:** `keytool` release keystore → GitHub Secrets (`ANDROID_KEYSTORE_BASE64`, passwords, alias).
4. **CI/CD:** `.github/workflows/build-apk.yml` on `v*` tags — Node 20 + Java 17 + Android SDK → `npx cap sync android` → `./gradlew assembleRelease` → publish `app-release.apk` to GitHub Releases.

---

## 🚀 Execution Roadmap

### 📍 Phase 1: Immediate UX Fixes (v1.x — High Priority)
1. **Top Search History** — `focus` → `pushState` on `#inputBuscar` (~L1303); `blur()` on `popstate` (~L1335).
2. **Patch Note Dates** — strip `[YYYY-MM-DD]` via regex when rendering `it.notaParche` (~L1937).
3. **Modal Scroll Reset** — `.modal-content.scrollTop = 0` in `abrirModal()`/`cerrarModal()` (~L1855/~L2040).

### 📍 Phase 2: Backend & Offline Resilience (v1.x)
1. **Parallel Open Library** — refactor `resolverAutoresOpenLibrary_` with `UrlFetchApp.fetchAll()`.
2. **API Key Health** — `?action=health` diagnostic for `TMDB_API_KEY` / `STEAMGRIDDB_API_KEY`.
3. **Offline Read-Only** — `online`/`offline` listeners disabling write actions + toast.

### 📍 Phase 3: Instagram/X Visual Motion System (v1.x)
- **3A:** Skeleton shimmer cards + `--ease-spring` micro-interactions.
- **3B:** Directional swipe transitions (`slideInRight`/`slideInLeft`) + sliding tab pill.
- **3C:** Double-tap heart burst in `.img-container` for instant wishlist.
- **3D:** Bottom-sheet modals with pull-to-dismiss + scroll-snap screenshot carousel.

### 📍 Phase 4: Cloud SQL & Auth (v2.0)
1. Deploy `schema.sql` on Supabase (Auth + profiles/libraries/media_items/tracking).
2. Migrate Steam/TMDB/OpenLibrary/AniList resolvers from `WebAPP.gs` to Edge Functions / Workers.
3. ETL: import `GameList.xlsx` into PostgreSQL mapped to user UUIDs.

### 📍 Phase 5: Cross-User Library Linking (v2.0)
1. Invite-code UI + `library_links` (`request_library_link()`).
2. Link approval/revocation + `match_enabled` toggle (private notes never exposed).
3. Unified Match feed querying `v_library_matches` + `v_cross_library_matches` with realtime subscriptions.

### 📍 Phase 6: Android APK & Release CI/CD (v2.0)
1. Capacitor integration (Haptics, StatusBar, Network, BackButton).
2. Offline-first sync queue (IndexedDB → PostgreSQL `UPSERT` on reconnect).
3. Signed `.apk` builds on every `v*` tag → GitHub Releases.

---

*Last consolidated update: 2026-11-20 — v1 audit verified against live code; v2 sections are planned.*
