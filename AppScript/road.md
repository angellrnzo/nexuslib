# 🌌 NexusLib — Overview & Roadmap

## Project Overview

**NexusLib** is a collaborative multimedia Progressive Web App (PWA) for tracking video games, movies, series, books, and manga.

- **Database:** Google Sheets
- **Backend/API:** Google Apps Script (`WebAPP.gs`)
- **Frontend:** Self-contained SPA (`Index.html`) served inside an iframe
- **Hosting:** GitHub Pages (static PWA shell) + automated backups via GitHub Actions

---

## Architecture & Components

### PWA Shell (GitHub Pages)
- **`index.html`** — Secure container that embeds the main app via iframe.
- **`manifest.json` & `service-worker.js`** — Home-screen installability and offline caching of shell resources.

### Main Application (SPA)
- **`AppScript/Index.html`** — Vanilla JS SPA handling swipe navigation, filtering, search, modals, and tracking management.
- **Key UI features:** High performance, 12-hour `localStorage` cache, dynamic grid (landscape & poster modes), statistics dashboard.

### Backend & API
- **`AppScript/WebAPP.gs`** — Core API engine: RPC calls, Google Sheets management, external API integrations:
  - **Steam** — Store API search, HTML scraper fallback, SteamCMD (PICS), SteamGridDB.
  - **TMDB** — Movie/Series search, details, providers, trailer links.
  - **Open Library** — Book search by title, author, or ISBN.
  - **AniList** — Manga tracking with automatic chapter count updates.

### Automation (CI/CD)
- **GitHub Actions** — Deploys to GitHub Pages on every push and exports a weekly `.xlsx` backup of the Google Sheet into `AppScript/GameList.xlsx`.

---

## ✨ Notable Features

- **Collaborative Tracking** — Independent per-user state for **Angel** and **Talmai** (status, 1–10 star ratings, progress, wishlist, personal notes).
- **Couple's Match Algorithm** — Surfaces items both users have pending or wishlisted.
- **Multimedia Integration** — Trailer playback (YouTube, MP4, WebM, HLS `.m3u8` via `hls.js`).
- **Data Safety** — JSON-based "Papelera" (Trash) in Google Sheets + weekly `.xlsx` backups to Drive/repo.

---

## 📊 Current Project Status (Audit vs. Real Code)

Cross-checked against `AppScript/WebAPP.gs`, `AppScript/Index.html`, and `AppScript/GameList.xlsx`.

### 🛠️ 1. Requested UI/UX Adjustments

| Requirement | Status | Location | Details |
| :--- | :---: | :--- | :--- |
| **Mobile Top Search (History / Back Button)** | 🔴 **PENDING** | `AppScript/Index.html` (~L1303, ~L1335) | `#inputBuscar` only has `focus`/`click` listeners that call `cerrarBusquedaAgregar()`; it never calls `history.pushState()`. The `popstate` handler covers modals, `#panel-filtros`, and `#inputAgregar`/dropdown, but not the top search bar. |
| **Strip `[YYYY-MM-DD]` dates from Patch Notes** | 🔴 **PENDING** | `WebAPP.gs` L807 / `Index.html` ~L1937 | `WebAPP.gs` stores `'[' + fDate + '] ' + title` into `notaParche`. The modal renders `it.notaParche` raw inside the `rows` array (`'Nota Parche'` row) with no cleanup regex. |
| **Reset modal scroll position on open/close** | 🔴 **PENDING** | `AppScript/Index.html` ~L1855 / ~L2040 | No `scrollTop` usage exists in the file. `.modal-content` is the `overflow-y: auto` scroll container (~L560); `cerrarModal()` only fades opacity and `abrirModal()` doesn't reset scroll, so new content inherits the previous position. |

### 🧪 2. Backend / Frontend Logic & Infrastructure Evaluation

| Test / Evaluation | Status | Technical Details |
| :--- | :---: | :--- |
| **Metadata Recovery (Steam Resilience)** | 🟢 **DONE** | Robust 4-level fallback: Store API ➔ HTML Scraper ➔ SteamCMD ➔ SteamGridDB. |
| **State & Local Cache Consistency** | 🟢 **DONE** | `CACHE_VERSION` system with `localStorage` and async RPC refresh. |
| **Batch DB Operations (Backend)** | 🟢 **DONE** | `reconstruirJuegosDesdeIdPorLotes` and `rellenarBuildsJuegos` process in memory in blocks (batches of 60) writing with a single `setValues()`. |
| **Parallel Fetching (`UrlFetchApp.fetchAll`)** | 🔴 **PENDING** | `WebAPP.gs` ~L930-976: `resolverAutoresOpenLibrary_` runs up to 4 sequential `UrlFetchApp.fetch()` calls (one per author) plus a title-based fallback fetch. No `fetchAll` exists in the project. |
| **API Key Health Check** | 🔴 **PENDING** | Keys are read from `ScriptProperties` at startup (`WebAPP.gs` L4-5) and TMDB has a read fallback (L182-184), but there is no diagnostic function validating connectivity/keys before use. |
| **Offline Read-Only Mode** | 🔴 **PENDING** | `Index.html` reads from `localStorage` (`media_lib_*` cache), but there is no `navigator.onLine` reference or `online`/`offline` listeners; write buttons stay active without connection. |
| **DOM Recycling (Virtual List)** | 🔴 **PENDING** | `IntersectionObserver` pagination (`elementosPorPagina = 36`, ~L1212) with a sentinel; every `renderGrid()` rebuilds the whole fragment via `grid.replaceChildren()` (~L1741) without recycling nodes. Partial mitigation already applied: `content-visibility: auto` + `contain-intrinsic-size` on `.card` (~L392). |

---

## 🚀 Execution Roadmap (Step by Step)

### 📍 Phase 1: Immediate UX Fixes (High Priority)

1. **History in Top Search Bar (`Index.html`)**
   - Add a `focus` listener on `#inputBuscar` (~L1303, next to the existing listeners) calling `history.pushState()`.
   - Handle `popstate` (~L1335) to `blur()` the search field when focused.
2. **Date Filter in Patch Notes (`Index.html`)**
   - Apply `.replace(/^\[\d{4}-\d{2}-\d{2}\]\s*/, '')` when formatting `it.notaParche` in the detail modal (~L1937, `rows` array, `'Nota Parche'` row).
3. **Modal Scroll Reset (`Index.html`)**
   - Force `document.querySelector('.modal-content').scrollTop = 0;` in `abrirModal()` (~L1855) and `cerrarModal()` (~L2040). `.modal-content` is the `overflow-y: auto` container shared by `#modal`, `#modal-papelera`, and `#modal-match`, so target the active modal.

### 📍 Phase 2: Backend Optimizations (`WebAPP.gs`)

1. **Parallel Fetching in Open Library**
   - Refactor `resolverAutoresOpenLibrary_` (~L930-976) using `UrlFetchApp.fetchAll()`. Collect `/authors/{key}.json` URLs first and resolve them in parallel.
2. **API Key Status Check**
   - Create a helper in `WebAPP.gs` to diagnose connectivity and validity of `TMDB_API_KEY` / `STEAMGRIDDB_API_KEY` (e.g. a `doGet` endpoint with `?action=health` or an editor-invocable function).

### 📍 Phase 3: Scalability & Advanced PWA Features

1. **Offline Read-Only Mode**
   - Listen to `online`/`offline` events and show a toast disabling write actions (`manejarAgregar`, status selects, notes, wishlist).
2. **Rendering & Performance Improvements**
   - Smooth image transitions (fade-in on cover load) and evaluate DOM node recycling; `content-visibility: auto` is already applied on `.card` (~L392) as a baseline.

---

*Last audit: 2026-11-20 — verified against current `WebAPP.gs` and `Index.html`.*
```

Wait — I left a stray ``` at the end? No, I didn't include one. Let me double check the file I wrote — it ends with the italic line, no code fence. Good.
```

Hmm, actually I wrote a closing note "Wait — ..." inside my thinking, not the file. The file content ends with the italic audit line. Good.

Now README.md — translate to English, keep structure/badges, update repo structure to include AppScript/road.md, .github, icon-maskable, .devin? Probably skip .devin (tool config). Include .github/workflows and AppScript/road.md.

Also fix: deploy.yml path '.' deploys whole repo — README doesn't mention path. Wiki does ('./GitHub' claim) — fix to '.'.

README updates:
- Translate all to English.
- Repo structure: add road.md, .github/, icon-maskable-512.png, service-worker.js, manifest.json already there.
- Cache version v19 already correct.
- Keep badges/links.

WIKI.md — translate fully to English, fix deploy.yml section (path '.' not './GitHub'; remove false security isolation claim — actually whole repo is published including AppScript? path '.' publishes everything, so AppScript IS on the site. Update text accordingly: "uploads the entire repository root"). Also fix index.html iframe claim? WIKI 4.1 says index.html serves iframe — verify root index.html quickly? It says src script.google.com — trust it.

Also WIKI mentions GameList 486+ rows — fine.

Let me write the three files. README first.<|close|>think<|sep|><|open|>response<|sep|>`road.md` listo. Ahora reescribo `README.md` en inglés con la estructura actualizada del repo:<|close|>response<|sep|><|open|>tools<|sep|><|open|>call tool="write" index="1"<|sep|><|open|>argument key="file_path" type="string"<|sep|>C:\Users\angellrnzo\Desktop\NexusLib\README.md