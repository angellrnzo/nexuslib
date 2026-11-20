🌌 Project Overview
NexusLib is a collaborative multimedia Progressive Web App (PWA) designed for tracking video games, movies, series, books, and manga. It uses Google Sheets as a database, Google Apps Script for the backend/API, and GitHub Pages for static hosting.

🏛️ Architecture & Components
Frontend Wrapper (PWA):
index.html: Acts as a secure container, hosting the main application via an iframe.
manifest.json & service-worker.js: Enable PWA features like home screen installation and offline caching of the shell resources.
Main Application (SPA):
AppScript/Index.html: A high-performance Single Page Application built with vanilla JavaScript. It handles navigation (Swipe), filtering, searching, and item management.
Key UI Features: 60 FPS performance via virtualized grids, 12-hour local caching, and a comprehensive statistics dashboard.
Backend & API:
AppScript/WebAPP.gs: The "brain" of the project. It handles RPC calls from the frontend, manages Google Sheets data, and integrates with external APIs:
Steam: Comprehensive metadata recovery (Store API, PICS fallback for restricted games).
TMDB: Movie and Series search/details.
Open Library: Book search by title, author, or ISBN.
AniList: Manga tracking with automatic chapter count updates.
Automation (CI/CD):
GitHub Actions: Automatically deploys changes to GitHub Pages and performs weekly backups of the Google Sheet into AppScript/GameList.xlsx.
✨ Notable Features
Collaborative Tracking: Per-user per-item tracking for Angel and Talmai, including independent status, ratings (1-10 stars), and personal notes.
Couple's Match Algorithm: Identifies items that both users have pending or in their wishlists to facilitate shared activities.
Multimedia Integration: Integrated trailer playback (YouTube, MP4, WebM, and HLS .m3u8 via hls.js).
Data Safety: A JSON-based "Papelera" (Trash) system in Google Sheets allows for item restoration, and automatic weekly backups ensure data persistence.
The project is exceptionally well-structured, combining the accessibility of a web app with the power of Google's cloud ecosystem and third-party media APIs.