-- ============================================================================
-- Phase 4 — soporte Edge Functions / writes de catálogo
--
-- 1) set_media_total_chapters: el frontend actualiza capitulosTotales desde el
--    modal; media_items solo tiene policy de lectura, así que va por RPC
--    security definer que solo permite tocar metadata->>'total_chapters'.
--
-- Ejecutar en SQL Editor. Idempotente.
-- ============================================================================

begin;

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

commit;
