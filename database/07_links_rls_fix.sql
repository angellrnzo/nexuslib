-- ============================================================================
-- 07_links_rls_fix.sql — endurezimiento RLS de library_links
--
-- BUG: la policy "links_owner" era `for all` para miembros de CUALQUIERA de
-- los dos lados (owner_library_id O linked_library_id). Eso permitía al lado
-- invitado hacer UPDATE/DELETE directo sobre la fila del owner:
--   * status pending -> accepted (auto-aceptar sin consentimiento del owner)
--   * visibility -> exponer tracking/notas del owner sin su consentimiento
--   * match_enabled, link_type, etc.
--
-- Fix: policies granulares.
--   SELECT  -> ambos lados (necesario para ver pendientes/aceptados)
--   INSERT  -> solo via RPCs security definer (request/respond_library_link)
--   UPDATE  -> solo miembros de owner_library_id (el owner gestiona SU
--              exposicion: visibility, match_enabled). Las transiciones de
--              status las hacen los RPCs security definer, que saltan RLS.
--   DELETE  -> solo owner_library_id (desvincular la propia biblioteca)
-- ============================================================================

begin;

drop policy if exists "links_owner" on public.library_links;

create policy "links_select" on public.library_links
  for select using (
    exists (select 1 from public.library_members lm
            where lm.library_id = library_links.owner_library_id
              and lm.profile_id = auth.uid())
    or exists (select 1 from public.library_members lm
               where lm.library_id = library_links.linked_library_id
                 and lm.profile_id = auth.uid()));

-- INSERT: sin policy -> denegado. Toda alta de links pasa por los RPCs
-- security definer (request/respond_library_link), que saltan RLS. Sin esto,
-- un usuario podria insertar filas con status='accepted' directo.

create policy "links_update" on public.library_links
  for update using (
    exists (select 1 from public.library_members lm
            where lm.library_id = library_links.owner_library_id
              and lm.profile_id = auth.uid()))
  with check (
    exists (select 1 from public.library_members lm
            where lm.library_id = library_links.owner_library_id
              and lm.profile_id = auth.uid()));

create policy "links_delete" on public.library_links
  for delete using (
    exists (select 1 from public.library_members lm
            where lm.library_id = library_links.owner_library_id
              and lm.profile_id = auth.uid()));

commit;
