# Guía de Diseño Web y Estándares UI/UX — NexusLib

Este documento establece los lineamientos oficiales de diseño, arquitectura frontend, interacción, accesibilidad y mantenimiento para **NexusLib** (PWA con soporte i18n ES/EN, caché local con TTL + *stale-while-revalidate*, filtros dinámicos, acordeones, modales y sincronización con Supabase).

---

## 1. Principios Fundamentales de Diseño

1. **Claridad estructural y un solo borde por superficie:**
   - Todo contenedor interactivo (barra de búsqueda, tarjetas de ítems, modales, paneles de filtros) define su contorno en el elemento padre.
   - Nunca agregues bordes independientes a inputs, botones o chips internos si el contenedor padre ya posee un borde visible.
2. **Jerarquía visual basada en peso, no en ruido:**
   - Diferencia la importancia de la información mediante tamaño tipográfico, peso (`font-weight`), espaciado (`gap`) y contraste de color antes que añadiendo recuadros, sombras pesadas o colores saturados en cada elemento.
3. **Coherencia en temas y tokens CSS:**
   - Utiliza siempre variables CSS (`--bg-surface`, `--border-color`, `--text-primary`, `--text-muted`, etc.) para que tanto el modo claro como el modo oscuro respondan de manera uniforme sin valores de color hardcodeados.
4. **Estado único de verdad:**
   - Toda modificación de datos (privacidad, estado, emisión, vínculos, eliminación) debe actualizar primero el estado en memoria (`itemsByCategory`) y la persistencia local (`localStorage`), y luego reflejarse en la interfaz sin requerir recarga de página.

---

## 2. Layout, Bordes y Geometría

* **`box-sizing: border-box` universal:** Aplica `box-sizing: border-box` en todos los componentes para evitar desbordes inesperados al combinar `padding`, `border` y anchos flexibles.
* **Control de espaciado con `gap`:** Usa `display: flex` o `display: grid` con `gap` explícito en lugar de márgenes asimétricos entre hermanos (`margin-left` / `margin-right` condicionales).
* **Prevención de recortes de foco (`outline`):** Evita `overflow: hidden` permanente en contenedores donde existan elementos enfocables que necesiten mostrar `:focus-visible`, o compénsalo usando `outline-offset` interno o anillo `box-shadow` controlado en el contenedor padre.

```css
/* Patrón base de contenedor limpio sin doble borde */
.nexus-surface-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 1.5px solid var(--border-color);
  border-radius: 14px;
  background: var(--bg-surface);
  box-sizing: border-box;
  transition: border-color 180ms ease, box-shadow 180ms ease;
}

.nexus-surface-bar:focus-within {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px var(--accent-ring);
}

.nexus-surface-bar input,
.nexus-surface-bar button {
  border: none;
  background: transparent;
  outline: none;
}
```

---

## 3. Animaciones y Microinteracciones

* **Propiedades ligeras:** Prioriza animar `transform` (`scale`, `translateX`, `translateY`) y `opacity`. Cuando necesites colapsar botones laterales en una barra flexible, acompaña `opacity` y `transform` con `width` / `flex-basis` y `padding: 0` usando una curva suave como `cubic-bezier(0.22, 1, 0.36, 1)`.
* **Duraciones breves y predecibles:**
  - Microinteracciones de hover/tap: `140ms – 180ms`.
  - Transiciones de estado de barra, paneles o acordeones: `200ms – 260ms`.
* **Respeto a `prefers-reduced-motion`:** Incluye siempre la regla de accesibilidad para desactivar o minimizar transiciones cuando el usuario lo solicite en su sistema operativo.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 4. Barra de Búsqueda Superior y Navegación

1. **Activación limpia:**
   - Al enfocar el campo de búsqueda o pulsar el botón de búsqueda, activa una única clase de estado (por ejemplo `.is-searching`) en el contenedor padre para ocultar suavemente los iconos secundarios (hamburguesa y filtro) y dar protagonismo al campo de texto.
2. **Cierre al tocar o hacer clic fuera:**
   - Usa un único listener `pointerdown` sobre `document` comprobando `!searchBar.contains(event.target)` (más soporte para la tecla `Escape`) para desactivar `.is-searching` y restaurar los iconos laterales.
   - **Prohibido cerrar la búsqueda por eventos `scroll` o `touchmove`** con umbrales arbitrarios, ya que interrumpe el desplazamiento natural del usuario por los resultados en móvil.
3. **Gestión limpia del historial (`history`):**
   - No ejecutes `history.pushState(...)` cada vez que se enfoca un input de búsqueda; reserva `pushState` únicamente para vistas/modales reales que requieran navegación con el botón "Atrás" y mantén sincronizado `popstate`.

---

## 5. Organización y Jerarquía Visual de Ítems

### 5.1. Escala de Peso Visual en Tarjetas
Cada ítem de biblioteca debe organizarse en tres niveles claros de lectura:

| Nivel | Contenido | Tratamiento Visual |
| :--- | :--- | :--- |
| **Nivel 1 (Alto peso)** | Título principal + identificador o progreso clave | `font-weight: 600–700`, color `--text-primary`, lectura inmediata sin truncamiento agresivo. |
| **Nivel 2 (Peso medio)** | Estado del ítem, privacidad (`is_private` / candado `i-lock`) o vínculo/persona | Pastillas/chips compactos (`border-radius: 999px`) sin borde propio, acento sutil solo si el estado es activo o privado. |
| **Nivel 3 (Peso bajo)** | Metadatos auxiliares (`estadoEmision`, categoría, etiquetas secundarias) | `font-weight: 400`, tamaño reducido (`0.78rem–0.82rem`), color `--text-muted`. |

### 5.2. Coincidencia Semántica y Normalización
* **Normalización de texto:** Convierte a minúsculas, elimina diacríticos (`NFD`) y colapsa espacios antes de comparar cadenas en búsqueda o agrupación.
* **Valores canónicos de `estadoEmision`:** Mapea variantes en distintos idiomas (ej. `"Airing"`, `"En emisión"`, `"Ongoing"`, `"Finished"`, `"Finalizado"`) a claves canónicos internos antes de filtrar en `Peliculas_Series` y `Mangas`.
* **Agrupación uniforme:** Al agrupar ítems por estado, emisión, privacidad o persona/vínculo, utiliza cabeceras de grupo ligeras (título + contador) y conserva exactamente la misma cuadrícula y diseño de tarjeta debajo.

---

## 6. Seguridad, Accesibilidad e Internacionalización (i18n)

1. **Delegación de eventos en lugar de `onclick` inline:**
   - No interpoles IDs, títulos ni strings dinámicos dentro de atributos `onclick="..."` en plantillas HTML.
   - Usa atributos `data-item-id` y `data-action` en el marcado y gestiona las interacciones mediante delegación de eventos en el contenedor padre.
2. **Accesibilidad móvil y zoom:**
   - No bloquees el zoom del usuario en `<meta name="viewport">` (evita `user-scalable=no` y `maximum-scale=1.0`). Para evitar el auto-zoom indeseado en iOS al enfocar inputs, asegúrate de que los campos de texto tengan `font-size: 16px` en pantallas móviles.
   - Garantiza áreas táctiles cómodas (`min-width: 36px; min-height: 36px` o `44px` en acciones principales móviles).
3. **Integridad de i18n (`STR.es` / `STR.en`):**
   - Mantén cero claves duplicadas en los objetos de traducción y extrae cualquier texto visible hardcodeado en JavaScript hacia el diccionario de idiomas.

---

## 7. Checklist de Revisión antes de Cada Cambio

- [ ] ¿El componente tiene un único borde contenedor y evita líneas superpuestas internas?
- [ ] ¿La barra de búsqueda cierra limpiamente al tocar afuera (`pointerdown`) y con `Escape` sin afectar el scroll?
- [ ] ¿Los ítems respetan los 3 niveles de peso visual y usan `data-*` + delegación de eventos?
- [ ] ¿Los cambios de estado o privacidad actualizan `itemsByCategory` y `localStorage` inmediatamente?
- [ ] ¿Funciona correctamente en tema claro/oscuro, móvil/escritorio y con `prefers-reduced-motion`?