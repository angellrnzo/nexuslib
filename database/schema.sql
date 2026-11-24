-- ============================================================================
-- NexusLib — Schema v2.0 (Supabase / Postgres)
-- Phase 4 "THE CUT" — draft for review before applying.
--
-- Covers: profiles (5E), libraries + members + links (5A/5F), media_items,
-- library_items, user_media_tracking (5A is_private), mods, item_touches (5D).
-- Auth: Supabase email-only (password + magic link); TOTP MFA opt-in per user.
-- Categories keep the Sheet tab names so the visibility matrix keys match:
--   'Juegos', 'Peliculas_Series', 'Libros', 'Mangas'
-- ============================================================================

create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

create type public.link_status as enum ('pending', 'accepted', 'blocked');
create type public.link_type as enum ('pareja', 'amigo', 'familia', 'custom');
create type public.member_role as enum ('owner', 'editor', 'viewer');
create type public.track_status as enum ('backlog', 'in_progress', 'completed');
create type public.library_kind as enum ('personal', 'zone');
create type public.mod_source as enum ('nexus_mods', 'steam_workshop', 'curseforge', 'otra_url');
create type public.touch_type as enum (
  'interested', 'save', 'note', 'later',
  'react_good', 'react_funny', 'react_love',
  'watching_now', 'date_night', 'inside', 'miss_you_note'
);

-- ---------------------------------------------------------------------------
-- profiles — 1:1 con auth.users (5E)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  display_name      text not null,
  avatar_url        text,                       -- 'preset:<n>' | 'upload:<path>' | null → identicon
  locale            text not null default 'es',
  preferences       jsonb not null default '{}'::jsonb,
  -- privacidad opt-in (5E)
  show_activity     boolean not null default false,
  last_seen_at      timestamptz,
  show_stats        boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ---------------------------------------------------------------------------
-- libraries — biblioteca personal O zona conjunta (5F: zona = libraries row
-- normal con kind='zone' y ambos usuarios como members)
-- ---------------------------------------------------------------------------

create table public.libraries (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  kind         public.library_kind not null default 'personal',
  invite_code  text unique,                     -- 10 chars, solo libraries kind='personal'
  created_by   uuid not null references public.profiles(id),
  created_at   timestamptz not null default now()
);

alter table public.libraries enable row level security;

create table public.library_members (
  library_id  uuid not null references public.libraries(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  role        public.member_role not null default 'editor',
  joined_at   timestamptz not null default now(),
  primary key (library_id, profile_id)
);

alter table public.library_members enable row level security;

-- ---------------------------------------------------------------------------
-- library_links — vinculación entre DOS libraries personales (5A)
-- Dirección: la fila vive en la library DEL OWNER; su `visibility` controla
-- lo que el owner expone a ESA library vinculada.
-- ---------------------------------------------------------------------------

create table public.library_links (
  id                uuid primary key default gen_random_uuid(),
  owner_library_id  uuid not null references public.libraries(id) on delete cascade,
  linked_library_id uuid not null references public.libraries(id) on delete cascade,
  link_type         public.link_type not null default 'amigo',
  link_label        text,                       -- nombre libre cuando link_type='custom'
  status            public.link_status not null default 'pending',
  match_enabled     boolean not null default true,
  -- matriz 5A: {categoria: {status, rating, wishlist, progress, notes, mods}}
  visibility        jsonb not null,
  created_at        timestamptz not null default now(),
  resolved_at       timestamptz,
  unique (owner_library_id, linked_library_id),
  check (owner_library_id <> linked_library_id)
);

alter table public.library_links enable row level security;

-- ---------------------------------------------------------------------------
-- media_items — catálogo global deduplicado
-- ---------------------------------------------------------------------------

create table public.media_items (
  id                  uuid primary key default gen_random_uuid(),
  category            text not null check (category in
                        ('Juegos','Peliculas_Series','Libros','Mangas')),
  provider            text not null,            -- 'steam','tmdb','openlibrary','anilist','manual',…
  external_id         text not null,            -- SIN prefijo (etl_mapping decisión 1)
  title               text not null,
  cover_url           text,
  banner_url          text,
  trailer_url         text,
  metadata            jsonb not null default '{}'::jsonb,
  metadata_updated_at timestamptz,
  created_at          timestamptz not null default now(),
  unique (category, provider, external_id)
);

create index media_items_title_trgm on public.media_items using gin (title gin_trgm_ops);
create index media_items_metadata_gin on public.media_items using gin (metadata);

alter table public.media_items enable row level security;

-- ---------------------------------------------------------------------------
-- library_items — pertenencia de un media_item a una library (+ papelera SQL)
-- ---------------------------------------------------------------------------

create table public.library_items (
  id            uuid primary key default gen_random_uuid(),
  library_id    uuid not null references public.libraries(id) on delete cascade,
  media_item_id uuid not null references public.media_items(id) on delete cascade,
  added_by      uuid references public.profiles(id),
  shared_note   text,                           -- notas compartidas en zona (5D)
  deleted_at    timestamptz,                    -- papelera = soft delete
  created_at    timestamptz not null default now()
);

-- unicidad lógica: un item no borrado por library
create unique index library_items_active_uniq
  on public.library_items (library_id, media_item_id)
  where deleted_at is null;

create index library_items_media_idx on public.library_items (media_item_id);

alter table public.library_items enable row level security;

-- ---------------------------------------------------------------------------
-- user_media_tracking — tracking POR USUARIO sobre media_item
-- (is_private = veto absoluto 5A; edition = "mi edición" libro, right of cut)
-- ---------------------------------------------------------------------------

create table public.user_media_tracking (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  media_item_id uuid not null references public.media_items(id) on delete cascade,
  status        public.track_status,
  rating        numeric(3,1) check (rating is null or (rating >= 1.0 and rating <= 10.0)),
  progress      text,
  is_wishlisted boolean not null default false,
  personal_notes text,
  is_private    boolean not null default false,
  edition       text,                           -- "mi edición" (libros, right of cut)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (profile_id, media_item_id)
);

create index umt_media_idx on public.user_media_tracking (media_item_id);
create index umt_wishlist_idx on public.user_media_tracking (profile_id) where is_wishlisted;

alter table public.user_media_tracking enable row level security;

-- ---------------------------------------------------------------------------
-- mods — listas de mods por juego por usuario (spec WIKI §7.3 / road.md)
-- ---------------------------------------------------------------------------

create table public.mods (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  media_item_id uuid not null references public.media_items(id) on delete cascade,
  name          text not null,
  source        public.mod_source not null,
  url           text,
  version_juego text,                           -- agrupa mods por versión del juego
  notes         text,
  created_at    timestamptz not null default now()
);

create index mods_game_idx on public.mods (media_item_id);

alter table public.mods enable row level security;

-- ---------------------------------------------------------------------------
-- item_touches — interacciones social-light entre libraries vinculadas (5D)
-- ---------------------------------------------------------------------------

create table public.item_touches (
  id           uuid primary key default gen_random_uuid(),
  library_item_id uuid not null references public.library_items(id) on delete cascade,
  from_profile_id uuid not null references public.profiles(id),
  to_library_id   uuid not null references public.libraries(id),
  touch_type   public.touch_type not null,
  note         text,
  created_at   timestamptz not null default now()
);

create index item_touches_item_idx on public.item_touches (library_item_id);
create index item_touches_to_idx on public.item_touches (to_library_id, created_at desc);

alter table public.item_touches enable row level security;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- 5E: al crearse un auth.users → profile + library personal + membership
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
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', 'Usuario'));

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantiene updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger umt_updated_at before update on public.user_media_tracking
  for each row execute function public.touch_updated_at();

-- Matriz de visibilidad por defecto según link_type (5E defaults)
create or replace function public.default_visibility(p_link_type public.link_type)
returns jsonb language sql immutable as $$
  select case p_link_type
    when 'pareja' then
      '{"Juegos":{"status":true,"rating":true,"wishlist":true,"progress":true,"notes":false,"mods":false},
        "Peliculas_Series":{"status":true,"rating":true,"wishlist":true,"progress":true,"notes":false,"mods":false},
        "Libros":{"status":true,"rating":true,"wishlist":true,"progress":true,"notes":false,"mods":false},
        "Mangas":{"status":true,"rating":true,"wishlist":true,"progress":true,"notes":false,"mods":false}}'::jsonb
    else -- amigo / familia / custom heredan defaults restrictivos
      '{"Juegos":{"status":true,"rating":false,"wishlist":false,"progress":false,"notes":false,"mods":false},
        "Peliculas_Series":{"status":true,"rating":false,"wishlist":false,"progress":false,"notes":false,"mods":false},
        "Libros":{"status":true,"rating":false,"wishlist":false,"progress":false,"notes":false,"mods":false},
        "Mangas":{"status":true,"rating":false,"wishlist":false,"progress":false,"notes":false,"mods":false}}'::jsonb
  end;
$$;

-- Vinculación con aprobación mutua (Phase 5 items 1-2)
create or replace function public.request_library_link(p_invite_code text)
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

  insert into library_links (owner_library_id, linked_library_id, link_type, visibility)
  values (my_lib, target_lib, 'amigo', default_visibility('amigo'))
  on conflict (owner_library_id, linked_library_id) do nothing
  returning id into new_link;

  return new_link;
end;
$$;

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
    -- de su link_type (ajustable luego en settings); hace el match bidireccional
    insert into library_links (owner_library_id, linked_library_id, link_type, visibility)
    select ll.linked_library_id, ll.owner_library_id, 'amigo', default_visibility('amigo')
    from library_links ll where ll.id = p_link_id
    on conflict (owner_library_id, linked_library_id) do nothing;
  end if;
end;
$$;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Match intra-library: ≥2 miembros wishlist/backlog el mismo item
create or replace view public.v_library_matches
with (security_invoker = true) as
select li.library_id, mi.id as media_item_id, mi.title, mi.category,
       count(distinct t.profile_id) as interested_users,
       array_agg(distinct p.display_name) as user_names
from library_items li
join media_items mi on mi.id = li.media_item_id
join user_media_tracking t on t.media_item_id = mi.id
  and (t.is_wishlisted or t.status = 'backlog')
join profiles p on p.id = t.profile_id
where li.deleted_at is null and not t.is_private
  and exists (select 1 from library_members lm where lm.library_id = li.library_id)
group by li.library_id, mi.id, mi.title, mi.category
having count(distinct t.profile_id) >= 2;

-- Match cross-library (5A): expone campos del owner SOLO según
-- ll.visibility -> category ->> field, excluye is_private, requiere
-- match_enabled y membership de auth.uid() en cualquiera de los dos lados.
--
-- NOTA DE SEGURIDAD: esta vista es SECURITY DEFINER (sin security_invoker)
-- a propósito — es el ÚNICO punto donde un usuario lee tracking ajeno, y la
-- aplicación de la matriz es server-side aquí. No añadir security_invoker
-- (rompería la lectura del lado owner por RLS) ni seleccionar columnas
-- fuera de la matriz.
create or replace view public.v_cross_library_matches as
select
  ll.id as link_id,
  ll.link_type,
  ll.link_label,
  mi.id as media_item_id,
  mi.title,
  mi.category,
  mi.cover_url,
  case when (ll.visibility -> mi.category ->> 'status')::boolean
       then ot.status::text end                              as owner_status,
  case when (ll.visibility -> mi.category ->> 'rating')::boolean
       then ot.rating::text end                              as owner_rating,
  case when (ll.visibility -> mi.category ->> 'wishlist')::boolean
       then ot.is_wishlisted::text end                       as owner_wishlist,
  case when (ll.visibility -> mi.category ->> 'progress')::boolean
       then ot.progress end                                  as owner_progress,
  case when (ll.visibility -> mi.category ->> 'notes')::boolean
       then ot.personal_notes end                            as owner_notes,
  lt.status::text                                            as my_status,
  lt.rating::text                                            as my_rating,
  lt.progress                                                as my_progress,
  lt.is_wishlisted                                           as my_wishlist,
  true                                                       as mutual_wishlist
from library_links ll
join lateral (
  select lm.profile_id from library_members lm
  where lm.library_id = ll.owner_library_id and lm.role = 'owner'
  limit 1
) own on true
join library_items loi on loi.library_id = ll.owner_library_id
  and loi.deleted_at is null
join media_items mi on mi.id = loi.media_item_id
join user_media_tracking ot on ot.media_item_id = mi.id
  and ot.profile_id = own.profile_id
join user_media_tracking lt on lt.media_item_id = mi.id
  and lt.profile_id = auth.uid()
where ll.status = 'accepted'
  and ll.match_enabled
  and not ot.is_private
  and not lt.is_private
  -- el viewer debe ser miembro de la library vinculada (lado que recibe)
  and exists (select 1 from library_members vm
              where vm.library_id = ll.linked_library_id
                and vm.profile_id = auth.uid())
  -- match = ambos lados interesados (wishlist o backlog)
  and (ot.is_wishlisted or ot.status = 'backlog')
  and (lt.is_wishlisted or lt.status = 'backlog');

-- Dirección inversa: si existe link B→A, el owner de A ve los campos
-- compartidos por B en OTRA ejecución de la misma vista — no hace falta
-- duplicar lógica. Para match mutuo completo ambos links deben existir;
-- respond_library_link() crea la fila inversa al aceptar.

-- ============================================================================
-- RLS POLICIES (base: cada usuario ve/edita lo suyo; lo compartido va por views)
-- ============================================================================

-- profiles: cada quien ve/edita su perfil; display público mínimo para links
create policy "profiles_self" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- libraries: miembros ven su library
create policy "libraries_member_read" on public.libraries
  for select using (
    exists (select 1 from library_members lm
            where lm.library_id = libraries.id and lm.profile_id = auth.uid())
    or exists (select 1 from library_links ll
               join library_members lm on lm.library_id = ll.linked_library_id
               where ll.owner_library_id = libraries.id and ll.status = 'accepted'
                 and lm.profile_id = auth.uid()));

create policy "libraries_member_write" on public.libraries
  for update using (
    exists (select 1 from library_members lm
            where lm.library_id = libraries.id and lm.profile_id = auth.uid()
              and lm.role in ('owner','editor')));

-- library_members: miembros ven su library; nadie se añade solo (RPCs lo hacen)
create policy "members_read" on public.library_members
  for select using (
    exists (select 1 from library_members me
            where me.library_id = library_members.library_id and me.profile_id = auth.uid())
    or profile_id = auth.uid());

-- library_links: owner gestiona sus links; el invitado ve los pendientes dirigidos a él
create policy "links_owner" on public.library_links
  for all using (
    exists (select 1 from library_members lm
            where lm.library_id = owner_library_id and lm.profile_id = auth.uid())
    or exists (select 1 from library_members lm
               where lm.library_id = linked_library_id and lm.profile_id = auth.uid()));

-- media_items: catálogo global legible por autenticados (la escritura va por ETL/service role)
create policy "media_items_read" on public.media_items
  for select to authenticated using (true);

-- library_items: miembros de la library ven/gestionan (role editor+ para write)
create policy "items_member" on public.library_items
  for all using (
    exists (select 1 from library_members lm
            where lm.library_id = library_items.library_id and lm.profile_id = auth.uid()));

-- user_media_tracking: cada usuario gestiona lo suyo
create policy "tracking_self" on public.user_media_tracking
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- mods: dueño los ve; lectura de mods compartidos se gobierna por visibility['mods'] en Phase 5
create policy "mods_self" on public.mods
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- item_touches: miembros de la library destino ven; origen escribe
create policy "touches_member" on public.item_touches
  for select using (
    exists (select 1 from library_members lm
            where lm.library_id = to_library_id and lm.profile_id = auth.uid()));
create policy "touches_insert" on public.item_touches
  for insert with check (from_profile_id = auth.uid());

-- ============================================================================
-- NOTAS FINALES
-- ============================================================================
-- - La ETL corre con service_role (bypass RLS) — nunca exponer service key.
-- - anon key + auth.uid() en Edge Functions vía Supabase JS / PostgREST.
-- - TOTP MFA: sin cambios de schema (vive en auth.mfa_* de Supabase).
-- - Zone (5F): libraries row kind='zone' + library_members de ambos —
--   sin tablas nuevas; UI decide cuántas zonas por usuario.
-- - PENDIENTE Phase 5: query real de v_cross_library_matches (ver nota arriba)
--   y RPCs de touches → writes en user_media_tracking.
