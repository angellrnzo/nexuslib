#!/usr/bin/env python3
"""
apply_schema.py — Aplica el schema completo de NexusLib a un proyecto
Supabase (principal, standby, o reconstruccion tras desastre).

Uso:
    python database/apply_schema.py --project-ref <ref> [--password <pw>]

Si no se pasa --password, lo lee de _local/supabase_credentials.env
(SUPABASE_DB_PASSWORD para el principal; para standby define
SUPABASE_STANDBY_DB_PASSWORD o pasalo con --password).

Orden aplicado (fuente de verdad: database/RESTORE.md):
    00-06 (schema + phases + perf)
"""

import argparse
import os
import sys

import psycopg2

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE = os.path.join(ROOT, "..", "_local", "supabase_credentials.env")
DB_DIR = os.path.join(ROOT, "database")

FILES = [
    "00_schema.sql",
    "01_phase4_5.sql",
    "02_phase5c_item_privacy.sql",
    "03_phase5d_item_shares.sql",
    "04_phase5e_optin_label.sql",
    "05_phase5h_username.sql",
    "06_get_items_merged_perf.sql",
]

# Deltas idempotentes (02+): seguros de re-correr — create or replace,
# if not exists, drop if exists. 00/01 son bootstrap, NO re-correr.
FILES_DELTAS = FILES[2:]


def load_env():
    env = {}
    if os.path.exists(ENV_FILE):
        for line in open(ENV_FILE, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project-ref", default=None)
    ap.add_argument("--password", default=None)
    ap.add_argument("--host", default="aws-0-us-east-2.pooler.supabase.com")
    ap.add_argument("--port", type=int, default=5432)
    ap.add_argument("--url", default=None, help="connstring postgres:// completa (tiene prioridad)")
    ap.add_argument("--deltas", action="store_true",
                    help="solo archivos 02+ (idempotentes) — para sync de standby")
    args = ap.parse_args()
    if not args.url and not args.project_ref:
        ap.error("se requiere --project-ref o --url")

    env = load_env()
    password = args.password or env.get("SUPABASE_STANDBY_DB_PASSWORD") or env.get("SUPABASE_DB_PASSWORD")
    if not password:
        sys.exit("Falta password: --password o SUPABASE_*_DB_PASSWORD en _local")

    dsn = args.url or (
        f"host={args.host} port={args.port} dbname=postgres "
        f"user=postgres.{args.project_ref} password={password} sslmode=require"
    )
    conn = psycopg2.connect(dsn)
    conn.autocommit = True
    cur = conn.cursor()

    files = FILES_DELTAS if args.deltas else FILES
    for name in files:
        path = os.path.join(DB_DIR, name)
        sql = open(path, encoding="utf-8").read()
        print(f"Aplicando {name} ({len(sql)} chars)...")
        cur.execute(sql)
        print(f"  OK")

    cur.execute(
        "select count(*) from information_schema.tables where table_schema='public'"
    )
    print(f"Tablas en public: {cur.fetchone()[0]}")
    conn.close()
    print("Schema aplicado.")


if __name__ == "__main__":
    main()
