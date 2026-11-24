# NexusLib — DESIGN.md

> Visual design system for the PWA. Single source of truth for agents and
> implementers. Values reflect `AppScript/Index.html` (current v1); items
> marked **[Phase 2]** are roadmap specs, not yet implemented.
> Full motion spec: `AppScript/road.md` → Phase 2.

## 1. Product and tone

- Personal multimedia library (movies/series, games, books, manga)
- Audience: 2 primary users (Angel, Talmai) + future social layer
- Style: dark cinema — Steam/Netflix-like dark UI, blue and pink accents
- Languages: ES primary, EN via Phase 2.5 (i18n)

## 2. Color

### Tokens (`:root`)

| Token | Value | Use |
| :--- | :--- | :--- |
| `--bg` | `#0b0e14` | Base background |
| `--panel` | `#1b2838` | Surfaces (header gradient) |
| `--accent` | `#66c0f4` | Primary blue — actions, focus, badges |
| `--text` | `#c7d5e0` | Body text |
| `--gold` | `#ffd700` | Stars, achievements |
| `--border` | `rgba(255,255,255,0.1)` | Subtle borders |
| `--btn-primary` | `#66c0f4` | Primary CTA |
| `--success` | `#5ba32b` | Confirmations |
| `--warning` | `#d6a918` | Warnings |
| `--danger` | `#c93b3b` | Errors/destructive |
| `--wish` | `#ff4d6d` | Wishlist — pink |
| `--angel-color` | `#66c0f4` | Angel identity (= accent) |
| `--talmai-color` | `#ff4d6d` | Talmai identity (= wish) |

### Color rules

- Backgrounds: `radial-gradient(circle at top left, #1b2838, #0b0e14 80%)` on body
- Semantic accents: `--wish` wishlist, `--gold` ratings, `--danger`
  destructive, `--success` saved
- User colors (`--angel-color`/`--talmai-color`) only in social/match
  contexts — never in generic UI
- Modal overlays: `rgba(6, 9, 14, 0.88)`; modal borders tinted with accent
  `rgba(102,192,244,0.38)`

## 3. Typography

- **Single family:** `'Inter', sans-serif` — all text
- Scale in use (px): 9 (min badges), 10-11 (subtitles, results), 12-13
  (body, inputs, card titles), 15-18 (buttons, modal titles), 20 (stars),
  ~24+ (display titles)
- Weights: 700-900 for titles/buttons/tables; 400 body
- `-webkit-font-smoothing: antialiased` global

## 4. Layout and spacing

- Mobile-first PWA; body `padding` uses `env(safe-area-inset-*)` for
  notch/home indicator (future Android Capacitor)
- Card grid `#grid` with `poster-mode` view switch (list ↔ poster)
- Modal `max-width`: 620px; `max-height: 90dvh` with internal scroll
- Touch: `touch-action: pan-y` (free vertical scroll, no pinch zoom)
- `-webkit-tap-highlight-color: transparent` on all interactives

## 5. Motion tokens

### Implemented

| Token | Value | Use |
| :--- | :--- | :--- |
| `--t-fast` | `150ms` | Subtle hover/focus |
| `--t-base` | `220ms` | Standard transitions (modal, toast) |
| `--t-slow` | `320ms` | Entrances/emphasis |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Entrances/exits — default |
| `--ease-inout` | `cubic-bezier(0.4, 0, 0.2, 1)` | Bidirectional movement |

### Current animation patterns

- **Modal:** overlay `opacity 0→1` + `.modal-content`
  `translateY(10px) scale(0.985) → translateY(0) scale(1)` with
  `--t-base --ease-out`; scroll reset on open (Phase 1)
- **Toast:** `translateY` + opacity, `.success/.warning/.error` classes
  with colored border
- **Active tab:** color + icon change (`transition` on `.tab-btn`)

### [Phase 2] Planned — not implemented

- `--ease-spring` (spring physics) for card micro-interactions
- Skeleton shimmer on loads (replaces spinner/text)
- Directional transitions on modal navigation
- Double-tap heart on posters
- Bottom sheet pattern for filters/actions
- Scroll-snap on carousels; **lightbox** for screenshots (in-app overlay,
  arrows, ESC/close — never a new window)

## 6. Components

### Cards (`#grid > .card`)

- `.card-content` 12px padding, column layout
- `.card-title` / `.card-dev` — truncated title and metadata
- States: hover lift **[Phase 2]**, skeleton loading **[Phase 2]**

### Tabs (`.tab-btn`)

- Pills with SVG icon + label; `.active` accent background
- View switch: `#grid.poster-mode` (list ↔ poster)

### Buttons

- `.btn-primary` — CTA (solid accent)
- `.btn` generic, `.btn-trailer` (trailer toggle — `.active` red
  `rgba(201,59,59,…)`), `.wish-toggle` (`.active` pink `--wish`),
  `.filter-reset`, `.status-select`
- All: `border-radius`, `cursor:pointer`, no tap-highlight

### Modal (`#modal`, `#modal-papelera`, `#modal-match`)

- 3 instances share the `.modal-content` pattern
- Header: `.modal-header-grid` (img + info), `poster`/`landscape` modes
- `.modal-close` sticky top-right, 36px circle
- Inner sections reuse the `.trailer-box` pattern (reviews, updates,
  editions — see Phase 3 specs)

### Carousel (`.carousel`)

- `display:flex; overflow-x:auto` — movie screenshots
- Images `flex: 0 0 75%; height:140px` — next-item peek
- **[Phase 2]** scroll-snap + dots + lightbox viewer

### Rating (`.star`)

- 5 SVG/character stars, `.active` → `--gold`, inactive `#333`
- Used in per-user "Minimum Rating" filters

### Badges / tags

- `.search-result-badge` — 10px pill, `rgba(102,192,244,0.18)`
  background, accent text
- Item status pills with semantic colors

### State boxes — empty / error / offline **[Phase 2F — planned]**

- Shared `.state-box` component replacing today's inline-styled fallbacks
  (`<p style="color:#ff6b6b">Error: …</p>`, plain "Sin resultados.")
- Layout: centered SVG sprite icon + title + description + optional action
- Variants: `.state-box.error` (danger tint + **Retry** button re-running
  the failed fetch), `.state-box.empty` (neutral + suggestion text),
  `.state-box.offline` (bound to the `.offline` body class — Phase 3)
- Skeleton coverage per surface: grid (2A), modal content blocks, search
  dropdown rows, stats accordions — all reuse `.skeleton`

### Toast (`#toast-container`)

- Corner, stacked; `.show` visible; success/warning/error variants

### Iconography

- **Inline SVG sprite** `<symbol id="i-*">` + `<svg class="ico"><use>`
- Sizes: `.ico` 14px, `.ico-sm` 12px, `.ico-lg` 16px
- `.ico-fill` solid fill; modifiers `.ico-angel`, `.ico-talmai`,
  `.ico-gold`, `.ico-wish` for semantic color
- Strokes: `stroke-width:2`, `linecap/linejoin: round` — flat outline style

## 7. Responsive / PWA

- Mobile viewport; desktop works via implicit max-width
- `manifest.json` + `service-worker.js` — installable, offline read-only
  **[Phase 3]**
- iOS/Android safe areas covered in padding
- **[Phase 6]** Capacitor: same safe-area insets + status bar styling

## 8. Accessibility and hard rules

- Contrast: `#c7d5e0` text on `#0b0e14` (~10:1) — passes AA
- Visible focus on all interactives (no bare `outline:none`)
- `prefers-reduced-motion`: global kill-switch already exists
  (`@media` ~L745 in `Index.html`) — every new animation/keyframes MUST
  degrade through it; never add `animation` overrides outside it
- **[Phase 2E]** Dialog semantics: modals get `role="dialog"`,
  `aria-modal="true"`, `aria-labelledby` → `.modal-title`; focus trap
  (Tab cycles inside modal), focus first element on open, restore focus to
  the opener on close, `Escape` closes
- `aria-*` on remaining controls (labels, live regions for toasts) —
  improve gradually
- No emojis in UI — sprite SVG only
- `user-select:none` on stars/touch controls

## 9. External references

Design/animation skills installed in the workspace `.devin/skills/`:

- `impeccable` (pbakaus) — anti-"AI slop" UI audit (61 rules + critique/
  audit/polish commands; includes `android.md`/`ios.md` refs for Phase 6)
- `animate`, `animation-vocabulary`, `animation-performance`,
  `review-animations`, `improve-animations`, `find-animation-opportunities`,
  `apple-design` (emilkowalski/skills) — motion guides for Phase 2
