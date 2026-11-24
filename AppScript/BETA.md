# BETA — Registro de avances y pruebas

> Un bloque por sesión de trabajo. La rama `beta` es el banco de pruebas;
> `main` es producción y **solo se actualiza con aprobación expresa del
> owner** — ver `AppScript/road.md` → "Branching, Beta & Release Workflow".
> Excepción: la documentación (`.md`) puede sincronizarse a `main` en
> cualquier momento (no llega a usuarios); el código de la app queda
> congelado hasta deploy explícito.

## Cómo probar una entrada beta

1. Pegar `AppScript/Index.html` (y `WebAPP.gs` si cambió) en el editor de Apps Script.
2. Abrir la URL `/dev` del proyecto (no `/exec`).
3. Probar en Android + escritorio según los pasos indicados.

---

## Plantilla de entrada

```text
### YYYY-MM-DD — <tema corto>

- Rama/commit: beta@<sha>
- Cambios: <qué se hizo>
- Spec origen: <road.md → Phase X, item Y>
- Cómo probar: <pasos concretos>
- Estado: pendiente de prueba | verificado | promovido a main (vX.Y.Z)
- Pendiente: <lo que falta>
- Necesito de ti: <bloqueos o decisiones>
```

---

## Entradas

### 2026-11-22 — Setup del flujo beta

- Rama/commit: `beta` creada desde `main` (`012cc0f`+)
- Cambios: workflow documentado en `road.md`; este registro creado
- Spec origen: petición del usuario — mantener producción funcional mientras se desarrolla
- Cómo probar: n/a (solo proceso)
- Estado: verificado
- Pendiente: elegir la primera fase beta (candidatas: Phase 2 motion, Phase 3 backend/mods/reviews)
- Necesito de ti: decidir por qué phase empezamos

### 2026-11-22 — Spec i18n ES/EN añadida al roadmap

- Rama/commit: `beta`
- Cambios: Phase 2.5 documentada en `road.md` (diccionario `I18N` + `t()`, toggle con `localStorage`, **español por defecto**); fila añadida al mapa de ubicación de features; CHANGELOG Unreleased actualizado
- Spec origen: petición del usuario — web bilingüe ES/EN, docs del repo se quedan en inglés
- Cómo probar: n/a (solo spec)
- Estado: pendiente de implementación
- Pendiente: extracción de strings de `Index.html` (varios cientos — sesión beta dedicada)
- Necesito de ti: nada

### 2026-11-22 — Spec capa social ligera (Phase 5D)

- Rama/commit: `beta` (`3d4f751`)
- Cambios: Phase 5D añadida a `road.md` — notas compartidas por ítem, reacciones "visto también", `watching_now` efímero, y recomendaciones con botón "Agregar a mi biblioteca" (`recommended_by`); chat libre descartado explícitamente. WIKI §7 actualizado con la nota de la capa social
- Spec origen: conversación con el usuario — interacciones sociales ancladas a ítems compartidos, no mensajería
- Cómo probar: n/a (solo spec)
- Estado: pendiente de implementación (post-cut, junto a Phase 5)
- Pendiente: resolver open question de Phase 5 (2 usuarios vs multi-usuario) antes de construir
- Necesito de ti: nada

### 2026-11-22 — Phase 5D: catálogo de toques predeterminados

- Rama/commit: `beta`
- Cambios: `road.md` → Phase 5D ampliada con tabla de 7 preset touches (`interested`/`save`/`watching`/`seen`/`later`/`note`/`vote`), flujo de uso real de 3 pasos, notas de implementación (`item_touches` table, mapeo touch→acción, rate-limit, i18n). WIKI §7 actualizado
- Spec origen: petición del usuario — toques tipo "mira aquí interesante" que concluyan en flujo real (recomendación → biblioteca)
- Cómo probar: n/a (solo spec)
- Estado: pendiente de implementación (post-cut, junto a Phase 5)
- Pendiente: resolver open question de Phase 5 antes de construir
- Necesito de ti: nada

### 2026-11-22 — Phase 5D: toques por tipo de relación + exclusivos de pareja

- Rama/commit: `beta`
- Cambios: `road.md` → Phase 5D ampliada: set de touches filtrado por `link_type` (pareja=catálogo completo + exclusivos, amigo=set suave "Me la apunto"/"Buena elección"/"Jaja", familia=mínimo, custom=configurable) y tabla de 4 toques exclusivos de pareja (`react_love`, `date_night`, `inside`, `miss_you_note`). WIKI §7 actualizado
- Spec origen: petición del usuario — mismas mecánicas pero tono más blando con amigos + reacciones específicas de pareja
- Cómo probar: n/a (solo spec)
- Estado: pendiente de implementación (post-cut, junto a Phase 5)
- Pendiente: resolver open question de Phase 5 antes de construir
- Necesito de ti: nada

### 2026-11-23 — Specs: Game Update History + Book Editions + checklist pre-flight

- Rama/commit: `beta`
- Cambios: `road.md` → dos features nuevas especadas (Steam patch log vía news RSS, lazy-fetch como reviews; ediciones de libros por traductor vía OpenLibrary `works/{key}/editions.json` — mitad read-only v1.x, campo "mi edición" right of the cut y alimenta visibilidad Phase 5A). Phase 3 items 6-7 añadidos, audit OpenLibrary actualizado con editions endpoint. Nueva sección **"Implementation Inputs Checklist"**: insumos/APIs/keys/SQL/decisiones/acciones del usuario requeridos antes de iniciar cada fase (2→7). WIKI §7 actualizado
- Spec origen: petición del usuario — seguimiento de parches de juegos y ediciones por traductor en libros
- Cómo probar: n/a (solo spec)
- Estado: pendiente de implementación (Phase 3 items 6-7 v1.x; ownership de edición post-cut)
- Pendiente: work key de OpenLibrary por libro (verificar captura en resolver); inconsistencia `appreviews` muerto en Phase 4 item 5 marcada para corregir al implementar
- Necesito de ti: nada por ahora — la checklist marca qué necesitaré de ti en cada fase (p. ej. proyecto Supabase, exports Trakt/Steam/GoodReads)

### 2026-11-23 — Auditoría de consistencia docs + DESIGN.md en inglés

- Rama/commit: `beta`
- Cambios: README (links a DESIGN.md, estado al día, features nuevas listadas, árbol con BETA.md/DESIGN.md), CHANGELOG Unreleased (nuevas specs por fase), BETA.md (excepción docs→main aclarada en header), WIKI (last-updated), DESIGN.md traducido a inglés para alinear con el set técnico (README/WIKI/road/CHANGELOG en inglés; BETA.md queda en español como log de trabajo)
- Spec origen: petición del usuario — auditar sincronización idioma/formatos del set de docs
- Cómo probar: n/a (solo docs)
- Estado: docs sincronizadas, lint 0 issues en los 6 `.md`
- Pendiente: convención de idioma — técnico en inglés, log de trabajo en español
- Necesito de ti: nada

### 2026-11-23 — Specs: a11y dialog semantics + state boxes (audit gaps)

- Rama/commit: `beta`
- Cambios: `road.md` → Phase 2 items 2E (dialog semantics `role="dialog"`/`aria-modal`/focus trap/focus restore — modales no tienen semántica de diálogo hoy) y 2F (`.state-box` compartido para empty/error/offline con variantes + Retry; reemplaza fallbacks inline-style actuales). Tabla de auditoría §2 con 2 filas nuevas. DESIGN.md → sección state-box + reglas a11y actualizadas (prefers-reduced-motion ya existe global ~L745 — verificado en código; documentado). HANDOFF.md pendiente de gaps actualizado
- Spec origen: auditoría de diseño del usuario — "anota y documenta a profundidad donde toca"
- Cómo probar: n/a (solo spec)
- Estado: pendiente de implementación (Phase 2E/2F junto al motion system)
- Pendiente: definir copy exacto de state-boxes por superficie al implementar
- Necesito de ti: nada

### 2026-11-23 — Re-test de fuentes API + backups secundarios

- Rama/commit: `beta`
- Cambios: `road.md` → nueva subsección "Backup & secondary sources — live re-test 2026-11-23" con requests reales por categoría. Verificados OK: Steam appdetails+news RSS (spec update history), OL editions.json (1,181 ediciones Gatsby — spec book editions) + ratings.json, AniList, **Kitsu como backup nuevo de manga** (200, sin key). Descartados: Gutendex (timeout), Jikan (timeout confirmado). Posibles con key (testear al implementar): IGDB, RAWG, OMDB, TVDB, Google Books, MAL
- Spec origen: petición del usuario — "chequea fuentes, anexa secundarias, testea directo"
- Cómo probar: n/a (docs)
- Estado: audit actualizado
- Pendiente: testear fuentes 🔑 cuando se implementen las features que las necesiten
- Necesito de ti: nada (las keys se gestionan en Apps Script Properties cuando toque)

### 2026-11-23 — Backlog: import/export con fuentes conocidas

- Rama/commit: `beta`
- Cambios: `road.md` → nueva entrada "Backlog (queued, low priority)": intercambio import/export con fuentes conocidas — export además del import bulk de Phase 4 (Trakt/Steam/GoodReads), más Letterboxd CSV, MAL/AniList list export, OL want-to-read. Marcado como Phase 8+ tras estabilizar v2. "Last consolidated update" del roadmap actualizado
- Spec origen: petición del usuario — "anota que se puedan importar y exportar bases de datos de fuentes conocidas, en cola por ahora"
- Cómo probar: n/a (docs)
- Estado: backlog documentado
- Pendiente: definir scope (direcciones, formatos, servicios) cuando se retome
- Necesito de ti: nada
