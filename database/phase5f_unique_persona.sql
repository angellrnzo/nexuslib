-- ============================================================
-- Phase 5f — Unicidad del usuario (display_name completo)
-- ============================================================
-- Cada perfil es una persona distinta: dos usuarios no pueden
-- compartir display_name (case/espacios ignorados). Además el
-- sufijo de persona de get_items_merged (initcap del primer
-- nombre) queda cubierto: nombres completos distintos pueden
-- compartir primer nombre, pero eso es un caso aceptado — la
-- identidad única es el display_name completo.
--
-- Se excluye 'usuario' (default del trigger handle_new_user cuando
-- el signup no trae display_name) para no romper altas sin nombre.
-- ============================================================

create unique index if not exists profiles_display_name_uniq
  on public.profiles (lower(btrim(display_name)))
  where display_name is not null
    and lower(btrim(display_name)) <> 'usuario';
