-- ============================================================================
-- Phase 4 — fix RLS: recursión infinita en members_read
--
-- BUG: la policy "members_read" de library_members hacia EXISTS sobre la
-- MISMA tabla -> Postgres detecta recursión (42P17) y TODA query a
-- library_members / library_items / library_links / libraries falla con 500
-- para usuarios autenticados. Nunca se notó porque get_items_merged es
-- security definer y el tracking usa profile_id = auth.uid() directo —
-- pero papelera/eliminar/restaurar/nexusEnsureProfile estaban rotos.
--
-- FIX: is_library_member() security definer (bypassea RLS, solo devuelve
-- boolean) + members_read la usa. Las demás policies que consultan
-- library_members (items_member, links_owner, touches_*, libraries_*)
-- quedan sanas en cadena al resolverse esta.
--
-- Ejecutar en SQL Editor. Idempotente.
-- ============================================================================

begin;

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

commit;
