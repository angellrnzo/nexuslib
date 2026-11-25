-- ============================================================================
-- Phase 4 — corte frontend: setup test + get_items_merged()
--
-- 1) display_name de los users test -> 'Angel' / 'Talmai' (las keys del UI
--    v1 son estadoAngel/estrellasTalmai... derivadas del nombre)
-- 2) vinculación 'pareja' ACEPTADA en ambos sentidos con visibilidad total
--    (paridad con el Sheet compartido de v1; ajustable luego por campo)
-- 3) get_items_merged(p_category) -> setof jsonb con la shape plana v1
--
-- Ejecutar en SQL Editor. Idempotente.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) display_name
-- ---------------------------------------------------------------------------
update public.profiles p
set display_name = 'Angel'
from auth.users u
where u.id = p.id and u.email = 'angellrnzo@gmail.com';

update public.profiles p
set display_name = 'Talmai'
from auth.users u
where u.id = p.id and u.email = 'angellrnzor@gmail.com';

-- ---------------------------------------------------------------------------
-- 2) library_links pareja aceptada, ambos sentidos, visibilidad completa
-- ---------------------------------------------------------------------------
with libs as (
  select u.email, l.id as lib_id
  from auth.users u
  join public.library_members lm on lm.profile_id = u.id
  join public.libraries l on l.id = lm.library_id and l.kind = 'personal'
  where u.email in ('angellrnzo@gmail.com', 'angellrnzor@gmail.com')
)
insert into public.library_links
  (owner_library_id, linked_library_id, link_type, status, visibility, resolved_at)
select a.lib_id, b.lib_id, 'pareja', 'accepted',
       '{"Juegos":{"status":true,"rating":true,"wishlist":true,"progress":true,"notes":true,"mods":true},
         "Peliculas_Series":{"status":true,"rating":true,"wishlist":true,"progress":true,"notes":true,"mods":true},
         "Libros":{"status":true,"rating":true,"wishlist":true,"progress":true,"notes":true,"mods":true},
         "Mangas":{"status":true,"rating":true,"wishlist":true,"progress":true,"notes":true,"mods":true}}'::jsonb,
       now()
from libs a, libs b
where a.email = 'angellrnzo@gmail.com' and b.email = 'angellrnzor@gmail.com'
on conflict (owner_library_id, linked_library_id) do nothing;

with libs as (
  select u.email, l.id as lib_id
  from auth.users u
  join public.library_members lm on lm.profile_id = u.id
  join public.libraries l on l.id = lm.library_id and l.kind = 'personal'
  where u.email in ('angellrnzo@gmail.com', 'angellrnzor@gmail.com')
)
insert into public.library_links
  (owner_library_id, linked_library_id, link_type, status, visibility, resolved_at)
select a.lib_id, b.lib_id, 'pareja', 'accepted',
       '{"Juegos":{"status":true,"rating":true,"wishlist":true,"progress":true,"notes":true,"mods":true},
         "Peliculas_Series":{"status":true,"rating":true,"wishlist":true,"progress":true,"notes":true,"mods":true},
         "Libros":{"status":true,"rating":true,"wishlist":true,"progress":true,"notes":true,"mods":true},
         "Mangas":{"status":true,"rating":true,"wishlist":true,"progress":true,"notes":true,"mods":true}}'::jsonb,
       now()
from libs a, libs b
where a.email = 'angellrnzor@gmail.com' and b.email = 'angellrnzo@gmail.com'
on conflict (owner_library_id, linked_library_id) do nothing;

-- ---------------------------------------------------------------------------
-- 3) get_items_merged — shape plana v1 por categoria para el usuario actual
-- ---------------------------------------------------------------------------
create or replace function public.get_items_merged(p_category text)
returns setof jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  my_uid   uuid := auth.uid();
  my_lib   uuid;
  my_pname text;
  rec      record;
  obj      jsonb;
  t        record;
  vp       record;
  vis      jsonb;
  suf      text;
  genres_txt text;
begin
  if my_uid is null then
    raise exception 'not authenticated';
  end if;

  select l.id into my_lib
  from public.libraries l
  join public.library_members lm on lm.library_id = l.id
  where lm.profile_id = my_uid and l.kind = 'personal'
  limit 1;
  if my_lib is null then return; end if;

  select p.display_name into my_pname from public.profiles p where p.id = my_uid;
  suf := initcap(split_part(coalesce(my_pname, 'Yo'), ' ', 1));

  for rec in
    select mi.*, li.id as li_id
    from public.library_items li
    join public.media_items mi on mi.id = li.media_item_id
    where li.library_id = my_lib and li.deleted_at is null
      and mi.category = p_category
    order by mi.title
  loop
    -- catalogo: keys v1
    select string_agg(x, ', ') into genres_txt
    from jsonb_array_elements_text(coalesce(rec.metadata -> 'genres', '[]'::jsonb)) x;

    obj := jsonb_build_object(
      'id',          rec.external_id,
      'titulo',      rec.title,
      'portada',     rec.cover_url,
      'trailer',     rec.trailer_url,
      'descripcion', rec.metadata ->> 'description',
      'generos',     genres_txt,
      'creador',     coalesce(rec.metadata ->> 'developer', rec.metadata ->> 'creator',
                              rec.metadata ->> 'author', ''),
      'autor',       coalesce(rec.metadata ->> 'developer', rec.metadata ->> 'creator',
                              rec.metadata ->> 'author', ''),
      'editorial',   rec.metadata ->> 'publisher',
      'fecha',       rec.metadata ->> 'release_date',
      'precio',      rec.metadata ->> 'price',
      'dlcs',        rec.metadata ->> 'dlcs',
      'puntuacion',  coalesce(rec.metadata ->> 'metacritic', rec.metadata ->> 'catalog_score', 'N/A'),
      'steamdeck',   rec.metadata ->> 'steam_deck',
      'capturas',    rec.metadata ->> 'screenshots',
      'modos',       rec.metadata ->> 'modes',
      'tags',        rec.metadata ->> 'tags',
      'tipo',        case rec.metadata ->> 'media_type'
                       when 'movie' then 'Película' when 'series' then 'Serie' else null end,
      'extension',   coalesce(rec.metadata ->> 'duration_min', rec.metadata ->> 'pages',
                              rec.metadata ->> 'volumes_chapters'),
      'plataformas', rec.metadata ->> 'platforms',
      'estadoEmision', rec.metadata ->> 'emission_status',
      'isbn',        rec.metadata ->> 'isbn',
      'demografia',  rec.metadata ->> 'demographic',
      'capitulosTotales', coalesce((rec.metadata ->> 'total_chapters')::int, 0),
      'versionEstable', coalesce(rec.metadata ->> 'build_estable', '-'),
      'versionPatch', '-',
      'versionBeta', '-',
      'buildEstable', coalesce(rec.metadata ->> 'build_estable', '-'),
      'fechaEstable', coalesce(rec.metadata ->> 'build_date', '-'),
      'beta',        coalesce((select string_agg(x, ', ') from jsonb_array_elements_text(
                                coalesce(rec.metadata -> 'beta_branches', '[]'::jsonb)) x), '-'),
      'notaParche',  coalesce(rec.metadata ->> 'last_patch_note', '-'),
      'dupli',       '-'
    );

    -- tracking propio: siempre completo
    select umt.status, umt.rating, umt.is_wishlisted, umt.progress, umt.personal_notes
    into t
    from public.user_media_tracking umt
    where umt.profile_id = my_uid and umt.media_item_id = rec.id;

    obj := obj || jsonb_build_object(
      'estado'   || suf, case t.status when 'completed' then 'Completado'
                                   when 'in_progress' then 'En proceso' else 'No jugado' end,
      'estrellas'|| suf, coalesce(t.rating, 0),
      'deseado'  || suf, coalesce(t.is_wishlisted, false),
      'progreso' || suf, coalesce(t.progress, ''),
      'nota'     || suf, coalesce(t.personal_notes, '')
    );

    -- tracking de perfiles vinculados: gated por visibility del link
    -- (owner=ellos -> linked=yo); lo no visible se emite como "sin datos"
    for vp in
      select p.id as pid, p.display_name as pname, ll.visibility as vis
      from public.library_links ll
      join public.libraries ol on ol.id = ll.owner_library_id and ol.kind = 'personal'
      join public.library_members olm on olm.library_id = ol.id
      join public.profiles p on p.id = olm.profile_id
      join public.library_members vlm on vlm.library_id = ll.linked_library_id
                                     and vlm.profile_id = my_uid
      where ll.status = 'accepted' and p.id <> my_uid
    loop
      vis := vp.vis -> p_category;
      select umt.status, umt.rating, umt.is_wishlisted, umt.progress, umt.personal_notes
      into t
      from public.user_media_tracking umt
      where umt.profile_id = vp.pid
        and umt.media_item_id = rec.id
        and umt.is_private = false;

      suf := initcap(split_part(coalesce(vp.pname, 'X'), ' ', 1));
      obj := obj || jsonb_build_object(
        'estado'   || suf, case when coalesce((vis ->> 'status')::boolean, false)
                                then case t.status when 'completed' then 'Completado'
                                                    when 'in_progress' then 'En proceso'
                                                    else 'No jugado' end
                                else 'No jugado' end,
        'estrellas'|| suf, case when coalesce((vis ->> 'rating')::boolean, false)
                                then coalesce(t.rating, 0) else 0 end,
        'deseado'  || suf, case when coalesce((vis ->> 'wishlist')::boolean, false)
                                then coalesce(t.is_wishlisted, false) else false end,
        'progreso' || suf, case when coalesce((vis ->> 'progress')::boolean, false)
                                then coalesce(t.progress, '') else '' end,
        'nota'     || suf, case when coalesce((vis ->> 'notes')::boolean, false)
                                then coalesce(t.personal_notes, '') else '' end
      );
    end loop;

    return next obj;
  end loop;
  return;
end;
$$;

-- RPC accesible via PostgREST con auth del usuario
revoke all on function public.get_items_merged(text) from public, anon;
grant execute on function public.get_items_merged(text) to authenticated;

commit;
