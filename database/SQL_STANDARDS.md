# NexusLib — Estándares SQL

Normas para todo SQL del proyecto (schema, RPCs, policies, deltas). Basado en
buenas prácticas generales (referencia: ai-boost/awesome-prompts `sql_assistant`,
VoltAgent sql-pro) adaptadas a **PostgreSQL 17 + Supabase + RLS**.

## Reglas generales

- **Dialect: PostgreSQL 17.** Nada de sintaxis T-SQL/MySQL. `RETURNING`,
  `ON CONFLICT`, `jsonb`, CTEs, `security definer` están OK.
- **JOINs explícitos** — nunca comas implícitas.
- **CTEs con comentario** de propósito cuando la query lo amerite; aliases
  cortos en minúscula (`mi`, `li`, `t`).
- **SARGable siempre**: nada de funciones sobre columnas indexadas en WHERE
  (`lower(col)`, `date_trunc(col)` matan índices — usar expresiones
  indexadas o rangos).
- **Parámetros, nunca concatenar** valores en SQL dinámico.
- **Operaciones destructivas** (DELETE/UPDATE sin WHERE/TRUNCATE/DROP):
  verificar scope con SELECT primero; en migraciones usar transacción.
- **Confirmar el grain** antes de escribir GROUP BY.

## Schema design

- `NOT NULL` por defecto — NULL = "desconocido", no "vacío".
- Tipos precisos: `text` con CHECK o enum antes que VARCHAR libre;
  `numeric(3,1)` para ratings; `timestamptz` siempre (nunca `timestamp`).
- **Soft delete con `deleted_at timestamptz`** — ya es convención
  (`library_items.deleted_at`); NO usar `is_deleted boolean`.
- FK con `on delete cascade` explícito y pensado.
- Índices solo con justificación — cada índice cuesta escritura.
  Ya existen: `media_items` trigram + gin metadata, `mods_game_idx`,
  `library_items_active_uniq` parcial.

## Convenciones NexusLib (específicas)

- **Archivos numerados** `00_`–`05_` en `database/` = orden de ejecución
  para rebuild. Deltas nuevos = `06_`, `07_`… en `database/`.
  `database/legacy/` NO se corre (subsumido).
- **Idempotente**: `create or replace function`, `create index if not exists`,
  `drop ... if exists` antes de recrear. Todo archivo debe poder correrse
  dos veces sin romper.
- **`begin; ... commit;`** envolviendo DDL cuando el archivo lo amerite
  (los phase*.sql ya lo hacen).
- **RLS en toda tabla nueva** — `enable row level security` + policies.
  Sin excepciones; la app depende de RLS para aislamiento por usuario.
- **RPCs con `security definer`** cuando cruzan profiles ajenos
  (patrón `get_items_merged`, `get_my_library_links`). Documentar por qué
  es definer y qué valida (`auth.uid()`).
- **Sufijos dinámicos por persona**: `estado{Persona}`, `visible{Persona}`,
  `username{Persona}`, `privado{Persona}` — initcap del primer nombre del
  username. Nunca hardcodear nombres.
- **`is_private` = veto absoluto**; `shared_with uuid[]` NULL/{} = legacy
  (matriz del link), `[ids]` = audiencia específica.
- **JSONB para metadata/extensible** (`media_items.metadata`,
  `profiles.preferences`, `library_links.visibility`).

## Edge Functions (Deno/TS)

- JWT verificado con `requireUser` (`_shared/http.ts`); service role solo
  para writes que RLS no permite.
- Secrets vía `Deno.env.get` — nunca hardcodear keys en el código.
- Lazy-fetch: nada de datos externos en carga de catálogo — solo al abrir
  modal/búsqueda (patrón catalog-search/catalog-add/item-refresh).

## Verificación obligatoria tras aplicar SQL

1. Correr en SQL Editor o `apply_schema.py` — nunca asumir que aplicó.
2. Verificar en vivo: counts de tablas, `get_items_merged` emite ambos
   sufijos de persona, RLS no rompe queries de autenticados.
3. Si es delta sobre función viva: probar con JWT real (magic link o
   service key) — `security definer` puede enmascarar errores de RLS.
4. Documentar en `road.md`/`HANDOFF.md` qué se aplicó y cuándo.

## Backups

- Antes de DDL destructivo en producción: `python database/backup_local.py`.
- Post-cambio estructural: re-correr `mirror_to_standby.py` para que el
  standby refleje el nuevo shape (el Action semanal lo hace solo, pero
  verificación manual acelera).
