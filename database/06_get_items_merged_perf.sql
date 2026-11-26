-- ============================================================
-- Phase 6a — get_items_merged: optimizacion set-based
-- ============================================================
-- La version de 05 hacia ~4 queries por item (tracking propio,
-- tracking por vinculado, exists library_items, string_agg
-- generos/beta) y la query de perfiles vinculados se re-ejecutaba
-- por CADA item -> ~1000 queries para 251 juegos = ~0.9s.
--
-- Aqui todos los lookups se prefetchean UNA vez en mapas jsonb:
--   v_my_trk  : tracking propio por media_item_id
--   v_vps     : perfiles vinculados aceptados (una sola pasada)
--   v_vp_trk  : tracking de vinculados por pid|media_item_id
--   v_active  : items activos por owner_lib|media_item_id
--   v_meta    : string_agg generos/beta por media_item_id
-- Mismo shape de salida exacto — solo cambia el acceso a datos.
-- Idempotente. Ejecutar en SQL Editor o via apply.
-- ============================================================

begin;

create or replace function public.get_items_merged(p_category text)
returns setof jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  my_uid   uuid := auth.uid();
  my_lib   uuid;
  my_pname text;
  my_suf   text;
  rec      record;
  obj      jsonb;
  vp       record;
  vis      jsonb;
  suf      text;
  t        jsonb;
  genres_txt text;
  beta_txt   text;
  can_see  boolean;
  sec_vis  boolean;
  trk_key  text;
  act_key  text;
  -- lookups prefetcheados
  v_my_trk jsonb;
  v_vps    jsonb;
  v_vp_trk jsonb;
  v_active jsonb;
  v_meta   jsonb;
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

  select coalesce(nullif(p.username, ''), p.display_name, 'Yo')
    into my_pname
  from public.profiles p where p.id = my_uid;
  my_suf := initcap(split_part(coalesce(my_pname, 'Yo'), ' ', 1));

  -- --- prefetch 1: perfiles vinculados (UNA pasada, no por item) ---
  select coalesce(jsonb_agg(jsonb_build_object(
           'pid',       p.id,
           'pname',     coalesce(nullif(p.username, ''), p.display_name, 'X'),
           'vis',       ll.visibility,
           'owner_lib', ll.owner_library_id
         )), '[]'::jsonb)
    into v_vps
  from public.library_links ll
  join public.libraries ol on ol.id = ll.owner_library_id and ol.kind = 'personal'
  join public.library_members olm on olm.library_id = ol.id
  join public.profiles p on p.id = olm.profile_id
  join public.library_members vlm on vlm.library_id = ll.linked_library_id
                                 and vlm.profile_id = my_uid
  where ll.status = 'accepted' and p.id <> my_uid;

  -- --- prefetch 2: items de MI biblioteca en la categoria (ids) ---
  -- (los necesita el loop principal y los lookups de tracking)

  -- --- prefetch 3: tracking propio -> mapa por media_item_id ---
  select coalesce(jsonb_object_agg(umt.media_item_id::text, to_jsonb(umt)), '{}'::jsonb)
    into v_my_trk
  from public.user_media_tracking umt
  where umt.profile_id = my_uid
    and umt.media_item_id in (
      select li.media_item_id from public.library_items li
      where li.library_id = my_lib and li.deleted_at is null);

  -- --- prefetch 4: tracking de vinculados -> mapa pid|media_item_id ---
  select coalesce(jsonb_object_agg(
           umt.profile_id::text || '|' || umt.media_item_id::text,
           to_jsonb(umt)), '{}'::jsonb)
    into v_vp_trk
  from public.user_media_tracking umt
  where umt.profile_id in (
          select (e ->> 'pid')::uuid from jsonb_array_elements(v_vps) e)
    and umt.media_item_id in (
      select li.media_item_id from public.library_items li
      where li.library_id = my_lib and li.deleted_at is null);

  -- --- prefetch 5: items activos -> mapa owner_lib|media_item_id ---
  select coalesce(jsonb_object_agg(
           li.library_id::text || '|' || li.media_item_id::text,
           'true'::jsonb), '{}'::jsonb)
    into v_active
  from public.library_items li
  where li.deleted_at is null
    and li.library_id in (
      select (e ->> 'owner_lib')::uuid from jsonb_array_elements(v_vps) e);

  -- --- prefetch 6: generos + beta_branches -> mapa por media_item_id ---
  select coalesce(jsonb_object_agg(x.id::text,
           jsonb_build_object('g', x.g, 'b', x.b)), '{}'::jsonb)
    into v_meta
  from (
    select mi.id,
      (select string_agg(e, ', ')
         from jsonb_array_elements_text(
           coalesce(mi.metadata -> 'genres', '[]'::jsonb)) e) as g,
      (select string_agg(e, ', ')
         from jsonb_array_elements_text(
           coalesce(mi.metadata -> 'beta_branches', '[]'::jsonb)) e) as b
    from public.media_items mi
    where mi.category = p_category
  ) x;

  -- --- loop principal: solo ensamblado JSON, cero queries ---
  for rec in
    select mi.*, li.id as li_id
    from public.library_items li
    join public.media_items mi on mi.id = li.media_item_id
    where li.library_id = my_lib and li.deleted_at is null
      and mi.category = p_category
    order by mi.title
  loop
    genres_txt := v_meta -> rec.id::text ->> 'g';
    beta_txt   := coalesce(v_meta -> rec.id::text ->> 'b', '-');

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
      'beta',        beta_txt,
      'notaParche',  coalesce(rec.metadata ->> 'last_patch_note', '-'),
      'dupli',       '-'
    );

    -- tracking propio (lookup O(1))
    t := v_my_trk -> rec.id::text;

    obj := obj || jsonb_build_object(
      'username' || my_suf, coalesce(my_pname, 'Yo'),
      'estado'   || my_suf, case t ->> 'status' when 'completed' then 'Completado'
                                   when 'in_progress' then 'En proceso' else 'No jugado' end,
      'estrellas'|| my_suf, coalesce((t ->> 'rating')::numeric, 0),
      'deseado'  || my_suf, coalesce((t ->> 'is_wishlisted')::boolean, false),
      'progreso' || my_suf, coalesce(t ->> 'progress', ''),
      'nota'     || my_suf, coalesce(t ->> 'personal_notes', ''),
      'privado'  || my_suf, coalesce((t ->> 'is_private')::boolean, false)
    );

    -- vinculados: mismo loop, lookups O(1)
    for vp in
      select (e ->> 'pid')::uuid       as pid,
             e ->> 'pname'            as pname,
             e -> 'vis'               as vis,
             (e ->> 'owner_lib')::uuid as owner_lib
      from jsonb_array_elements(v_vps) e
    loop
      vis := vp.vis -> p_category;
      trk_key := vp.pid::text || '|' || rec.id::text;
      t := v_vp_trk -> trk_key;
      act_key := vp.owner_lib::text || '|' || rec.id::text;

      -- privacidad: is_private veto; shared_with [ids] = solo esos viewers;
      -- item debe seguir ACTIVO en SU biblioteca.
      can_see := (t is not null)
        and ((t ->> 'is_private')::boolean is not true)
        and case
          when t ->> 'shared_with' is null then true
          when jsonb_typeof(t -> 'shared_with') <> 'array' then true
          when jsonb_array_length(t -> 'shared_with') = 0 then true
          else (t -> 'shared_with') ? my_uid::text
        end
        and (v_active ? act_key);
      sec_vis := (t is null) or can_see;

      suf := initcap(split_part(coalesce(vp.pname, 'X'), ' ', 1));
      obj := obj || jsonb_build_object(
        'username' || suf, coalesce(vp.pname, 'X'),
        'visible'  || suf, sec_vis,
        'estado'   || suf, case when can_see and coalesce((vis ->> 'status')::boolean, false)
                                then case t ->> 'status' when 'completed' then 'Completado'
                                                          when 'in_progress' then 'En proceso'
                                                          else 'No jugado' end
                                else 'No jugado' end,
        'estrellas'|| suf, case when can_see and coalesce((vis ->> 'rating')::boolean, false)
                                then coalesce((t ->> 'rating')::numeric, 0) else 0 end,
        'deseado'  || suf, case when can_see and coalesce((vis ->> 'wishlist')::boolean, false)
                                then coalesce((t ->> 'is_wishlisted')::boolean, false) else false end,
        'progreso' || suf, case when can_see and coalesce((vis ->> 'progress')::boolean, false)
                                then coalesce(t ->> 'progress', '') else '' end,
        'nota'     || suf, case when can_see and coalesce((vis ->> 'notes')::boolean, false)
                                then coalesce(t ->> 'personal_notes', '') else '' end
      );
    end loop;

    return next obj;
  end loop;
  return;
end;
$$;

revoke all on function public.get_items_merged(text) from public, anon;
grant execute on function public.get_items_merged(text) to authenticated;

commit;
