# NexusLib — Log de sesiones (archivo)

> Bloques append-only movidos de `HANDOFF.md` para mantenerlo
> liviano. Orden: más reciente arriba.

---

Generado 2026-11-26. Último commit: `8383b87`.

## Sesión UI — dropdowns custom en TODOS los filtros (commit `384acfc`, SW v93)

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

## Sesión UI — autocomplete + foco mods (commits `128951e`, `6283c89`, `18ad3d4`, SW v96)

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

## Sesión UI — barra agregar unificada (commit `3440f47`, SW v97)

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

## Sesión UI — barras unificadas geometria muestra (commit `f5a6729`, SW v98)

- Ambas barras (`.search-wrapper` filtro + `.add-wrapper` agregar) con la
  geometria de la muestra: border-radius 14px, border 1.5px, anillo
  `0 0 0 3px rgba(102,192,244,.16)` al estar activas.
- Barra superior de busqueda: nuevo `btn-clear-search` (visible solo con
  texto via `.has-text`), `syncSearchClearBtn()` y `limpiarBusquedaFiltro()`
  (limpia input + filtrarItems + refocus). `cambiarCategoria` sincroniza.

## Sesión UI — fix click-fuera + animaciones nav (commit `cba3e3e`, SW v99)

- BUG FIX: el click global solo cerraba la barra de agregar si
  `#search-dropdown` tenia `.open` — si la barra estaba `expanded` sin
  dropdown abierto (foco sin resultados), el click fuera no hacia nada.
  Ahora cierra cuando `add-wrapper-box.expanded` y el click cae fuera.
- Botones nav: transiciones opacity 180ms / transform 240ms spring
  (mismo ease-out de la muestra), `:active scale(0.94)`, y bloque
  `prefers-reduced-motion` para toda la familia de controles.

## Sesión estándares UI/UX (commit `2ff4f3d`, SW v100)

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

## Estándares por flujo (docs/standards/POR-FLUJO.md)

- Nuevo índice operativo: reglas por flujo (barras, filtros/custom-
  selects, grid/tarjetas, modal, share/privacidad, i18n/tema, motion)
  - checklist rápido. Las 3 guías fuente quedan en docs/standards/.
- NORMS.md del workspace suma §12 con las reglas transversales
  (pointerdown+Escape, prohibido scroll/touchmove closers y pushState
  en focus, orden backend→memoria→localStorage→UI, mapas canónicos,
  custom-selects, reduced-motion).
