-- ============================================================
-- Phase 5f — Unicidad del sufijo de persona
-- ============================================================
-- get_items_merged emite los campos de tracking con clave
--   estado{Sufijo} / visible{Sufijo} / privado{Sufijo} / ...
-- donde Sufijo = initcap(primer nombre de profiles.display_name).
-- Si dos perfiles comparten primer nombre, sus campos colisionan
-- en el JSON y uno pisa al otro. Este índice lo prohíbe a nivel DB.
--
-- Se excluye 'usuario' (default del trigger handle_new_user cuando
-- el signup no trae display_name) para no romper altas sin nombre.
-- ============================================================

create unique index if not exists profiles_persona_key_uniq
  on public.profiles (lower(btrim(split_part(display_name, ' ', 1))))
  where display_name is not null
    and lower(btrim(split_part(display_name, ' ', 1))) <> 'usuario';
