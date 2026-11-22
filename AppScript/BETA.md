# BETA — Registro de avances y pruebas

> Un bloque por sesión de trabajo. La rama `beta` es el banco de pruebas;
> `main` es producción. Ver el flujo completo en `AppScript/road.md` →
> "Branching, Beta & Release Workflow".

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
