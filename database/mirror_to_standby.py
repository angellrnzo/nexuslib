#!/usr/bin/env python3
"""
mirror_to_standby.py — Espejo vivo principal -> standby.

Vuelca todas las tablas public del SOURCE al TARGET:
  1. Dump de tablas via psycopg2 (filas como dicts)
  2. TRUNCATE ... CASCADE de todas las tablas public del target
     (auth.users NO se toca — los profiles se remapean por username)
  3. Remap de profile ids: los UUIDs de auth.users difieren entre
     proyectos; se traduce viejo->nuevo via profiles.username
  4. INSERT en orden FK

Uso:
    python database/mirror_to_standby.py --source-url <url> --target-url <url>

Las URLs son connstrings postgres:// (pooler OK). Usado por
.github/workflows/backup-supabase.yml y manual para refresh del standby.
"""

import argparse
import json
import sys

import psycopg2
from psycopg2.extras import Json, RealDictCursor

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


def connect(url):
    return psycopg2.connect(url)


def list_tables(cur):
    cur.execute(
        "select table_name from information_schema.tables "
        "where table_schema='public' and table_type='BASE TABLE' order by table_name"
    )
    rows = cur.fetchall()
    if rows and isinstance(rows[0], dict):
        return [r["table_name"] for r in rows]
    return [r[0] for r in rows]


def dump_tables(conn):
    cur = conn.cursor(cursor_factory=RealDictCursor)
    tables = list_tables(cur)
    data = {}
    for t in tables:
        cur.execute(f'SELECT * FROM public."{t}"')
        data[t] = [dict(r) for r in cur.fetchall()]
    return data


def truncate_all(cur, tables):
    if not tables:
        return
    names = ", ".join(f'public."{t}"' for t in tables)
    cur.execute(f"TRUNCATE {names} RESTART IDENTITY CASCADE")


def remap_profile_ids(data, cur):
    """Traduce profile ids del source a los del target via username."""
    src_profiles = data.get("profiles") or []
    old_by_user = {r["username"]: r["id"] for r in src_profiles if r.get("username")}
    cur.execute("select id, username from public.profiles")
    rows = cur.fetchall()
    if rows and isinstance(rows[0], dict):
        new_by_user = {r["username"]: r["id"] for r in rows if r.get("username")}
    else:
        new_by_user = {u: i for i, u in rows if u}
    id_map = {old: new_by_user[u] for u, old in old_by_user.items() if u in new_by_user}
    missing = set(old_by_user) - set(new_by_user)
    if missing:
        print(f"  WARN usernames sin perfil en target: {missing} — correr sync_auth_users.py")
    if not id_map:
        return data, 0

    def walk(v):
        if isinstance(v, str) and v in id_map:
            return id_map[v]
        if isinstance(v, (list, tuple)):
            return [walk(x) for x in v]
        if isinstance(v, dict):
            return {k: walk(x) for k, x in v.items()}
        return v

    for t, rows in data.items():
        if t == "profiles":
            continue
        data[t] = [{k: walk(v) for k, v in r.items()} for r in rows]

    # profiles del target ya existen (trigger auth); insertar solo campos
    # que no sean id. Las filas source traen id viejo -> insertar sin id?
    # profiles.id es PK -> mejor UPDATE de campos mutables por username.
    for r in src_profiles:
        u = r.get("username")
        if u in new_by_user:
            cur.execute(
                """update public.profiles set display_name=%s, avatar_url=%s,
                   locale=%s, preferences=%s where username=%s""",
                (r.get("display_name"), r.get("avatar_url"), r.get("locale"),
                 Json(r["preferences"]) if isinstance(r.get("preferences"), dict) else r.get("preferences"), u),
            )
    return data, len(id_map)


def insert_rows(cur, table, rows):
    if not rows:
        return 0
    cols = list(rows[0].keys())
    collist = ", ".join(f'"{c}"' for c in cols)
    ph = ", ".join(["%s"] * len(cols))
    sql = f'INSERT INTO public."{table}" ({collist}) VALUES ({ph})'
    n = 0
    for r in rows:
        vals = [Json(v) if isinstance(v, dict) else v for v in (r[c] for c in cols)]
        cur.execute(sql, vals)
        n += 1
    return n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source-url", required=True)
    ap.add_argument("--target-url", required=True)
    args = ap.parse_args()

    src = connect(args.source_url)
    dst = connect(args.target_url)
    dst.autocommit = False

    print("Dump source...")
    data = dump_tables(src)
    src.close()
    total_src = sum(len(v) for k, v in data.items() if not k.startswith("_"))
    print(f"  {len(data)} tablas, {total_src} filas")

    dcur = dst.cursor(cursor_factory=RealDictCursor)
    tables = list_tables(dcur)
    print(f"Target: {len(tables)} tablas — truncando...")
    # profiles NO se trunca: los crea el trigger de auth.users con UUIDs propios
    truncate_all(dcur, [t for t in tables if t != "profiles"])
    dst.commit()

    data, nmap = remap_profile_ids(data, dcur)
    print(f"  profile id remap: {nmap}")

    ordered = [t for t in ORDER if t in data and t != "profiles"] + sorted(
        t for t in data if t not in ORDER and t != "profiles" and not t.startswith("_")
    )
    total = 0
    for t in ordered:
        n = insert_rows(dcur, t, data.get(t) or [])
        total += n
        print(f"  {t}: {n}")
    dst.commit()
    dst.close()
    print(f"Mirror completo: {total} filas")


if __name__ == "__main__":
    main()
