# NexusLib — Lista absoluta de verificación

Checklist E2E para la ronda de testeo previo al deploy `beta` → `main`.
Marcar cada punto: `[x]` pasa / `[!]` falla (anotar en notas) / `[-]` no aplica.

**Entorno de prueba:** preview local (`http://127.0.0.1:8080/index.html`) o `/dev` de Pages apuntando a `beta`. Modo Nexus (Supabase) — `NEXUS_MODE=true`.

**Preparación:**

- [ ] Hard-refresh (Ctrl+F5) o cerrar/reabrir pestaña — el SW sirve caché de la versión anterior
- [ ] Verificar en consola que no hay errores rojos al cargar
- [ ] Probar en **desktop + móvil real** (o DevTools responsive 360px)

---

## 1. Auth y sesión

- [ ] Overlay landing carga sin parpadeo ni contenido debajo
- [ ] Tab **Entrar**: login con email+password funciona
- [ ] Tab **Crear cuenta**: signup crea usuario (revisar email de confirmación si está activo)
- [ ] Magic link: `signUp`/`signIn` con enlace de email entra directo
- [ ] **Recuperar**: envía email, link abre form de nueva contraseña, `updateUser` funciona
- [ ] Recovery directo por URL (`#access_token&type=recovery`) muestra el form correcto
- [ ] Sesión persiste tras F5 y tras cerrar/reabrir la app
- [ ] **Cerrar sesión** desde Perfil funciona y vuelve al overlay
- [ ] Logout con pestaña abierta → acciones protegidas redirigen a login, no crashean

## 2. Biblioteca — CRUD por categoría

Repetir para **Juegos, Películas/Series, Libros, Mangas**:

- [ ] Grid carga items de `get_items_merged` sin errores de consola
- [ ] **Buscar**: filtra por título/dev/género/tag según placeholder de la categoría
- [ ] **Agregar**: búsqueda externa devuelve resultados con metadata correcta (ES por defecto)
- [ ] Agregar desde URL externa (Steam/TMDB/OpenLibrary/AniList) resuelve el item
- [ ] Agregar un item ya existente → mensaje amable, no duplica
- [ ] **Editar** título/descripción desde la ficha
- [ ] **Papelera**: mover a papelera, listar, restaurar, eliminar definitivo
- [ ] Papelera vacía muestra empty-state con botón Reintentar
- [ ] Scroll infinito / "cargar más" si aplica — no repite items ni se queda colgado
- [ ] Coleccionables: muestra "próximamente", no rompe el grid

## 3. Tracking por persona

- [ ] Acordeón de persona: avatar+color, chevron rota, borde/glow al abrir (una sola pieza)
- [ ] Estado (No jugado/En proceso/Completado) guarda y persiste tras F5
- [ ] Progreso (S2 E04 / capítulo X de Y) guarda en la persona correcta
- [ ] Estrellas de nota guardan; "Sin nota" muestra placeholder
- [ ] Deseado (corazón) toggle guarda
- [ ] Con **2+ personas**: cada acordeón independiente, filtros por persona funcionan
- [ ] Selector de persona en **Estadísticas** filtra todas las cards (sin repetir nombre si hay 1)
- [ ] Sección remota de vinculado: "Solo lectura", atenuada, `pointer-events:none`
- [ ] Item privado del vinculado → su sección **no aparece** (`visible{Persona}=false`)

## 4. Modal de item — ficha y paneles

- [ ] Modal abre con snap/dots + backdrop, cierra con X/Esc/backdrop
- [ ] **Ficha técnica**: labels correctos por categoría, valores metaTr (Modos/Tags/Demografía traducidos en EN)
- [ ] Géneros como chips traducibles; plataformas/estados con su color
- [ ] Botones externos (Ver en Steam/TMDB/AniList, SteamDB, JustWatch, Goodreads…) abren URL correcta — JustWatch con `/es/` o `/en/` según idioma
- [ ] Tráiler (Juegos): embed carga, botón Ver/Ocultar alterna
- [ ] **Mods** (Juegos): acordeón morado de una pieza, lista mods, agregar/borrar persiste
- [ ] **Updates** (Juegos): botón lazy carga historial Steam, fechas+links
- [ ] **Ediciones** (Libros): lazy load OpenLibrary, tags ES/EN, links de lectura
- [ ] **Reseñas** (Juegos): lazy load, % positivas, distribución 5 bloques, trend 30d
- [ ] Compartir… (sección propia): toggle 🔒 Privado + selector audiencia `shared_with`
- [ ] Enviar…: elegir vínculo → solicitud pendiente → badge notificaciones en header
- [ ] Match de Pareja: calcula matches correctos entre personas
- [ ] Stats-bar del modal: pills por persona correctas

## 5. Vínculos (social)

- [ ] Badge 🔔 con contador aparece con solicitudes pendientes
- [ ] Modal Vínculos: mi invite_code + botón copiar → "Código copiado."
- [ ] Enviar solicitud por código + `link_type` (amigo/pareja/familia/personalizado)
- [ ] Personalizado muestra input de etiqueta → `link_label` persiste
- [ ] Recibir solicitud → aceptar/rechazar → badge por tipo de vínculo
- [ ] Pendientes salientes listadas; historial de vinculados
- [ ] **Editor matriz ⚙** por persona: dirección Yo→/→Yo, categoría, 5 campos, guarda
- [ ] Dirección **Yo → X**: editable, checkboxes habilitados, Guardar funciona
- [ ] Dirección **X → yo**: **solo lectura** (checkboxes deshabilitados, sin botón Guardar, hint "Solo {n} puede cambiar…") — fix RLS 07
- [ ] Verificar en la otra cuenta que la matriz "Yo → X" que edité aquí aparece como "X → yo" con los mismos valores
- [ ] Elementos compartidos recibidos: aceptar (entra a MI biblioteca) / rechazar
- [ ] Reenviar item ya compartido no duplica; declinado permite reenvío
- [ ] Username único: intentar username repetido → "Ese usuario ya está en uso."

## 6. Estadísticas

- [ ] Card perfil: avatar, nombre, @username, email, Editar perfil (acordeón azul→morado)
- [ ] Editar display_name/username persiste; username único validado
- [ ] **Nota media otorgada**: 1 persona → sin nombre repetido; Todos → nombre por línea
- [ ] Barras Completados/En proceso/Wishlist respetan selector de persona
- [ ] **Balance y Retos**: ancho completo, 2 columnas, retos automáticos correctos
- [ ] **Próximos Estrenos**: wishlist + fecha ≤90d agrupados, sin-fecha aparte
- [ ] Stats en ES y EN (labels traducidos)

## 7. i18n ES ⇄ EN

- [ ] Toggle English/Español en menú hamburguesa → recarga → chrome en inglés
- [ ] `localStorage nexus_lang` persiste la elección tras F5
- [ ] Auth overlay completo en EN (tabs, placeholders, errores, éxito)
- [ ] Modales: títulos, botones, placeholders en EN
- [ ] Vínculos/share/send/visibilidad en EN
- [ ] Stats cards + papelera + match en EN
- [ ] Ficha técnica: labels EN + valores metadata traducidos (metaTr)
- [ ] Toasts y empty/error states en EN
- [ ] Metadata nueva con `lang=en` → géneros/descripciones en inglés (tras deploy de functions)
- [ ] **Review de traducciones EN**: anotar textos raros para ajustar dict `en`

## 8. Offline y PWA

- [ ] Modo offline (DevTools → Offline): banner "Sin conexión — modo solo lectura"
- [ ] Lectura de items cacheados funciona offline
- [ ] Escrituras offline → toast de error, no crash
- [ ] "Conexión restablecida" al volver online
- [ ] SW actualiza solo: bump de versión → toast/prompt de actualización si existe
- [ ] `manifest.json` + iconos correctos; instalable en Android
- [ ] Health check Edge Function responde

## 9. Responsive y micro-interacciones

- [ ] 360px: sin scroll horizontal, cards 1 columna, filtros usables
- [ ] Inputs ≥16px en móvil (sin auto-zoom iOS) — perfil, mods, tracking
- [ ] Modales → bottom-sheet en ≤768px con handle y scroll-lock
- [ ] Acordeones perfil/mods/personas: una pieza, glow correcto por sección
- [ ] Botón atrás Android cierra buscador modal antes que la app
- [ ] `prefers-reduced-motion`: transiciones minimizadas
- [ ] Focus-trap en modales (Tab no escapa), Esc cierra, focus visible
- [ ] Touch targets ≥44px en móvil

## 10. Edge Functions y datos

- [ ] `catalog-search` / `catalog-add` / `item-refresh`: búsqueda, alta y refresh OK
- [ ] `steam-updates` / `steam-reviews` / `book-editions` / `health`: 200 con auth, datos correctos
- [ ] Functions con `lang` param (post-deploy): metadata en EN cuando UI en inglés
- [ ] RPCs: `get_items_merged` (sufijos dinámicos, `visible`, `privado`), links, shares, tracking upsert
- [ ] RLS: otro usuario no puede leer/escribir tracking ajeno

## 11. Regresión y bugs conocidos a vigilar

- [ ] `nexusRun` callbacks: acciones seguidas no disparan renders con datos de la anterior
- [ ] `suf` tracking propio: MI sección aparece en TODOS los items (no solo el primero)
- [ ] Privacidad opt-in: item nuevo NO visible para vinculado hasta compartir
- [ ] Caché vieja del SW tras deploy → hard-refresh obligatorio documentado
- [ ] Consola limpia: sin 404 de assets, sin errores de Supabase CORS

---

## Notas de la ronda

| # | Área | Resultado | Notas |
|---|------|-----------|-------|
|   |       |           |       |

**Hallazgos → issues:**
