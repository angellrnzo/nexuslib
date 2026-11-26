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
| **Mobile Top Search (`popstate` Back Button)** | ✅ DONE (en `index.html` PWA) | `inputBuscar` focus/click + `popstate` | Focus hace `pushState({sf:true})`; back button → blur + reset estado. |
| **Strip `[YYYY-MM-DD]` dates from Patch Notes** | ✅ DONE | `WebAPP.gs` L807 / `Index.html` ~L1937 | `WebAPP.gs` stores `'[' + fDate + '] ' + title` into `notaParche`; the modal renders it raw in the `rows` array (`'Nota Parche'` row) with no cleanup regex. |
| **Reset modal scroll on open/close** | ✅ DONE | `Index.html` ~L1855 / ~L2040 | No `scrollTop` usage exists. `.modal-content` is the `overflow-y: auto` container (~L560) shared by `#modal`, `#modal-papelera`, `#modal-match`; `abrirModal()`/`cerrarModal()` don't reset it. |

### 🎨 2. UI Motion & Micro-Interactions (Instagram / X Patterns)

| Pattern | Status | Target | Implementation Notes |
| :--- | :---: | :--- | :--- |
| **Skeleton Shimmer Loading** | ✅ DONE 2026-11-27 (`nexusSkeletonGrid` + `.skel-grid` en `index.html`) | `cargarCategoria()` | Skeleton cards con proporción de `.card` reemplazan el spinner en carga inicial y refresh. |
| **Spring Micro-Feedback** | ✅ DONE 2026-11-27 (tokens + optimistic UI en wish/stars/progreso/nota/capitulos con toast de error; fix race de handlers en `nexusRun._exec`) | `index.html` | Updates 0ms sobre `it`+localStorage+rerender, `RUN.*` en background con `.withFailureHandler` toast. |
| **Directional Tab Transitions** | ✅ DONE 2026-11-27 (`#grid` slide ±22px según dirección tabs/swipe + stagger por filas) | `index.html` | Verificado en beta. |
| **Double-Tap Heart Burst** | ✅ DONE 2026-11-27 (`nexusHeartBurst` + `nexusToggleDeseadoCard` en touchend/dblclick) | `index.html` | En touch no abre modal; desktop `dblclick`. |
| **Bottom Sheet & Pull-to-Dismiss** | ✅ DONE 2026-11-27 (≤768px bottom-sheet + handle sticky + pull-down >90px cierra + overscroll-behavior + scroll-lock) | `index.html` | `body.modal-open` via MutationObserver en los 5 modales + lightbox. |
| **Carousel Scroll-Snap & Dots** | ✅ DONE 2026-11-26 (scroll-snap + dots dinámicos) | `#m-screenshots` (~L1064, ~L1943) | `scroll-snap-type: x mandatory` + dynamic pagination dots for Steam screenshots. |
| **Image Lightbox Viewer** | ✅ DONE 2026-11-26 (fullscreen, flechas, teclado, counter) | `#m-screenshots`, `.carousel img` (~L650) | Fullscreen in-app lightbox for covers/screenshots/backdrops — arrows, keyboard/swipe nav, ESC/backdrop close. Keeps user inside the app (preferred over `window.open`/new tab, which breaks PWA context). User idea 2026-11-23. |
| **Dialog Semantics & Focus Trap** | ✅ DONE 2026-11-27 (4 modales con role=dialog/aria-modal, Escape cierra, focus al abrir, Tab/Shift+Tab cicla dentro del modal) | `#modal`, `#modal-papelera`, `#modal-match`, `#modal-perfil` | `role="dialog"`/`aria-modal`/`aria-labelledby`, focus trap Tab-cycle, focus restore on close. Spec in Phase 2E. |
| **Empty & Error State Boxes** | ✅ DONE 2026-11-27 (`nexusStateBox` en grid error/vacío/búsqueda + papelera empty/error con Reintentar) | `index.html` | Offline variant queda para wiring con `body.offline`. |

### 🧪 3. Backend, Infrastructure & Data Audit

| Evaluation | Status | Technical Details |
| :--- | :---: | :--- |
| **Metadata Recovery (Steam Resilience)** | 🟢 **DONE** | 4-level fallback: Store API ➔ HTML Scraper ➔ SteamCMD ➔ SteamGridDB. |
| **State & Local Cache Consistency** | 🟢 **DONE** | `CACHE_VERSION` (`v19`) with `localStorage` and async RPC refresh. |
| **Batch DB Operations (Backend)** | 🟢 **DONE** | `reconstruirJuegosDesdeIdPorLotes` / `rellenarBuildsJuegos` batch writes (60 rows) + 15s self-rescheduling triggers. |
| **Parallel Fetching (`UrlFetchApp.fetchAll`)** | ✅ DONE 2026-11-26 (Promise.all en resolverAutoresOpenLibrary — providers.ts) | `resolverAutoresOpenLibrary_` (`WebAPP.gs` ~L930-976) runs up to 4 sequential fetches + title fallback; no `fetchAll` in the project. |
| **API Key Health Check** | ✅ DONE 2026-11-26 (Edge Function `health` — valida STEAMGRIDDB+TMDB con probe real, sin exponer keys) | Keys load from `ScriptProperties` (`WebAPP.gs` L4-5, TMDB fallback L182-184) but no diagnostic function validates them before use. |
| **Offline Read-Only Mode** | ✅ DONE 2026-11-26 (navigator.onLine + body.offline + banner + writes deshabilitados + toast) | No `navigator.onLine` or `online`/`offline` listeners; write buttons stay active without connection. |
| **DOM Recycling (Virtual List)** | 🔴 **PENDING** | `IntersectionObserver` pagination (36/page) rebuilds the whole fragment via `grid.replaceChildren()` (~L1741). Partial mitigation: `content-visibility: auto` on `.card` (~L392). |
| **Cross-User Library Linking (`library_links`)** | 🔴 **PENDING** *(v2)* | Link separate user libraries via invite code and compute real-time matches across independent catalogs. |

---

## 🔧 Planned Feature: Game Mods Tracker (v1.x — spec only, not implemented)

> **Status:** ✅ **IMPLEMENTADO 2026-11-26** — versión Supabase (no Sheets): tabla `mods` ya existía con RLS `mods_self` (privado por usuario, sin match de pareja). UI en `index.html`: botón "Mods" en la fila de acciones del modal de juego (solo Juegos + NEXUS_MODE), panel con búsqueda rápida (Nexus/Workshop exacto por appid/CurseForge/Google), formulario nombre+fuente+URL+versión+notas, lista agrupada por `version_juego` (details colapsables), eliminar. Pendiente: prueba visual en /dev con mods reales.
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

> **Nota 2026-11-25:** los SQL de `database/` fueron renumerados por orden de ejecución: `00_schema.sql`, `01_phase4_5.sql`, `02_phase5c`, `03_phase5d`, `04_phase5e`, `05_phase5h`. Los aplicados históricamente como `phase5b/5f/5g` viven en `database/legacy/` (subsumidos por 05 — no re-correr). Referencias a nombres viejos en este documento son registro histórico.

## 🔧 Planned Feature: Game Update History — Steam patch log (v1.x — spec only, not implemented)

> **Status:** ✅ **IMPLEMENTADO 2026-11-26 (Supabase)** — Edge Function `steam-updates` (POST {appid} → RSS `feeds/news/app/{appid}` parseado: date/title/url/summary/is_update, últimos 20 items, badge Update por keywords ES/EN). Deployada en principal + standby. UI en `index.html`: botón "Historial de Updates" en el modal de juego (solo Juegos con appid numérico + NEXUS_MODE), caja lazy-load estilo trailer, items con fecha + título-link + badge + resumen. Verificado E2E con Cyberpunk 2079 (10 items reales). El `doGet` de Apps Script del spec original quedó obsoleto — el proxy vive en Supabase.
> User idea: keep the full patch/changelog history per game — Steam publishes every update on the store page (e.g. *Mewgenics* update history), and users want it tracked inside the app instead of checking Steam manually.

### Patch log concept

For each **video game** with a Steam appid, show the game's **update history** (patches, hotfixes, major updates) with date + title + link to the full patch notes — same lazy-fetch pattern as the Steam Reviews breakdown (Phase 3.5 item 5): fetched on modal open, never at catalog load.

### Data source

- Primary: Steam **news RSS feed** — `https://store.steampowered.com/feeds/news/app/{appid}?l=spanish&cc=US` (public, no key, same domain/cookies as the existing store-page scrape in `WebAPP.gs` ~L686). Items carry `<title>`, `<pubDate>`, `<link>` (full patch post) and `<description>` (summary).
- Filter client-side or server-side to update-ish titles (`update`, `patch`, `hotfix`, `actualización`, `parche` — EN+ES) OR take last N items regardless; keep it simple: last 10 news items, badge the ones matching update keywords.
- Full patch notes: link out to the Steam post URL (`<link>`) — fetching+parsing each news post's HTML body is a v2 nicety, not needed for v1.
- Non-Steam games (no appid) → section hidden, same guard as `admiteTrailer`/`#btn-toggle-resenas`.

### UI

- New collapsible box inside the game modal (same `.trailer-box`/`#m-resenas-box` pattern), toggle button styled like `.btn-trailer`.
- List: date · title · "ver parche completo ↗" external link. Sorted newest first.
- Optional later: "installed version" marker — needs storage → **right of the cut** (not v1).

### Backend

- New `doGet` action `?action=steamUpdates&appid={id}` — `UrlFetchApp.fetch` the RSS feed, regex/Xml parse items, return JSON array `[{date, title, url, summary}]`. No schema change, no storage — pure proxy + parse.

---

## 🔧 Planned Feature: Book Editions by Translator (v1.x read-only + v2 ownership)

> **Status:** ✅ **Half A IMPLEMENTADA 2026-11-26 (Supabase)** — Edge Function `book-editions` (POST {id} → resuelve work key desde external_id almacenado — `W` directo, `M` vía edition→works[], `isbn:` vía isbn→works[] → `works/{key}/editions.json?limit=100`, traductores resueltos a nombre vía /authors/ cap 20, sort ES primero + año desc). Deployada principal+standby. UI: botón "Ediciones" lazy en modal de Libros — filas con título, traductor·editorial·fecha·idioma, tag ES, links ISBN/archive.org "Leer". Verificado E2E (El Diario de Ana Frank 2 eds, El imperio final 45 eds ES-first). Half B (ownership por usuario → visibility matrix) sigue pendiente — right of the cut.
> User idea: same book exists in multiple translations/editions and some are better than others — Pedro owns translator X's version, Juan owns translator Y's. Want a per-work **editions list** (translator, publisher, year, language, ISBN) and eventually track *which edition each user owns*.

### Concept — two halves with different cut positions

**Half A — Editions browser (v1.x, read-only, no schema change):**

- Source: OpenLibrary **`works/{key}/editions.json`** — same provider already used for books; returns up to ~100 editions per work with `key`, `title`, `publish_date`, `publishers[]`, `translators[]` (as `{key, name}`), `languages[]` (`{key, name}`), `isbn_10`/`isbn_13`, `ocaid` (archive.org scan link).
- Backend: new `doGet` action `?action=libroEdiciones&workKey={key}` — fetch editions JSON, normalize to `[{edition, translators, publisher, language, year, isbn, ocaid}]`, sort by `publish_date` desc. New resolver — no changes to existing ones.
- UI: collapsible "Ediciones" section in the book modal (`.trailer-box` pattern) — table/cards: **traductor · editorial · año · idioma · ISBN**, with archive.org "leer" link when `ocaid` present. ES translations first.
- Edge cases: works with 1 edition → show section anyway (confirms no alternatives); `translators` often empty → show "sin dato"; non-OL books (manual entries) → section hidden.

**Half B — "My edition" ownership (✂️ right of the cut):**

- Each user marks which edition they own (dropdown populated from Half A + free-text fallback). Needs a stored field → `user_media_tracking.edition jsonb` (or `edition_id` + `edition_label`) in Phase 4 schema.
- **Synergy with Phase 5A:** edition becomes a visibility-matrix field — Angel can expose "tengo la edición de Enrique de Juan" to `pareja` while hiding it from `amigo`. Same mechanism, one more field.
- Community "best translation" ratings → out of scope (would need per-edition social layer; revisit only if editions get heavy use).

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
- **`works/{key}/editions.json` exists** — returns per-edition `translators[]`, `publishers[]`, `languages[]`, `publish_date`, `isbn_*`, `ocaid`. Powers the planned "Book Editions by Translator" feature (spec above). Limit ~100 editions/work, `limit`/`offset` params available.
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

### Backup & secondary sources — live re-test 2026-11-23

Keyless endpoints verified with real requests; key-required sources listed as **possible — test when needed**.

**Juegos (primary: Steam `appdetails` + store scrape):**

| Source | Test | Verdict |
|---|---|---|
| Steam `appdetails` JSON | `200` (~1.2s) | ✅ primary, healthy |
| Steam news RSS `feeds/news/app/{appid}` | `200` (~0.9s) | ✅ **verified — powers Game Update History spec (Phase 3 item 6)** |
| IGDB (Twitch) | not tested — needs Twitch client id/secret | 🔑 possible — richer game metadata (genres, platforms, screenshots) |
| RAWG | not tested — needs free API key | 🔑 possible — game DB w/ ratings, alternative to Steam for non-Steam titles |

**Peliculas_Series (primary: TMDB):**

| Source | Test | Verdict |
|---|---|---|
| TMDB | key in ScriptProperties — can't test externally | ✅ primary (assumed healthy) |
| OMDB | not tested — needs free API key | 🔑 possible — thin metadata, good for quick lookups |
| TVDB | not tested — needs free API key | 🔑 possible — strong series/episode data, good TMDB complement for episodic tracking |

**Libros (primary: OpenLibrary):**

| Source | Test | Verdict |
|---|---|---|
| OL `works/{key}/editions.json` | `200` — Gatsby work returned **1,181 editions** | ✅ **verified — powers Book Editions spec (Phase 3 item 7)**; earlier 404s were invalid work keys, endpoint is healthy |
| OL `works/{key}/ratings.json` | `200` | ✅ verified (fills `puntuacion` gap) |
| Google Books API | `429` without key | 🔑 possible **with free key** — ISBN lookup + page count fallback |
| Gutendex (Project Gutenberg) | timeout (15s, unreachable) | ❌ dead from this network — drop as backup |

**Mangas (primary: AniList):**

| Source | Test | Verdict |
|---|---|---|
| AniList GraphQL `Media(id:,type:MANGA)` | `200` (MONSTER id 30001 verified) | ✅ primary, healthy |
| Kitsu `api/edge/manga` | `200` | ✅ **NEW viable backup** — JSON:API, no key, covers manga+anime; good AniList fallback |
| Jikan (MAL wrapper) | timeout again (15s) | ❌ confirmed unreliable — do NOT rely on it |
| MyAnimeList API | not tested — needs client_id | 🔑 possible — official but rate-limited; only if AniList+Kitsu both fail |

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
| UI polish, single-user reads, lazy metadata fetches, i18n ES/EN | v1 | 2.5 |
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
         NEVER touched without the owner's explicit approval.
beta   ← integration & testing. Nothing here reaches users.
feat/* ← optional short-lived branches for a single phase item, merged into beta.
```

> **Golden rule:** `main` is only updated when the repository owner explicitly approves a promotion. All day-to-day work lands on `beta`/`feat/*` and is verified via the Apps Script `/dev` URL before promotion.
>
> **Docs vs app (clarified 2026-11-22):** *documentation* may be updated on `main` at any time — it doesn't ship to users. The **app itself is frozen on `main`**: no changes to the frontend (`index.html`, `AppScript/Index.html`, `manifest.json`, `service-worker.js`) or backend (`AppScript/WebAPP.gs`) reach `main` unless we explicitly prepare the deploy **after all work for that release is finished**. Docs track the plan in parallel; the app only moves on promotion day.
>
> **Deploy confirmation protocol (2026-11-22):** even when the owner says the deploy phrase, the agent must **not** run any deploy/merge/push to `main` on its own — it must first ask the owner to **write the confirmation command literally**. The authorized command is **`Confirmar deploy`** (exact phrase, case-insensitive). Only that explicit typed command authorizes the promotion. This prevents accidental deploys from ambiguous phrasing.

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

## 📦 Implementation Inputs Checklist (pre-flight)

> Everything that must be **ready before starting** each phase — APIs, credentials, SQL/schema work, decisions, and user actions. Check items off mentally before writing code; if something is missing, resolve it first (don't discover it mid-implementation).

### Phase 2 — Motion system (v1.x)

- [ ] Motion token values approved (`--ease-spring`, `--t-*` durations/easings) — pick concrete numbers before coding CSS.
- [ ] List of surfaces getting directional transitions (modal open/close directions, tab switches).
- [ ] No external APIs, no schema, no credentials.

### Phase 2.5 — i18n ES/EN (v1.x)

- [x] Decision: hand-rolled `STR` dict + `localStorage nexus_lang` (no `?lang=` — PWA-friendly) — implementado 2026-11-27.
- [x] Infra + chrome batch: `t()`, `catText()`, `applyStaticI18n()` (`data-i18n`/`data-i18n-ph`/`data-i18n-title`), toggle English/Español en menú hamburguesa, tabs/placeholders/filtros/menú traducidos, `cambiarCategoria` placeholders por idioma.
- [x] Lote 3: vinculos/share/send/vis panels, stats cards, papelera, match, filtros dinamicos por categoria/persona, estados vacios, busqueda/agregar, updates/ediciones/resenas, toasts, metaTr() para vocabulario de metadata (generos/plataformas/estados) + param `lang` en catalog-search/catalog-add/item-refresh (ES/EN en fetchers; requiere `supabase functions deploy`).
- [x] Lote 2: auth overlay completo (login/signup/recover/reset), títulos de modales estáticos, acordeón de persona (estado/nota/progreso/capítulos/deseado/enviar) + helper `tf()` para interpolación `{n}`.
- [x] Lote 4 (cierre): ficha técnica por categoría (labels + metaTr en valores), panel de mods (sources, vacío, contadores, titles), offline banner, err.generic. Fix: replaces globales habian envenenado valores del dict STR con auto-referencia `t()` — restaurados.
- [x] Inventario JS migrado por completo (lotes 1-4 + remanentes 2026-11-27) — solo quedan strings canonicos de DB y nombres propios. `TESTING.md` creado para la ronda E2E pre-deploy.
- [ ] EN translations review por usuario.
- [ ] No APIs/SQL.

### Phase 3 — Backend & offline (v1.x)

- [x] **Mods Tracker:** ✅ implementado — UI en acordeón `.mods-accordion` del modal juegos (spec arriba).
- [x] **Steam Reviews:** implementado 2026-11-26 — Edge Function `steam-reviews` (scrape store page, tooltips 30d+all-time, tier 5-bloques, trend chip) + botón lazy "Reseñas Steam" en modal de juegos. E2E: Cyberpunk 92%/23,297.
- [x] **Game Update History:** ✅ implementado 2026-11-26 — Edge Function `steam-updates` + botón lazy en modal juegos (updates = título+fecha+link, sin descripción).
- [ ] **Book Editions:** OpenLibrary `works/{key}/editions.json` — free, no key. **Input needed:** the OL **work key** (not edition key) per book — verify resolver captures it at search time or derive via edition→`works[]`; if missing, add work-key capture to the resolver first.
- [x] **Open Library `fetchAll`:** refactor hecho 2026-11-26 en `providers.ts` (Promise.all).
- [x] **Health check + offline read-only:** ambos hechos 2026-11-26 (Edge Function `health` + modo offline frontend).

### Phase 3.5 — Read-only aggregations (v1.x)

- [x] **DONE 2026-11-26:** cards "Próximos Estrenos" (wishlist + fecha ≤90d, grupo sin-fecha) y "Balance y Retos" (por persona: comp/proc/wish/nota + % backlog resuelto + retos automáticos) en `renderizarEstadisticas`.

### Phase 4 — THE CUT (v2.0)

- [x] **v1 freeze declared** (2026-11-24) — user confirmed: no more v1 features, only fixes. Everything new lands right of the cut.
- [x] **Sheet export access restored** (2026-11-24) — user re-enabled "anyone with link can view"; `backup-excel.yml` works again. Fresh xlsx snapshot committed (5 tabs: Juegos, Peliculas_Series, Libros, Mangas, Papelera).
- [ ] **Full data validation before ETL** — row counts per category + random spot-checks on the fresh snapshot; keep a manual export of ALL tabs as the pre-migration archive (the weekly xlsx is a backup, not an archive).
- [ ] **Parallel run, not big-bang:** Supabase starts as read-only replica — Sheet stays source of truth; validate ~1 week; then flip writes. Doubles part of the ETL work, removes the "lost everything" risk.
- [ ] **Supabase free-tier pause caveat** — projects pause after ~1 week DB inactivity; first request after wake can take ~30 s or fail. Handle gracefully in Edge Functions; if unacceptable, evaluate paid tier or the alternatives below.
- [x] **Backend decided: Supabase** (2026-11-24) — evaluated Firebase/Neon/PocketBase/D1; Supabase wins on integrated Auth+DB+Storage+Edge Functions matching the relational schema. Free-tier pause accepted (daily-use app won't trigger it); revisit only if it becomes a real problem.
- [x] **Supabase project creado Y API viva** (2026-11-24/25) — `vkmgnwnlceycauleluwl` (org angellrnzo, Free, East US Ohio). ⚠️ El primer proyecto (`kbzgwtffdvyiymxgdaxx`) quedó con API gateway roto (NXDOMAIN >2.5h pese a restart+pause/restore) → recreado; todo re-aplicado. Credenciales en `_local/supabase_credentials.env` (nunca commitear). REST+RPC verificados: gateway responde, `get_items_merged` permission-gated a `authenticated`.
- [x] **`database/schema.sql` APLICADO y verificado** (2026-11-24) — 9 tablas, 2 vistas, 7 enums, 41 funciones, 11 policies en DB real (SQL Editor). DDL completo: profiles/libraries/library_members/library_links/media_items/library_items/user_media_tracking/mods/item_touches, RLS, trigger `handle_new_user`, RPCs `request/respond_library_link`, `default_visibility()` por link_type, vistas `v_library_matches` + `v_cross_library_matches`.
- [x] **ETL field mapping doc — decisiones cerradas** ✅ `AppScript/etl_mapping.md` (verificado contra snapshot real): mapping por pestaña, escalas, transformaciones, 6 decisiones resueltas (external_id sin prefijo, items sin tracking → ambas libraries, papelera descartada, status enum inglés, Dupli=UNIQUE, Capitulos_Totales ignorado).
- [x] **ETL Juegos APLICADO** (2026-11-24) — `database/etl/etl_juegos.py` → `etl/etl_juegos.sql` (idempotente): **250 media_items + 500 library_items + 294 tracking (147/user)** verificado en DB. Users test: `angellrnzo@gmail.com` (Angel) / `angellrnzor@gmail.com` (Talmai).
- [x] **ETL catálogo APLICADO** (2026-11-24) — `database/etl/etl_catalogo.py` → `etl/etl_catalogo.sql`: Peliculas_Series 2 + Libros 2 + Mangas 2 items, library_items ×2 users, tracking por usuario. **Migración de datos COMPLETA: 256 media_items totales.**
- [x] **Auth method decided** (2026-11-23) — **email-only**: password + magic link, OAuth disabled (see 5E). Remaining user action: configure email provider/SMTP in Supabase dashboard + redirect URLs.
- [ ] **Optional: TOTP 2FA** — Supabase MFA built-in, no extra infra; testable via API script before UI (see 5E). Per-user opt-in, off by default.
- [ ] **Bulk import inputs (user exports)** — Trakt.tv data export, Steam profile URL, GoodReads CSV export. Get them before writing `import_external`.
- [x] **Metadata refresh TTLs decided** (2026-11-24) — **Juegos + Mangas: 7 días**; **Peliculas/Series/Libros: 30 días**. Además: al **añadir un item próximo a salir** (edición de cartas, set LEGO, etc.) se fuerza fetch inmediato para verificar fecha/salida real — no esperar al TTL. Mecanismo (pg_cron vs Edge Function) se decide al escribir el DDL.
- [x] **`appreviews` inconsistency corrected** (2026-11-24) — Phase 4 item 5 below updated: reviews via store-page scrape, not the dead endpoint.
- [x] **Frontend cut strategy decided** (2026-11-24) — **por categorías, Juegos primero** (95% de los datos): cada categoría migra su capa de datos de `google.script.run` a Edge Functions de forma independiente; el Sheet queda read-only de respaldo hasta completar la última. **Cada migración se testea antes de pasar a la siguiente** (verificación funcional en beta por categoría).
- [x] **Regla de confirmación para pasos de frontend/deploy** (decidido 2026-11-25, usuario) — **siempre confirmar con el usuario antes de tocar el paso de Apps Script** (pegar `Index.html` en el editor, `/dev` vs `/exec`, o cualquier deploy). El repo se edita libre en `beta`, pero la aplicación del cambio en Apps Script va precedida de confirmación expresa.
- [x] **APIs externas inventariadas** (2026-11-25, usuario) — `STEAMGRIDDB_API_KEY`, `TMDB_API_KEY`, `ULTIMA_ACT_MANGAS_SEMANAL` (timestamp semanal de refresh Mangas) pasadas por chat → guardadas en `_local/external_apis.env` (nunca commitear). Destino: Supabase Edge Function secrets con los mismos nombres.
- [x] **Edge Functions DESPLEGADAS y verificadas E2E** (2026-11-25) — `supabase/functions/`: `catalog-search` (port `buscarCatalogoExterno`), `catalog-add` (port `agregarItem`: ID/URL directo o búsqueda → upsert `media_items` + `library_items` en biblioteca propia **y pareja aceptada**), `item-refresh` (port `repararItemIndividual`: re-fetch → update `metadata`/`metadata_updated_at` → devuelve fila vía RPC `get_item_merged` con shape v1). Secrets `STEAMGRIDDB_API_KEY`/`TMDB_API_KEY` en Supabase. Auth: JWT verificado + service role para writes. Soporte: RPCs `set_media_total_chapters` + `get_item_merged` (`phase4_5.sql` sec.2). **Test E2E OK**: añadidos juegos/película/libro/manga, repair sin pérdida visual.
- [x] **RLS recursion fix** (2026-11-25) — `members_read` hacia EXISTS sobre `library_members` (misma tabla) → 42P17 en TODA query a library_*/libraries para autenticados. Latente porque `get_items_merged` es definer y tracking usa `profile_id` directo; papelera/eliminar/restaurar/`nexusEnsureProfile` estaban rotos. Fix: `is_library_member()` security definer + policy reescrita (`phase4_5.sql` consolidado + `schema.sql` corregido).
- [x] **Batería de pruebas Phase 4 completa — VERDE** (2026-11-25, JWT real vía admin generate_link): library_members/items/libraries/links GET 200, ciclo papelera soft-delete→restore OK, catalog-search ×4 categorías, item-refresh ×4 con shape v1 completa (37-42 keys), `set_media_total_chapters` RPC OK.
- [ ] **Pendiente no-bloqueante Phase 4:** scheduler refresh TTL (pg_cron vs Edge Function scheduled — decidir), verificar backups diarios en dashboard, parity checklist `doGet`→actions, deploy formal `/exec` (esperando `Confirmar deploy`).
- [ ] Google Apps Script → Edge Function parity checklist (every `doGet` action mapped to a function or dropped).
- [ ] **Web launch checklist Phase 4 items** — security headers/rate limiting, auth E2E flows, error monitoring, DB backups, cookies review → see "Web Launch Checklist" section.

### Phase 5 — Cross-user linking (v2.0)

- [ ] Phase 4 done first (hard dependency).
- [ ] Phase 5A spec approved: `link_type` values, `visibility jsonb` matrix defaults per relationship.
- [ ] 5E spec approved (2026-11-23): email-only auth (password + magic link), `profiles` privacy columns, per-user visibility settings screen, per-`link_type` visibility defaults.
- [ ] 5F spec approved (2026-11-23): linking model = two personal libraries + shared zone (`libraries`/`library_members` reuse, per-member tracking inside zone).
- [x] **Multi-user scope decided** (2026-11-24) — build the linking section **complete**: `pareja`/`familia`/`amigo`/`custom` link types with per-relationship visibility matrices as documented in 5A/5E/5F — no simplified 2-user version. Implementation will ship with a step-by-step guide of user actions (Supabase dashboard, invite codes, etc.) so Angel/Talmai can apply it themselves.
- [ ] Invite-code UX decision (how Talmai enters Angel's code).
- [ ] **UI personas por vínculo — decidido 2026-11-24 (usuario):**
  - **`pareja` → sección dual completa**, pero el campo de la pareja es **solo lectura** (es tracking personal suyo — ver/desplegar sí, editar NO). En v1 ambas columnas eran editables; en v2 solo la propia es escribible (RLS ya lo garantiza — la UI debe deshabilitar inputs ajenos).
  - **Items compartidos según link** aparecen con los campos que la matriz permita, mismos campos de pareja read-only.
  - **Multi-vínculo → configurable por el usuario**: en ajustes se elige qué vínculos aparecen como columnas extra en el modal (preferencia en `profiles.preferences` o tabla dedicada — decidir en implementación).
  - **`is_private` → badge "privado" (candado) solo para mí**: yo lo veo normal con indicador; para los demás el tracking simplemente no existe. Sin pista visual del item en vistas ajenas.
  - **`is_private` es el ESTADO BASE (decidido 2026-11-24, usuario):** por defecto nada se comparte; el tracking de un item es privado salvo que el usuario indique **a qué vínculo(s)/persona(s) aparece**. Es opt-in por item, no opt-out. → **Implicación schema Phase 5:** `is_private boolean` no basta para "a quién le aparece" — evaluar `shared_with uuid[]` (link_ids) en `user_media_tracking` u override por vínculo; la matriz `visibility` del link seguiría filtrando campos, pero la puerta de entrada por item es explícita.
- [ ] **Pendiente:** definir dónde vive la preferencia "qué vínculos se muestran" (`profiles.preferences` jsonb alcanza para v2).
- [x] **Plan Phase 5 acordado (2026-11-25, usuario)** — flujo: signup crea profile+library+invite_code automáticos (trigger `handle_new_user` ya existe) → desde perfil: mostrar/copiar mi `invite_code`, input "tengo un código" + **selector de `link_type`** (pareja/familia/amigo/custom), lista de links pendientes con aceptar/rechazar, editor de matriz `visibility` por campo, preferencia de vínculos visibles.
  - **Gap schema #1 ✅ resuelto en `database/phase4_5.sql` (sec.3)** (2026-11-25, pendiente aplicar en SQL Editor): `request_library_link(p_invite_code, p_link_type default 'amigo')` — el invitador elige relación; firma vieja de 1 arg dropeada. Bonus fix: `respond_library_link` ya no hardcodea `'amigo'` en la fila inversa — hereda `link_type` + `default_visibility` del link real.
  - **Gap schema #2 ✅ resuelto en `database/phase4_5.sql` (sec.3)**: `user_media_tracking.shared_with uuid[]` — regla: `is_private=true` veto absoluto; `shared_with NULL/{}` = legacy (matriz del link, todo lo actual sigue igual); `[profile_ids]` = solo esos perfiles. Gates añadidos en `get_items_merged` y `v_cross_library_matches`. **`is_private` default NO se flipea aún** (sigue `false`) — se cambia a `true` cuando exista la UI "compartir con…" para no dejar items nuevos invisibles durante la transición.
  - **UI nueva:** pantalla de vínculos en ajustes del frontend (no existe en Nexus mode todavía) + badge "privado" + selector "compartir con…" por item + al shipear la UI: `alter column is_private set default true`.
  - **Orden:** ✅ patch SQL → ✅ `phase4_5.sql` aplicado → ✅ pantalla vínculos → ✅ privacidad por item (UI + E2E verificado) → ✅ enviar items a vínculos → ⏳ editor matriz `visibility` → ⏳ secciones dinámicas multi-vínculo → ⏳ flip `is_private` default `true`.
  - **Pantalla vínculos ✅ implementada 2026-11-26 (Index.html, pendiente probar en /dev):** botón `btn-vinculos` en header (solo NEXUS_MODE) → modal con: mi `invite_code` + copiar, input código + selector `link_type` → `request_library_link`, pendientes entrantes con aceptar/rechazar → `respond_library_link`, pendientes salientes, vinculados con badge por tipo. Requiere RPC `get_my_library_links()` en `database/phase5b_links_rpc.sql` (✅ aplicado y verificado E2E). Pendiente en esa pantalla: editor de matriz `visibility` y link `custom` label.
  - **Privacidad por item ✅ implementada 2026-11-26 (Index.html):** botón "Compartir…" inline en la sección del usuario logueado del modal de item → panel con toggle `is_private` (🔒 Privado) + audiencia (`shared_with`: todos los vínculos = NULL, o personas específicas = `[profile_ids]`). Escribe vía `nexusTrackingUpsert` (upsert directo, RLS `tracking_self`). **Sección oculta:** `get_items_merged` ahora emite `visible{Persona}=false` cuando el dueño marcó el item privado para el viewer → el acordeón completo no se renderiza (decisión usuario: "si Talmai está privado, a mí no me aparece su desplegable"). **Bug fix gate:** `shared_with` validaba `vp.pid` (dueño) en vez de `my_uid` (viewer) → corregido. Delta vivo: `database/phase5c_item_privacy.sql` (**correr de nuevo en SQL Editor** — ahora incluye el flag `visible`).
  - **Enviar item a vínculo ✅ implementado 2026-11-26 (Index.html + `database/phase5d_item_shares.sql` — APLICADO y verificado en vivo):** botón "Enviar" junto a Compartir en la sección propia del modal → lista de vínculos aceptados → `send_item_share(category, external_id, to_profile_id)` crea `item_share_requests` pending → el destinatario ve la solicitud en el modal Vínculos ("Elementos compartidos") → `respond_item_share` acepta = `library_items` insert en SU biblioteca (tracking vacío, estatus inicial) / rechaza = declined (reenvío permitido). Aplica a TODOS los vínculos aceptados (decisión usuario). `get_my_item_shares()` lista pendientes+historial.
  - **E2E privacidad ✅ verificado 2026-11-26:** ciclo completo probado en vivo — `is_private=true` → `visible{Persona}=false` → sección oculta en modal y cards; revert a `false` → sección reaparece tras F5. Confirmado por usuario en /dev.
  - **UI acordeón por persona ✅ pulida (commits 3299cfa, 098e9b2, 6fac845):** avatar circular con inicial+color de persona, chevron rotatorio, borde/glow accent al abrir; sección remota = badge "Solo lectura" + details atenuados + `pointer-events:none`; grid colapsa a 1 columna cuando solo una sección es visible; `max-height` details 560→760px (contenido Compartir/Enviar se cortaba). **Bug fix race:** `nexusSyncShareUI` ahora `async` + `await nexusEnsureProfile()` — antes leía `nexusPersona()` antes de cargar perfil → 'Yo' → AMBAS secciones Solo lectura.
  - **Cards ✅ respetan `visible{Persona}`:** chips de estado, icono deseado y barras de capítulos se ocultan cuando el vinculado marcó el item privado para mí.
  - **Bug "juegos en películas" ✅ resuelto:** era caché corrupto — `CACHE_VERSION` v21 forzó refetch completo; datos DB siempre estuvieron limpios (3 movies correctas).
  - **Edge fix tracking fantasma ✅:** `get_items_merged` ahora exige que el item siga ACTIVO en la biblioteca del vinculado (`library_items.deleted_at is null`) — si lo borró, su tracking viejo ya no se filtra al viewer (la sección se oculta como si fuera privada). `v_cross_library_matches` ya estaba cubierto. `phase5c_item_privacy.sql` regenerado y **aplicado** (2026-11-26).
  - **Evaluación vista cruzada (decidido NO por ahora):** items de bibliotecas vinculadas visibles sin estar en la mía — NO implementada. El flujo Enviar+aceptar ya produce el mismo resultado con una sola fuente de verdad. **Opcional a futuro (Phase 5D):** "preview" de items ajenos read-only si se pide.
  - **Editor matriz `visibility` ✅ implementado 2026-11-26:** engranaje ⚙ por persona en Vinculados → panel con **dirección** ("Yo → nombre" = lo que YO expongo / "nombre → yo" = lo que me expone, filas `out`/`in` del RPC), **categoría** (4 pills) y **5 campos** (Estado/Valoración/Deseado/Progreso/Notas). Guarda con PATCH directo a `library_links.visibility` (RLS `links_owner` permite a miembros de cualquier lado; preserva clave `mods`). Sin RPC nuevo.
  - **Badge 🔒 en cards ✅ implementado 2026-11-26:** `get_items_merged` emite `privado{Persona}` = `is_private` del tracking propio → el chip de estado de MI persona en la card muestra icono candado. **Requiere re-correr `phase5c_item_privacy.sql`** (regenerado con el flag).
  - **Flip `is_private` default ✅ aplicado 2026-11-26 (`phase5e_optin_label.sql` — correr en SQL Editor):** default `true` — el tracking nuevo nace privado, compartir es opt-in vía panel Compartir. Filas existentes intactas. **OJO:** items nuevos que añadas ya NO serán visibles para la pareja hasta que compartas — es el modelo opt-in decidido.
  - **`link_label` custom ✅ (`phase5e`):** `request_library_link` gana `p_link_label`; al elegir "Personalizado" aparece input de nombre; la fila inversa hereda la etiqueta; `get_my_library_links` la expone y la UI la muestra en badges/textos.
  - **Badge notificaciones ✅ (Index.html):** punto con contador sobre el botón Vínculos del header — cuenta solicitudes de vínculo entrantes + items compartidos pendientes; refresh al abrir/cerrar modal y cada 60s.
  - **Secciones dinámicas multi-vínculo ✅ implementado 2026-11-26 (Index.html, refactor grande):** registro `_personas` derivado de los sufijos `estado{X}`/`visible{X}` que emite `get_items_merged` (initcap del primer nombre de `display_name`); helpers `nexusScanItemPersonas`/`nexusRebuildPersonas`/`nexusItemPersonas`/`nexusPersonaDot`. Todo lo que estaba hardcodeado Angel/Talmai ahora itera personas: acordeones del modal (`nexusRenderPersonasModal`/`nexusPersonaAccordionHTML` generan el HTML por persona con avatar-color propio, `is-remote` solo en modo Nexus), filtros por persona (`#filter-personas`), stats (`nexusRenderStatsProfButtons` + `renderizarEstadisticas` genérico por sufijo), stats-bar pills, chips/badges de cards, barra de lectura, Match de Pareja (match = todas las personas pendientes o todas deseadas), `guardarTotalCapsDesdeModal` (sincroniza total entre TODAS las secciones). Modo Sheets clásico intacto: los items legacy traen `estadoAngel`/`estadoTalmai` → `_personas` = [Angel,Talmai] y todo se comporta igual. **Sin cambios de DB** — el RPC ya emitía sufijos dinámicos.
  - **Username único ✅ (`phase5h_username.sql` — correr en SQL Editor):** `profiles.username` (unique, backfill `regexp_replace(local-part email,'[^a-z0-9_]')`) = handle visible; `display_name` pasa a nombre real sin unique. `get_items_merged` sufija por username y emite `username{Sufijo}`; links/shares exponen username. Front: `nexusPersona()` lee username, `vinculosNombre()` prefiere username en vínculos/share/enviar, `_personas` guarda `label` por item, nombres con ellipsis 12ch, `CACHE_VERSION` v22.   - **Bugfix crítico `suf` compartida (2026-11-26):** `get_items_merged` usaba UNA variable `suf` para el tracking propio y la reasignaba dentro del loop de vinculados → del 2º item en adelante MIS campos se emitían con el sufijo del vinculado y eran sobrescritos (mi sección desaparecía en casi todos los items). Fix: `my_suf` separada para el bloque propio. **Aplicado en vivo + en `phase5h_username.sql`.**
**Sustituye a phase5f (unique display_name) y phase5g (trigger sin username)** — el 5h los reemplaza; si ya corriste f/g no pasa nada, el 5h hace drop del índice viejo.
  - **Phase 5h APLICADO EN VIVO (2026-11-26, verificado vía Management API):** `profiles.username` único creado (angellrnzo / talbetancourt — email de Talmai migrado de angellrnzor@gmail.com a talbetancourt@gmail.com vía admin API, email_confirm=true). `display_name` quedó como nombre real (Angel/Talmai por ahora, el usuario lo ajusta). `profiles_username_uniq` activo, `profiles_display_name_uniq` eliminado. `get_items_merged`/`get_my_library_links`/`get_my_item_shares` reemplazadas — sufijos `Angellrnzo`/`Talbetancourt`, campos `username{Sufijo}` emitidos.
  - **Fix `suf` compartida ✅ aplicado en vivo:** del 2º item en adelante el tracking propio se emitía con sufijo del vinculado y era sobrescrito → mi sección desaparecía en casi todos los items (solo el 1º alfabético salía). `my_suf` separada. Verificado: 251/251 juegos y 3/3 pelis emiten ambas personas.
  - **Modal-close rediseñado ✅:** `position:absolute` fijo arriba-derecha (antes sticky+float — se montaba al scroll y tapaba la nota), hover rojo + press scale, sin franja de padding (se veía hueco sobre el poster). Solo `padding-right` en título/header-info vertical para que géneros/badges no queden debajo.
  - **Resumen persona = 2 filas fijas ✅:** fila1 avatar+username+iconos deseado/nota, fila2 chip estado+estrellas+chevron. Nombres con ellipsis 12ch (`.pa-name`, `.stat-prof-name`). Badge "Solo lectura" eliminado (atenuado basta).
  - **Phase 5 completa** salvo pruebas visuales con un 3er vínculo real.

### Phase 4.5 — Web hosting: GitHub Pages + Supabase (decidido 2026-11-26)

**Decisión:** se descarta el web app de Apps Script (`/exec` + `WebAPP.gs`). La web se aloja en **GitHub Pages** (`angellrnzo.github.io/nexuslib`) hablando directo con Supabase — `NEXUS_MODE=true` ya está hardcodeado en `Index.html`, el camino `google.script.run`/Sheets es código muerto.

**Estado actual (2026-11-26):** `index.html` raíz ES la app real (Supabase-only, ex-`AppScript/Index.html` adaptada). `AppScript/Index.html` quedó LEGACY. Producción sigue en el shell viejo hasta el merge `beta`→`main` del cierre del roadmap.

**Adaptaciones necesarias:**

- [x] Sustituir `index.html` por el contenido de `AppScript/Index.html` (o moverlo a `app.html`/`index.html` directo) — **quitar `<base target="_top">`** (solo aplica a Apps Script). **HECHO 2026-11-26:** `index.html` raíz = la app completa (192KB, `lang="es"`, sin `<base>`); head PWA del shell fusionado (manifest/OG/favicon/apple meta + error handlers + registro SW). `AppScript/Index.html` marcado LEGACY — la copia canónica editable es la raíz. Sintaxis JS verificada (node --check ×3), HTML balanceado, servido local OK.
- [x] Supabase Dashboard → Auth → URL Configuration: Site URL = `https://angellrnzo.github.io/nexuslib/` + redirect URLs del dominio Pages (magic link/password reset). **Ya configurado 2026-11-25** en principal y standby.
- [x] **Auth UI rework (2026-11-27):** `nexusShowLogin` reemplazado por overlay landing + tabs Entrar/Crear cuenta/Recuperar + magic link (`sb.auth.signUp` con `display_name` en metadata → trigger `handle_new_user` lo lee). Recovery: `nexusBoot` detecta `#access_token&type=recovery`/`type=recovery` → `nexusShowPasswordReset` (form nueva contraseña → `sb.auth.updateUser`). **Profile modal** `#modal-perfil`: avatar inicial, display_name editable (update `profiles` vía `profiles_self` RLS), username/email read-only, invite_code copiable, botón cerrar sesión. Pendiente: test visual E2E de signup→confirmación email→login y reset; SMTP custom opcional (free tier ~2-4 emails/h).
- [x] Verificar CORS de Edge Functions (`catalog-search`, `catalog-add`, `item-refresh`) desde origen Pages — **verificado 2026-11-26:** preflight OPTIONS devuelve `Access-Control-Allow-Origin: *` + headers authorization/apikey/content-type.
- [x] `WebAPP.gs` → renombrado **`WebAPP.legacy.gs`** con header LEGACY/RESPALDO — congelado como referencia histórica del backend Sheets, no desplegar ni editar (2026-11-26).
- [~] Limpiar código muerto en `Index.html`: rama `google.script.run` en `RUN` (siempre `nexusRun` con `NEXUS_MODE=true`). **Parcial:** el ternario es lazy (`google.script.run` nunca se evalúa con `NEXUS_MODE=true`) → inofensivo en Pages. El strip completo del path Sheets queda como refactor aparte de bajo valor (código muerto que no corre).
- [x] Sheet queda **congelado** — nada escribe en él desde la migración (flujo fue Sheet→Supabase, una vía). `backup-excel.yml` exporta el mismo xlsx stale y el diff lo descarta sin commit — inofensivo. **Descartar al cierre**: borrar workflow + `AppScript/GameList.xlsx` cuando se confirme que no hace falta rescate (junto con WebAPP.legacy.gs).
- [x] PWA: `manifest.json` + service worker (si existe) revisar scope/paths para el nuevo dominio; iconos ya están en `icons/`. **HECHO:** paths `./` relativos correctos para `/nexuslib/`; SW bump `nexuslib-cache-v5`→`v6` (el contenido de index.html cambió por completo).
- [x] OG/Twitter cards del shell se conservan (ya apuntan a Pages) — fusionadas en el head de la app.
- [ ] Deploy formal: merge `beta` → `main` requiere `Confirmar deploy` (regla vigente).

**Regla (2026-11-26):** NO mergear/pushear `beta` → `main` hasta terminar el roadmap completo — producción queda congelada en el shell/iframe actual.

**Notas:** Apps Script dejará de ser necesario del todo — los ETLs ya corren local (`database/etl/*.py`) y las Edge Functions viven en Supabase.

### Phase 4.6 — Backups Supabase (2026-11-25)

Arquitectura de respaldo en 3 capas — runbook completo en `database/RESTORE.md`:

- [x] GitHub Action `backup-supabase.yml` — `pg_dump` schema public (custom, compress 9) semanal + manual → artifact 90 dias. Secrets: `SUPABASE_DB_URL`, `SUPABASE_DB_PASSWORD`.
- [x] Standby Supabase — 2do proyecto free mismo org; el workflow hace `pg_restore --data-only` semanal si `SUPABASE_STANDBY_ENABLED=true` + secrets standby. **Switch = cambiar NEXUS_URL/KEY en Index.html**. Caveat: `auth.users` no viaja → recrear usuarios via admin API (magic link resuelve passwords).
- [x] Backup local cifrado — `database/backup_local.py` (Fernet AES, clave en `_local/backup_key.key` — respaldar aparte). Probado en vivo: 237 KB, 8 tablas.
- [x] Standby `uxixiwrvobkulkjkicjm` (us-west-2) **REPLICADO 2026-11-25**: schema identico (12t/49f/12p/2v) + datos completos (1093 filas via `restore_backup.py` con remap de profile ids) + 2 auth users (via `sync_auth_users.py`). REST/Auth responden. **COMPLETADO 2026-11-25:** PAT account-level `SUPABASE_ADMIN_TOKEN` (org angellrnzo, 2 proyectos, Never) → 3 Edge Functions deployadas + secrets + auth URLs (site_url=Pages). **E2E verificado: catalog-search OK, get_items_merged 251 items.** Secrets GitHub cargados + var activa → **workflow verificado E2E 2026-11-26** (run 45730023321: dump+artifact+mirror todo verde). Mirror usa `mirror_to_standby.py` (pg_restore no servia: auth UUIDs difieren entre proyectos).

### Phase 6a — Perf `get_items_merged` (2026-11-26)

`database/06_get_items_merged_perf.sql` — reescritura set-based: los ~4 queries por item (tracking propio/vinculados, exists library_items, string_agg géneros/beta) y la query de vínculos re-ejecutada por item ahora son 6 lookups jsonb prefetcheados una vez. **0.92s → 0.78s en 251 juegos** (la ventaja crece con más items: O(items×queries) → O(1) queries + ensamblado). Mismo shape exacto, verificado E2E (ambos sufijos, privacidad, is_private). Aplicado en principal + standby.

### Phase 4.7 — Auditoría DB para features pendientes (2026-11-25)

Schema ya cubre casi todo lo que Phase 3+ necesita — **no hay SQL nuevo urgente**:

- `mods` tabla + RLS + `mod_source` enum: listos para Mods Tracker (solo Edge Function + UI).
- `user_media_tracking.edition text`: existe ("mi edición" libros). **Pendiente menor:** cuando se implemente Book Editions Half B, `get_items_merged` debe emitir `edicion{Persona}` para mostrarla/compartirla — delta SQL chico en `05_phase5h` o archivo `06_` nuevo.
- `item_touches`: lista para Phase 5D social layer.
- Game Update History / Steam Reviews / Book Editions Half A: lazy-fetch, cero storage.
- Visibilidad: la matriz `visibility` ya incluye campo `mods` por defecto en todas las categorías.

### Phase 5D — Social layer (v2.x)

- [ ] Phase 5 done first.
- [ ] `item_touches` DDL + touch→action mapping table approved (preset list exists in spec — couple-exclusive 4 touches need user sign-off on wording ES/EN).
- [ ] Rate-limit values decided (e.g. max touches/hour/user).
- [ ] i18n strings for all touch labels (depends on Phase 2.5 pattern).

### Phase 6 — Android APK (v2.0)

- [ ] Capacitor installed in the v2 frontend (`npx cap init/add android`) — app id `com.nexuslib.app` confirmed.
- [ ] **Signing keystore generated** — `keytool` once, stored safely (**user keeps backup** — losing it = can't update the app).
- [ ] GitHub repo secrets for release signing (`ANDROID_KEYSTORE_*` etc.).
- [ ] Offline write-queue design approved (IndexedDB → sync on reconnect).

### Phase 7 — Coleccionables (v2.x, optional ⭐)

- [ ] Provider keys decided: Rebrickable API key (free tier), BoardGameGeek API key (free, registered app), or accept `provider='manual'` for all.
- [ ] Subtype field list finalized (lego / juego_mesa / figura / funko / rompecabezas / tcg / miniatura / blind_box / vinilo / memorabilia / otro).
- [ ] Ownership model confirmed: `tengo` / `quiero` / `vendido` + condition + value fields.
- [ ] Only start after v2 core is stable (user-marked high interest but explicitly optional).

---

## 🌐 Web Launch Checklist — estado y pendientes por fase (audit 2026-11-24)

Auditoría de los 25 puntos "pre-launch" contra el repo. El shell PWA (GitHub Pages) ya está cubierto; lo que queda vive **dentro del iframe de Apps Script** (`Index.html`) o llega con Supabase. No re-auditar el shell — solo lo listado aquí.

### ✅ Ya cubierto (shell — no tocar)

- HTTPS (Pages + Apps Script), favicon + iconos correctos (192 real), meta description + OG/Twitter cards, `robots.txt`, `sitemap.xml`, `404.html`, error logging (`window.onerror`/`unhandledrejection`), SW cache v5, backup semanal Sheet→xlsx (`.github/workflows/backup-excel.yml`).
- Secretos: API keys solo en Script Properties — verificado, nada hardcodeado.
- ⚠️ Backup semanal Sheet→xlsx **roto** (export URL pide login desde ~2026-11-22; el repo lleva commiteando HTML de error) — fix pendiente en Phase 4 inputs.

### 🔶 Phase 3 (v1, `Index.html`) — pendiente de auditoría interna

- [ ] **Formularios**: validar todos los inputs/búsquedas (mensajes de error, estados disabled).
- [ ] **Botones/elementos interactivos**: test funcional de cada acción (modales, toggles, swipe, export).
- [ ] **Un solo CTA claro** por vista — revisar jerarquía.
- [ ] **Contraste de color** — pasar checklist WCAG sobre `DESIGN.md` tokens (especial modo claro si existe).
- [ ] **Alt text** en imágenes cargadas (posters/backdrops de TMDB/SteamGridDB).
- [ ] **Compresión de imágenes** remotas — TMDB/SteamGridDB sirven tamaños; pedir el tamaño mínimo necesario.
- [ ] **Loading speed** del SPA — medir First Contentful Paint; `fetchAll` ya está en Phase 3.
- [ ] **Responsive** — testear breakpoints reales en móvil (la app es mobile-first, pero verificar tablets).

### 🔶 Phase 4 (THE CUT, Supabase) — nace con la migración

- [ ] **Security headers + rate limiting** — GitHub Pages no permite headers custom; configurar en Supabase (dashboard/API gateway) y Edge Functions. Rate limits en auth y en RPCs sensibles.
- [ ] **Flujos de auth completos** — test E2E: signup, login, password reset, magic link, verificación de email, TOTP enroll/verify (5E ya lo marca testeable por API antes de UI).
- [ ] **Error logging/monitoring** — Supabase logs + Edge Function logging; decidir si se añade beacon de errores del cliente.
- [ ] **Backups DB** — Sheet semanal ya existe; en Supabase configurar backups del proyecto (free tier: daily; evaluar PITR si se paga).
- [ ] **Cookies/consentimiento** — revisar qué cookies deja Supabase Auth; banner solo si se añade analytics o se abre a más usuarios.

### 🔶 Phase 5/5E — antes de abrir a terceros

- [ ] **Privacy policy + Terms** — decidir si se crea página estática (`privacy.html` en el repo Pages, link desde ajustes). Obligatorio éticamente antes de cualquier usuario externo; para 2 usuarias puede esperar.
- [ ] **Analytics** — decisión pendiente: si se añade (umami/self-hosted vs nada), dispara cookie consent + privacy policy.

### ⏸️ Descartado / N/A

- Spam protection en formularios públicos — no hay formularios públicos (auth será Supabase).
- Social sharing preview — ya está (OG/Twitter cards en shell); el contenido real va por iframe, aceptable.

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
- **2E Accessibility hardening (audit gap 2026-11-23):** modals (`#modal`, `#modal-papelera`, `#modal-match`) lack dialog semantics — add `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at `.modal-title`, and an `aria-label` on `.modal-close`. Implement a **focus trap**: on open, focus first focusable element inside `.modal-content` (or the close button); `Tab`/`Shift+Tab` cycle within the modal; store `document.activeElement` before open and **restore focus on close**. `Escape` already closes via existing handlers — verify it also returns focus. `@media (prefers-reduced-motion)` already exists globally (~L745) and kills durations — the new skeleton/heart/bottom-sheet keyframes MUST go through it (no `animation` overrides outside the media query).
- **2F Empty & error states (audit gap 2026-11-23):** current states are unstyled inline markup — `'<p style="color:#ff6b6b">Error: …</p>'` in `cargarCategoria()` (~L1529) and papelera (~L2549), and plain-text `"Sin resultados."` (~L1810). Replace with a shared `.state-box` component: centered icon (SVG sprite) + title + description + optional action button. Variants: `.state-box.error` (danger tint + **Reintentar** button re-running the last fetch), `.state-box.empty` (neutral, suggestion text), `.state-box.offline` (Phase 3 hook — shown by the `.offline` body class). Skeleton coverage beyond the grid: define per-surface skeletons — modal content blocks, search dropdown rows, stats accordions — reusing `.skeleton` from 2A.
- **Guardrail:** every new animation must degrade under `prefers-reduced-motion` (the existing ~L745 block already nukes durations globally — verify new keyframes don't bypass it).

### 📍 Phase 2.5: UI Internationalization — ES/EN (v1.x — frontend only)

> **User decision (2026-11-22):** the web app becomes bilingual Spanish/English. **Default language on open: Spanish** (`es`). Repo docs stay in English (project is public/general). All new features must ship with i18n keys from day one — no hardcoded strings.

**Spec — implementable on v1 (left of the cut, no backend dependency):**

1. **String dictionary** — new `I18N` object in `Index.html`: `{ es: { key: "texto" }, en: { key: "text" } }`. Keys grouped by section (`nav.*`, `modal.*`, `filters.*`, `stats.*`, `common.*`).
2. **`t(key)` helper** — returns `I18N[lang][key] || I18N.es[key] || key`; `lang` from `localStorage('nexuslib_lang')`, default `'es'`. The choice is **cached persistently** (localStorage survives PWA restarts; in the v2 native app the same key persists in the WebView, and the preference can later sync to `profiles.preferences` JSONB so it follows the user across devices).
3. **Extraction pass** — replace hardcoded UI strings in `Index.html` (buttons, labels, placeholders, toasts, empty states, aria-labels) with `t('...')` calls. Template literals stay; only visible text moves to the dictionary. Estimated several hundred strings — mechanical but large; do it in one focused pass, verify visually per category.
4. **Language toggle** — selector in the header/settings (globe icon), persists to `localStorage`, re-renders current view without reload (`renderGrid()` / re-open modal).
5. **API content language** — decision needed per provider: keep `l=spanish` always (content stays ES regardless of UI) OR map UI lang → provider lang params (Steam `l=`, TMDB `language=`, AniList `UserPreferred`?). **Recommendation:** phase 1 = UI strings only, provider content stays Spanish; revisit later if wanted.
6. **Numbers/dates** — use `Intl.NumberFormat`/`DateTimeFormat` with active locale for ratings, counts, dates.
7. **Guardrails:** no string concatenation for sentences (word order differs ES/EN — use placeholders like `t('mods.count', {n})`); keep `titulo`/metadata untouched (proper nouns).

### 📍 Phase 3: Backend & Offline Resilience (v1.x)

**Spec — implementable as-is:**

1. **Parallel Open Library** — `resolverAutoresOpenLibrary_` (`WebAPP.gs` ~L930-976): collect all `UrlFetchApp.fetch` calls into an array → single `UrlFetchApp.fetchAll(requests)` → map `responses[i].getContentText()` back to authors in order. Preserve the title-fallback path. No schema change.
2. **API Key Health** — new `doGet` branch `?action=health`: returns JSON `{tmdb: bool, steamdb: bool, steam: bool, sheets: bool}` — `sheets` = `SpreadsheetApp.getActive()` ok; API keys = non-empty `PropertiesService.getScriptProperties().getProperty(...)`. Read-only, no external calls (fast, safe to poll).
3. **Offline Read-Only** — `Index.html`: `window.addEventListener('online'/'offline')` toggling a body class `.offline`; CSS disables `.btn-guardar`, `.btn-eliminar`, wishlist/star buttons (`pointer-events:none; opacity:.5`) + toast "Sin conexión — solo lectura". Reads already served by v19 cache.
4. **Game Mods Tracker** — see [spec above](#-planned-feature-game-mods-tracker-v1x--spec-only-not-implemented): per-user mod lists per game (Nexus Mods / Steam Workshop / CurseForge / URL), version-tagged, quick-search links. New `mods` sheet — standalone, no changes to existing schema.
5. **Steam Reviews Breakdown** — new toggle `#btn-toggle-resenas` styled like `.btn-trailer` (~L609) next to it in `#m-trailer-bar` (~L1045), opening `#m-resenas-box` (same `.trailer-box` pattern ~L616). Backend: the old `appreviews/{appid}?json=1` JSON endpoint is **DEAD** (verified 2026-11-21: all variants return `302 → store homepage`). Real source = scrape `https://store.steampowered.com/app/{appid}/?l=spanish&cc=US` — same HTML fetch + agecheck cookies the resolver already uses as fallback (`WebAPP.gs` ~L686). Extract review summary from the `user_reviews_summary_row` tooltips: `"El X% de las N reseñas ... últimos 30 días son positivas"` (30d window) and `"El Y% de las M reseñas ... en tu idioma son positivas"` (all-time). Store `resenasSteam` as `{pct30, total30, pct, total}` — positive count can come FREE from `recommendations.total` in `appdetails` (see audit §Steam); neg/pos30 derived as `round(pct*total/100)` (approximate, mark with `≈` in UI). Fetch lazily on modal open for `Juegos` only, not at catalog load. Tier = **5-block scale** (client-side, no Steam thresholds): 0-20 "Muy negativas", 20-40 "Mayormente negativas", 40-60 "Neutras", 60-80 "Mayormente positivas", 80-100 "Muy positivas". Frontend renders a **CSS-only chart** (no chart lib — vanilla SPA): (a) a 5-segment gradient bar red→gray→green with a marker/needle at the `pct` position, (b) the tier label under it, (c) big % positive number, pos/neg counts, total reviews, and a **trend chip** comparing `pct30` vs `pct` (↑/↓/→ "vs hace 30 días"). Only for `Juegos` with valid Steam appid; hide otherwise (same guard as `admiteTrailer` ~L1920). Reuse existing motion tokens for bar grow-in (`--t-*`, `transform: scaleX`). Note: Steam's 9-tier label and 5-star histogram are NOT exposed by the public API — this custom 5-block scale is the chosen simplified equivalent.
6. **Game Update History** — see [spec above](#-planned-feature-game-update-history--steam-patch-log-v1x--spec-only-not-implemented): lazy RSS scrape of Steam news per appid on modal open, collapsible patch list with external "full patch" links. No schema change.
7. **Book Editions Browser** — see [spec above](#-planned-feature-book-editions-by-translator-v1x-read-only--v2-ownership): OpenLibrary `works/{key}/editions.json` resolver + "Ediciones" section in book modal (translator · publisher · year · language · ISBN). Read-only half only — the "my edition" ownership field is right of the cut (Phase 4/5A).

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

1. `database/schema.sql` on Supabase: `profiles` (incl. privacy columns — see 5E), `libraries`, `library_members`, `library_links`, `media_items`, `library_items`, `user_media_tracking`, `mods` (see WIKI §7.3 for full DDL summary).
2. Edge Functions / Workers replacing `WebAPP.gs` resolvers (Steam Store+fallback chain, TMDB, OpenLibrary, AniList) — same fallback order as v1.
3. ETL `GameList.xlsx` → PostgreSQL: map sheets rows to `media_items` via `(category, provider, external_id)`; `mods` sheet → `mods` table per spec above.
4. Auth: **decided (2026-11-23)** — Supabase Auth **email-only**: password sign-up/sign-in + magic link (OTP) as alternative; all OAuth providers disabled. Angel/Talmai get `profiles` + auto `libraries` via `bootstrap_user_default_library()` trigger. Details in [5E](#5e--profiles-auth--per-user-privacy-settings-user-decisions-2026-11-23).
5. **Scheduled metadata refresh** — `metadata_updated_at timestamptz` column on `media_items`; weekly cron (pg_cron or scheduled Edge Function) refreshes only stale rows by TTL: **Juegos 7 days** (reviews/prices move fast), **movies/series/books/manga 30 days** (static metadata). Reuses the same resolver fallback chain; review data via **store-page scrape** (`user_reviews_summary_row` tooltips — `appreviews` JSON endpoint is DEAD, corrected 2026-11-24). Never touches user fields (`user_media_tracking`, notes).
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

#### 5D — Lightweight social layer (user idea, 2026-11-22)

> **User direction:** no free-form chat — interactions stay **anchored to shared library items**. Cheap tables + RLS reuse the Phase 5 link model.

- **Shared notes per item**: `shared_note` field on `library_items` (or a small `item_notes` table if notes must be per-user). Visible only to members of the link; respects `is_private` and the `notes` field in the visibility matrix.
- **"Visto también" reactions**: lightweight ack on status changes (e.g. partner marks a movie watched → 👀 badge on your copy). v1 of the activity feed — cheapest social signal.
- **`watching_now` ephemeral status**: "Angel está viendo X ahora" — auto-expires, Spotify-style. One nullable column + TTL, no chat infra.
- **Recommendations with one-click add**: when a linked user shares/recommends an item, the receiver gets an **"Agregar a mi biblioteca"** button → creates a `user_media_tracking` row (or wishlist entry) in *their own* library with `recommended_by` attribution. Turns social signal into action without conversation.
- Explicitly out: free-form chat/messaging — cost/benefit doesn't justify it vs. item-anchored interactions.

##### Preset touches (quick reactions, user idea 2026-11-22)

> **Goal:** zero-typing interactions. A row of preset "toques" on any shared/matched item; each touch carries an optional short note and can trigger a real action — closing the loop from "I saw this" to "it's in my library".

| Touch | Label (ES default) | Effect on receiver's library | Notifies sender? |
| :--- | :--- | :--- | :---: |
| `interested` | "Me interesa" | Adds item to receiver's **wishlist** with `recommended_by` | ✅ |
| `save` | "Guárdalo" | Adds item to receiver's **backlog** | ✅ |
| `watching` | "La estoy viendo" | Sets receiver's `watching_now` to this item | ✅ |
| `seen` | "Ya la vi" | Sets receiver's status → watched + optional star rating prompt | ✅ |
| `later` | "Para después" | Wishlist with snooze marker (re-surfaces in N days) | ❌ |
| `note` | "Mira esto 👀" | Opens note field → posts `shared_note` on the item | ✅ |
| `vote` | "¿La vemos?" | Creates lightweight poll on the item (2–4 options from shared wishlist) | ✅ |

**Real usage flow (design target):**

1. Partner browsing shared catalog/match feed taps **"Me interesa"** on a movie → it lands in *your* wishlist tagged `recommended_by: partner` → you get a subtle badge/notification.
2. You open it → see their note ("la escena del final es brutal") → tap **"Ya la vi"** → status updates, optional rating → partner sees the 👀/⭐ ack on their copy.
3. Or you tap **"La estoy viendo"** → partner sees `watching_now` on the item → later **"¿La vemos?"** poll proposes a watch night from both wishlists.

**Implementation notes:**

- Touches are rows in a `item_touches` table (`item_id`, `from_user_id`, `to_user_id`/`library_id`, `touch_type`, `note`, `created_at`) — or a JSONB array on the link if volume stays tiny; table preferred for realtime + analytics.
- Each `touch_type` maps to a deterministic write into `user_media_tracking` (status/wishlist/watch-now) — touches are **actions**, not just emoji.
- Respect `is_private` and the visibility matrix: a touch on a non-shared field never crosses.
- i18n: touch labels live in the `I18N` dictionary (Phase 2.5) — ES default, EN fallback.
- Rate-limit: max ~20 touches/hour/link to avoid spam; touches expire visually after N days unless actioned.

##### Touches per relationship type (user idea 2026-11-22)

> **Concept:** same `item_touches` mechanics, but the **available set and tone scale with `link_type`** — pareja gets the full intimate set; amigos gets a softer, lower-pressure variant; familia gets minimal. Prevents the "partner features" from feeling weird with friends.

| `link_type` | Touches enabled | Tone / what's excluded |
| :--- | :--- | :--- |
| `pareja` | Full catalog (all 7) **+ exclusive couple touches** | Intimate: `watching_now`, "¿La vemos?" polls, seen-acks — the couple-flow is the primary use case |
| `amigo` | `interested`, `save`, `note`, `later` + soft variants | No `watching_now` broadcast, no "¿La vemos?" (that's couple-planning); adds casual reactions: "Buena elección 👍", "Jaja este sí" — acknowledges without tracking pressure |
| `familia` | `save`, `note` only | Minimal — family links default to the most restrictive visibility anyway; touches stay informational |
| `custom` | Configurable subset | Owner picks enabled touches in the link's settings (same editor pattern as the visibility matrix) |

**Couple-exclusive touches (`pareja` only — never offered to other link types):**

| Touch | Label (ES) | Effect |
| :--- | :--- | :--- |
| `react_love` | "Te quiero 💕" / heart | Pure ack reaction — no library write, shows on the item for both |
| `date_night` | "Noche de pelis 🌙" | Proposes a watch-together: creates a pending `watching_now` invite both must accept → shared viewing session marker |
| `inside` | "Nuestra" | Marks the item as a shared-favorites entry (couple-only badge on the item in both libraries) |
| `miss_you_note` | "Te extraño aquí" | `shared_note` variant styled differently — sentimental note pinned to the item |

These couple touches are the identity layer: they exist **only** because `link_type='pareja'` — the same engine, gated by relationship.

**Soft-variant labels (ES, `amigo` set):**

- `interested` → "Me la apunto" (softer than "Me interesa")
- `save` → "La guardo"
- `note` → "Mira esto"
- `later` → "Luego la veo"
- `react_good` → "Buena elección" (pure ack, no library write)
- `react_funny` → "Jaja, esa sí" (pure ack)

**Implementation:** `touch_type` enum stays global; a per-`link_type` allowlist (or per-link override for `custom`) filters which touches render in the UI and which the Edge Function accepts. The DB write is identical — only the label set and enabled subset differ. Reactions (`react_*`) write a touch row with no `user_media_tracking` side-effect.

> **~~Open question~~ RESOLVED (2026-11-23):** linking model = **two personal libraries + one shared zone** — each user keeps their private library, plus a joint `libraries` row for the communal collection. See [5F](#5f--shared-zone--zona-conjunta-user-decision-2026-11-23). The link_type/visibility design assumes full `library_links` — with only 2 users a single link row still works (one relationship = one row).

#### 5E — Profiles, Auth & Per-User Privacy Settings (user decisions 2026-11-23)

> **User decisions:** account creation is **email-only** — no social/OAuth login. Each user configures **from their own settings** what is visible and **to which relationship type** — visibility is per-owner: your settings control what *you* share, never what others share with you.

**Auth (decided — implemented in Phase 4):**

- Supabase Auth with the **email provider only**: password sign-up/sign-in **and** magic link (OTP) as alternative access. All OAuth providers disabled.
- Email verification on sign-up; password reset via Supabase flow; expired magic links re-requestable.
- No public username/handle — identity is `profiles.display_name`.

**`profiles` columns (Phase 4 schema delta):**

- `display_name text not null`, `avatar_url text`, `locale text not null default 'es'`.
- `avatar_url` stores a **preset id** (`preset:<n>`) in v2 — see avatar spec below; the `upload:<path>` form is reserved for the optional later upload.
- `show_activity boolean not null default false` + `last_seen_at timestamptz` — opt-in "estado" (online / last active) visible to accepted links.
- `show_stats boolean not null default false` — opt-in public counters per category (feeds match views + 5B activity feed).
- Email is **never** exposed to linked users — auth-only field.

**Avatars — preset-first, upload optional (user decision 2026-11-23):**

- **v2 launch: curated preset set only** — ~24-32 illustrated avatars in a consistent style, shipped as WebP (~5-15 KB each) in the repo or a public bucket; cached after first load. `avatar_url` stores the preset id — zero storage, zero upload UI, zero moderation.
- **Picker UI**: avatar grid in the profile settings screen — one tap, no crop flow.
- **Fallback**: deterministic identicon generated client-side from `profiles.id` (GitHub-style) when no avatar chosen — everyone always has one.
- **Later (maybe Phase 7+ if the user base grows)**: optional custom upload via Supabase Storage with client-side resize to ~256 px WebP (~10-20 KB). `avatar_url` already supports it via the `upload:<path>` form — the front-end just learns to render it. No schema change needed.

**Profile & Privacy settings screen (Phase 5 UI):**

- **Perfil**: display name, avatar picker (preset grid), email (read-only), locale selector.
- **Privacidad**: toggles `show_activity`, `show_stats`; account actions (change password if password auth used, resend magic link, delete account → cascade wipes their library per RLS).
- **Visibilidad por relación**: dedicated settings section listing each link (`pareja` / `amigo` / `familia` / each `custom` label) with its own **visibility matrix editor** — the 5A editor promoted from link-creation time to an always-editable screen. Editing updates `library_links.visibility` on the **owner's row only**; the other side's row is theirs to configure.
- Per-item override unchanged: `is_private` lock in the tracking modal (5A) — absolute veto over every link.

**Linking flow (confirmed — matches Phase 5 items 1–2):**

- Invite code with **mutual approval**: A generates code → B enters it → `request_library_link()` → `pending` → A approves → `accepted`.
- Unlink/`match_enabled=false`: sync stops; the UI states plainly that already-seen content cannot be "unseen".

**Visibility defaults per `link_type`** (refines the single 5A default into per-relationship presets):

| `link_type` | Visible by default | Private by default |
| :--- | :--- | :--- |
| `pareja` | status, rating, wishlist, progress | notes, mods |
| `amigo` | status | rating, wishlist, progress, notes, mods |
| `familia` | status | rating, wishlist, progress, notes, mods |
| `custom` | inherits `amigo`, owner adjusts | same |

`is_private` remains the absolute veto on top of any matrix.

**Optional hardening — TOTP 2FA (user request 2026-11-23):**

- Supabase Auth MFA (TOTP) is built-in: `auth.mfa.enroll / challenge / verify` — authenticator apps (Google Authenticator, Authy) scan a QR; session goes `aal1` → `aal2`.
- **Per-user opt-in** toggle in the account/privacy settings screen — off by default.
- **Testable via API script during Phase 4, before any UI exists**: enroll → QR/secret → scan → challenge → verify (right code = `aal2`, wrong = rejected). No NexusLib code needed for the proof.
- Rationale: matters if NexusLib grows beyond 2 users (Phase 7+ candidates, possible public launch) — cheap now through Supabase, painful to retrofit. For 2 users the magic link already covers "something you have"; TOTP is the extra factor for password logins and sensitive actions.

#### 5F — Shared Zone / Zona Conjunta (user decision 2026-11-23)

> **User decision:** the linking model is **two personal libraries + one shared zone** — each user keeps their private library, and a joint space holds the communal collection (movies to watch together, games to play, books to read).

**Model:**

- Personal libraries unchanged (Phase 4 schema: `libraries` + `library_members` + `library_links`).
- The shared zone is a **regular `libraries` row** (e.g. `name = 'Zona conjunta'`) where both linked users are `library_members` — **reuses the existing schema, no new tables**.
- Membership flows through the same invite/mutual-approval path: accepting a link can offer "create shared zone"; any `link_type` can have one (the zone name doubles as the `custom` label case).
- Roles already in schema: `owner` = creator, other member = `editor` (can add/remove zone items); `viewer` reserved for future read-only members.

**Semantics:**

- Zone = **communal catalog**: both members add items; the collection belongs to the zone, not to either personal library.
- Tracking inside the zone is **per-member**: each user marks their own status/progress — the zone shows "Angel la vio / Talmai pendiente" and feeds the couple touches (`date_night`, `inside`, `watching_now`).
- `is_private` does **not** apply inside the zone (everything there is shared by definition); removing an item removes it for everyone → confirm dialog.
- Zone items dedup on `(category, provider, external_id)` via `media_items` — no copies, same canonical catalog.
- The `library_links.visibility` matrix governs **personal↔personal matching only** — zone contents are visible to members by definition of membership.

**Open sub-questions (resolve at implementation):**

- Multiple zones per user? (one per `pareja` link + one per friends group) — schema allows it; UI decides.
- Can a zone grow beyond 2 members later (add a third person) or is it fixed at link acceptance?
- Zone activity in the 5B feed: "añadieron X a la zona conjunta" — yes/no.

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

**Nota datos (2026-11-25):** sub-tabs de `Peliculas_Series` ya distinguen Películas/Series/Anime (anime = Serie + género Animación, heurística). **Doramas quedan pendientes** — requieren `origin_country` en el pipeline TMDB; anotado para trabajar junto con Coleccionables.

**Optional future categories (user-marked ⭐ high interest, 2026-11-21):**

- **Coleccionables** — Phase 7 spec below.
- **Podcasts** — separate late-v2 category if ever wanted: episodic audio via RSS/subscription (iTunes Search API free + feed parsing), progress-per-episode like series. NOT inside Peliculas_Series (different consumption model, no TMDB catalog). Low priority — series episode tracking doesn't exist yet.

**Explicitly discarded:** music (streaming owns it; Last.fm covers scrobbling), shopping list (out of scope).

**Backlog (agregado 2026-11-25):** **caché de portadas en Supabase Storage** — proxy Edge Function que descarga covers de OL/TMDB/Steam una vez y los sirve desde bucket público `covers/` con `cache-control` inmutable (~50-100ms vs ~0.5-1s de archive.org). srcset multi-proveedor ya aplicado (OL -S/M/L, TMDB w342/500/780, Steam header/capsule616). **Caveat escalado:** si el catálogo crece mucho o se comparte entre varios usuarios, el bucket puede llenarse (free tier ~1GB); evaluar límite, TTL o solo-cachear-items-propios en ese momento.

**Backlog (queued, low priority — user note 2026-11-23):** **import/export interchange with known sources** — beyond the Phase 4 bulk *import* (Trakt/Steam/GoodReads): also support **export** of the NexusLib library to known formats/services (CSV per category, OPML-like lists, or write-back APIs where available: Trakt sync, Steam wishlist export, GoodReads CSV). Candidate sources to support both directions: Trakt.tv, Steam profile/wishlist, GoodReads, MyAnimeList/AniList list export, Letterboxd CSV, Open Library want-to-read. Decide scope when picked up — likely a Phase 8+ item after v2 stabilizes.

---

*Last consolidated update: 2026-11-23 — API sources re-tested (Kitsu new manga backup; key-required sources marked 🔑 possible); Phase 3 items 6-7 specs (game update history via Steam news RSS — verified live; book editions via OL editions.json — verified live); Phase 2E/2F specs (dialog a11y + state boxes); DESIGN.md added; import/export interchange backlog queued. Prior: Phase 5D spec (lightweight social layer — free-form chat discarded); Phase 1 ✅ in production; v1→v2 cut-over rule (Phase 4 = the cut); Phase 7 candidate = Coleccionables.*
