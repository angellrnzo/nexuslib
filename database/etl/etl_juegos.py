#!/usr/bin/env python3
"""ETL Juegos: GameList.xlsx -> SQL para Supabase (Phase 4).

Genera `etl_juegos.sql` idempotente (ON CONFLICT) listo para pegar en el
SQL Editor de Supabase o ejecutar via pooler cuando este disponible.

Uso:
    python database/etl_juegos.py --users angel=correo@x, talmai=correo@y

El mapeo sigue AppScript/etl_mapping.md (decisiones cerradas 2026-11-24):
- provider='steam', external_id=AppID int sin decimales
- metadata jsonb con claves especificas (NO las genéricas de v1)
- Estado -> track_status en ingles; Estrellas 1-10 directo (0.0 -> NULL)
- Deseado -> is_wishlisted; items sin tracking -> ambas libraries
- Papelera: no se migra
"""

import argparse
import json
import re
import sys
from datetime import datetime, date
from pathlib import Path

import openpyxl

REPO = Path(__file__).resolve().parents[2]
XLSX_DEFAULT = REPO / "AppScript" / "GameList.xlsx"
OUT_DEFAULT = Path(__file__).resolve().parent / "etl_juegos.sql"

STATUS_MAP = {
    "No jugado": "backlog",
    "En proceso": "in_progress",
    "Completado": "completed",
}

CATEGORY = "Juegos"
PROVIDER = "steam"


def s(value):
    """SQL string literal o NULL."""
    if value is None:
        return "null"
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    text = str(value).strip()
    if text == "" or text.lower() in ("none", "n/a", "nan"):
        return "null"
    return "'" + text.replace("'", "''") + "'"


def j(value):
    """jsonb literal."""
    return s(json.dumps(value, ensure_ascii=False)) + "::jsonb"


def iso_date(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    text = str(value).strip()
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", text)
    return m.group(0) if m else (text or None)


def num_or_none(value):
    try:
        f = float(str(value).replace(",", ".").replace("$", "").strip())
    except (TypeError, ValueError):
        return None
    return f


def parse_bool(value):
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return str(value).strip().lower() in ("true", "1", "si", "sí", "x")


def list_from_csv(value):
    if not value:
        return None
    parts = [p.strip() for p in str(value).split(",") if p.strip()]
    return parts or None


def appid_int(value):
    f = num_or_none(value)
    return str(int(f)) if f is not None else None


PLACEHOLDERS = {"-", "n/a", "na", "none", "null", "por confirmarse", "sin datos"}


def clean_text(value):
    if value is None:
        return None
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    text = str(value).strip()
    if not text or text.lower() in PLACEHOLDERS:
        return None
    return text


def build_metadata(row):
    meta = {}
    pairs = [
        ("Developer", "developer"),
        ("Distribuidora", "publisher"),
        ("Precio", "price"),
        ("Metacritic", "metacritic"),
        ("SteamDeck", "steam_deck"),
        ("Capturas", "screenshots"),
        ("Modos", "modes"),
        ("Tags", "tags"),
        ("Descripcion", "description"),
        ("notaParche", "last_patch_note"),
    ]
    for src, dst in pairs:
        val = clean_text(row.get(src.lower()))
        if val is not None:
            meta[dst] = val
    # numéricos / fechas con formato propio
    be = num_or_none(row.get("buildestable"))
    if be is not None:
        meta["build_estable"] = int(be) if be.is_integer() else be
    bd = iso_date(row.get("fechaestable"))
    if bd:
        meta["build_date"] = bd
    dlcs_num = num_or_none(row.get("dlcs"))
    if dlcs_num is not None and dlcs_num > 0:
        meta["dlcs"] = int(dlcs_num) if dlcs_num.is_integer() else dlcs_num
    genres = list_from_csv(row.get("generos"))
    if genres:
        meta["genres"] = genres
    rel_raw = clean_text(row.get("lanzamiento"))
    rel = iso_date(row.get("lanzamiento"))
    if rel:
        meta["release_date"] = rel
    elif rel_raw:
        meta["release_date_raw"] = rel_raw
    beta = list_from_csv(row.get("beta"))
    if beta:
        meta["beta_branches"] = beta
    return meta


def tracking_rows(row, suffix):
    """Devuelve dict de tracking para un usuario o None si no hay datos."""
    status_raw = clean_text(row.get(f"estado {suffix.lower()}"))
    stars = num_or_none(row.get(f"estrellas {suffix.lower()}"))
    wished = parse_bool(row.get(f"deseado {suffix.lower()}"))
    note = clean_text(row.get(f"nota {suffix.lower()}"))

    has_data = bool(status_raw) or (stars is not None and stars > 0) or wished or bool(note)
    if not has_data:
        return None

    status = STATUS_MAP.get(status_raw) if status_raw else None
    rating = stars if (stars is not None and 1.0 <= stars <= 10.0) else None
    return {
        "status": status,
        "rating": rating,
        "wishlist": wished,
        "notes": note,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--xlsx", type=Path, default=XLSX_DEFAULT)
    ap.add_argument("--out", type=Path, default=OUT_DEFAULT)
    ap.add_argument(
        "--users",
        required=True,
        help="pares nombre=correo separados por coma, ej: angel=a@x.com,talmai=b@x.com",
    )
    ap.add_argument("--chunk", type=int, default=100, help="filas por INSERT de media_items")
    args = ap.parse_args()

    users = []
    for pair in args.users.split(","):
        name, email = pair.split("=", 1)
        users.append((name.strip(), email.strip()))
    suffixes = [n for n, _ in users]

    wb = openpyxl.load_workbook(args.xlsx, read_only=True, data_only=True)
    ws = wb["Juegos"]
    it = ws.iter_rows(values_only=True)
    header = [str(h).strip() if h is not None else "" for h in next(it)]
    rows = [{k.casefold(): v for k, v in zip(header, r) if k} for r in it if any(v is not None for v in r)]

    items, track = [], {n: [] for n, _ in users}
    skipped = 0
    for r in rows:
        ext = appid_int(r.get("appid"))
        title = clean_text(r.get("nombre"))
        if not ext or not title:
            skipped += 1
            continue
        meta = build_metadata(r)
        items.append({
            "external_id": ext,
            "title": title,
            "cover_url": clean_text(r.get("portada")),
            "trailer_url": clean_text(r.get("trailer")),
            "metadata": meta,
        })
        for name, _email in users:
            t = tracking_rows(r, name)
            if t:
                track[name].append({"external_id": ext, **t})

    out = []
    out.append("-- ETL Juegos — generado por database/etl_juegos.py")
    out.append(f"-- fuente: {args.xlsx.name} | {len(items)} items | {sum(len(v) for v in track.values())} tracking rows")
    out.append("-- idempotente: ON CONFLICT DO NOTHING en todas las tablas")
    out.append("begin;\n")

    # 1) media_items (chunks)
    for i in range(0, len(items), args.chunk):
        chunk = items[i:i + args.chunk]
        vals = []
        for it_ in chunk:
            vals.append(
                f"({s(CATEGORY)},{s(PROVIDER)},{s(it_['external_id'])},{s(it_['title'])},"
                f"{s(it_['cover_url'])},{s(it_['trailer_url'])},{j(it_['metadata'])})"
            )
        out.append(
            "insert into public.media_items\n"
            "  (category, provider, external_id, title, cover_url, trailer_url, metadata)\n"
            "values\n  " + ",\n  ".join(vals) + "\n"
            "on conflict (category, provider, external_id) do nothing;\n"
        )

    emails = ", ".join(s(e) for _n, e in users)

    # 2) library_items: todo el catalogo a la biblioteca personal de cada usuario
    out.append(
        "-- library_items: cada usuario recibe todo el catalogo (decision ETL #2)\n"
        "insert into public.library_items (library_id, media_item_id, added_by)\n"
        "select l.id, mi.id, l.created_by\n"
        "from public.media_items mi\n"
        "join public.libraries l on l.kind = 'personal'\n"
        "join public.library_members lm on lm.library_id = l.id\n"
        "join auth.users u on u.id = lm.profile_id\n"
        "where mi.category = 'Juegos'\n"
        "  and u.email in (" + emails + ")\n"
        "on conflict do nothing;\n"
    )

    # 3) user_media_tracking por usuario (VALUES + join)
    for name, email in users:
        rows_t = track[name]
        if not rows_t:
            continue
        vals = []
        for t in rows_t:
            vals.append(
                f"({s(t['external_id'])},{s(t['status'])},{s(t['rating'])},"
                f"{'true' if t['wishlist'] else 'false'},{s(t['notes'])})"
            )
        out.append(
            f"-- tracking: {name} ({len(rows_t)} filas)\n"
            "insert into public.user_media_tracking\n"
            "  (profile_id, media_item_id, status, rating, is_wishlisted, personal_notes)\n"
            "select (select id from auth.users where email = " + s(email) + "), mi.id,\n"
            "       v.status::public.track_status, v.rating::numeric, v.wishlist, nullif(v.notes, '')\n"
            "from (values\n  " + ",\n  ".join(vals) + "\n"
            ") as v(external_id, status, rating, wishlist, notes)\n"
            "join public.media_items mi\n"
            "  on mi.category = 'Juegos' and mi.provider = 'steam' and mi.external_id = v.external_id\n"
            "on conflict (profile_id, media_item_id) do nothing;\n"
        )

    out.append("commit;")

    args.out.write_text("\n".join(out), encoding="utf-8")
    print(f"OK: {len(items)} media_items, {sum(len(v) for v in track.values())} tracking, {skipped} filas sin AppID/titulo")
    print(f"SQL generado: {args.out} ({args.out.stat().st_size/1024:.0f} KB)")
    for name, _e in users:
        print(f"  tracking {name}: {len(track[name])}")


if __name__ == "__main__":
    sys.exit(main())
