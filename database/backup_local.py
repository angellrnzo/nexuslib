#!/usr/bin/env python3
"""
backup_local.py — Respaldo local cifrado de NexusLib (Supabase).

Exporta todas las tablas del schema `public` a un JSON.gz cifrado con
Fernet (AES-128-CBC + HMAC). La clave se genera una sola vez en
_local/backup_key.key — NUNCA commitear esa carpeta.

Uso:
    python database/backup_local.py            # backup normal
    python database/backup_local.py --verify   # restaura a JSON y verifica

Requiere: pg8000, cryptography  (pip install pg8000 cryptography)
Credenciales: lee _local/supabase_credentials.env (SUPABASE_DB_PASSWORD,
SUPABASE_PROJECT_REF) — misma convencion que los ETLs.
"""

import argparse
import base64
import datetime
import gzip
import json
import os
import sys

import pg8000.dbapi
from cryptography.fernet import Fernet

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCAL = os.path.join(ROOT, "..", "_local")  # _local vive en la raiz del workspace
ENV_FILE = os.path.join(LOCAL, "supabase_credentials.env")
KEY_FILE = os.path.join(LOCAL, "backup_key.key")
BACKUP_DIR = os.path.join(LOCAL, "backups")

# Tablas de datos (public). Se descubren dinamicamente — el schema se
# regenera desde database/*.sql, el backup solo salva DATOS.


def load_env():
    env = {}
    if os.path.exists(ENV_FILE):
        for line in open(ENV_FILE, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    for k in ("SUPABASE_DB_PASSWORD", "SUPABASE_PROJECT_REF"):
        env[k] = env.get(k) or os.environ.get(k)
        if not env[k]:
            sys.exit(f"Falta {k} en {ENV_FILE} o variables de entorno")
    return env


def get_key():
    os.makedirs(LOCAL, exist_ok=True)
    if os.path.exists(KEY_FILE):
        return open(KEY_FILE, "rb").read().strip()
    key = Fernet.generate_key()
    with open(KEY_FILE, "wb") as f:
        f.write(key)
    print(f"Clave nueva generada en {KEY_FILE} (NO commitear, NO perder)")
    return key


def connect(env):
    # Pooler session mode (puerto 5432) — transaction mode (6543) no sirve para dumps
    return pg8000.dbapi.connect(
        user=f"postgres.{env['SUPABASE_PROJECT_REF']}",
        host="aws-0-us-east-2.pooler.supabase.com",
        port=5432,
        database="postgres",
        password=env["SUPABASE_DB_PASSWORD"],
        ssl_context=True,
    )


def dump_all(conn):
    cur = conn.cursor()
    cur.execute(
        "select table_name from information_schema.tables "
        "where table_schema='public' and table_type='BASE TABLE' order by table_name"
    )
    tables = [r[0] for r in cur.fetchall()]
    data = {"_meta": {"date": datetime.datetime.now().isoformat(), "tables": {}}}
    for t in tables:
        try:
            cur.execute(f'SELECT * FROM public."{t}"')
            cols = [d[0] for d in cur.description]
            rows = [dict(zip(cols, r)) for r in cur.fetchall()]
            for r in rows:
                for k, v in r.items():
                    if isinstance(v, (datetime.date, datetime.datetime)):
                        r[k] = v.isoformat()
            data["_meta"]["tables"][t] = len(rows)
            data[t] = rows
        except Exception as e:
            data["_meta"]["tables"][t] = f"ERROR: {e}"
    return data


def serialize(data):
    raw = json.dumps(data, ensure_ascii=False, default=str).encode("utf-8")
    return gzip.compress(raw, compresslevel=9)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--verify", action="store_true", help="Listar contenido del ultimo backup")
    args = ap.parse_args()

    os.makedirs(BACKUP_DIR, exist_ok=True)
    env = load_env()
    conn = connect(env)

    if args.verify:
        backups = sorted(
            (f for f in os.listdir(BACKUP_DIR) if f.endswith(".enc")),
            reverse=True,
        )
        if not backups:
            sys.exit("No hay backups en " + BACKUP_DIR)
        path = os.path.join(BACKUP_DIR, backups[0])
        f = Fernet(get_key())
        raw = gzip.decompress(f.decrypt(open(path, "rb").read()))
        data = json.loads(raw)
        print(f"Backup: {backups[0]}")
        for t, n in data["_meta"]["tables"].items():
            print(f"  {t}: {n}")
        return

    data = dump_all(conn)
    conn.close()

    stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M")
    out = os.path.join(BACKUP_DIR, f"nexuslib_{stamp}.json.gz.enc")
    f = Fernet(get_key())
    enc = f.encrypt(serialize(data))
    with open(out, "wb") as fh:
        fh.write(enc)

    size_kb = os.path.getsize(out) / 1024
    print(f"Backup OK -> {out} ({size_kb:.0f} KB)")
    for t, n in data["_meta"]["tables"].items():
        print(f"  {t}: {n}")


if __name__ == "__main__":
    main()
