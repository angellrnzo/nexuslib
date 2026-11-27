# NexusLib — Handoff

Estado actual para la próxima sesión. Último commit: `384acfc` (SW v93, rama `beta`).

## Estado del código

**Rama:** `beta` — working tree limpio, commits pusheados.
**Producción:** `main` — no tocar sin `Confirmar deploy` literal.
**DB:** prod + standby en espejo (datos idénticos, schema sincronizado tras delta 07).
**Último commit:** `384acfc` (SW v93).

## Trabajo realizado en esta sesión

### 1. Visual/responsive audit
- Tracking con 1 persona ocupaba media columna → fix `.tracking-container.single`
- Match modal a 1 columna en móvil → fix `minmax(110px,1fr)` bajo 600px
- Stats detail lines sin wrap → fix `overflow-wrap:anywhere`
- Rojos residuales unificados a `--danger-text` (#ff8585)

### 2. Edge Functions + SQL/RLS audit (capa 2 nunca revisada)
- i18n gaps corregidos: `steam-updates`, `steam-reviews` (tier_idx + STR), `book-editions` (idiomas bilingües)
- `catalog-add` check "ya existe" ahora usa `external_id` canónico post-metadata
- Hardening: caps de input en `catalog-search`/`catalog-add`
- RLS fix crítico: `library_links` policies granulares (SELECT ambos, UPDATE/DELETE solo owner) — aplicado a prod y standby
- Editor de visibilidad dirección `in` ahora solo lectura (fix seguridad)

### 3. CSS vars uniformización
- 7 tokens nuevos (`--muted`, `--bright`, `--danger-text`, `--links`, `--mods`, `--on-accent`, `--positive`)
- ~44 contextos migrados a vars (solo dentro de CSS, nunca en datos JS con alpha)
- **Bug crítico:** sweep dejó `:root` vars auto-referenciadas → texto invisible. Restaurado valores literales.

### 4. Enlaces cruzados (RPCs vs SQL)
- Los 9 RPCs del frontend existen en SQL con firmas correctas
- Orden de migraciones FILES 00→07 explícito
- STR dict parity verificada (ES/EN OK)
- Auth/login/magic/recover/reset funcionan

### 5. Verificaciones web estándar
- SW navigation strategy: network-first para navegaciones (estándar web.dev)
- OpenLibrary User-Agent identificado (app + repo URL + email angellrnzo@gmail.com) → rate limit 3x
- pg_cron + pg_net disponibles en free tier (scheduler TTL resuelto)

### 6. DB mirror
- Prod vs standby: datos idénticos, schema sincronizado tras delta 07 manual
- Workflow semanal lunes 5AM UTC: pg_dump + mirror + deltas automáticos

### 7. Mods Tracker UI refinamiento (último trabajo)
- Layout: Nombre/Fuente/Versión en 3 columnas (2fr 1.2fr 1fr), URL/Notas full-width debajo
- Responsive: apilar en 1 columna bajo 600px
- Espaciado uniforme: gap 10px, padding 10px 12px, notas min-height 80px
- Validación: botón Guardar deshabilitado hasta Nombre+URL llenos (Nota opcional)
- Botón Guardar: estado apagado (opacity 0.4), hover glow morado + borde visible
- Acordeón Mods: animación reforzada (box-shadow glow), estilo morado consistente
- Bordes/buttons: uniformidad con acordeón (border-radius 12px, hover glow sin ring)
- Icono papelera: hover rojo (ya implementado)

### 8. Uniformidad visual general (último trabajo)
- Gaps contenedores principales unificados a 10px: tracking-container, action-buttons, stats-bar, filter-group, stats-profile-actions, pf-grid-2, pf-invite-row, stats-view
- Gaps internos compactos (4-6px) se mantienen para chips/iconos/labels — mejor densidad visual

### 9. Repaso visual y UX completo (2026-11-26, SW v101)
- Controles superiores: `#btn-toggle-filtros` y `#btn-menu` reubicados en fila 1 junto a búsqueda, rediseñados como `.btn-circle` oscuros translúcidos con `.has-filters` visible y exclusión mutua al abrir.
- Barra agregar (`#add-wrapper-box`): eliminado botón `+` duplicado; icono pasivo izquierdo alineado con búsqueda y CTA `#btn-add` tipo píldora (`btn.add`).
- Panel de filtros (`#panel-filtros`): cabecera `tip.filtros`, layout compacto en 2 columnas (`#filter-personas`, `.filter-grid-2`, `.filter-extras-grid`), selectores uniformados en `--accent` (`--mods` solo en `#fuente-dropdown`), corregido `data-i18n="filter.ordenar"`.
- Perfil y stats (`#stats-view`): chevron animado en Editar, botón copiar código resaltado, `Cerrar sesión` sutil, `max-height: 420px` en acordeones de stats, `data-i18n` completo en perfil y categorías stats (`st.global`).
- Modales Juegos (Reseñas Steam y Updates): lavado de cara en `--accent` respetando espaciado original, barra `.rev-bar5` segmentada.
- Scroll y SVG: añadido `<symbol id="i-sort">`, `grid-column: 1 / -1` en `.skel-grid`, `#offline-banner` sin solapar `.top-header`, bloqueo real de scroll (`html.modal-open` + `overscroll-behavior: contain`), `history.scrollRestoration = 'manual'` + `scrollTo(0, 0)` al recargar y cambiar de categoría.

## Documentación actualizada

- `AUDIT.md` — registro de 13 bugs + checklist mecanico para auditorías futuras
- `NORMS.md` — 11 secciones de normas por tipo (general, JS, i18n, CSS, SQL, Edge Functions, Python, Git, seguridad, testing, documentación)
- `DESIGN.md` — tokens nuevos + normas específicas del proyecto
- `TESTING.md` — +3 puntos RLS (sección 5) + sección 3.1 Mods Tracker completa
- `CHANGELOG.md` — todas las mejoras documentadas
- `AppScript/road.md` — spec "Perfil público shareable" en backlog post-v2, Phase 6 rewrite (native app al final, repos pendientes)

## Pendiente de tu lado (antes de deploy)

1. **TESTING.md ronda E2E** (~93 puntos) — sección 3.1 Mods Tracker ahora incluida
2. **Review EN** del dict — activar English y anotar textos raros
3. **`Confirmar deploy`** → `beta`→`main` cuando la ronda salga limpia

Deploy activará:
- GitHub Pages (index.html)
- 7 Edge Functions auto-deploy (con lang param, fix RLS ya en prod)
- SW v78 (network-first navegaciones)

## Opcionales (no bloquean deploy)

**Roadmap:**
- Bulk import por CSV/JSON (spec en road.md)
- pg_cron scheduler TTL refresh (posible ahora con pg_cron+pg_net)
- 2FA (roadmap web launch)
- Rate limiting en functions (roadmap web launch)
- Perfil público shareable (spec en road.md, post-v2)
- Phase 5H: bulk actions (items, tracking)
- Phase 6: native Android+iOS app (repos pendientes de usuario)

**Handoff:**
- Revisar EN dict cuando tengas tiempo
- Repos para native app evaluation (cuando llegue Phase 6)

## Comandos útiles

```bash
# Servidor local
cd C:/Users/angellrnzo/Documents/Workspace/NexusLib
python -m http.server 8080 --bind 127.0.0.1

# Preview
http://127.0.0.1:8080/index.html

# Aplicar deltas de schema a standby (manual si es necesario)
python apply_schema.py --deltas

# Verificar nodos SW
F12 → Application → Service Workers → Unregister (si hay cache vieja)
```

## Ruta crítica de testeo

1. TESTING.md sección 3.1 Mods Tracker (último trabajo)
2. TESTING.md completo (~93 puntos)
3. Review EN
4. `Confirmar deploy`

---
Generado 2026-11-26. Último commit: `8383b87`.

### Sesión UI — dropdowns custom en TODOS los filtros (commit `384acfc`, SW v93)

- `initCustomSelect(id, onChange)` reescrito: delegación de clicks en el wrap
  (los `<li>` se regeneran sin perder listeners), callback por wrapper,
  idempotente vía `dataset.csInit`, cierra otros dropdowns abiertos.
- Helpers nuevos: `nexusCSMenuHTML`, `nexusCustomSelectWrap`,
  `nexusCSSyncSelect`, `nexusSyncPanelCustomSelects`, `nexusCSRebuildMenu`,
  `nexusCSCloseOthers`. Patrón: hidden input conserva el id que lee
  `filtrarItems`; wrapper id = `<hiddenId>-dropdown`.
- `nexusRenderFilterPersonas` ahora genera custom-selects para
  `filter-est-*`/`filter-nota-*` y reconstruye menús de `filter-deseado`
  (todos/cualquiera/ninguno/solo:key/all) y `filter-orden`
  (az/za/recientes/nota:key/puntuacion) — opciones por persona restauradas.
- `configurarFiltrosCategoria` genera custom-selects para `f-extra-1/2/3`
  en las 4 categorías; en Películas f-extra-1 setea `fSubcat` antes de filtrar.
- Eliminado `<select id="filter-orden">` nativo duplicado; corregidos valores
  inválidos (`deseado`→`cualquiera`, `recent`→`recientes`).
- `resetFiltros` llama `nexusSyncPanelCustomSelects()` para actualizar labels.
- `.custom-select-menu` fondo opaco `#0d1322` (sin transparencia).
- Verificado en vivo: 9 custom-selects en panel, 0 selects nativos,
  selección filtra, reset sincroniza labels.

### Sesión UI — autocomplete + foco mods (commits `128951e`, `6283c89`, `18ad3d4`, SW v96)

- Foco mods: `.custom-select-trigger:focus-visible{outline:none}` (el
  "amarillo" era el focus ring default del browser); `#fuente-dropdown.open`
  borde morado discreto; `.mods-form input/textarea:focus` glow morado sutil.
- Autocomplete: debounce 300ms, umbral 2 chars,
  `autocompletarAgregarInput()` abre el dropdown con "Searching..." apenas
  se teclea (sin Enter). `.search-results-dropdown` fondo opaco #0d1322,
  top calc(100%+4px), animacion nexusDdDrop.
- VERIFICADO: el "no sugiere / debo dar Enter" del usuario era el service
  worker cacheando index.html viejo — tras unregister+reload funciona.
  Regla: para probar cambios de UI, Ctrl+Shift+R o desregistrar SW.

### Sesión UI — barra agregar unificada (commit `3440f47`, SW v97)

- Barra de agregar ahora es UN solo contenedor bordeado: filtro + menu +
  plus + input + clear + add dentro de `.add-wrapper` (patron
  `search-header-bar` de la muestra del usuario).
- `.add-collapse`: botones nav colapsan animados (width/flex/opacity/
  transform) al expandir — equivalente a `.is-searching .nav-trigger`.
- `.add-wrapper .btn-circle` = 30px dentro de la barra; `.add-plus` clickeable.
- `expanded` usa anillo `0 0 0 3px rgba(102,192,244,.16)` + glow.
- Eliminado `.right-controls`/`#right-ctrls`; `activarModoBusquedaAgregar`
  ya no lo referencia y llama `cerrarMenuPanel()` al activar.
- Verificado: colapso 30px->0 con opacity, regresa al cerrar, ring visible.

### Sesión UI — barras unificadas geometria muestra (commit `f5a6729`, SW v98)

- Ambas barras (`.search-wrapper` filtro + `.add-wrapper` agregar) con la
  geometria de la muestra: border-radius 14px, border 1.5px, anillo
  `0 0 0 3px rgba(102,192,244,.16)` al estar activas.
- Barra superior de busqueda: nuevo `btn-clear-search` (visible solo con
  texto via `.has-text`), `syncSearchClearBtn()` y `limpiarBusquedaFiltro()`
  (limpia input + filtrarItems + refocus). `cambiarCategoria` sincroniza.

### Sesión UI — fix click-fuera + animaciones nav (commit `cba3e3e`, SW v99)

- BUG FIX: el click global solo cerraba la barra de agregar si
  `#search-dropdown` tenia `.open` — si la barra estaba `expanded` sin
  dropdown abierto (foco sin resultados), el click fuera no hacia nada.
  Ahora cierra cuando `add-wrapper-box.expanded` y el click cae fuera.
- Botones nav: transiciones opacity 180ms / transform 240ms spring
  (mismo ease-out de la muestra), `:active scale(0.94)`, y bloque
  `prefers-reduced-motion` para toda la familia de controles.

### Sesión estándares UI/UX (commit `2ff4f3d`, SW v100)

- Lineamientos del usuario archivados en `docs/standards/` (3 docs:
  manual de coincidencia de elementos, instrucciones dev UI/UX, guía
  de diseño web). Son la referencia oficial para futuros cambios UI.
- Barra agregar según guía §4: cierre fuera con `pointerdown` +
  `Escape`; ELIMINADOS closers por scroll/touchmove (prohibidos) y el
  `pushState` en focus (desincronizaba popstate / doble "Atrás").
- `guardarSharePanel` ahora actualiza `itemsByCategory` + `privado{Suf}`
  de mi persona + localStorage, y pasa el item real a
  `nexusSyncShareUI` (antes pasaba `{id}` falso → botón nunca cambiaba).
- `nexusRebuildPersonas` escanea TODOS los items (antes solo 3 por
  categoría — bug de personas tardías).
- `estadoEmision`: `NEXUS_EMISION_MAP` + `nexusCanonEmision`/
  `nexusEmisionMatch` — filtra ES/EN ("Airing"≈"En emisión",
  "Finished"≈"Finalizado/a") en Peliculas_Series y Mangas.
- Viewport sin `user-scalable=no` (accesibilidad, zoom permitido).
- i18n: `mods.saved`, `chap.autoapi/auto/unknown/manual` y badges
  "Fecha Build"/"Beta" migrados a STR.es/STR.en.
- Pendiente de los docs (no implementado aún): delegación de eventos
  data-*/onclick en TODAS las plantillas (refactor grande), agrupación
  visual por elemento común, STR duplicados=0 verificado, ~resto de
  literales hardcodeados.

### Estándares por flujo (docs/standards/POR-FLUJO.md)

- Nuevo índice operativo: reglas por flujo (barras, filtros/custom-
  selects, grid/tarjetas, modal, share/privacidad, i18n/tema, motion)
  + checklist rápido. Las 3 guías fuente quedan en docs/standards/.
- NORMS.md del workspace suma §12 con las reglas transversales
  (pointerdown+Escape, prohibido scroll/touchmove closers y pushState
  en focus, orden backend→memoria→localStorage→UI, mapas canónicos,
  custom-selects, reduced-motion).
