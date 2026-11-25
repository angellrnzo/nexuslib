-- ============================================================
-- Phase 5g — display_name fallback desde el email
-- ============================================================
-- Si el signup no trae display_name en metadata, se usa la parte
-- local del email (angellrnzo@x.com -> 'Angellrnzo') en vez del
-- genérico 'Usuario'. El sufijo de persona de get_items_merged
-- (initcap del primer nombre) y las etiquetas de vínculos quedan
-- significativos sin configuración manual.
--
-- También hace backfill de perfiles existentes con 'Usuario'.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_library_id uuid;
  new_code text;
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      initcap(split_part(coalesce(new.email, ''), '@', 1)),
      'Usuario'
    )
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

-- Backfill: perfiles que quedaron como 'Usuario' adoptan el
-- prefijo de su email (misma regla que el trigger).
update public.profiles p
set display_name = initcap(split_part(u.email, '@', 1))
from auth.users u
where u.id = p.id
  and lower(btrim(p.display_name)) = 'usuario'
  and u.email is not null
  and split_part(u.email, '@', 1) <> '';
