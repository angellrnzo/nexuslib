-- ============================================================================
-- Phase 5b — get_my_library_links(): resumen de vínculos del usuario actual
--
-- La UI de vínculos necesita el display_name del OTRO perfil, pero la policy
-- profiles_self solo permite leer el propio -> RPC security definer que
-- devuelve por cada link: dirección, tipo, estado, nombre del otro, y su
-- profile_id (para shared_with / secciones por persona).
--
-- Ejecutar en SQL Editor. Idempotente.
-- ============================================================================

begin;

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
      -- library del "otro" lado
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
