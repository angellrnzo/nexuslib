# Manual Técnico: Coincidencia de Elementos Comunes y Organización de Ítems en NexusLib

Este manual está diseñado para guiar el diseño, la implementación y la refactorización de la **organización de ítems** en **NexusLib** mediante la **coincidencia de elementos comunes**, manteniendo
intacta la uniformidad visual, los tokens de diseño, la accesibilidad y los flujos de datos actuales (grid, chips, estados, privacidad, vínculos, filtros, acordeones, papelera y sincronización con
Supabase).

---

## 1. Principios Rectores de Uniformidad

Antes de agrupar, ordenar o renderizar ítems, todo componente debe respetar estas reglas base:

1. **Un solo contenedor de superficie por ítem:** Cada tarjeta o fila de ítem usa un único contenedor principal con los tokens de superficie, borde y radio existentes. Evita bordes múltiples anidados
  dentro del mismo ítem.
2. **Coincidencia semántica antes que visual:** Dos ítems pertenecen al mismo grupo o coinciden en un filtro/índice cuando comparten un **valor canónico normalizado** (estado, estado de emisión,
  persona/vínculo, categoría o nivel de privacidad), no por coincidencia casual de mayúsculas, espacios o idiomas distintos.
3. **Preservación de la voz y estética del sistema:** Los chips, badges, acordeones, separadores y modales deben reutilizar los estilos y clases ya establecidos en NexusLib, evitando introducir
  patrones visuales desconectados.
4. **Estado único de verdad:** Toda mutación sobre un ítem (estado, emisión, privacidad `is_private` / `shared_with` / `privado{Sufijo}`, vínculos/personas o eliminación a papelera) debe actualizar
  primero el modelo en memoria (`itemsByCategory`) y la persistencia (`localStorage` / caché / Supabase), y luego reflejarse en la UI.

---

## 2. Taxonomía de Elementos Comunes entre Ítems

Para organizar ítems sin romper la uniformidad, clasifica los atributos compartidos en cinco dimensiones:

### 2.1. Dimensión de Identidad y Categoría
* **Identificador (`id`):** Clave única del ítem dentro de su categoría o colección.
* **Categoría (`category` / `currentCategory`):** Ej. `Peliculas_Series`, `Mangas`, libros u otras colecciones soportadas.
* **Título y subtítulo/metadato principal:** Nombre del ítem y dato identificativo rápido (año, autor, volumen, episodio o progreso).

### 2.2. Dimensión de Estado y Progreso
* **Estado del ítem:** Valores de seguimiento (ej. completado, en proceso, pendiente/deseado, pausado, abandonado).
* **Estado de emisión (`estadoEmision`):** Especialmente relevante en `Peliculas_Series` y `Mangas` (ej. en emisión, finalizado, hiato/pausado, próximo).
* **Coincidencia común:** Permite agrupar o filtrar ítems que comparten el mismo momento de consumo o publicación.

### 2.3. Dimensión de Privacidad y Compartición
* **Indicadores de privacidad:** `is_private`, `privado{Sufijo}` y lista de compartidos (`shared_with`).
* **Coincidencia común:** Agrupa o destaca ítems privados, compartidos con personas específicas o públicos/locales, manteniendo el mismo chip o icono de candado (`i-lock`) de forma consistente.

### 2.4. Dimensión de Personas y Vínculos
* **Personas / vínculos asociados:** Colaboradores, amigos, parejas, creadores o vínculos registrados en el sistema.
* **Coincidencia común:** Permite filtrar o agrupar ítems que comparten una misma persona o vínculo, asegurando que el índice de personas (`nexusRebuildPersonas()`) considere todos los ítems
  relevantes y no solo los primeros elementos de cada arreglo.

### 2.5. Dimensión de Búsqueda y Texto
* **Campos buscables:** Título, etiquetas/géneros, estado, persona/vínculo o notas clave.
* **Coincidencia común:** Normalización de texto (minúsculas, sin acentos/diacríticos, `trim()`) para que búsquedas parciales coincidan de forma predecible.

---

## 3. Normalización y Coincidencia de Elementos Comunes

### 3.1. Normalización de Texto
Antes de comparar cadenas para búsqueda, agrupación o filtros:
* Convertir a minúsculas (`String(val || '').toLowerCase()`).
* Recortar espacios extremos y colapsar espacios múltiples (`replace(/\s+/g, ' ').trim()`).
* Normalizar caracteres acentuados si se requiere búsqueda tolerante (`NFD` + eliminación de marcas diacríticas), conservando el texto original intacto para mostrar en pantalla.

### 3.2. Normalización Canónica de Estados y `estadoEmision`
En categorías como `Peliculas_Series` y `Mangas`, los valores pueden provenir de distintas fuentes o idiomas (por ejemplo `"Airing"`, `"En emisión"`, `"Ongoing"`, `"Finished"`, `"Finalizado"`).

* **Regla:** Definir un mapa canónico de equivalencias que traduzca cualquier variante conocida a una clave interna estándar (ej. `airing`, `finished`, `hiatus`, `upcoming`) y, a su vez, resuelva la
  etiqueta visible según el idioma activo (`STR.es` / `STR.en`).
* **Beneficio:** El filtro por `estadoEmision` y las agrupaciones por estado coincidirán de forma fiable sin depender de `.includes()` sensibles al idioma o formato.

### 3.3. Coincidencia por Persona / Vínculo
* Extraer todas las referencias a personas o vínculos de cada ítem de forma uniforme.
* Normalizar el identificador/nombre de la persona o vínculo para evitar duplicados por mayúsculas o espacios.
* Al construir o actualizar el índice de personas, recorrer de forma íntegra o incremental los ítems de las categorías para no omitir coincidencias más allá de los primeros elementos.

### 3.4. Coincidencia por Privacidad
* Evaluar de manera centralizada si un ítem es privado o compartido (`is_private`, `privado{Sufijo}`, `shared_with.length > 0`).
* Usar esa misma función auxiliar tanto para mostrar el indicador visual (candado/chip) como para filtrar o agrupar por privacidad.

---

## 4. Patrones de Organización Uniforme en la Interfaz

### 4.1. Estructura Interna Estándar de Cada Ítem
Mantén una anatomía coherente en cada tarjeta o fila de ítem:
1. **Cabecera del ítem:** Título principal + acción rápida o indicador clave.
2. **Cuerpo / Metadatos comunes:** Chips de estado, `estadoEmision`, privacidad/vínculo o progreso, usando los mismos estilos de pastilla y tipografía secundaria.
3. **Pie / Acciones:** Controles secundarios o de gestión consistentes en todas las tarjetas de la misma vista.

### 4.2. Modos de Organización sin Romper el Layout
* **Vista plana (Grid / Lista estándar):** Todos los ítems comparten exactamente las mismas dimensiones y distribución. Ideal cuando no hay agrupación activa.
* **Vista agrupada por elemento común:** Cuando el usuario agrupa por estado, `estadoEmision`, persona/vínculo o privacidad:
  * Inserta una cabecera de grupo uniforme (con el nombre normalizado del grupo y el contador de ítems coincidentes).
  * Renderiza debajo la **misma cuadrícula o lista** de ítems que en la vista plana, evitando cambiar el diseño de la tarjeta dentro de cada grupo.
* **Vista filtrada:** Muestra únicamente los ítems que cumplen todas las condiciones activas (búsqueda + filtros de categoría/estado/emisión/persona/privacidad), manteniendo el orden coherente con el
  criterio seleccionado.

### 4.3. Criterios de Ordenación Coherentes
* Define un orden determinista (por ejemplo: orden manual/posición, fecha de actualización, título alfabético o prioridad/estado) con desempate estable por `id`.
* Evita que al alternar filtros o refrescar un ítem cambie el orden de los demás elementos de forma inesperada.

---

## 5. Vistas sin Bordes Extraños y Acentuación por Importancia y Peso

Para evitar ruido visual, dobles líneas o recuadros innecesarios, la vista debe apoyarse en **superficies, espaciado (`gap`), tipografía y peso** antes que en bordes.

### 5.1. Reglas para Eliminar Bordes Extraños
1. **Un solo borde por superficie contenedora:** Solo el contenedor principal del ítem (si la estética base usa borde) o su superficie de fondo define el contorno. Nunca coloques bordes adicionales en
  chips secundarios, filas internas o wrappers de texto si ya existe un borde padre.
2. **Separación por aire (`gap`) y superficie en vez de líneas:** Usa `gap` entre chips y metadatos en lugar de `border-right` o `border-bottom` que fragmentan la tarjeta en cuadrículas accidentales.
3. **Bordes solo con propósito funcional o de énfasis:** Reserva un borde destacado únicamente para estados activos, selección, foco de teclado (`:focus-visible`) o privacidad/urgencia cuando
  realmente aporte señal.
4. **Cuidado en `box-sizing` y `overflow`:** Usa `box-sizing: border-box` en todos los elementos y evita `overflow: hidden` agresivo que recorte anillos de foco (`outline`) o sombras sutiles.

### 5.2. Jerarquía de Acentuación por Importancia y Peso Visual
Cada ítem o grupo debe comunicar qué importa primero sin saturar la pantalla con colores llamativos simultáneos:

* **Nivel 1 — Máxima importancia (Título / Identificador principal):**
  * Mayor peso tipográfico (`font-weight: 600` o `700`), color de texto principal (`--text-primary`) y prioridad de lectura inmediata.
* **Nivel 2 — Importancia operativa / Estado clave (Estado, `estadoEmision`, Privacidad/Vínculo):**
  * Peso medio (`font-weight: 500`), tamaño ligeramente menor y acento sutil (tinte suave de superficie o icono claro como candado/vínculo) solo cuando el estado es relevante o activo (por ejemplo,
    privado/compartido o en emisión).
* **Nivel 3 — Peso secundario / Contexto (Metadatos auxiliares, fecha, contador, etiquetas):**
  * Peso normal (`font-weight: 400`), tono atenuado (`--text-muted`) y menor contraste para que no compitan con el título ni con los estados activos.

### 5.3. Oportunidades Concretas de Mejora UI/UX
1. **Evitar exceso de chips por tarjeta:** Limita los chips visibles en cada ítem a los más útiles (p. ej. estado + privacidad/vínculo) y envía detalles secundarios al modal/detalle o a filtros,
  reduciendo el "efecto etiqueta".
2. **Diferenciar estado activo vs. estado neutro:** Si casi todos los ítems tienen el mismo estado neutro, darle un color fuerte a todos anula el acento; deja el color/acento para lo que destaque o
  esté activo, y mantén lo neutro sobrio.
3. **Soporte claro de `:focus-visible` y accesibilidad táctil:** Asegura áreas táctiles cómodas (`min-height` / padding adecuado en móvil) y un indicador `:focus-visible` visible que no sea recortado
  por el contenedor.
4. **Cabeceras de grupo ligeras:** Al agrupar por elemento común (persona/vínculo, estado o privacidad), usa una cabecera limpia con título, peso semibold y contador discreto, sin encerrar cada grupo
  en cajas pesadas dobles.

---

## 6. Muestras de Código de Referencia (CSS y JS)

### 6.1. Vista de Ítems sin Bordes Extraños y con Peso Escalonado (CSS)

```css
.nexus-item-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--border-color, rgba(148, 163, 184, 0.25));
  background: var(--bg-surface, #ffffff);
  box-sizing: border-box;
  transition: border-color 180ms ease, background-color 180ms ease, transform 180ms ease;
}

.nexus-item-card:hover {
  border-color: var(--border-hover, rgba(99, 102, 241, 0.45));
}

.nexus-item-card:focus-within {
  outline: 2px solid var(--accent-color, #4f46e5);
  outline-offset: 2px;
}

/* Énfasis opcional por importancia (ej. ítem privado o destacado) sin bordes dobles */
.nexus-item-card[data-weight="high"] {
  border-color: var(--accent-subtle-border, rgba(79, 70, 229, 0.5));
}

.nexus-item-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

/* Peso 1: Título principal */
.nexus-item-title {
  margin: 0;
  font-size: 0.96rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--text-primary, #0f172a);
}

/* Peso 2: Metadatos y chips sin bordes internos redundantes */
.nexus-item-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.nexus-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.35;
  background: var(--chip-bg, rgba(148, 163, 184, 0.14));
  color: var(--chip-text, #334155);
  border: none; /* Sin borde extra dentro del ítem */
}

.nexus-chip--accent {
  background: var(--chip-accent-bg, rgba(79, 70, 229, 0.14));
  color: var(--chip-accent-text, #4338ca);
}

/* Peso 3: Contexto secundario discreto */
.nexus-item-sub {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--text-muted, #64748b);
}

/* Cabecera de grupo uniforme al organizar por elemento común */
.nexus-group-header {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 2px;
  margin-top: 8px;
  background: transparent;
  border: none;
}

.nexus-group-title {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--text-primary, #0f172a);
}

.nexus-group-count {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted, #64748b);
}

@media (prefers-reduced-motion: reduce) {
  .nexus-item-card {
    transition: none;
  }
}
```

### 6.2. Normalización, Coincidencia Común y Delegación de Eventos (JS)

```javascript
// 1. Normalización de texto y valores canónicos de emisión
function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const MAPA_EMISION = {
  'en emision': 'airing',
  'emision': 'airing',
  'airing': 'airing',
  'ongoing': 'airing',
  'finalizado': 'finished',
  'finished': 'finished',
  'completed': 'finished',
  'hiato': 'hiatus',
  'pausado': 'hiatus',
  'hiatus': 'hiatus',
  'proximo': 'upcoming',
  'upcoming': 'upcoming',
};

function canonicalizarEstadoEmision(valor) {
  const clave = normalizarTexto(valor);
  return MAPA_EMISION[clave] || clave || '';
}

// 2. Evaluación centralizada de privacidad / compartición
function esItemPrivadoOCompartido(item) {
  const tieneFlagPrivado = Boolean(item && item.is_private);
  const tieneCompartidos = Boolean(item && Array.isArray(item.shared_with) && item.shared_with.length > 0);
  const tieneFlagSufijo = Boolean(
    item && Object.keys(item).some((k) => k.startsWith('privado') && Boolean(item[k]))
  );
  return tieneFlagPrivado || tieneCompartidos || tieneFlagSufijo;
}

// 3. Agrupación por elemento común ('none' | 'estado' | 'emision' | 'privacidad' | 'persona')
function agruparItemsPorElementoComun(items, criterio = 'none', obtenerClaveGrupo) {
  if (!Array.isArray(items) || criterio === 'none') {
    return [{ key: 'all', label: null, items: items || [] }];
  }

  const gruposMap = new Map();

  for (const item of items) {
    const grupo = obtenerClaveGrupo(item, criterio) || { key: 'sin-dato', label: 'Sin especificar' };
    if (!gruposMap.has(grupo.key)) {
      gruposMap.set(grupo.key, { key: grupo.key, label: grupo.label, items: [] });
    }
    gruposMap.get(grupo.key).items.push(item);
  }

  return Array.from(gruposMap.values());
}

// 4. Delegación de eventos en el contenedor padre de ítems
function inicializarDelegacionItems(contenedorEl, handlers = {}) {
  if (!contenedorEl) return;

  contenedorEl.addEventListener('click', (event) => {
    const accionEl = event.target.closest('[data-action]');
    const tarjetaEl = event.target.closest('[data-item-id]');
    if (!tarjetaEl) return;

    const itemId = tarjetaEl.dataset.itemId;
    const action = accionEl ? accionEl.dataset.action : 'open';

    if (typeof handlers[action] === 'function') {
      handlers[action](itemId, event, tarjetaEl);
    } else if (typeof handlers.onSelect === 'function') {
      handlers.onSelect(itemId, action, event, tarjetaEl);
    }
  });
}
```

---

## 7. Checklist Práctico de Implementación para el Agente

1. **Crear utilidades de normalización:** Funciones puras para normalizar texto, mapear `estadoEmision` a valores canónicos, resolver estado de privacidad y extraer personas/vínculos.
2. **Unificar criterios de coincidencia:** Usar las mismas funciones de normalización en búsqueda, filtros (`filtrarItems()`), agrupación y construcción del índice de personas
  (`nexusRebuildPersonas()`).
3. **Estandarizar plantillas de ítems:** Asegurar un único contenedor por ítem, chips uniformes sin bordes internos redundantes y atributos `data-item-id` / `data-action` con delegación de eventos en
  el contenedor.
4. **Aplicar peso visual escalonado:** Diferenciar título principal, chips operativos/activos y metadatos secundarios sin saturar ni usar recuadros dobles.
5. **Garantizar sincronización completa:** Al modificar privacidad, compartir o propiedades de un ítem, actualizar `itemsByCategory` y `localStorage` antes de refrescar la UI.
6. **Validar casos borde:** Ítems sin `estadoEmision`, sin personas/vínculos, títulos con comillas o acentos, filtros sin resultados, `:focus-visible`, `prefers-reduced-motion` y cambio de idioma
  (`ES`/`EN`) o tema.