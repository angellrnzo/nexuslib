# NexusLib — Runbook de respaldo y restauracion

Como reconstruir la base de datos completa desde cero o desde un respaldo.

> `_local/` = la carpeta hermana del repo (`../_local` desde `database/`,
> en la practica `master_nexuslib/_local/`). Nunca commitear.

## Capas de respaldo

| Capa | Que | Frecuencia | Donde |
|---|---|---|---|
| GitHub Action | `pg_dump` schema `public` (custom format) | Semanal (lunes 5AM UTC) + manual | Artifacts del repo (90 dias) |
| Standby Supabase | Espejo vivo automatico | Semanal (mismo workflow) | `uxixiwrvobkulkjkicjm` (us-west-2) — **REPLICA 100% FUNCIONAL**: schema + datos (mirror vivo via `mirror_to_standby.py`, NO pg_restore — auth UUIDs difieren) + 2 auth users + 6 Edge Functions + secrets + auth URLs. Workflow verificado E2E 2026-11-26 (run 45730023321 todo verde). Switch = cambiar NEXUS_URL/KEY en Index.html |
| Local cifrado | JSON.gz + Fernet de todas las tablas | Manual (`backup_local.py`) | `_local/backups/` (NO commitear) |

## Secrets de GitHub Actions (Settings -> Secrets and variables -> Actions)

- `SUPABASE_DB_URL` — `postgres://postgres.<ref>:<pass>@aws-0-us-east-2.pooler.supabase.com:5432/postgres`
- `SUPABASE_DB_PASSWORD` — password del proyecto principal
- `SUPABASE_STANDBY_DB_URL` + `SUPABASE_STANDBY_DB_PASSWORD` — `postgres://postgres.uxixiwrvobkulkjkicjm:<pass>@aws-0-us-west-2.pooler.supabase.com:5432/postgres` (misma pass que el principal)
- Variable `SUPABASE_STANDBY_ENABLED` = `true` para activar el restore al standby

## Restauracion completa (desastre total)

1. **Proyecto nuevo** en Supabase (mismo org, region `us-east-2`, PG17, plan free).
2. **Schema** — automatizado o manual:

   ```bash
   python database/apply_schema.py --project-ref <ref>
   ```

   Aplica en orden numerico `00` a `06` por pooler (`06` = optimizacion de `get_items_merged`, reemplaza la funcion de `05`).
   Manual (SQL Editor): mismo orden — `database/legacy/` (phase5b/5f/5g)
   queda subsumido por `05_phase5h_username.sql`, NO correrlo.

3. **Datos** — caminos automatizados:

   - `python database/restore_backup.py --project-ref <ref> --host <pooler>` — restaura el ultimo `.enc` local (descifra con `_local/backup_key.key`, remapea profile ids por username, INSERT ON
     CONFLICT). **Probado: 1093 filas**
   - `python database/apply_schema.py --url <standby> --deltas` — sync de schema (solo 02+, idempotente). **El Action ya lo corre antes del mirror** — un delta nuevo en `database/` se propaga solo al
     standby en el proximo backup semanal
   - `python database/mirror_to_standby.py --source-url <url> --target-url <url>` — espejo vivo source→target (TRUNCATE+INSERT con remap). Es lo que corre el Action semanal
   - Desde dump del Action: `pg_restore <url> --data-only --disable-triggers dump.dump`
   - Catalogo (`media_items`/`library_items`): re-ETL desde `database/etl/*.py` si el dump falla

4. **Usuarios auth** — `auth.users` NO viaja en dumps del schema public.
   `python database/sync_auth_users.py --standby-ref <ref> --standby-key <service_role>`
   los recrea via Admin API (password aleatoria + email_confirm -> entran por
   magic link). **Ya corrido en standby: 2 usuarios creados.**

5. **Edge Functions** — `npx supabase functions deploy <fn> --project-ref <ref>`
   con PAT account-level (guardado en `_local` como `SUPABASE_ADMIN_TOKEN`,
   scope: org angellrnzo, 2 proyectos, Never expiry). Secrets de functions:
   `POST /v1/projects/{ref}/secrets` con `STEAMGRIDDB_API_KEY`/`TMDB_API_KEY`
   (valores en `_local/external_apis.env`). **Standby ya tiene las 3
   deployadas + secrets + auth URLs — E2E verificado 2026-11-25**
   (catalog-search devuelve resultados reales, get_items_merged 251 items).

6. **Frontend** — `Index.html`: actualizar `NEXUS_URL` =
   `https://uxixiwrvobkulkjkicjm.supabase.co`, `NEXUS_KEY` = publishable del
   standby (esta en `_local/supabase_credentials.env` ->
   `SUPABASE_STANDBY_PUBLISHABLE_KEY`). Auth del standby ya tiene
   site_url=Pages + redirects configurados.

## Switch al standby

El standby recibe el restore semanal. Para conmutar:

1. Verificar que el standby esta al dia (ultimo run del Action exitoso).
2. En `Index.html`: `NEXUS_URL` -> `https://<standby-ref>.supabase.co`,
   `NEXUS_KEY` -> publishable key del standby (Dashboard -> Settings -> API).
3. Auth URLs del nuevo proyecto: agregar la misma Site URL/redirects.
4. Redeploy Edge Functions en el standby si no se copiaron.
5. Deploy del front (hoy: GH Pages; mientras tanto: re-pegar Index.html en /dev).

## Backup local cifrado

```bash
python database/backup_local.py            # crea _local/backups/nexuslib_*.json.gz.enc
python database/backup_local.py --verify   # lista tablas del ultimo backup
```

- Clave Fernet en `_local/backup_key.key` — **respaldar aparte** (sin ella el
  .enc es irrecuperable). Guardar copia en gestor de passwords o papel.
- `_local/` nunca se commitea.

## Que NO se respalda (se regenera)

- Schema completo -> `database/*.sql`
- Catalogo base (`media_items`, `library_items` vacios) -> ETLs
- Edge Functions -> `supabase/functions/`
- Secrets -> `_local/supabase_credentials.env` (local) + GitHub Secrets
