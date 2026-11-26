# Estándares por flujo — NexusLib

Normas operativas organizadas por **flujo de UI**, para aplicar rápido
según lo que se esté tocando. Complementa (no reemplaza) los docs
fuente en esta carpeta: `manual_coincidencia_elementos.md`,
`instrucciones_desarrollo_ui.md`, `guia_diseno_ui_ux.md`.

Reglas transversales que aplican a TODOS los flujos:

- Un solo borde por superficie contenedora; elementos internos sin borde propio.
- Cierre de paneles/barras: `pointerdown`/`click` fuera del contenedor + `Escape`.
- PROHIBIDO cerrar por `scroll`/`touchmove` con umbrales arbitrarios.
- PROHIBIDO `history.pushState` en focus de inputs de búsqueda (desincroniza `popstate`).
- `itemsByCategory` + `localStorage` se actualizan ANTES de refrescar la UI.
- Textos visibles por `t()`/`tf()`; cero literales hardcodeados en JS.
- `prefers-reduced-motion` respetado en toda animación nueva.
- Datos de usuario a `innerHTML` siempre escapados (`escaparHTML`/`vinculosEsc`).

---

## Flujo 1 — Barra de búsqueda/filtro (`#search-wrapper-box`, `#inputBuscar`)

**Archivos:** HTML ~línea 1460, JS `nexusInitApp` ~línea 3615, `filtrarItems`.

Reglas:

- Geometría igual a la barra de agregar: `height:34px`, `border-radius:14px`,
  `border:1.5px solid rgba(255,255,255,.08)`; focus-within → borde accent +
  anillo `0 0 0 3px` + glow.
- Botón limpiar (`.btn-clear-search`) visible solo con `.has-text`.
- Enfocar input: `busquedaFiltroActiva = true` + UN `pushState({sf:true})`
  (guardado por flag — no repetir por cada focus).
- Cierre: click/pointerdown fuera, `Escape`, o `popstate` → blur + flag false.

---

## Flujo 2 — Barra de agregar/autocomplete (`#add-wrapper-box`, `#inputAgregar`)

**Archivos:** HTML ~línea 1560, JS `activarModoBusquedaAgregar`,
`cerrarBusquedaAgregar`, `autocompletarAgregarInput`, `manejarAgregar`.

Reglas:

- Misma geometría que la barra de filtro (14px/1.5px/anillo).
- Botones nav (filtro/hamburguesa) viven DENTRO del wrapper como
  `.add-collapse`; colapsan a `width:0/opacity:0` al expandir
  (transición 240ms `cubic-bezier(0.22,1,0.36,1)` = `--ease-out`).
- `activarModoBusquedaAgregar(true)` = solo `classList.add('expanded')` +
  `cerrarMenuPanel()`. SIN `pushState`.
- Cierre: `pointerdown` fuera de `.add-wrapper` + `Escape` + `popstate`.
  NUNCA por scroll/touchmove.
- Autocomplete: umbral **2 caracteres**, debounce **300ms**, feedback
  inmediato "Buscando..." al primer tecleo (`autocompletarAgregarInput`).
- Dropdown `#search-dropdown`: fondo opaco `#0d1322`, pegado a la barra
  (`top:calc(100% + 4px)`), animación `nexusDdDrop` 180ms.
- `cerrarBusquedaAgregar(soloLimpiar)`: `soloLimpiar=true` limpia texto y
  re-expande (botón X); `false` colapsa todo.

---

## Flujo 3 — Panel de filtros + dropdowns custom

**Archivos:** `#panel-filtros`, `nexusCustomSelectWrap`, `initCustomSelect`,
`nexusRenderFilterPersonas`, `configurarFiltrosCategoria`,
`nexusSyncDeseadoMenu`/`nexusSyncOrdenMenu`/`nexusSyncExtraMenus`/
`nexusSyncPersonaMenus`, `filtrarItems`, `resetFiltros`.

Reglas:

- TODO select del panel es dropdown custom: hidden input `#id` +
  wrapper `#id-dropdown` (`.custom-select-trigger` + `.custom-select-menu`
  con `li[role=option][data-value]`). Cero `<select>` nativos.
- `initCustomSelect(wrapId, onChange)` — SIEMPRE pasar callback
  (`filtrarItems` o `nexusValidarFormMods`); sin callback no filtra.
- Menú con fondo OPACO (`#0d1322`), nunca transparente.
- Al hacer `innerHTML` dinámico (personas, f-extra-*), reconstruir los
  `<li>` y llamar a las funciones `nexusSync*Menu` — los listeners son
  por delegación y sobreviven rebuilds.
- Valores canónicos de filtros: `todos`, `cualquiera`, `ninguno`,
  `solo:{key}`, `all`, `nota:{key}`, `recientes`, `puntuacion`, etc.
  NO usar `deseado`/`recent` (no existen en la lógica).
- `estadoEmision` se compara con `nexusEmisionMatch()` (mapa canónico
  ES/EN: airing/finished/hiatus/upcoming) — nunca `.includes()` directo.
- `resetFiltros` debe sincronizar labels de TODOS los custom-selects.
- Panel se cierra con pointerdown fuera (mismo listener global).

---

## Flujo 4 — Grid / tarjetas de ítems

**Archivos:** `renderGrid`, template de tarjeta (~línea 4300),
`nexusItemPersonas`, `nexusPersonaDot`, `abrirModal`.

Reglas:

- Un solo contenedor de superficie por tarjeta; chips/badges internos
  SIN borde propio (pastillas `border-radius:999px`, fondo tintado).
- 3 niveles de peso: título `font-weight:600-700` + `--text-primary`;
  chips operativos 500 con acento solo si activos; metadatos 400
  `--text-muted`.
- Personas: badges con `nexusPersonaDot(p,13)` + label;
  candado `i-lock` cuando `p.mine && it['privado'+p.suffix]===true`;
  deseado = dots de personas.
- Orden determinista: criterio elegido + desempate por `id`.
- `nexusRebuildPersonas` escanea TODOS los items (no muestrear).
- Migración pendiente: `onclick` inline → `data-item-id`/`data-action`
  + delegación en contenedor.

---

## Flujo 5 — Modal de detalle + acciones

**Archivos:** `abrirModal`, `cerrarModal`, secciones por categoría,
share/send panels, mods.

Reglas:

- `currentItemId`/`currentCategory` = fuente de verdad del contexto.
- Toda mutación (estado, nota, deseado, privacidad, mod, capítulo):
  upsert backend → actualizar `itemsByCategory` + `localStorage` →
  refrescar SOLO lo necesario (modal si aplica + `filtrarItems()` para grid).
- `nexusSyncShareUI(it)` requiere el ITEM REAL (con campos
  `estado{Suf}`/`username{Suf}`) — nunca `{id}` solo.
- Acordeones de updates/ediciones/reseñas: estado abierto persistente
  por categoría donde aplique.
- `history.pushState` solo al abrir/cerrar modal real; `popstate`
  cierra en cascada modal → papelera → match → menú → filtros → búsqueda.

---

## Flujo 6 — Compartir / privacidad / vínculos

**Archivos:** `toggleSharePanel`, `renderSharePanel`,
`guardarSharePanel`, `toggleSendPanel`, `nexusSendItem`,
`nexusFetchMyPrivacy`, `nexusTrackingUpsert`.

Reglas:

- `guardarSharePanel`: tras upsert, actualizar en `itemsByCategory`
  `is_private`, `shared_with` y `privado{MiSufijo}` + persistir
  `media_lib_{CACHE_VERSION}_{cat}` en localStorage — ANTES de
  `nexusSyncShareUI(realIt)`.
- Datos privados se excluyen en TODA superficie: stats, match, listas,
  badges, exports (`visible{Suf}===false`, `is_private`, `shared_with`).
- Secciones de personas ajenas (`!p.mine`): solo lectura
  (`is-remote`), sin controles de edición.
- Errores de red: `sp-empty` con `t('err.prefix')` + mensaje, sin romper UI.

---

## Flujo 7 — i18n / idioma / tema

**Archivos:** `STR.es`/`STR.en`, `t()`, `tf()`, `metaTr()`,
`applyStaticI18n`, `cambiarIdioma`.

Reglas:

- Paridad de claves ES=EN (hoy 349/349, 0 duplicados — mantener).
- `cambiarIdioma` recarga la página → los labels dinámicos se
  regeneran solos; no hardcodear textos en plantillas JS.
- Metadata de APIs (géneros, estados, plataformas) → `metaTr`, no al dict.
- `toLocaleString`/`toLocaleDateString` con locale dinámico.
- Tema claro/oscuro solo vía tokens `var(--*)`; hex hardcodeado solo
  con alpha (`color+'22'`) o paletas semánticas de datos.

---

## Flujo 8 — Motion / animaciones

**Tokens:** `--t-fast:150ms`, `--t-base:220ms`, `--ease-out:
cubic-bezier(0.22,1,0.36,1)` (spring suave estándar del proyecto).

Reglas:

- Microinteracciones hover/tap: 140–180ms. Paneles/barras/acordeones:
  200–260ms.
- Animar `transform`/`opacity` preferentemente; `width`/`flex-basis`
  solo para colapsos de barra con transición suave.
- `:active { transform: scale(0.94) }` en botones circulares/icon-btn.
- Todo bloque nuevo de animación respeta `prefers-reduced-motion`.
- Nada de animaciones en scroll-loop ni propiedades que fuercen layout
  cada frame (top/left/width continuos).

---

## Checklist rápido por flujo (antes de cerrar)

- [ ] ¿Toca barra/búsqueda? → reglas Flujo 1/2 (pointerdown, sin
      pushState extra, sin closers de scroll).
- [ ] ¿Toca filtros/selects? → Flujo 3 (custom-select + sync menus +
      `nexusEmisionMatch`).
- [ ] ¿Toca tarjetas/grid? → Flujo 4 (un borde, 3 niveles de peso,
      personas/dots/candado).
- [ ] ¿Toca mutación de datos? → estado único: backend → memoria →
      localStorage → UI (Flujo 5/6).
- [ ] ¿Texto nuevo? → `t()`/`tf()` en AMBOS idiomas.
- [ ] ¿Animación nueva? → tokens `--t-*`/`--ease-out` + reduced-motion.
- [ ] ¿SW cachea assets? → bump `CACHE_NAME` en service-worker.js.
