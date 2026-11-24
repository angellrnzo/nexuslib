# NexusLib — DESIGN.md

> Design system de la PWA. Fuente de verdad visual para agentes e
> implementadores. Los valores reflejan `AppScript/Index.html` (v1 actual);
> los items marcados **[Phase 2]** son specs del roadmap, no implementados.
> Spec de motion completa: `AppScript/road.md` → Phase 2.

## 1. Producto y tono

- Biblioteca multimedia personal (películas/series, juegos, libros, manga)
- Audiencia: 2 usuarias principales (Angel, Talmai) + futura capa social
- Estilo: dark cinema — UI oscura tipo Steam/Netflix, acentos azul y rosa
- Idiomas: ES primario, EN vía Phase 2.5 (i18n)

## 2. Color

### Tokens (`:root`)

| Token | Valor | Uso |
| :--- | :--- | :--- |
| `--bg` | `#0b0e14` | Fondo base |
| `--panel` | `#1b2838` | Superficies (header gradiente) |
| `--accent` | `#66c0f4` | Azul primario — acciones, foco, badges |
| `--text` | `#c7d5e0` | Texto cuerpo |
| `--gold` | `#ffd700` | Estrellas, logros |
| `--border` | `rgba(255,255,255,0.1)` | Bordes sutiles |
| `--btn-primary` | `#66c0f4` | CTA principal |
| `--success` | `#5ba32b` | Confirmaciones |
| `--warning` | `#d6a918` | Avisos |
| `--danger` | `#c93b3b` | Errores/eliminar |
| `--wish` | `#ff4d6d` | Wishlist — rosa |
| `--angel-color` | `#66c0f4` | Identidad Angel (= accent) |
| `--talmai-color` | `#ff4d6d` | Identidad Talmai (= wish) |

### Reglas de color

- Fondos: `radial-gradient(circle at top left, #1b2838, #0b0e14 80%)` en body
- Acento funcional por semántica: `--wish` wishlist, `--gold` ratings,
  `--danger` destructivo, `--success` guardado
- Colores de usuaria (`--angel-color`/`--talmai-color`) solo en contextos
  sociales/match — nunca en UI genérica
- Overlays de modal: `rgba(6, 9, 14, 0.88)`; bordes de modal con tinte de
  accent `rgba(102,192,244,0.38)`

## 3. Tipografía

- **Familia única:** `'Inter', sans-serif` — todo el texto
- Escala en uso (px): 9 (badges mínimos), 10-11 (subtítulos, resultados),
  12-13 (body, inputs, títulos de card), 15-18 (botones, títulos modal),
  20 (stars), ~24+ (títulos destacados)
- Pesos: 700-900 para títulos/botones/tablas; 400 body
- `-webkit-font-smoothing: antialiased` global

## 4. Layout y espaciado

- Mobile-first PWA; `padding` de body con `env(safe-area-inset-*)` para
  notch/home indicator (Android Capacitor futuro)
- Grid de cards `#grid` con modo `poster-mode` (switch vista lista/poster)
- `max-width` en modales: 620px; `max-height: 90dvh` con scroll interno
- Touch: `touch-action: pan-y` (scroll vertical libre, sin zoom por gesto)
- `-webkit-tap-highlight-color: transparent` en todos los interactivos

## 5. Motion tokens

### Actual (implementado)

| Token | Valor | Uso |
| :--- | :--- | :--- |
| `--t-fast` | `150ms` | Hover/focus sutil |
| `--t-base` | `220ms` | Transiciones estándar (modal, toast) |
| `--t-slow` | `320ms` | Entradas/emphasis |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Salidas/entradas — default |
| `--ease-inout` | `cubic-bezier(0.4, 0, 0.2, 1)` | Movimientos bidireccionales |

### Patrones de animación actuales

- **Modal:** overlay `opacity 0→1` + `.modal-content` `translateY(10px)
  scale(0.985) → translateY(0) scale(1)` con `--t-base --ease-out`;
  scroll reseteado al abrir (Phase 1)
- **Toast:** `translateY` + opacity, clases `.success/.warning/.error`
  con borde coloreado
- **Tab active:** cambio de color + icono (`transition` en `.tab-btn`)

### [Phase 2] Planeado — no implementado

- `--ease-spring` (spring physics) para micro-interacciones de cards
- Skeleton shimmer en cargas (reemplaza spinner/spinner-text)
- Transiciones direccionales en navegación de modales
- Doble-tap corazón en posters
- Bottom sheet pattern para filtros/acciones
- Scroll-snap en carruseles; **lightbox** para screenshots (overlay in-app,
  flechas, ESC/cierra — nunca nueva ventana)

## 6. Componentes

### Cards (`#grid > .card`)

- `.card-content` padding 12px, layout column
- `.card-title` / `.card-dev` — título y metadatos truncados
- Estados: hover lift **[Phase 2]**, skeleton loading **[Phase 2]**

### Tabs (`.tab-btn`)

- Pills con icono SVG + label; `.active` con fondo accent
- Cambio de vista: `#grid.poster-mode` (lista ↔ póster)

### Botones

- `.btn-primary` — CTA (accent sólido)
- `.btn` genérico, `.btn-trailer` (toggle trailer — `.active` rojo
  `rgba(201,59,59,…)`), `.wish-toggle` (`.active` rosa `--wish`),
  `.filter-reset`, `.status-select`
- Todos: `border-radius`, `cursor:pointer`, sin tap-highlight

### Modal (`#modal`, `#modal-papelera`, `#modal-match`)

- 3 instancias comparten `.modal-content` (mismo patrón visual)
- Header: `.modal-header-grid` (img + info), modos `poster`/`landscape`
- `.modal-close` sticky top-right, círculo 36px
- Secciones internas con patrón `.trailer-box` reutilizable
  (reviews, updates, ediciones — ver specs Phase 3)

### Carrusel (`.carousel`)

- `display:flex; overflow-x:auto` — screenshots de películas
- Imágenes `flex: 0 0 75%; height:140px` — peek del siguiente item
- **[Phase 2]** scroll-snap + dots + lightbox viewer

### Rating (`.star`)

- 5 estrellas SVG/character, `.active` → `--gold`, inactivas `#333`
- Usado en filtros "Nota Mínima" por usuaria

### Badges / tags

- `.search-result-badge` — pill 10px, fondo `rgba(102,192,244,0.18)`,
  texto accent
- Estado de item: pills por `status` con colores semánticos

### Toast (`#toast-container`)

- Esquina, apilados; `.show` visible; variantes success/warning/error

### Iconografía

- **Sprite SVG inline** `<symbol id="i-*">` + `<svg class="ico"><use>`
- Tamaños: `.ico` 14px, `.ico-sm` 12px, `.ico-lg` 16px
- `.ico-fill` relleno sólido; modificadores `.ico-angel`, `.ico-talmai`,
  `.ico-gold`, `.ico-wish` para color semántico
- Trazos: `stroke-width:2`, `linecap/linejoin: round` — estilo outline plano

## 7. Responsive / PWA

- Viewport mobile; funciona en desktop con max-width implícito
- `manifest.json` + `service-worker.js` — instalable, offline read-only
  **[Phase 3]**
- Safe areas iOS/Android contempladas en padding
- **[Phase 6]** Capacitor: mismos safe-area insets + status bar styling

## 8. Accesibilidad y reglas duras

- Contraste: texto `#c7d5e0` sobre `#0b0e14` (~10:1) — cumple AA
- Foco visible en todos los interactivos (no `outline:none` sin reemplazo)
- `aria-*` en modales y controles (mejorar gradualmente — Phase 2)
- Sin emojis en UI — solo SVG del sprite
- `user-select:none` en estrellas/controles táctiles

## 9. Referencias externas

Skills de diseño instaladas en `.devin/skills/` del workspace:

- `impeccable` — auditoría de UI anti-"AI slop" (61 reglas + comandos
  critique/audit/polish; incluye refs `android.md`/`ios.md` para Phase 6)
- `animate`, `animation-vocabulary`, `animation-performance`,
  `review-animations`, `improve-animations`, `find-animation-opportunities`,
  `apple-design` (emilkowalski/skills) — guías de motion para Phase 2
