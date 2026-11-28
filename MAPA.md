# NexusLib — Mapa de index.html

Guía rápida para encontrar dónde está cada cosa en el código. Si quieres tocar un componente visual, busca su ID/clase aquí y vas directo al HTML/JS/CSS.

## Estructura general

`index.html` ~6.5K líneas:
- Líneas 1-1650: CSS (`<style>`)
- Líneas 1650-1850: HTML header/top
- Líneas 1850-2100: HTML filtros y controles
- Líneas 2100-2400: HTML grid de items
- Líneas 2400-2650: HTML vinculos (modal)
- Líneas 2650-2850: HTML perfil/stats
- Líneas 2850-3000: HTML modales generales
- Líneas 3000-3300: HTML modales específicos (Juegos, share, match)
- Líneas 3300-5400: JS setup y helpers
- Líneas 5400-5700: JS stats y modales
- Líneas 5700-6200: JS vinculos y sync

---

## 1. Header y navegación superior

**HTML:** líneas 1650-1780
- `#top-header` — contenedor principal
- `#logo` — texto "NexusLib"
- `#btn-toggle-filtros` — botón círculo para abrir/cerrar filtros
- `#btn-menu` — botón menú (perfil/ajustes)
- `#search-wrapper` — barra de búsqueda

**JS:**
- `filtrarItems()` — busca en `itemsByCategory` según texto
- `toggleFiltros()` — abre/cierra panel de filtros
- `nexusToggleMenu()` — abre/cierra menú lateral

**CSS:**
- `.top-header`, `.logo`, `.btn-circle`, `.search-wrapper`, `.search-input`

---

## 2. Panel de filtros

**HTML:** líneas 1780-1900
- `#panel-filtros` — contenedor del panel
- `#filter-personas` — filtros por persona (estado, nota mín, deseado)
- `.filter-grid-2` — categoría + orden
- `.filter-extras-grid` — solo deseados + orden inverso

**JS:**
- `nexusRenderFilterPersonas()` — genera filtros por persona
- `nexusCustomSelectWrap()` — crea dropdowns custom
- `filtrarItems()` — aplica todos los filtros

**CSS:**
- `#panel-filtros`, `.filter-group`, `.filter-grid-2`, `.custom-select`, `.custom-select-menu`

---

## 3. Barra de agregar items

**HTML:** líneas 1900-2000
- `#add-wrapper-box` — contenedor
- `#btn-add` — botón "Agregar"
- `#add-form` — formulario (desplegable)

**JS:**
- `toggleAddForm()` — abre/cierra formulario
- `agregarItem()` — valida y llama a RPC
- `nexusFetchMetadata()` — busca metadata de APIs

**CSS:**
- `#add-wrapper-box`, `.btn.add`, `.add-wrapper.expanded`, `.na-in` (inputs)

---

## 4. Grid de items (tarjetas)

**HTML:** líneas 2000-2250
- `#grid` — contenedor grid
- `.card` — cada tarjeta de item
- `.card-img`, `.card-title`, `.card-meta`, `.card-footer`

**JS:**
- `renderizarGrid()` — genera HTML del grid desde `itemsByCategory`
- `toggleMenu()` — menú contextual por tarjeta
- `nexusItemCardHTML()` — HTML de una tarjeta

**CSS:**
- `#grid`, `.card`, `.card-img`, `.card-title`, `.card-meta`, `.card-footer`, `.card-reading-labels`

---

## 5. Modales de item (Juegos: reseñas, updates, mods)

**HTML:** líneas 2250-2450
- `#modal` — modal genérico
- `#m-screenshots` — carrusel de capturas (con flechas)
- `.rev-bar5` — barra de reseñas Steam
- `.mods-list` — lista de mods tracker

**JS:**
- `abrirModalJuegos(it)` — abre modal de juego
- `nexusInitCarouselDots()` — inicializa carrusel capturas
- `renderizarModsTracker()` — renderiza mods

**CSS:**
- `#modal`, `.carousel-viewport`, `.carousel`, `.carousel-arrow`, `.rev-bar5`, `.mods-list`

---

## 6. Vinculos (modal de vinculación)

**HTML:** líneas 2450-2650
- `#modal-vinculos` — modal de vinculos
- `#vinc-codigo` — input de código propio
- `#vinc-list` — lista de vínculos aceptados
- `#vinc-requests` — solicitudes pendientes

**JS:**
- `abrirVinculosModal()` — abre modal
- `nexusMisVinculos()` — llama RPC `get_my_library_links`
- `nexusRequestLink()` — solicita vinculo
- `nexusRespondLink()` — acepta/rechaza

**CSS:**
- `#modal-vinculos`, `.sp-row`, `.sp-label`, `.sp-badge`

---

## 7. Perfil y estadísticas

**HTML:** líneas 2650-2850
- `#stats-view` — contenedor de stats
- `#stats-profile-card` — header del perfil (avatar, nombre, @username)
- `#stats-prof-buttons` — botones de persona (Todos, Angel, Talmai...)
- `#stats-cat-buttons` — botones de categoría (Todas, Juegos, Películas...)
- `#stats-cards-grid` — tarjetas de métricas

**JS:**
- `nexusRenderProfileHeader()` — renderiza header del perfil
- `nexusRenderStatsProfButtons()` — botones de persona
- `renderizarEstadisticas()` — genera tarjetas de stats
- `cambiarPerfilStats()` — cambia persona seleccionada
- `cambiarCategoriaStats()` — cambia categoría

**CSS:**
- `#stats-view`, `.stats-profile-card`, `.stats-prof-btn`, `.stats-cat-btn`, `.stats-cards-grid`, `.stat-card`, `.stat-accordion-content`, `.br-cols`, `.br-person`, `.nd-row`

---

## 8. Persona: dots, labels, normalización

**JS helpers (líneas 3270-3320):**
- `nexusPersonaDisplay(v)` — normaliza inicial a minúscula
- `nexusPersonaLabel(it, suf)` — nombre visible (username{Suf} > label > suffix)
- `nexusRebuildPersonas()` — reconstruye `_personas` desde items
- `nexusPersonaDot(p, size)` — HTML del dot de color
- `nexusItemPersonas(it)` — personas de un item concreto

**CSS:**
- `.ico` (iconos SVG), `.ico-sm`, `.ico-lg`, `.ico-gold`, `.ico-angel`, `.ico-talmai`

---

## 9. Modales generales

**HTML:** líneas 2850-3000
- `#modal-papelera` — confirmación borrar
- `#modal-match` — match de metadata
- `#modal-share` — compartir item

**JS:**
- `abrirPapeleraModal()` — papelera
- `abrirMatchModal()` — match
- `nexusSharePanel()` — compartir

**CSS:**
- `#modal`, `.modal-header`, `.modal-body`, `.modal-footer`

---

## 10. Iconos SVG (sprite)

**HTML:** líneas 1560-1620 (`<svg><symbol>`)
- `i-gamepad`, `i-film`, `i-book`, `i-manga` — categorías
- `i-star`, `i-star-half` — rating
- `i-trophy`, `i-target`, `i-check` — stats/retos
- `i-users`, `i-user` — personas
- `i-chevron-down`, `i-x`, `i-plus`, `i-trash` — controles

**Uso en JS:**
- `svgIcon(id, cls)` — genera `<svg class="ico..."><use href="#id"/></svg>`

---

## 11. Setup global JS

**JS (líneas 3300-3500):**
- `_personas` — array global de personas
- `PERSONA_PALETTE` — colores de persona
- `NEXUS_LANG` — idioma actual
- `CAT_CONFIG` — config de categorías
- `VINCULOS_BADGE_COLORS` — colores de badges de vinculo

---

## 12. Supabase client

**JS (líneas 3500-3700):**
- `sb` — cliente Supabase
- `_nexusUser` — usuario auth
- `_nexusProfile` — perfil (display_name, username)
- `_nexusLibId` — library_id actual

---

## 13. i18n (ES/EN)

**JS (líneas 3700-3900):**
- `STR.es` / `STR.en` — diccionarios
- `t(key)` — traduce
- `tf(key, obj)` — traduce con placeholders
- `applyStaticI18n()` — aplica traducciones a elementos estáticos

---

## 14. Modals y lightbox de capturas

**JS (líneas 5900-6100):**
- `openLightbox(srcs, idx)` — abre lightbox de imágenes
- `closeLightbox()` — cierra
- Navegación con flechas ←/→ y teclado

**CSS:**
- `#lightbox`, `.lightbox-img`, `.lightbox-arrow`

---

## 15. Service Worker (SW)

**JS (líneas 6200-6400):**
- Registro de SW
- Network-first para navegaciones
- Cache-first para assets estáticos

---

## Buscar rápido por ID/clase

| Componente | ID/Clase | Ubicación |
|---|---|---|
| Búsqueda | `#search-wrapper` | HTML ~1700 |
| Filtros | `#panel-filtros` | HTML ~1780 |
| Grid items | `#grid` | HTML ~2000 |
| Perfil | `#stats-profile-card` | HTML ~1790 |
| Stats cards | `#stats-cards-grid` | HTML ~1830 |
| Modal juego | `#modal` | HTML ~2250 |
| Carrusel capturas | `#m-screenshots` | HTML ~2300 |
| Vinculos | `#modal-vinculos` | HTML ~2450 |
| Botones persona | `#stats-prof-buttons` | HTML ~1820 |
| Botones categoría | `#stats-cat-buttons` | HTML ~1820 |

---

## Buscar rápido por función JS

| Función | Qué hace | Línea aprox |
|---|---|---|
| `renderizarGrid()` | Dibuja el grid de items | ~5400 |
| `filtrarItems()` | Filtra por búsqueda + filtros | ~5400 |
| `nexusRenderStatsProfButtons()` | Botones de persona | ~5380 |
| `renderizarEstadisticas()` | Tarjetas de stats | ~5410 |
| `nexusPersonaDisplay()` | Normaliza inicial minúscula | ~3270 |
| `nexusPersonaDot()` | HTML del dot de persona | ~3300 |
| `abrirModalJuegos()` | Abre modal de juego | ~5600 |
| `nexusInitCarouselDots()` | Carrusel de capturas | ~6040 |
| `svgIcon()` | Genera icono SVG | ~3680 |

---

## Buscar rápido por clase CSS

| Clase | Qué es | Línea aprox |
|---|---|---|
| `.card` | Tarjeta de item | ~800 |
| `.btn-circle` | Botón círculo (filtros/menu) | ~700 |
| `.custom-select` | Dropdown custom | ~348 |
| `.stats-prof-btn` | Botón de persona | ~760 |
| `.stat-card` | Tarjeta de stats | ~797 |
| `.carousel-arrow` | Flechas carrusel | ~1160 |
| `.ico` | Icono SVG base | ~94 |

---

Si no encuentras algo, usa `grep` en el archivo:

```bash
# Buscar por ID
grep -n "id=\"algo\"" index.html

# Buscar por clase
grep -n "class=\"algo\"" index.html

# Buscar por función JS
grep -n "function algo" index.html
```
