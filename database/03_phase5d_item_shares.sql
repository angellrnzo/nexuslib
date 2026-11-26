-- ============================================================================
-- Phase 5d (parcial) — item_share_requests: "enviar item a un vínculo"
--
-- Flujo: desde el modal de un item, el usuario envía el elemento a una
-- persona con vínculo aceptado -> le llega solicitud -> al aceptar, el
-- media_item se inserta en SU library_items (biblioteca propia) con
-- tracking vacío ("estatus inicial"). Rechazo = declined, se puede
-- reenviar después.
--
-- Ejecutar en SQL Editor. Idempotente.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) Tabla
-- ---------------------------------------------------------------------------
create table if not exists public.item_share_requests (
  id              uuid primary key default gen_random_uuid(),
  media_item_id   uuid not null references public.media_items(id) on delete cascade,
  from_profile_id uuid not null references public.profiles(id) on delete cascade,
  to_profile_id   uuid not null references public.profiles(id) on delete cascade,
  status          text not null default 'pending'
                  check (status in ('pending', 'accepted', 'declined')),
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz,
  check (from_profile_id <> to_profile_id)
);

alter table public.item_share_requests enable row level security;

-- un solo pending por triple (item, origen, destino); declined/accepted no bloquean reenvío
create unique index if not exists item_share_requests_pending_uniq
  on public.item_share_requests (media_item_id, from_profile_id, to_profile_id)
  where status = 'pending';

create index if not exists item_share_requests_to_idx
  on public.item_share_requests (to_profile_id, status, created_at desc);

-- lectura: origen y destino ven sus solicitudes
drop policy if exists "shares_participants" on public.item_share_requests;
create policy "shares_participants" on public.item_share_requests
  for select using (
    from_profile_id = auth.uid() or to_profile_id = auth.uid()
  );

-- sin insert/update directo: todo pasa por los RPCs security definer

-- ---------------------------------------------------------------------------
-- 2) send_item_share — enviar item a un vínculo aceptado
--    p_category + p_external_id identifican el media_item (misma convención
--    que get_items_merged: 'Juegos','Peliculas_Series','Libros','Mangas').
-- ---------------------------------------------------------------------------
create or replace function public.send_item_share(
  p_category text,
  p_external_id text,
  p_to_profile_id uuid
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  my_uid    uuid := auth.uid();
  my_lib    uuid;
  media_id  uuid;
  req_id    uuid;
  found_link boolean;
begin
  if my_uid is null then raise exception 'not authenticated'; end if;
  if p_to_profile_id = my_uid then raise exception 'no puedes enviarte el item a ti mismo'; end if;

  select l.id into my_lib
  from public.libraries l
  join public.library_members lm on lm.library_id = l.id
  where lm.profile_id = my_uid and l.kind = 'personal'
  limit 1;
  if my_lib is null then raise exception 'sin biblioteca personal'; end if;

  -- ¿existe vínculo aceptado entre mi biblioteca y una biblioteca del destino?
  select exists (
    select 1
    from public.library_links ll
    join public.library_members olm on olm.library_id = ll.owner_library_id
    join public.library_members dlm on dlm.library_id = ll.linked_library_id
    where ll.status = 'accepted'
      and ((ll.owner_library_id = my_lib and dlm.profile_id = p_to_profile_id)
        or (ll.linked_library_id = my_lib and olm.profile_id = p_to_profile_id))
  ) into found_link;
  if not found_link then raise exception 'no hay vínculo aceptado con esa persona'; end if;

  select mi.id into media_id
  from public.media_items mi
  where mi.category = p_category and mi.external_id = p_external_id;
  if media_id is null then raise exception 'item no encontrado en el catálogo'; end if;

  -- ya compartido antes -> no duplicar solicitud
  select id into req_id
  from public.item_share_requests
  where media_item_id = media_id
    and from_profile_id = my_uid
    and to_profile_id = p_to_profile_id
    and status = 'accepted'
  limit 1;
  if req_id is not null then return req_id; end if;

  -- reenvío tras declined -> vuelve a pending
  update public.item_share_requests
  set status = 'pending', resolved_at = null
  where media_item_id = media_id
    and from_profile_id = my_uid
    and to_profile_id = p_to_profile_id
    and status = 'declined';

  insert into public.item_share_requests (media_item_id, from_profile_id, to_profile_id)
  values (media_id, my_uid, p_to_profile_id)
  on conflict (media_item_id, from_profile_id, to_profile_id) where status = 'pending'
  do nothing
  returning id into req_id;

  if req_id is null then
    -- ya existía pending o accepted: devolver el id existente
    select id into req_id
    from public.item_share_requests
    where media_item_id = media_id
      and from_profile_id = my_uid
      and to_profile_id = p_to_profile_id
      and status in ('pending', 'accepted')
    order by created_at desc
    limit 1;
  end if;

  return req_id;
end;
$$;

revoke all on function public.send_item_share(text, text, uuid) from public, anon;
grant execute on function public.send_item_share(text, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) respond_item_share — el destinatario acepta (item entra a SU biblioteca)
--    o rechaza.
-- ---------------------------------------------------------------------------
create or replace function public.respond_item_share(p_request_id uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  my_uid   uuid := auth.uid();
  my_lib   uuid;
  req      record;
begin
  if my_uid is null then raise exception 'not authenticated'; end if;

  select * into req
  from public.item_share_requests
  where id = p_request_id
    and to_profile_id = my_uid
    and status = 'pending';
  if req.id is null then raise exception 'solicitud no encontrada o ya resuelta'; end if;

  if p_accept then
    select l.id into my_lib
    from public.libraries l
    join public.library_members lm on lm.library_id = l.id
    where lm.profile_id = my_uid and l.kind = 'personal'
    limit 1;
    if my_lib is null then raise exception 'sin biblioteca personal'; end if;

    -- el item aparece en su biblioteca con tracking vacío (estatus inicial)
    if not exists (
      select 1 from public.library_items li
      where li.library_id = my_lib
        and li.media_item_id = req.media_item_id
        and li.deleted_at is null
    ) then
      insert into public.library_items (library_id, media_item_id, added_by)
      values (my_lib, req.media_item_id, my_uid);
    end if;

    update public.item_share_requests
    set status = 'accepted', resolved_at = now()
    where id = p_request_id;
  else
    update public.item_share_requests
    set status = 'declined', resolved_at = now()
    where id = p_request_id;
  end if;
end;
$$;

revoke all on function public.respond_item_share(uuid, boolean) from public, anon;
grant execute on function public.respond_item_share(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) get_my_item_shares — solicitudes de items donde participo
--    (para la UI: pendientes entrantes con aceptar/rechazar + historial)
-- ---------------------------------------------------------------------------
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
      p.display_name as other_name
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
