#!/usr/bin/env python3
"""
sync_auth_users.py — Replica los usuarios de auth del proyecto principal
al standby (o a un proyecto nuevo tras desastre).

auth.users NO viaja en pg_dump (schema auth es del sistema). Este script
los recrea via Admin API: email + password aleatoria + email_confirm=true
-> los usuarios entran por magic link / "olvide mi password" sin problema.

Uso:
    python database/sync_auth_users.py --standby-ref <ref> --standby-key <service_role_key>

Lee del principal: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY de
_local/supabase_credentials.env. Del standby pide --standby-key (Dashboard
-> Settings -> API Keys -> service_role; NUNCA commitear).

Nota: si un usuario ya existe en el destino se salta (no pisa passwords).
"""

import argparse
import json
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE = os.path.join(ROOT, "..", "_local", "supabase_credentials.env")


def load_env():
    env = {}
    if os.path.exists(ENV_FILE):
        for line in open(ENV_FILE, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env


def api(base, key, path, method="GET", body=None):
    req = urllib.request.Request(
        f"{base}/auth/v1/admin/{path}",
        data=json.dumps(body).encode() if body else None,
        headers={
            "Authorization": f"Bearer {key}",
            "apikey": key,
            "Content-Type": "application/json",
        },
        method=method,
    )
    return json.load(urllib.request.urlopen(req))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--standby-ref", required=True)
    ap.add_argument("--standby-key", required=True, help="service_role del standby")
    args = ap.parse_args()

    env = load_env()
    src_url = env["SUPABASE_URL"].rstrip("/")
    src_key = env["SUPABASE_SERVICE_ROLE_KEY"]
    dst_url = f"https://{args.standby_ref}.supabase.co"
    dst_key = args.standby_key

    users = api(src_url, src_key, "users?per_page=200")
    users = users.get("users", users) if isinstance(users, dict) else users
    print(f"Usuarios en principal: {len(users)}")

    existing = api(dst_url, dst_key, "users?per_page=200")
    existing = existing.get("users", existing) if isinstance(existing, dict) else existing
    dst_emails = {u["email"] for u in existing}

    created = skipped = 0
    for u in users:
        email = u.get("email")
        if not email or email in dst_emails:
            skipped += 1
            continue
        api(dst_url, dst_key, "users", "POST", {
            "email": email,
            "password": os.urandom(24).hex(),  # aleatoria; entran por magic link
            "email_confirm": True,
            "user_metadata": u.get("user_metadata") or {},
        })
        print(f"  + {email}")
        created += 1

    print(f"Listo: {created} creados, {skipped} ya existian")


if __name__ == "__main__":
    main()
