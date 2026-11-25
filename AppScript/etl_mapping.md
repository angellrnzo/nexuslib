# ETL Mapping — Google Sheet → Supabase (Phase 4 draft)

> Verificado contra el snapshot real `GameList.xlsx` (2026-11-24, 5 tabs) y el código actual (`WebAPP.gs` → `mapearHeaderAKey_`, `Index.html` → escalas/estados).
> Estado: **decisiones cerradas 2026-11-24** — listo para escribir el ETL en Phase 4.

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
| Dupli | — | flag dedup: `'✅ OK'` = verificado único, vacío = sin verificar; **0 AppIDs repetidos** en el snapshot → ETL confía en UNIQUE + pasada de dedup |

### Peliculas_Series → `provider='tmdb'`

| Columna | Destino | Nota |
|---|---|---|
| ID (`movie-1003596`) | `external_id` | ⚠️ **corregido 2026-11-24**: el prefijo `movie-`/`tv-` SE CONSERVA — es el desambiguador TMDB (movie-123 ≠ tv-123); sin él, `UNIQUE(category,provider,external_id)` fusionaría obras distintas. `external_id='movie-1003596'` |
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
| ID (`OL5738148W`) | `external_id` → `5738148W` ✅ (strip `OL`, conserva sufijo `W`) |
| Titulo/Autor/Editorial | `title` / `metadata.author` / `metadata.publisher` |
| Publicacion | `metadata.release_date` |
| Paginas | `metadata.pages` (hoy `'N/A'` en todas) |
| ISBN | `metadata.isbn` |
| Capitulos_Totales | ignorar ✅ (artefacto de esquema — los libros no tienen capítulos) |

### Mangas → `provider='anilist'`

| Columna | Destino |
|---|---|
| ID (`al-30002`) | `external_id` → `30002` ✅ (strip `al-`) |
| Titulo/Autor/Editorial | `title` / `metadata.author` / `metadata.publisher` |
| Estado_Emision | `metadata.emission_status` (En emisión…) |
| Tomos_Caps | `metadata.volumes_chapters` |
| Demografia | `metadata.demographic` (Seinen/Shounen) |
| Capitulos_Totales | `metadata.total_chapters` (alimenta progress %) |

## Mapeo → `user_media_tracking` (por usuario: Angel / Talmai)

El Sheet es **un solo archivo con columnas por usuario** → en SQL cada par de columnas genera una fila `user_media_tracking` por usuario sobre el mismo `media_items.id`.

| Columnas Sheet (×2 usuarios) | Destino SQL | Transformación |
|---|---|---|
| Estado Angel / Estado Talmai | `status` | enum inglés ✅: `No jugado`→`backlog`, `En proceso`→`in_progress`, `Completado`→`completed`; vacío → **sin fila tracking** |
| Estrellas Angel / Estrellas Talmai | `rating` | 0–10 directo; `0.0` → NULL |
| Deseado Angel / Deseado Talmai | `is_wishlisted` | parse `'True'/'False'`/bool; solo `True` genera flag |
| Nota Angel / Nota Talmai | `personal_notes` | texto libre (vacío hoy) |
| Progreso Angel / Progreso Talmai | `progress` | texto libre; solo existe en Peliculas/Libros/Mangas |

### `library_items` y `is_private`

- Cada fila de tab = item en la biblioteca compartida v1 → en v2 **cada usuario necesita su `library_items` row** sobre el mismo `media_items.id` ✅ (decidido: fiel a v1, ambos usuarios reciben todos los items del catálogo).
- `is_private`: default `false` en migración (nada era privado en v1).

### Papelera → DESCARTADA ✅

`Papelera` (8 items con `datosJson`) **no se migra** — decisión 2026-11-24. La papelera se llenará sola con los borrados futuros; SQL ya tiene `deleted_at` nativo en `library_items` para ese mecanismo.

## Decisiones — RESUELTAS 2026-11-24

1. ✅ **`external_id` sin prefijo** — `al-30002`→`30002`, `OL5738148W`→`5738148W`. **Excepción TMDB (corregido mismo día):** `movie-`/`tv-` se conserva porque es el desambiguador real (mismo número puede existir como movie y tv).
2. ✅ **Items sin tracking → ambas libraries** — fiel a v1 (Sheet = bibliotecas fusionadas). `library_items` para ambos usuarios en todo el catálogo; `user_media_tracking` solo donde hay datos reales.
3. ✅ **Papelera: DESCARTAR** — no se migra (la papelera se llenará sola cuando toque; SQL ya tiene `deleted_at` nativo para futuros borrados).
4. ✅ **Status enum en inglés** — `backlog`/`in_progress`/`completed` (la web será bilingüe ES/EN — el enum es neutro, la UI traduce).
5. ✅ **`Dupli`** — resuelto por datos: 0 AppIDs repetidos; `'✅ OK'` = verificado, vacío = sin verificar. ETL confía en `UNIQUE(category,provider,external_id)` + pasada de dedup por si acaso.
6. ✅ **`Capitulos_Totales` en Libros** — ignorar (artefacto de esquema; los libros no tienen capítulos).

## Notas del mapeo v1 (header→key, ya verificado 100%)

Sobrecargas semánticas que el ETL **no** debe heredar (mapping plano a `metadata` específico):

- `Developer`→`creador`, `Distribuidora`→`editorial` (Juegos)
- `Metacritic`→`puntuacion`
- `Duracion_Temp`/`Paginas`/`Tomos_Caps`→`extension` (colapsan en un campo genérico)
- `Lanzamiento`/`Estreno`/`Publicacion`→`fecha`
