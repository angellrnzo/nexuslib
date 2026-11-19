# 📚 Wiki Técnica de NexusLib
### *Arquitectura Integral, Especificación de APIs y Guía de Desarrollo*

Este documento constituye el manual de referencia técnica y arquitectónica de **NexusLib**, detallando el diseño de extremo a extremo (End-to-End), el protocolo de comunicación cliente-servidor, las integraciones con servicios externos, las estrategias de respaldo ante fallos y los patrones de optimización móvil.

---

## 📑 Índice de Contenidos
1. [Visión General del Sistema](#1-visión-general-del-sistema)
2. [Capa Backend (Google Apps Script)](#2-capa-backend-google-apps-script)
   - [Punto de Entrada y Políticas de Seguridad](#21-punto-de-entrada-y-políticas-de-seguridad)
   - [Mapeo Relacional de Cabeceras Dinámicas](#22-mapeo-relacional-de-cabeceras-dinámicas)
   - [Ecosistema de APIs Externas y Fallback Robusto](#23-ecosistema-de-apis-externas-y-fallback-robusto)
   - [Procesamiento por Lotes y Superación del Timeout de 6 Minutos](#24-procesamiento-por-lotes-y-superación-del-timeout-de-6-minutos)
   - [Sistema de Papelera y Restauración de Datos](#25-sistema-de-papelera-y-restauración-de-datos)
3. [Capa Frontend (SPA Autocontenida)](#3-capa-frontend-spa-autocontenida)
   - [Estrategia de Caché v19 con LocalStorage](#31-estrategia-de-caché-v19-con-localstorage)
   - [Virtualización de Grid e IntersectionObserver](#32-virtualización-de-grid-e-intersectionobserver)
   - [Escala de Puntuaciones y Normalización al Ordenar](#33-escala-de-puntuaciones-y-normalización-al-ordenar)
   - [Algoritmo de Match de Pareja](#34-algoritmo-de-match-de-pareja)
   - [Seguimiento de Capítulos para Libros y Mangas](#35-seguimiento-de-capítulos-para-libros-y-mangas)
   - [Integración de Tráilers y Reproducción HLS](#36-integración-de-tráilers-y-reproducción-hls)
4. [Capa de Despliegue PWA (GitHub Pages)](#4-capa-de-despliegue-pwa-github-pages)
   - [Estructura del Contenedor Iframe](#41-estructura-del-contenedor-iframe)
   - [Service Worker y Estrategia de Caché Offline](#42-service-worker-y-estrategia-de-caché-offline)
   - [Manifiesto PWA e Iconografía Adaptativa](#43-manifiesto-pwa-e-iconografía-adaptativa)
5. [Automatizaciones y CI/CD (GitHub Actions)](#5-automatizaciones-y-cicd-github-actions)
   - [Despliegue Continuo (deploy.yml)](#51-despliegue-continuo-deployyml)
   - [Backup Semanal Automatizado del Excel (backup-excel.yml)](#52-backup-semanal-automatizado-del-excel-backupexcylyl)
6. [Guía de Solución de Problemas (Troubleshooting)](#6-guía-de-solución-de-problemas-troubleshooting)

---

## 1. Visión General del Sistema

NexusLib está concebida bajo una **arquitectura híbrida desacoplada**:

```text
┌─────────────────────────────────────────────────────────────────┐
│                     USUARIO (Navegador / PWA)                   │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                   [HTTPS / Standalone Window]
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│          FRONTEND HOSTING: GitHub Pages (PWA Wrapper)           │
│   - index.html (Iframe seguro con allow="fullscreen; autoplay") │
│   - manifest.json (Configuración PWA, display: standalone)      │
│   - service-worker.js (Caché estática de la shell)             │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                 [postMessage / RPC asíncrono]
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│         BACKEND & CLIENTE SPA: Google Apps Script (GAS)         │
│   - doGet() sirve la SPA completa (AppScript/Index.html)        │
│   - WebAPP.gs expone funciones RPC vía google.script.run        │
│   - Lógica de negocio, serialización y validación de tipos      │
└──────────────┬──────────────────────────────────┬───────────────┘
               │                                  │
       [REST / GraphQL]                     [Google Sheets API]
               ▼                                  ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│        APIs EXTERNAS         │   │      PERSISTENCIA / DB       │
│ - Steam API & SteamCMD PICS  │   │ - Pestaña Juegos (486+ filas)│
│ - TMDB API v3                │   │ - Pestaña Peliculas_Series   │
│ - Open Library REST API      │   │ - Pestaña Libros             │
│ - AniList GraphQL API        │   │ - Pestaña Mangas             │
│ - SteamGridDB                │   │ - Pestaña Papelera (JSON)    │
└──────────────────────────────┘   └──────────────────────────────┘
```

---

## 2. Capa Backend (Google Apps Script)

El archivo [AppScript/WebAPP.gs](AppScript/WebAPP.gs) opera como el backend de la aplicación, ejecutándose sobre el motor V8 de Google Cloud.

### 2.1. Punto de Entrada y Políticas de Seguridad
La función `doGet(e)` inicializa y despacha la aplicación web:
```javascript
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('NexusLib')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}
```
* **`XFrameOptionsMode.ALLOWALL`:** Indispensable para permitir la incrustación limpia desde el dominio de GitHub Pages (`angellrnzo.github.io`) sin que el navegador bloquee la página por directivas de cabecera `X-Frame-Options: SAMEORIGIN`.

### 2.2. Mapeo Relacional de Cabeceras Dinámicas
Para permitir que las hojas de cálculo evolucionen (adición de columnas, cambios de orden o pequeñas variaciones de nombre como `AppID` vs `App ID` o `Fecha` vs `Lanzamiento`), se utiliza un diccionario canónico `HEADER_TO_KEY` y la función normalizadora:
```javascript
function mapearHeaderAKey_(rawHeader) {
  var clean = String(rawHeader || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (HEADER_TO_KEY[clean]) return HEADER_TO_KEY[clean];
  var sinGuiones = clean.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (HEADER_TO_KEY[sinGuiones]) return HEADER_TO_KEY[sinGuiones];
  return String(rawHeader || '').trim();
}
```
Esto garantiza que la lectura (`getItems`) y escritura (`guardarFilaSheet`, `guardarProgresoItem`) no dependan de índices fijos de columna, sino de búsquedas dinámicas mediante `buscarColumna_(headers, key)`.

### 2.3. Ecosistema de APIs Externas y Fallback Robusto

| Categoría | API Primaria | Mecanismos de Fallback / Respaldo | Clave Requerida |
| :--- | :--- | :--- | :--- |
| **Juegos** | Valve Store API (`appdetails`) | 1. Scraper HTML con cookies de edad (`mature_content=1`)<br>2. SteamCMD PICS API (`api.steamcmd.net`)<br>3. Steam News API<br>4. SteamGridDB | Opcional (`STEAMGRIDDB_API_KEY`) |
| **Cine/Series** | TMDB API v3 (`search/multi`, `movie`, `tv`) | Extracción de directores en crew, plataformas de streaming vía `watch/providers` por región y trailers en YouTube. | Obligatoria (`TMDB_API_KEY`) |
| **Libros** | Open Library REST API | Búsqueda por ISBN, Work ID (`OL...W`) o Book ID (`OL...M`). Resolución paralela de nombres de autores mediante `/authors/`. | Ninguna (Pública) |
| **Mangas** | AniList GraphQL API | Soporte dual de identificadores (IDs directos de AniList e IDs de MyAnimeList mediante `idMal`). | Ninguna (Pública) |

#### El Mecanismo de Fallback de Steam:
Cuando un juego clásico o restringido por edad (como AppID `238960` o juegos descatalogados) es consultado, la API estándar de Valve suele responder `{ success: false }`. `WebAPP.gs` activa en cascada:
1. **Paso 1:** Simulación de navegador con cookie de bypass de verificación de edad (`birthtime=283993201; mature_content=1`).
2. **Paso 2:** Consulta a los registros PICS de SteamCMD (`api.steamcmd.net/v1/info/{id}`) para extraer el nombre real, desarrollador, compatibilidad con Steam Deck (`steam_deck_compatibility`) y builds de ramas públicas y betas (`depots.branches`).
3. **Paso 3:** Si no se dispone de arte oficial, consulta a SteamGridDB para obtener banners en proporciones `460x215` o `920x430`.

### 2.4. Procesamiento por Lotes y Superación del Timeout de 6 Minutos
Google Apps Script impone un límite de ejecución síncrona de **6 minutos** por petición. Para actualizar metadatos y builds de catálogos extensos (486+ juegos):
* Se segmenta el procesamiento en lotes de 60 elementos (`LOTE_BUILDS_JUEGOS = 60`).
* Al concluir cada lote, se registra el cursor numérico en `PropertiesService` y se programa un disparador temporal asíncrono con `ScriptApp.newTrigger`:
  ```javascript
  ScriptApp.newTrigger(TRIGGER_HANDLER_BUILDS)
    .timeBased()
    .after(15 * 1000)
    .create();
  ```
* El proceso se auto-reanuda 15 segundos después, repitiendo el ciclo hasta cubrir el 100% de la hoja sin exceder jamás el límite de tiempo.

### 2.5. Sistema de Papelera y Restauración de Datos
Al eliminar un elemento mediante `eliminarItem(categoria, id)`:
1. Se localiza la fila por su ID o clave de fila.
2. Se extraen todos sus campos en un objeto plano y se serializa a JSON.
3. Se inserta en la pestaña `Papelera` guardando `[categoria, id, titulo, datosJson]`.
4. Al llamar a `restaurarItem(categoria, id)`, el backend reconstruye la fila basándose en las cabeceras actuales de la categoría de destino, garantizando restauración sin pérdida de información.

---

## 3. Capa Frontend (SPA Autocontenida)

El archivo [AppScript/Index.html](AppScript/Index.html) es una Single Page Application (SPA) construida en JavaScript vainilla puro sin frameworks pesados, garantizando máxima velocidad de ejecución en cualquier dispositivo.

### 3.1. Estrategia de Caché v19 con LocalStorage
Para evitar peticiones redundantes a Google Sheets y garantizar carga instantánea:
* Cada categoría se almacena en `localStorage` con la clave `media_lib_v19_{categoria}` y su timestamp `media_lib_time_v19_{categoria}`.
* Las lecturas tienen una vida útil (`MAX_CACHE_AGE`) de **12 horas**.
* El botón **Sincronizar** fuerza el refresco con `forzarSincronizacion()`, omitiendo la caché local y guardando la versión más reciente del servidor.

### 3.2. Virtualización de Grid e IntersectionObserver
Renderizar 500+ tarjetas con imágenes satura el DOM móvil. NexusLib aplica virtualización ligera:
* Solo se renderizan inicialmente **36 tarjetas** (`elementosPorPagina = 36`).
* Se coloca un centinela `#scroll-sentinel` al final del grid.
* Un `IntersectionObserver` con margen `rootMargin: '250px'` detecta cuando el usuario se acerca al final del scroll y renderiza el siguiente bloque de 36 tarjetas dinámicamente:
  ```javascript
  observer = new IntersectionObserver(function(entries) {
    if (entries[0].isIntersecting) { 
      paginaActual++; 
      renderGrid(filteredItems); 
    }
  }, { rootMargin: '250px' });
  ```
* Cada tarjeta cuenta con `content-visibility: auto; contain-intrinsic-size: 0 320px;` en CSS, permitiendo que el navegador omita el layout de tarjetas fuera de la pantalla.

### 3.3. Escala de Puntuaciones y Normalización al Ordenar
* **Escala de Valoración:** Las 10 estrellas visuales representan una escala directa del **1 al 10** (`idx`). Al pulsar la estrella 10, se guarda `10`, se iluminan las 10 estrellas y se refleja `10/10`.
* **Filtros por Nota:** Permiten seleccionar notas mínimas de `5+`, `7+` y `9+` (evaluadas mediante `pts >= notaMinima`).
* **Normalización de Puntuación Global:** Al ordenar por puntuación (`fOrden === 'puntuacion'`), la función `obtenerPuntuacionNormalizada()` divide entre 10 aquellas valoraciones expresadas en porcentaje (ej. `94% Steam` $\rightarrow$ `9.4`) para que compitan de forma justa contra las notas de TMDB y AniList (`8.5`).

### 3.4. Algoritmo de Match de Pareja
La función `renderMatchGrid(cat)` evalúa coincidencias entre los perfiles de **Angel** y **Talmai**:
$$\text{Match} = (\text{Pendiente}_A \land \text{Pendiente}_T) \lor (\text{Deseado}_A \land \text{Deseado}_T)$$
Muestra una cuadrícula filtrable por categoría con todas las obras que ambos tienen en cola o que ambos desean ver, jugar o leer.

### 3.5. Seguimiento de Capítulos para Libros y Mangas
Para obras con progreso secuencial:
* En **Mangas:** El total de capítulos se sincroniza automáticamente desde la API de AniList.
* En **Libros:** El total de páginas/capítulos puede editarse manualmente en el modal.
* La barra de lectura calcula el porcentaje en tiempo real:
  $$\text{Porcentaje} = \min\left(100, \text{round}\left(\frac{\text{Actual}}{\text{Total}} \times 100\right)\right)$$
* Se visualiza tanto en la tarjeta del grid principal como en los paneles de control de cada usuario.

### 3.6. Integración de Tráilers y Reproducción HLS
* **YouTube:** Extrae automáticamente el identificador de 11 caracteres y embebe el reproductor seguro con `youtube-nocookie.com/embed/{id}?autoplay=1`.
* **Steam MP4 / WebM:** Reproduce directamente en un elemento `<video controls autoplay playsinline>`.
* **Transmisiones HLS (`.m3u8`):** Si el tráiler es una lista de reproducción HTTP Live Streaming, inyecta de forma asíncrona la librería `hls.js` desde CDN y la vincula al elemento de vídeo.

---

## 4. Capa de Despliegue PWA (GitHub Pages)

Los archivos web estáticos (`index.html`, `manifest.json`, `service-worker.js`, iconos) se ubican en la raíz del repositorio para ser servidos directamente por GitHub Pages como PWA instalable.

### 4.1. Estructura del Contenedor Iframe
El archivo `index.html` sirve un iframe al 100% del viewport:
```html
<iframe 
    src="https://script.google.com/macros/s/.../exec" 
    allow="clipboard-write; fullscreen; autoplay" 
    allowfullscreen>
</iframe>
```
* **`allow="clipboard-write; fullscreen; autoplay"`:** Otorga permisos al iframe interno para reproducir tráilers a pantalla completa y gestionar el portapapeles.

### 4.2. Service Worker y Estrategia de Caché Offline
El archivo `service-worker.js` implementa la versión de caché `nexuslib-cache-v2`:
* En el evento `install`: Llama a `self.skipWaiting()` y precachea los recursos locales esenciales (`index.html`, `manifest.json`, iconos).
* En el evento `activate`: Itera sobre las claves de caché y purga cualquier versión obsoleta.
* En el evento `fetch`: Responde con estrategia *Cache First* para recursos locales, con fallback a red.

### 4.3. Manifiesto PWA e Iconografía Adaptativa
El archivo `manifest.json` define:
* `display: standalone`: Oculta la barra de direcciones del navegador en móviles.
* `theme_color: #0b0e14` y `background_color: #0b0e14`: Coherencia visual con la paleta de la aplicación.
* `"purpose": "any maskable"`: Soporte para iconos adaptativos en Android, evitando bordes blancos o paddings innecesarios.

---

## 5. Automatizaciones y CI/CD (GitHub Actions)

### 5.1. Despliegue Continuo (deploy.yml)
Ubicado en [.github/workflows/deploy.yml](.github/workflows/deploy.yml):
* Se dispara automáticamente con cada `push` a la rama `main`.
* Utiliza las acciones oficiales `actions/upload-pages-artifact@v3` y `actions/deploy-pages@v4`.
* **Aislamiento de seguridad:** Configurado con `path: './GitHub'`, lo que asegura que **únicamente** la carpeta `GitHub/` se publica en la web pública, manteniendo `AppScript/` dentro del repositorio pero fuera del sitio web.

### 5.2. Backup Semanal Automatizado del Excel (backup-excel.yml)
Ubicado en [.github/workflows/backup-excel.yml](.github/workflows/backup-excel.yml):
* **Frecuencia:** `cron: '0 3 * * 0'` (todos los domingos a las 3:00 AM UTC).
* **Disparador manual:** `workflow_dispatch` permite ejecutarlo a petición desde la interfaz de GitHub.
* **Flujo de ejecución:**
  1. Descarga el archivo vivo desde Google Sheets en formato binario Excel:
     ```bash
     curl -L -o "AppScript/GameList.xlsx" "https://docs.google.com/spreadsheets/d/13ZoOAVmoksF3jyNvFScscnBWhNHxXdOMAiXSlPImYnk/export?format=xlsx"
     ```
  2. Comprueba si existen modificaciones mediante `git diff --staged`.
  3. Si la hoja ha variado, realiza un commit automático con la firma `github-actions[bot]` y hace `git push` a la rama `main`.

---

## 6. Guía de Solución de Problemas (Troubleshooting)

### La web muestra una pantalla en blanco o error de CORS
* **Causa:** La URL de despliegue de Apps Script (`/exec`) ha cambiado o no tiene acceso público configurado.
* **Solución:** En Apps Script, verifica que la implementación esté configurada con: *Ejecutar como: Yo* y *Quién tiene acceso: Cualquier usuario*. Asegúrate de que la URL en `index.html` coincida exactamente con la URL de la última versión desplegada.

### No aparecen resultados al buscar películas o series
* **Causa:** Falta configurar la clave de API de TMDB.
* **Solución:** En el editor de Apps Script, ve a **Configuración del proyecto** $\rightarrow$ **Propiedades del script** y crea la propiedad `TMDB_API_KEY` con tu clave personal de The Movie Database.

### El workflow del backup semanal da error 401 o descarga un archivo HTML
* **Causa:** La hoja de Google Sheets no tiene permiso de lectura público por enlace.
* **Solución:** Abre la hoja en Google Sheets, pulsa **Compartir** $\rightarrow$ en *Acceso general* selecciona **Cualquier persona con el enlace** y déjalo con rol **Lector**.

### Los cambios en el código de Apps Script no se reflejan en la PWA
* **Causa:** En Google Apps Script, editar el código no actualiza automáticamente la URL `/exec` activa.
* **Solución:** Debes pulsar en **Implementar** $\rightarrow$ **Gestionar implementaciones** $\rightarrow$ icono de lápiz $\rightarrow$ en *Versión* selecciona **Nueva versión** $\rightarrow$ pulsa **Implementar**.
