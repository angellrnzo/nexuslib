#!/usr/bin/env python3
"""
restore_backup.py — Restaura un backup local cifrado (.json.gz.enc) en un
proyecto Supabase (standby o reconstruccion).

Uso:
    python database/restore_backup.py --project-ref <ref> [--host <pooler>] [--file <path>]

- Descifra con _local/backup_key.key (Fernet).
- Inserta en orden FK: profiles -> libraries -> media_items ->
  library_members -> library_links -> library_items -> user_media_tracking
  -> mods -> item_share_requests -> item_touches -> resto alfabetico.
- Es idempotente-ish: usa INSERT ... ON CONFLICT DO NOTHING por PK.
- NO toca auth.users (ver sync_auth_users.py).
"""

import argparse
import datetime
import gzip
import json
import os
import sys

import psycopg2
from psycopg2.extras import Json
from cryptography.fernet import Fernet

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCAL = os.path.join(ROOT, "..", "_local")
ENV_FILE = os.path.join(LOCAL, "supabase_credentials.env")
KEY_FILE = os.path.join(LOCAL, "backup_key.key")
BACKUP_DIR = os.path.join(LOCAL, "backups")

# Orden de insercion por dependencias FK
ORDER = [
    "profiles",
    "libraries",
    "media_items",
    "library_members",
    "library_links",
    "library_items",
    "user_media_tracking",
    "mods",
    "item_share_requests",
    "item_touches",
]


def load_env():
    env = {}
    if os.path.exists(ENV_FILE):
        for line in open(ENV_FILE, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env


def latest_backup():
    files = sorted(
        (f for f in os.listdir(BACKUP_DIR) if f.endswith(".json.gz.enc")),
        reverse=True,
    )
    if not files:
        sys.exit("No hay backups en " + BACKUP_DIR)
    return os.path.join(BACKUP_DIR, files[0])


def decrypt(path):
    key = open(KEY_FILE, "rb").read().strip()
    f = Fernet(key)
    raw = gzip.decompress(f.decrypt(open(path, "rb").read()))
    return json.loads(raw)


def remap_profiles(data, cur):
    """Los profile ids del backup son los del proyecto origen; en el destino
    los auth users tienen UUIDs nuevos (sync_auth_users). Mapea por username
    y reescribe toda referencia a profile_id en las filas."""
    backup_profiles = data.get("profiles") or []
    old_by_user = {r["username"]: r["id"] for r in backup_profiles if r.get("username")}
    cur.execute('select id, username from public.profiles')
    new_by_user = {u: i for i, u in cur.fetchall() if u}
    id_map = {old: new_by_user[u] for u, old in old_by_user.items() if u in new_by_user}
    if not id_map:
        return data
    print(f"  Remap profiles: {len(id_map)} ids ({', '.join(id_map.values())})")

    def walk(v):
        if isinstance(v, str) and v in id_map:
            return id_map[v]
        if isinstance(v, list):
            return [walk(x) for x in v]
        if isinstance(v, dict):
            return {k: walk(x) for k, x in v.items()}
        return v

    for t, rows in data.items():
        if t.startswith("_") or t == "profiles":
            continue
        data[t] = [ {k: walk(v) for k, v in r.items()} for r in rows ]

    # profiles: no insertar (ya existen via trigger); actualizar campos mutables
    for r in backup_profiles:
        u = r.get("username")
        if u in new_by_user:
            cur.execute(
                """update public.profiles set display_name=%s, avatar_url=%s,
                   locale=%s, preferences=%s where username=%s""",
                (r.get("display_name"), r.get("avatar_url"), r.get("locale"),
                 Json(r["preferences"]) if isinstance(r.get("preferences"), dict) else r.get("preferences"), u),
            )
    return data


def insert_rows(cur, table, rows):
    if not rows:
        return 0
    cols = list(rows[0].keys())
    collist = ", ".join(f'"{c}"' for c in cols)
    placeholders = ", ".join(["%s"] * len(cols))
    sql = (
        f'INSERT INTO public."{table}" ({collist}) VALUES ({placeholders}) '
        f"ON CONFLICT DO NOTHING"
    )
    n = 0
    for r in rows:
        # dict -> jsonb; list -> array PG (p.ej. shared_with uuid[]); resto tal cual
        vals = [Json(v) if isinstance(v, dict) else v for v in (r[c] for c in cols)]
        cur.execute(sql, vals)
        n += cur.rowcount if cur.rowcount and cur.rowcount > 0 else 0
    return n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project-ref", required=True)
    ap.add_argument("--host", default="aws-0-us-east-2.pooler.supabase.com")
    ap.add_argument("--file", default=None)
    ap.add_argument("--password", default=None)
    args = ap.parse_args()

    env = load_env()
    password = args.password or env.get("SUPABASE_STANDBY_DB_PASSWORD") or env.get("SUPABASE_DB_PASSWORD")
    path = args.file or latest_backup()
    data = decrypt(path)
    print(f"Backup: {os.path.basename(path)} ({data['_meta']['date']})")

    conn = psycopg2.connect(
        host=args.host, port=5432, dbname="postgres",
        user=f"postgres.{args.project_ref}", password=password,
        sslmode="require",
    )
    conn.autocommit = False
    cur = conn.cursor()
    data = remap_profiles(data, cur)

    tables = [t for t in ORDER if t in data and t != "profiles"] + sorted(
        t for t in data if t not in ORDER and not t.startswith("_")
    )
    total = 0
    for t in tables:
        rows = data.get(t) or []
        n = insert_rows(cur, t, rows)
        total += n
        print(f"  {t}: {len(rows)} filas ({n} insertadas)")
    conn.commit()
    conn.close()
    print(f"Restore completo: {total} filas")


if __name__ == "__main__":
    main()
