-- ============================================================================
-- Phase 4 — get_item_merged: una sola fila de get_items_merged por external_id
--
-- La usa la Edge Function item-refresh para devolver al frontend la MISMA
-- shape plana v1 que getItems (repararItemActual reemplaza el item con
-- res.data — necesita titulo/portada/estadoX..., no la fila cruda de DB).
--
-- Ejecutar en SQL Editor. Idempotente.
-- ============================================================================

begin;

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
