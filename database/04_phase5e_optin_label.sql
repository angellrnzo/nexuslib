-- ============================================================================
-- Phase 5e — is_private default true (modelo opt-in) + link_label custom
--
-- 1) user_media_tracking.is_private default false -> true:
--    el tracking nuevo nace privado; compartir es opt-in via panel
--    "Compartir" del modal (is_private/shared_with). Filas existentes no
--    cambian (default solo aplica a INSERTs nuevos sin la columna).
--
-- 2) request_library_link gana p_link_label (texto libre para link_type
--    'custom'); respond_library_link copia link_label a la fila inversa.
--
-- 3) get_my_library_links expone link_label para mostrarlo en la UI.
--
-- Ejecutar en SQL Editor. Idempotente.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) is_private: opt-in por defecto
-- ---------------------------------------------------------------------------
alter table public.user_media_tracking
  alter column is_private set default true;

comment on column public.user_media_tracking.is_private is
  'Privacidad opt-in: true = nadie ve este tracking (veto absoluto). Default true — compartir es explicito via UI (is_private=false + shared_with).';

-- ---------------------------------------------------------------------------
-- 2) request_library_link con etiqueta libre
-- ---------------------------------------------------------------------------
drop function if exists public.request_library_link(text, public.link_type);
drop function if exists public.request_library_link(text, public.link_type, text);

create or replace function public.request_library_link(
  p_invite_code text,
  p_link_type   public.link_type default 'amigo',
  p_link_label  text default null
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

  insert into library_links (owner_library_id, linked_library_id, link_type, link_label, visibility)
  values (my_lib, target_lib, p_link_type,
          case when p_link_type = 'custom' then nullif(trim(p_link_label), '') else null end,
          default_visibility(p_link_type))
  on conflict (owner_library_id, linked_library_id) do nothing
  returning id into new_link;

  return new_link;
end;
$$;

revoke all on function public.request_library_link(text, public.link_type, text) from public, anon;
grant execute on function public.request_library_link(text, public.link_type, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) respond_library_link — la fila inversa hereda link_label
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
    -- de su link_type; hereda link_label para que 'custom' tenga nombre
    insert into library_links (owner_library_id, linked_library_id, link_type, link_label, visibility)
    select ll.linked_library_id, ll.owner_library_id, ll.link_type, ll.link_label,
           default_visibility(ll.link_type)
    from library_links ll where ll.id = p_link_id
    on conflict (owner_library_id, linked_library_id) do nothing;
  end if;
end;
$$;

revoke all on function public.respond_library_link(uuid, boolean) from public, anon;
grant execute on function public.respond_library_link(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) get_my_library_links expone link_label
-- ---------------------------------------------------------------------------
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
      ll.link_label,
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
      'link_label',    rec.link_label,
      'status',        rec.status,
      'direction',     rec.direction,
      'match_enabled', rec.match_enabled,
      'visibility',    rec.visibility,
      'created_at',    rec.created_at,
      'other',         (
        select jsonb_build_object(
          'profile_id',   p.id,
          'display_name', p.display_name,
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

commit;
