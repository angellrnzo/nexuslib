# 🚀 NexusLib

Plataforma colaborativa multimedia (Juegos, Cine/Series, Libros y Mangas) desarrollada como Progressive Web App (PWA) sincronizada con Google Sheets a través de Google Apps Script.

---

## 📁 Estructura del Repositorio

```text
NexusLib/
├── .github/
│   └── workflows/
│       └── deploy.yml          # Despliegue automático a GitHub Pages
├── GitHub/                     # Capa Frontend Web / PWA
│   ├── index.html              # Contenedor iframe optimizado
│   ├── manifest.json           # Manifiesto PWA (Standalone, tema e iconos)
│   ├── service-worker.js       # Estrategia de caché y soporte offline de shell
│   ├── icon-192.png            # Icono PWA 192x192
│   └── icon-512.png            # Icono PWA 512x512
├── AppScript/                  # Capa Backend y Datos
│   ├── WebAPP.gs               # Backend en Google Apps Script
│   ├── Index.html              # SPA autocontenida que se ejecuta en Apps Script
│   ├── GameList.xlsx           # Plantilla base de la base de datos
│   └── backup_v1/              # Copia de seguridad local versionada
└── .gitignore                  # Exclusiones de archivos del sistema y temporales
```

---

## 🌐 Configuración de GitHub Pages

1. En tu repositorio de GitHub, entra a **Settings** $\rightarrow$ **Pages**.
2. En **Build and deployment** $\rightarrow$ **Source**, selecciona **GitHub Actions**.
3. Cada vez que hagas `git push` a la rama `main`, la GitHub Action publicará automáticamente los archivos de la carpeta `GitHub/` sin exponer la carpeta `AppScript/`.

---

## 💾 Backup Semanal Automático del Excel

En Google Sheets dispones del menú superior **NexusLib**:
* **Crear backup en Drive ahora (.xlsx):** Exporta inmediatamente tu hoja a Excel y la guarda en la carpeta `NexusLib_Backups` de tu Google Drive.
* **Activar backup semanal automático (.xlsx):** Programa un trigger automático para generar una copia `.xlsx` cada domingo a las 3:00 AM.
