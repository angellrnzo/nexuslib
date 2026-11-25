# NexusLib — Runbook de respaldo y restauracion

Como reconstruir la base de datos completa desde cero o desde un respaldo.

## Capas de respaldo

| Capa | Que | Frecuencia | Donde |
|---|---|---|---|
| GitHub Action | `pg_dump` schema `public` (custom format) | Semanal (lunes 5AM UTC) + manual | Artifacts del repo (90 dias) |
| Standby Supabase | Restore automatico del dump | Semanal (mismo workflow) | 2do proyecto free, mismo org |
| Local cifrado | JSON.gz + Fernet de todas las tablas | Manual (`backup_local.py`) | `_local/backups/` (NO commitear) |

## Secrets de GitHub Actions (Settings -> Secrets and variables -> Actions)

- `SUPABASE_DB_URL` — `postgres://postgres.<ref>:<pass>@aws-0-us-east-2.pooler.supabase.com:5432/postgres`
- `SUPABASE_DB_PASSWORD` — password del proyecto principal
- `SUPABASE_STANDBY_DB_URL` + `SUPABASE_STANDBY_DB_PASSWORD` — idem proyecto standby
- Variable `SUPABASE_STANDBY_ENABLED` = `true` para activar el restore al standby

## Restauracion completa (desastre total)

1. **Proyecto nuevo** en Supabase (mismo org, region `us-east-2`, PG17, plan free).
2. **Schema** — en SQL Editor, en orden:

   ```text
   database/schema.sql
   database/phase4_5.sql
   database/phase5c_item_privacy.sql
   database/phase5d_item_shares.sql
   database/phase5e_optin_label.sql
   database/phase5h_username.sql
   ```

   (`phase5f`/`phase5g` quedan subsumidos por `phase5h` — NO correrlos si corres 5h.)

3. **Datos** — dos caminos:

   - Desde dump del Action: `pg_restore <url> --data-only --disable-triggers dump.dump`
   - Desde backup local: descifrar con `_local/backup_key.key` (script `--verify` lista contenido; restore = INSERTs manuales o script ad-hoc)
   - Catalogo (`media_items`/`library_items`): re-ETL desde `database/etl/*.py` si el dump falla

4. **Usuarios auth** — `auth.users` NO viaja en dumps del schema public. Recrear en
   Authentication -> Users (o admin API): email + password, auto-confirm.
   Los usuarios reciben magic link en el proximo login si olvidan password.

5. **Edge Functions** — redesplegar `supabase/functions/*` (catalog-search,
   catalog-add, item-refresh) y reconfigurar secrets (`STEAMGRIDDB_API_KEY`,
   `TMDB_API_KEY`).

6. **Frontend** — `Index.html`: actualizar `NEXUS_URL`, `NEXUS_KEY`
   (publishable) si el proyecto es nuevo. `CACHE_VERSION` bump si cambia data.

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
