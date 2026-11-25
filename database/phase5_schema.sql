-- ============================================================================
-- Phase 5 — schema: vínculos tipados + privacidad opt-in por item
--
-- 1) user_media_tracking.shared_with uuid[] — audiencia explícita por item.
--    Regla de visibilidad (aplicada en get_items_merged y v_cross_library_matches):
--      is_private = true            -> NADIE ve el tracking (veto absoluto)
--      shared_with NULL / '{}'      -> comportamiento legacy: visible según
--                                      matriz visibility del link (filas
--                                      migradas y todo lo actual sigue igual)
--      shared_with = [profile_ids]  -> SOLO esos perfiles ven el tracking
--    NOTA: el DEFAULT de is_private NO se cambia todavía (sigue false) —
--    flip a true cuando exista la UI "compartir con…" para no dejar items
--    nuevos invisibles para la pareja durante la transición.
--
-- 2) request_library_link(p_invite_code, p_link_type) — antes hardcodeaba
--    'amigo'; ahora el invitador elige pareja/familia/amigo/custom.
--    Se dropea la firma vieja de 1 argumento.
--
-- 3) respond_library_link — la fila inversa heredaba 'amigo' hardcodeado;
--    ahora usa el link_type real del link + default_visibility de ese tipo.
--
-- 4) get_items_merged + v_cross_library_matches — gate shared_with añadido.
--
-- Ejecutar en SQL Editor. Idempotente.
-- ============================================================================

begin;

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
