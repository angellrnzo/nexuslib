# BETA — Registro de avances y pruebas

> Un bloque por sesión de trabajo. La rama `beta` es el banco de pruebas;
> `main` es producción y **solo se actualiza con aprobación expresa del
> owner** — ver `AppScript/road.md` → "Branching, Beta & Release Workflow".

## Cómo probar una entrada beta

1. Pegar `AppScript/Index.html` (y `WebAPP.gs` si cambió) en el editor de Apps Script.
2. Abrir la URL `/dev` del proyecto (no `/exec`).
3. Probar en Android + escritorio según los pasos indicados.

---

## Plantilla de entrada

```text
### YYYY-MM-DD — <tema corto>

- Rama/commit: beta@<sha>
- Cambios: <qué se hizo>
- Spec origen: <road.md → Phase X, item Y>
- Cómo probar: <pasos concretos>
- Estado: pendiente de prueba | verificado | promovido a main (vX.Y.Z)
- Pendiente: <lo que falta>
- Necesito de ti: <bloqueos o decisiones>
```

---

## Entradas

### 2026-11-22 — Setup del flujo beta

- Rama/commit: `beta` creada desde `main` (`012cc0f`+)
- Cambios: workflow documentado en `road.md`; este registro creado
- Spec origen: petición del usuario — mantener producción funcional mientras se desarrolla
- Cómo probar: n/a (solo proceso)
- Estado: verificado
- Pendiente: elegir la primera fase beta (candidatas: Phase 2 motion, Phase 3 backend/mods/reviews)
- Necesito de ti: decidir por qué phase empezamos

### 2026-11-22 — Spec i18n ES/EN añadida al roadmap

- Rama/commit: `beta`
- Cambios: Phase 2.5 documentada en `road.md` (diccionario `I18N` + `t()`, toggle con `localStorage`, **español por defecto**); fila añadida al mapa de ubicación de features; CHANGELOG Unreleased actualizado
- Spec origen: petición del usuario — web bilingüe ES/EN, docs del repo se quedan en inglés
- Cómo probar: n/a (solo spec)
- Estado: pendiente de implementación
- Pendiente: extracción de strings de `Index.html` (varios cientos — sesión beta dedicada)
- Necesito de ti: nada

### 2026-11-22 — Spec capa social ligera (Phase 5D)

- Rama/commit: `beta` (`3d4f751`)
- Cambios: Phase 5D añadida a `road.md` — notas compartidas por ítem, reacciones "visto también", `watching_now` efímero, y recomendaciones con botón "Agregar a mi biblioteca" (`recommended_by`); chat libre descartado explícitamente. WIKI §7 actualizado con la nota de la capa social
- Spec origen: conversación con el usuario — interacciones sociales ancladas a ítems compartidos, no mensajería
- Cómo probar: n/a (solo spec)
- Estado: pendiente de implementación (post-cut, junto a Phase 5)
- Pendiente: resolver open question de Phase 5 (2 usuarios vs multi-usuario) antes de construir
- Necesito de ti: nada
