-- ============================================================
-- Phase 5h — username unico + display_name = nombre real
-- ============================================================
-- Modelo:
--   profiles.username    -> handle unico visible en la UI
--                           ('angellrnzo'), se deriva del email
--   profiles.display_name-> nombre real de la persona ('Angel Lorenzo')
--
-- El sufijo de persona de get_items_merged pasa a derivarse del
-- username (initcap) — antes del primer nombre del display_name.
-- Se emite ademas 'username{Sufijo}' con el handle crudo para las
-- etiquetas del front.
--
-- NOTA: este script reemplaza a phase5f (unique display_name ya no
-- aplica: los nombres reales pueden repetirse) y a phase5g (el
-- trigger ahora tambien genera username). Ejecutar DESPUES de 5e.
-- Idempotente.
-- ============================================================

begin;

-- 1) columna username
alter table public.profiles add column if not exists username text;

-- 2) backfill desde el prefijo del email (minusculas, solo [a-z0-9_])
update public.profiles p
set username = regexp_replace(lower(split_part(u.email, '@', 1)), '[^a-z0-9_]', '', 'g')
from auth.users u
where u.id = p.id
  and u.email is not null
  and split_part(u.email, '@', 1) <> ''
  and (p.username is null or btrim(p.username) = '');

-- 3) dedupe: mismo prefijo local en dominios distintos -> sufijo del id
with d as (
  select id, username,
         row_number() over (partition by username order by id) as rn
  from public.profiles
  where username is not null
)
update public.profiles p
set username = d.username || substr(replace(p.id::text, '-', ''), 1, 4)
from d
where d.id = p.id and d.rn > 1;

-- 4) constraints
alter table public.profiles alter column username set not null;
create unique index if not exists profiles_username_uniq on public.profiles (username);
drop index if exists profiles_display_name_uniq;

-- 5) trigger de signup: username del email + display_name del meta o email
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_library_id uuid;
  new_code text;
  uname text;
begin
  uname := regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9_]', '', 'g');
  if uname = '' then uname := 'user' || substr(replace(new.id::text, '-', ''), 1, 6); end if;
  if exists (select 1 from public.profiles where username = uname) then
    uname := uname || substr(replace(new.id::text, '-', ''), 1, 4);
  end if;

  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      initcap(split_part(coalesce(new.email, ''), '@', 1)),
      'Usuario'
    ),
    uname
  );

  -- invite_code: 10 chars url-safe
  new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into public.libraries (name, kind, invite_code, created_by)
  values ('Mi biblioteca', 'personal', new_code, new.id)
  returning id into new_library_id;

  insert into public.library_members (library_id, profile_id, role)
  values (new_library_id, new.id, 'owner');

  return new;
end;
$$;

-- 6) get_items_merged: sufijo desde username + campo username{Sufijo}
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
  can_see  boolean;
  sec_vis  boolean;
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
    select umt.status, umt.rating, umt.is_wishlisted, umt.progress, umt.personal_notes,
           umt.is_private
    into t
    from public.user_media_tracking umt
    where umt.profile_id = my_uid and umt.media_item_id = rec.id;

    obj := obj || jsonb_build_object(
      'username' || suf, coalesce(my_pname, 'Yo'),
      'estado'   || suf, case t.status when 'completed' then 'Completado'
                                   when 'in_progress' then 'En proceso' else 'No jugado' end,
      'estrellas'|| suf, coalesce(t.rating, 0),
      'deseado'  || suf, coalesce(t.is_wishlisted, false),
      'progreso' || suf, coalesce(t.progress, ''),
      'nota'     || suf, coalesce(t.personal_notes, ''),
      'privado'  || suf, coalesce(t.is_private, false)
    );

    -- tracking de perfiles vinculados: gated por visibility del link
    -- (owner=ellos -> linked=yo); lo no visible se emite como "sin datos".
    -- shared_with: NULL/{} = legacy (matriz); [ids] = solo esos perfiles.
    for vp in
      select p.id as pid,
             coalesce(nullif(p.username, ''), p.display_name, 'X') as pname,
             ll.visibility as vis,
             ll.owner_library_id as owner_lib
      from public.library_links ll
      join public.libraries ol on ol.id = ll.owner_library_id and ol.kind = 'personal'
      join public.library_members olm on olm.library_id = ol.id
      join public.profiles p on p.id = olm.profile_id
      join public.library_members vlm on vlm.library_id = ll.linked_library_id
                                     and vlm.profile_id = my_uid
      where ll.status = 'accepted' and p.id <> my_uid
    loop
      vis := vp.vis -> p_category;
      select umt.status, umt.rating, umt.is_wishlisted, umt.progress, umt.personal_notes,
             umt.is_private, umt.shared_with
      into t
      from public.user_media_tracking umt
      where umt.profile_id = vp.pid
        and umt.media_item_id = rec.id;

      -- privacidad del dueño: is_private = veto; shared_with [ids] = solo esos viewers.
      -- Además el item debe seguir ACTIVO en SU biblioteca — si lo borró
      -- (papelera/borrado), su tracking viejo no se filtra al viewer.
      -- Sin fila de tracking -> can_see=false pero la seccion se muestra vacia (legacy).
      can_see := found
        and t.is_private is not true
        and (t.shared_with is null
             or cardinality(t.shared_with) = 0
             or my_uid = any(t.shared_with))
        and exists (select 1 from public.library_items li2
                    where li2.library_id = vp.owner_lib
                      and li2.media_item_id = rec.id
                      and li2.deleted_at is null);
      sec_vis := (not found) or can_see;

      suf := initcap(split_part(coalesce(vp.pname, 'X'), ' ', 1));
      obj := obj || jsonb_build_object(
        'username' || suf, coalesce(vp.pname, 'X'),
        'visible'  || suf, sec_vis,
        'estado'   || suf, case when can_see and coalesce((vis ->> 'status')::boolean, false)
                                then case t.status when 'completed' then 'Completado'
                                                    when 'in_progress' then 'En proceso'
                                                    else 'No jugado' end
                                else 'No jugado' end,
        'estrellas'|| suf, case when can_see and coalesce((vis ->> 'rating')::boolean, false)
                                then coalesce(t.rating, 0) else 0 end,
        'deseado'  || suf, case when can_see and coalesce((vis ->> 'wishlist')::boolean, false)
                                then coalesce(t.is_wishlisted, false) else false end,
        'progreso' || suf, case when can_see and coalesce((vis ->> 'progress')::boolean, false)
                                then coalesce(t.progress, '') else '' end,
        'nota'     || suf, case when can_see and coalesce((vis ->> 'notes')::boolean, false)
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

-- 7) get_my_library_links: exponer username del otro perfil
create or replace function public.get_my_library_links()
returns setof jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  my_uid uuid := auth.uid();
  my_lib uuid;
  rec    record;
begin
  if my_uid is null then
    raise exception 'not authenticated';
  end if;

  select lm.library_id into my_lib
  from public.library_members lm
  join public.libraries l on l.id = lm.library_id
  where lm.profile_id = my_uid and l.kind = 'personal'
  limit 1;
  if my_lib is null then return; end if;

  for rec in
    select
      ll.id            as link_id,
      ll.link_type,
      ll.status,
      ll.match_enabled,
      ll.visibility,
      ll.created_at,
      case when ll.owner_library_id = my_lib then 'outgoing' else 'incoming' end as direction,
      case when ll.owner_library_id = my_lib then ll.linked_library_id else ll.owner_library_id end as other_lib
    from public.library_links ll
    where (ll.owner_library_id = my_lib or ll.linked_library_id = my_lib)
      and ll.status <> 'blocked'
  loop
    return next jsonb_build_object(
      'link_id',       rec.link_id,
      'link_type',     rec.link_type,
      'status',        rec.status,
      'direction',     rec.direction,
      'match_enabled', rec.match_enabled,
      'visibility',    rec.visibility,
      'created_at',    rec.created_at,
      'other',         (
        select jsonb_build_object(
          'profile_id',   p.id,
          'display_name', p.display_name,
          'username',     p.username,
          'invite_code',  ol.invite_code
        )
        from public.library_members olm
        join public.profiles p on p.id = olm.profile_id
        join public.libraries ol on ol.id = rec.other_lib
        where olm.library_id = rec.other_lib
          and p.id <> my_uid
        limit 1
      )
    );
  end loop;
  return;
end;
$$;

revoke all on function public.get_my_library_links() from public, anon;
grant execute on function public.get_my_library_links() to authenticated;

-- 8) get_my_item_shares: other_name = username (fallback display_name)
create or replace function public.get_my_item_shares()
returns setof jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  my_uid uuid := auth.uid();
  rec    record;
begin
  if my_uid is null then raise exception 'not authenticated'; end if;

  for rec in
    select
      r.id, r.status, r.created_at, r.resolved_at,
      case when r.from_profile_id = my_uid then 'outgoing' else 'incoming' end as direction,
      mi.title, mi.cover_url, mi.category, mi.external_id,
      coalesce(nullif(p.username, ''), p.display_name) as other_name
    from public.item_share_requests r
    join public.media_items mi on mi.id = r.media_item_id
    join public.profiles p
      on p.id = case when r.from_profile_id = my_uid
                     then r.to_profile_id else r.from_profile_id end
    where r.from_profile_id = my_uid or r.to_profile_id = my_uid
    order by (r.status = 'pending') desc, r.created_at desc
  loop
    return next jsonb_build_object(
      'request_id',  rec.id,
      'status',      rec.status,
      'direction',   rec.direction,
      'created_at',  rec.created_at,
      'resolved_at', rec.resolved_at,
      'other_name',  rec.other_name,
      'item', jsonb_build_object(
        'id',       rec.external_id,
        'titulo',   rec.title,
        'portada',  rec.cover_url,
        'categoria', rec.category
      )
    );
  end loop;
  return;
end;
$$;

revoke all on function public.get_my_item_shares() from public, anon;
grant execute on function public.get_my_item_shares() to authenticated;

commit;
