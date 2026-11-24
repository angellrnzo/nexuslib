# ETL Mapping — Google Sheet → Supabase (Phase 4 draft)

> Verificado contra el snapshot real `GameList.xlsx` (2026-11-24, 5 tabs) y el código actual (`WebAPP.gs` → `mapearHeaderAKey_`, `Index.html` → escalas/estados).
> Estado: **borrador para revisión** — las decisiones abiertas están marcadas con ❓.

## Volumen real del snapshot

| Tab | Filas | Rol en v1 |
|---|---|---|
| Juegos | 485 | catálogo + tracking Steam |
| Peliculas_Series | 2 | catálogo TMDB |
| Libros | 8 | catálogo OpenLibrary |
| Mangas | 2 | catálogo AniList |
| Papelera | 8 | papelera con `datosJson` completo |

**Dato clave:** solo 147/485 Juegos tienen `Estado`/`Estrellas` rellenos (el resto son entradas de catálogo sin tracking personal — probablemente imports de wishlist Steam). En Peliculas/Libros/Mangas todas las filas traen tracking por defecto (`No jugado`/`0.0`/`False`).

## Escalas y enums verificados en el código

- **Estrellas** = escala **1–10** (`renderEstrellas` itera 1..10) → `user_media_tracking.rating` (1.0–10.0) **directo, sin conversión**.
- **Estado** = `No jugado` / `En proceso` / `Completado` → mapear a enum SQL (propuesta: `backlog`/`in_progress`/`completed`; `No jugado` hace doble función de "sin empezar" — el flag wishlist va aparte en `Deseado`).
- **Deseado** = booleano → `is_wishlisted`. Ojo: la hoja guarda strings `'False'`/`'True'` → parsear, vacío = false.
- **Nota** = texto libre → `personal_notes` (hoy 100% vacío).
- **Progreso** = texto libre (ej. "Cap 5") → `progress`. **Juegos NO tiene columnas Progreso** — solo Peliculas/Libros/Mangas.

## Mapeo por pestaña → `media_items`

`media_items` = catálogo global deduplicado: `UNIQUE(category, provider, external_id)` + `metadata jsonb` + cover/trailer URLs.

### Juegos → `provider='steam'`

| Columna Sheet | Destino | Transformación |
|---|---|---|
| AppID | `external_id` | **float → int** (`'1730790.0'` → `1730790`) |
| Nombre | `title` | tal cual |
| Portada | `cover_url` | URL Steam/SteamGridDB |
| Trailer | `trailer_url` | YouTube/Steam |
| Developer | `metadata.developer` | (en v1 cae en key `creador` por el header-map) |
| Lanzamiento | `metadata.release_date` | fecha → ISO |
| Generos | `metadata.genres` | string separado por comas → array |
| Precio | `metadata.price` | |
| DLCs | `metadata.dlcs` | |
| Distribuidora | `metadata.publisher` | (en v1 cae en `editorial`) |
| Metacritic | `metadata.metacritic` | (en v1 cae en `puntuacion`) |
| SteamDeck | `metadata.steam_deck` | |
| Capturas | `metadata.screenshots` | |
| Modos | `metadata.modes` | |
| Tags | `metadata.tags` | |
| Descripcion | `metadata.description` | |
| buildEstable | `metadata.build_estable` | versionado Steam (futuro: alimenta Game Update History) |
| fechaEstable | `metadata.build_date` | |
| beta | `metadata.beta_branches` | nombres de rama separados por comas |
| notaParche | `metadata.last_patch_note` | texto `[YYYY-MM-DD] ...` |
| Dupli | — | flag dedup: `'✅ OK'` = verificado único; ❓ qué significa vacío (245 filas) — revisar antes del ETL |

### Peliculas_Series → `provider='tmdb'`

| Columna | Destino | Nota |
|---|---|---|
| ID (`movie-1003596`) | `external_id` | **strip prefijo** `movie-`/`tv-` → `1003596`; el prefijo define `category` (`movie`/`series`) — respeta el caveat de dedup TMDB (mismo id-space, categorías separadas) |
| Tipo | `category` | `Película`→`movie`, `Serie`→`series` |
| Titulo | `title` | |
| Estreno | `metadata.release_date` | |
| Estado_Emision | `metadata.emission_status` | Post Production/Estrenada |
| Duracion_Temp | `metadata.duration` | "165 min" → `165` + unidad en metadata |
| Plataformas | `metadata.platforms` | lista streaming |
| Creador | `metadata.creator` | |
| Generos/Puntuacion/Descripcion | `metadata.*` | |

### Libros → `provider='openlibrary'`

| Columna | Destino |
|---|---|
| ID (`OL5738148W`) | `external_id` (tal cual o strip `OL`/`W` — ❓ decidir formato canónico) |
| Titulo/Autor/Editorial | `title` / `metadata.author` / `metadata.publisher` |
| Publicacion | `metadata.release_date` |
| Paginas | `metadata.pages` (hoy `'N/A'` en todas) |
| ISBN | `metadata.isbn` |
| Capitulos_Totales | ❓ irrelevante para libros (artefacto de esquema copiado) → ignorar o metadata |

### Mangas → `provider='anilist'`

| Columna | Destino |
|---|---|
| ID (`al-30002`) | `external_id` — strip `al-` → `30002` (o mantener prefijo, decidir consistencia con Libros) |
| Titulo/Autor/Editorial | `title` / `metadata.author` / `metadata.publisher` |
| Estado_Emision | `metadata.emission_status` (En emisión…) |
| Tomos_Caps | `metadata.volumes_chapters` |
| Demografia | `metadata.demographic` (Seinen/Shounen) |
| Capitulos_Totales | `metadata.total_chapters` (alimenta progress %) |

## Mapeo → `user_media_tracking` (por usuario: Angel / Talmai)

El Sheet es **un solo archivo con columnas por usuario** → en SQL cada par de columnas genera una fila `user_media_tracking` por usuario sobre el mismo `media_items.id`.

| Columnas Sheet (×2 usuarios) | Destino SQL | Transformación |
|---|---|---|
| Estado Angel / Estado Talmai | `status` | `No jugado`→`backlog`, `En proceso`→`in_progress`, `Completado`→`completed`; vacío → **sin fila tracking** (ver decisión abajo) |
| Estrellas Angel / Estrellas Talmai | `rating` | 0–10 directo; `0.0` → NULL |
| Deseado Angel / Deseado Talmai | `is_wishlisted` | parse `'True'/'False'`/bool; solo `True` genera flag |
| Nota Angel / Nota Talmai | `personal_notes` | texto libre (vacío hoy) |
| Progreso Angel / Progreso Talmai | `progress` | texto libre; solo existe en Peliculas/Libros/Mangas |

### `library_items` y `is_private`

- Cada fila de tab = item en la biblioteca compartida v1 → en v2 **cada usuario necesita su `library_items` row** sobre el mismo `media_items.id` (el Sheet fusionaba ambas bibliotecas). ❓ Confirmar: ¿los 497 items van a AMBAS libraries, o solo a la que tenga tracking/deseado? Propuesta: ambas (fiel a v1) — el catálogo ya deduplica.
- `is_private`: default `false` en migración (nada era privado en v1).

### Papelera → soft-delete

`Papelera` tiene `datosJson` completo por item → en SQL equivale a `library_items.deleted_at`. ETL: items borrados **no se recrean** como activos; si se quiere historial, insertarlos con `deleted_at` + `metadata._trash = datosJson`. ❓ Decidir si se migra la papelera o se descarta (8 items).

## Decisiones abiertas para Phase 4

1. ❓ `external_id` canónico: ¿strip prefijos (`movie-`, `al-`, `OL`) o conservar el ID tal cual del Sheet? (afecta dedup futura con APIs)
2. ❓ Filas sin tracking (338 Juegos): ¿`library_items` para ambos usuarios igual, o solo catálogo?
3. ❓ Significado de `Dupli` vacío vs `'✅ OK'`.
4. ❓ Papelera: ¿se migra como `deleted_at` o se descarta?
5. ❓ Enum `status` final en inglés (`backlog`/`in_progress`/`completed`) — la vista `v_library_matches` ya usa `backlog`.
6. ❓ `Capitulos_Totales` en Libros — ignorar.

## Notas del mapeo v1 (header→key, ya verificado 100%)

Sobrecargas semánticas que el ETL **no** debe heredar (mapping plano a `metadata` específico):

- `Developer`→`creador`, `Distribuidora`→`editorial` (Juegos)
- `Metacritic`→`puntuacion`
- `Duracion_Temp`/`Paginas`/`Tomos_Caps`→`extension` (colapsan en un campo genérico)
- `Lanzamiento`/`Estreno`/`Publicacion`→`fecha`
