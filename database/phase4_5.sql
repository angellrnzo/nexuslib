-- ============================================================================
-- Phase 4+5 — TODO el DDL post-schema en UNA pasada (consolidado 2026-11-25)
--
-- Une en orden: phase4_merged_view + phase4_support + phase5_schema.
-- Todo es idempotente: en la DB viva solo aplican los deltas de Phase 5;
-- en instalación fresca aplica todo de una vez.
--
-- ORDEN DE USO:
--   DB nueva : schema.sql -> crear users Auth -> ESTE archivo -> etl/*.sql
--   DB viva  : correr ESTE archivo (aplica Phase 5; el resto re-crea igual)
--
-- Ejecutar en SQL Editor. Idempotente.
-- ============================================================================

begin;



-- ============================================================================
-- SECCION 1/3 — phase4_merged_view (display_names + link pareja + get_items_merged)
-- ============================================================================

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

-- ============================================================================
-- SECCION 2/3 — phase4_support (is_library_member + RPCs)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- A) Fix RLS: recursión infinita en members_read
--
-- BUG: la policy "members_read" hacia EXISTS sobre la MISMA tabla -> 42P17 en
-- TODA query a library_members/items/links/libraries para autenticados.
-- Latente porque get_items_merged es security definer y el tracking usa
-- profile_id directo — pero papelera/eliminar/restaurar/nexusEnsureProfile
-- estaban rotos. is_library_member() security definer devuelve solo boolean.
-- ---------------------------------------------------------------------------
create or replace function public.is_library_member(p_library_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.library_members
    where library_id = p_library_id and profile_id = auth.uid()
  );
$$;

revoke all on function public.is_library_member(uuid) from public, anon;
grant execute on function public.is_library_member(uuid) to authenticated;

drop policy if exists "members_read" on public.library_members;
create policy "members_read" on public.library_members
  for select using (
    public.is_library_member(library_id) or profile_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- B) set_media_total_chapters — el frontend actualiza capitulosTotales desde
--    el modal; media_items solo tiene policy de lectura, así que va por RPC
--    security definer que solo permite tocar metadata->>'total_chapters'.
-- ---------------------------------------------------------------------------
create or replace function public.set_media_total_chapters(p_media_id uuid, p_total integer)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_total is null or p_total < 0 then
    raise exception 'total inválido';
  end if;
  update public.media_items
  set metadata = coalesce(metadata, '{}'::jsonb)
                 || jsonb_build_object('total_chapters', p_total)
  where id = p_media_id;
end;
$$;

revoke all on function public.set_media_total_chapters(uuid, integer) from public, anon;
grant execute on function public.set_media_total_chapters(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- C) get_item_merged — una sola fila de get_items_merged por external_id.
--    La usa la Edge Function item-refresh para devolver al frontend la MISMA
--    shape plana v1 que getItems (repararItemActual reemplaza el item con
--    res.data — necesita titulo/portada/estadoX..., no la fila cruda de DB).
-- ---------------------------------------------------------------------------
create or replace function public.get_item_merged(p_category text, p_external_id text)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  rec jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  for rec in
    select j from public.get_items_merged(p_category) j
    where j ->> 'id' = p_external_id
    limit 1
  loop
    return rec;
  end loop;
  return null;
end;
$$;

revoke all on function public.get_item_merged(text, text) from public, anon;
grant execute on function public.get_item_merged(text, text) to authenticated;

-- ============================================================================
-- SECCION 3/3 — phase5_schema (link_type + shared_with + gates)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) shared_with
-- ---------------------------------------------------------------------------
alter table public.user_media_tracking
  add column if not exists shared_with uuid[];

comment on column public.user_media_tracking.shared_with is
  'Audiencia opt-in por item: NULL/{} = legacy (visibilidad por matriz del link); [profile_ids] = solo esos perfiles. is_private=true sigue siendo veto absoluto.';

-- ---------------------------------------------------------------------------
-- 2) request_library_link con link_type
-- ---------------------------------------------------------------------------
drop function if exists public.request_library_link(text);

create or replace function public.request_library_link(
  p_invite_code text,
  p_link_type   public.link_type default 'amigo'
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  my_lib uuid;
  target_lib uuid;
  target_owner uuid;
  new_link uuid;
begin
  select lm.library_id into my_lib
  from library_members lm
  join libraries l on l.id = lm.library_id
  where lm.profile_id = auth.uid() and l.kind = 'personal'
  limit 1;
  if my_lib is null then raise exception 'sin biblioteca personal'; end if;

  select l.id, l.created_by into target_lib, target_owner
  from libraries l
  where l.invite_code = upper(trim(p_invite_code)) and l.kind = 'personal';
  if target_lib is null then raise exception 'código inválido'; end if;
  if target_lib = my_lib then raise exception 'no puedes vincularte contigo mismo'; end if;

  insert into library_links (owner_library_id, linked_library_id, link_type, visibility)
  values (my_lib, target_lib, p_link_type, default_visibility(p_link_type))
  on conflict (owner_library_id, linked_library_id) do nothing
  returning id into new_link;

  return new_link;
end;
$$;

revoke all on function public.request_library_link(text, public.link_type) from public, anon;
grant execute on function public.request_library_link(text, public.link_type) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) respond_library_link — inversa con link_type real
-- ---------------------------------------------------------------------------
create or replace function public.respond_library_link(p_link_id uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  target_owner uuid;
  link_owner_lib uuid;
begin
  select ll.owner_library_id into link_owner_lib
  from library_links ll
  join library_members lm on lm.library_id = ll.linked_library_id
  where ll.id = p_link_id and lm.profile_id = auth.uid() and ll.status = 'pending';
  if link_owner_lib is null then raise exception 'link no encontrado o no autorizado'; end if;

  update library_links set status = case when p_accept then 'accepted'::link_status else 'blocked'::link_status end,
         resolved_at = now()
  where id = p_link_id;

  if p_accept then
    -- fila inversa: el que acepta comparte SU biblioteca con los defaults
    -- de SU link_type (mismo tipo de relación, ajustable luego en settings)
    insert into library_links (owner_library_id, linked_library_id, link_type, visibility)
    select ll.linked_library_id, ll.owner_library_id, ll.link_type, default_visibility(ll.link_type)
    from library_links ll where ll.id = p_link_id
    on conflict (owner_library_id, linked_library_id) do nothing;
  end if;
end;
$$;

revoke all on function public.respond_library_link(uuid, boolean) from public, anon;
grant execute on function public.respond_library_link(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 4a) get_items_merged — gate shared_with en tracking de vinculados
--     (idéntica a phase4_merged_view.sql + condición shared_with)
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
    -- (owner=ellos -> linked=yo); lo no visible se emite como "sin datos".
    -- shared_with: NULL/{} = legacy (matriz); [ids] = solo esos perfiles.
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
        and umt.is_private = false
        and (umt.shared_with is null
             or cardinality(umt.shared_with) = 0
             or vp.pid = any(umt.shared_with));

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

revoke all on function public.get_items_merged(text) from public, anon;
grant execute on function public.get_items_merged(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4b) v_cross_library_matches — mismo gate shared_with sobre tracking owner
-- ---------------------------------------------------------------------------
create or replace view public.v_cross_library_matches as
select
  ll.id as link_id,
  ll.link_type,
  ll.link_label,
  mi.id as media_item_id,
  mi.title,
  mi.category,
  mi.cover_url,
  case when (ll.visibility -> mi.category ->> 'status')::boolean
       then ot.status::text end                              as owner_status,
  case when (ll.visibility -> mi.category ->> 'rating')::boolean
       then ot.rating::text end                              as owner_rating,
  case when (ll.visibility -> mi.category ->> 'wishlist')::boolean
       then ot.is_wishlisted::text end                       as owner_wishlist,
  case when (ll.visibility -> mi.category ->> 'progress')::boolean
       then ot.progress end                                  as owner_progress,
  case when (ll.visibility -> mi.category ->> 'notes')::boolean
       then ot.personal_notes end                            as owner_notes,
  lt.status::text                                            as my_status,
  lt.rating::text                                            as my_rating,
  lt.progress                                                as my_progress,
  lt.is_wishlisted                                           as my_wishlist,
  true                                                       as mutual_wishlist
from library_links ll
join lateral (
  select lm.profile_id from library_members lm
  where lm.library_id = ll.owner_library_id and lm.role = 'owner'
  limit 1
) own on true
join library_items loi on loi.library_id = ll.owner_library_id
  and loi.deleted_at is null
join media_items mi on mi.id = loi.media_item_id
join user_media_tracking ot on ot.media_item_id = mi.id
  and ot.profile_id = own.profile_id
join user_media_tracking lt on lt.media_item_id = mi.id
  and lt.profile_id = auth.uid()
where ll.status = 'accepted'
  and ll.match_enabled
  and not ot.is_private
  and (ot.shared_with is null
       or cardinality(ot.shared_with) = 0
       or auth.uid() = any(ot.shared_with))
  and not lt.is_private
  -- el viewer debe ser miembro de la library vinculada (lado que recibe)
  and exists (select 1 from library_members vm
              where vm.library_id = ll.linked_library_id
                and vm.profile_id = auth.uid())
  -- match = ambos lados interesados (wishlist o backlog)
  and (ot.is_wishlisted or ot.status = 'backlog')
  and (lt.is_wishlisted or lt.status = 'backlog');

commit;
