# Instrucciones de Desarrollo y UI/UX — NexusLib

Actúa como ingeniero frontend senior trabajando sobre **NexusLib** (PWA con soporte i18n ES/EN, caché con TTL + `stale-while-revalidate`, filtrado dinámico por persona, lightbox, acordeones y flujos con Supabase).

---

## 1. Reglas de Interfaz, Bordes y Animaciones

1. **Un solo borde por superficie (sin bordes superpuestos):**
   - Nunca coloques bordes propios en botones o inputs anidados dentro de un contenedor que ya tiene borde (por ejemplo, `.search-header-bar` o tarjetas de ítems).
   - El borde exterior vive únicamente en el contenedor padre con `box-sizing: border-box` y `gap` controlado.
2. **Barra de búsqueda superior y navegación (`#inputAgregar` / `.search-header-bar`):**
   - Al entrar en modo búsqueda, oculta los botones laterales (hamburguesa y filtro) mediante transiciones suaves (`opacity`, `transform`, `width` / `flex-basis`) con `cubic-bezier(0.22, 1, 0.36, 1)` y soporte `@media (prefers-reduced-motion: reduce)`.
   - **Cierre limpio al tocar afuera:** usa un único listener `pointerdown` en `document` verificando `!searchBar.contains(event.target)` (y tecla `Escape`) para salir del modo búsqueda y restaurar los botones laterales.
   - **No cierres el buscador por `scroll` o `touchmove`** con umbrales arbitrarios en móvil.
   - **No dispares `history.pushState` en cada `focus` de `#inputAgregar`**, ya que desincroniza `popstate` y obliga a dar múltiples toques en "Atrás".
3. **Organización uniforme y acentuación por peso visual en ítems:**
   - Mantén tarjetas uniformes con la misma familia de radios, espaciados y superficies (`--bg-surface`, `--border-color`), evitando cajas internas con bordes extraños.
   - Establece 3 niveles claros de jerarquía en cada ítem:
     1. **Nivel 1 (Alto peso):** Título principal + identificador o progreso clave.
     2. **Nivel 2 (Peso medio):** Chip de estado y privacidad (`is_private` / candado o vínculo) con estilo de pastilla consistente.
     3. **Nivel 3 (Peso bajo):** Metadatos secundarios (`estadoEmision`, categoría o vínculo) en tipografía compacta y tono atenuado.
   - **Normalización previa al filtrado/ordenamiento:** normaliza campos como `estadoEmision` (por ejemplo, mapeando variantes en inglés/español como `"Airing"` / `"En emisión"`) antes de comparar en `filtrarItems()` para `Peliculas_Series` y `Mangas`.

---

## 2. Reglas de Estado, Seguridad y Mantenimiento

1. **Sincronización inmediata de privacidad y estado:**
   - Al guardar cambios de privacidad en `guardarSharePanel`, actualiza de inmediato `is_private`, `shared_with` y el flag `privado{Sufijo}` tanto en `itemsByCategory[currentCategory]` como en `localStorage` antes de refrescar la UI (`nexusSyncShareUI`), para que el icono de candado (`i-lock`) se actualice sin recargar la página.
2. **Delegación de eventos y eliminación de `onclick` inline:**
   - Evita interpolar IDs o títulos dentro de atributos `onclick="..."` en plantillas HTML (`search-result-item`, `match-card`, `papelera-item`, tarjetas de grid). Usa atributos `data-id` / `data-action` y delegación de eventos en el contenedor padre.
3. **Cálculo completo de vínculos/personas:**
   - En `nexusRebuildPersonas()`, no limites la inspección a los primeros 3 elementos (`Math.min(arr.length, 3)`): recorre toda la colección disponible de cada categoría cargada para detectar todos los vínculos activos.
4. **i18n y accesibilidad:**
   - Elimina claves duplicadas en `STR.es` y `STR.en`, mueve cualquier texto fijo en español dentro del JS al diccionario i18n, y evita bloquear el zoom manual (`user-scalable=no`) en el `<meta name="viewport">`.

---

## 3. Protocolo Estricto ante Bucles o Fallos Repetidos

**Detente de inmediato y NO sigas aplicando parches a ciegas** si ocurre cualquiera de estas situaciones:
1. Repites el mismo cambio o una variación similar **2 veces** sin resolver el problema.
2. Un ajuste rompe otro comportamiento existente (por ejemplo: `history.pushState` / `popstate`, `itemsByCategory`, `is_private` / `shared_with`, `estadoEmision`, filtros, acordeones, modales o el service worker de la PWA).
3. El error de consola, estado o layout es ambiguo o no queda claro con el código disponible.

Cuando esto ocurra, **detén la edición**, resume brevemente qué intentaste y **pide al usuario exactamente los siguientes datos** para que los pase a su revisor:
1. **Acción y resultado:** qué flujo se ejecutó exactamente (ej. enfocar `#inputAgregar`, tocar fuera de la barra, guardar en `guardarSharePanel`, filtrar `Peliculas_Series`/`Mangas`), qué ocurrió y qué debía ocurrir.
2. **Código exacto involucrado:** las funciones, bloques HTML/CSS/JS o líneas exactas afectadas y el `git diff` corto del intento fallido.
3. **Estado en ejecución:** errores de consola o red, valores actuales de `itemsByCategory`, `currentCategory`, estado del historial (`history.state`) y diferencias entre vista previa y entorno local/PWA.
4. **Duda concreta a resolver:** la pregunta específica de lógica, CSS o arquitectura que debe validarse antes de volver a tocar el código.