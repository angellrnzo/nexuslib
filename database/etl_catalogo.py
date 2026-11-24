#!/usr/bin/env python3
"""ETL catálogo: GameList.xlsx -> SQL para Supabase (Phase 4, tabs restantes).

Genera `etl_catalogo.sql` idempotente cubriendo Peliculas_Series, Libros y
Mangas. Misma filosofía que etl_juegos.py; el mapeo sigue
AppScript/etl_mapping.md (decisiones cerradas 2026-11-24).

Uso:
    python database/etl_catalogo.py --users angel=correo@x,talmai=correo@y
"""

import argparse
import json
import re
import sys
from datetime import datetime, date
from pathlib import Path

import openpyxl

REPO = Path(__file__).resolve().parent.parent
XLSX_DEFAULT = REPO / "AppScript" / "GameList.xlsx"
OUT_DEFAULT = Path(__file__).resolve().parent / "etl_catalogo.sql"

STATUS_MAP = {
    "No jugado": "backlog",
    "En proceso": "in_progress",
    "Completado": "completed",
}

USERS = []  # (sheet_suffix, email)


def s(value):
    if value is None:
        return "null"
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    text = str(value).strip()
    if text == "" or text.lower() in ("none", "n/a", "nan"):
        return "null"
    return "'" + text.replace("'", "''") + "'"


def j(value):
    return s(json.dumps(value, ensure_ascii=False)) + "::jsonb"


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


def iso_date(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    text = str(value).strip()
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", text)
    return m.group(0) if m else None


def num_or_none(value):
    try:
        return float(str(value).replace(",", ".").replace("$", "").strip())
    except (TypeError, ValueError):
        return None


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


def load_tab(wb, tab):
    ws = wb[tab]
    it = ws.iter_rows(values_only=True)
    header = [str(h).strip() if h is not None else "" for h in next(it)]
    return [{k.casefold(): v for k, v in zip(header, r) if k}
            for r in it if any(v is not None for v in r)]


def tracking_rows(row, suffix):
    status_raw = clean_text(row.get(f"estado {suffix}"))
    stars = num_or_none(row.get(f"estrellas {suffix}"))
    wished = parse_bool(row.get(f"deseado {suffix}"))
    note = clean_text(row.get(f"nota {suffix}"))
    progress = clean_text(row.get(f"progreso {suffix}"))

    has_data = (bool(status_raw) or (stars is not None and stars > 0)
                or wished or bool(note) or bool(progress))
    if not has_data:
        return None
    return {
        "status": STATUS_MAP.get(status_raw) if status_raw else None,
        "rating": stars if (stars is not None and 1.0 <= stars <= 10.0) else None,
        "wishlist": wished,
        "notes": note,
        "progress": progress,
    }


def common_meta(row, extra_pairs):
    meta = {}
    for src, dst in extra_pairs:
        val = clean_text(row.get(src))
        if val is not None:
            meta[dst] = val
    genres = list_from_csv(row.get("generos"))
    if genres:
        meta["genres"] = genres
    score = clean_text(row.get("puntuacion"))
    if score:
        meta["catalog_score"] = score
    desc = clean_text(row.get("descripcion"))
    if desc:
        meta["description"] = desc
    rel = iso_date(row.get("estreno") or row.get("publicacion"))
    if rel:
        meta["release_date"] = rel
    return meta


def parse_duration(value):
    """'165 min' -> 165 (int)."""
    m = re.match(r"\s*(\d+)", str(value or ""))
    return int(m.group(1)) if m else None


# ---------------------------------------------------------------- catalogos

def items_peliculas(rows):
    items = []
    for r in rows:
        raw_id = clean_text(r.get("id"))
        if not raw_id or "-" not in raw_id:
            continue
        ext = raw_id.split("-", 1)[1]
        title = clean_text(r.get("titulo"))
        if not ext or not title:
            continue
        tipo = clean_text(r.get("tipo")) or ""
        meta = common_meta(r, [
            ("creador", "creator"),
            ("estado_emision", "emission_status"),
            ("plataformas", "platforms"),
        ])
        meta["media_type"] = "movie" if "pel" in tipo.lower() else "series"
        dur = parse_duration(r.get("duracion_temp"))
        if dur:
            meta["duration_min"] = dur
        items.append({
            "category": "Peliculas_Series",
            "provider": "tmdb",
            "external_id": ext,
            "title": title,
            "cover_url": clean_text(r.get("portada")),
            "trailer_url": clean_text(r.get("trailer")),
            "metadata": meta,
        })
    return items


def items_libros(rows):
    items = []
    for r in rows:
        raw_id = clean_text(r.get("id"))
        if not raw_id:
            continue
        ext = re.sub(r"^OL", "", raw_id, flags=re.IGNORECASE)  # conserva sufijo W
        title = clean_text(r.get("titulo"))
        if not ext or not title:
            continue
        meta = common_meta(r, [
            ("autor", "author"),
            ("editorial", "publisher"),
            ("isbn", "isbn"),
            ("paginas", "pages"),
        ])
        items.append({
            "category": "Libros",
            "provider": "openlibrary",
            "external_id": ext,
            "title": title,
            "cover_url": clean_text(r.get("portada")),
            "trailer_url": clean_text(r.get("trailer")),
            "metadata": meta,
        })
    return items


def items_mangas(rows):
    items = []
    for r in rows:
        raw_id = clean_text(r.get("id"))
        if not raw_id:
            continue
        ext = re.sub(r"^al-", "", raw_id, flags=re.IGNORECASE)
        title = clean_text(r.get("titulo"))
        if not ext or not title:
            continue
        meta = common_meta(r, [
            ("autor", "author"),
            ("editorial", "publisher"),
            ("estado_emision", "emission_status"),
            ("tomos_caps", "volumes_chapters"),
            ("demografia", "demographic"),
        ])
        caps = num_or_none(r.get("capitulos_totales"))
        if caps:
            meta["total_chapters"] = int(caps)
        items.append({
            "category": "Mangas",
            "provider": "anilist",
            "external_id": ext,
            "title": title,
            "cover_url": clean_text(r.get("portada")),
            "trailer_url": clean_text(r.get("trailer")),
            "metadata": meta,
        })
    return items


BUILDERS = {
    "Peliculas_Series": items_peliculas,
    "Libros": items_libros,
    "Mangas": items_mangas,
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--xlsx", type=Path, default=XLSX_DEFAULT)
    ap.add_argument("--out", type=Path, default=OUT_DEFAULT)
    ap.add_argument("--users", required=True,
                    help="pares nombre=correo separados por coma")
    ap.add_argument("--chunk", type=int, default=50)
    args = ap.parse_args()

    global USERS
    for pair in args.users.split(","):
        name, email = pair.split("=", 1)
        USERS.append((name.strip().lower(), email.strip()))
    suffixes = [n for n, _ in USERS]

    wb = openpyxl.load_workbook(args.xlsx, read_only=True, data_only=True)
    all_items, all_track = [], {n: [] for n, _ in USERS}
    for tab, builder in BUILDERS.items():
        rows = load_tab(wb, tab)
        items = builder(rows)
        all_items.extend(items)
        ext_by_cat = {it["external_id"]: it["category"] for it in items}
        for r in rows:
            # localizar el item por external_id derivado del ID de la fila
            for name in suffixes:
                t = tracking_rows(r, name)
                if not t:
                    continue
                raw_id = clean_text(r.get("id"))
                if not raw_id:
                    continue
                if tab == "Peliculas_Series":
                    ext = raw_id.split("-", 1)[1] if "-" in raw_id else None
                elif tab == "Libros":
                    ext = re.sub(r"^OL", "", raw_id, flags=re.IGNORECASE)
                else:
                    ext = re.sub(r"^al-", "", raw_id, flags=re.IGNORECASE)
                if ext:
                    all_track[name].append({"category": tab, "external_id": ext, **t})
        print(f"{tab}: {len(items)} items")

    out = ["-- ETL catalogo (Peliculas_Series + Libros + Mangas) — etl_catalogo.py",
           f"-- {len(all_items)} items | {sum(len(v) for v in all_track.values())} tracking",
           "-- idempotente: ON CONFLICT DO NOTHING", "begin;", ""]

    for i in range(0, len(all_items), args.chunk):
        vals = []
        for it_ in all_items[i:i + args.chunk]:
            vals.append(
                f"({s(it_['category'])},{s(it_['provider'])},{s(it_['external_id'])},"
                f"{s(it_['title'])},{s(it_['cover_url'])},{s(it_['trailer_url'])},{j(it_['metadata'])})"
            )
        out.append(
            "insert into public.media_items\n"
            "  (category, provider, external_id, title, cover_url, trailer_url, metadata)\n"
            "values\n  " + ",\n  ".join(vals) + "\n"
            "on conflict (category, provider, external_id) do nothing;\n"
        )

    # library_items por categoria
    cats = ", ".join(s(c) for c in BUILDERS)
    emails = ", ".join(s(e) for _n, e in USERS)
    out.append(
        "-- library_items: catalogo completo a cada biblioteca personal\n"
        "insert into public.library_items (library_id, media_item_id, added_by)\n"
        "select l.id, mi.id, l.created_by\n"
        "from public.media_items mi\n"
        "join public.libraries l on l.kind = 'personal'\n"
        "join public.library_members lm on lm.library_id = l.id\n"
        "join auth.users u on u.id = lm.profile_id\n"
        "where mi.category in (" + cats + ")\n"
        "  and u.email in (" + emails + ")\n"
        "on conflict do nothing;\n"
    )

    # tracking por usuario — un INSERT por categoria para el join exacto
    for name, email in USERS:
        for tab in BUILDERS:
            rows_t = [t for t in all_track[name] if t["category"] == tab]
            if not rows_t:
                continue
            vals = []
            for t in rows_t:
                vals.append(
                    f"({s(t['external_id'])},{s(t['status'])},{s(t['rating'])},"
                    f"{'true' if t['wishlist'] else 'false'},{s(t['notes'])},{s(t['progress'])})"
                )
            provider = {"Peliculas_Series": "tmdb", "Libros": "openlibrary", "Mangas": "anilist"}[tab]
            out.append(
                f"-- tracking {name} / {tab} ({len(rows_t)})\n"
                "insert into public.user_media_tracking\n"
                "  (profile_id, media_item_id, status, rating, is_wishlisted, personal_notes, progress)\n"
                "select (select id from auth.users where email = " + s(email) + "), mi.id,\n"
                "       v.status::public.track_status, v.rating::numeric, v.wishlist,\n"
                "       nullif(v.notes, ''), nullif(v.progress, '')\n"
                "from (values\n  " + ",\n  ".join(vals) + "\n"
                ") as v(external_id, status, rating, wishlist, notes, progress)\n"
                f"join public.media_items mi\n"
                f"  on mi.category = {s(tab)} and mi.provider = {s(provider)} and mi.external_id = v.external_id\n"
                "on conflict (profile_id, media_item_id) do nothing;\n"
            )

    out.append("commit;")
    args.out.write_text("\n".join(out), encoding="utf-8")
    print(f"SQL: {args.out} ({args.out.stat().st_size/1024:.0f} KB)")


if __name__ == "__main__":
    sys.exit(main())
