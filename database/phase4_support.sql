-- ============================================================================
-- Phase 4 — soporte post-schema (consolidado 2026-11-25)
--
-- Une los 3 parches que la DB viva necesitó tras aplicar schema.sql:
--   A) phase4_rls_fix.sql    — recursión infinita members_read -> is_library_member()
--   B) phase4_edge_support   — RPC set_media_total_chapters (capitulosTotales)
--   C) phase4_item_merged    — RPC get_item_merged (1 fila shape v1 para item-refresh)
--
-- Ya aplicado en la DB viva (vkmgnwnlceycauleluwl). Se conserva consolidado
-- para instalaciones frescas y trazabilidad. schema.sql ya incluye A).
--
-- Ejecutar en SQL Editor. Idempotente.
-- ============================================================================

begin;

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

commit;
