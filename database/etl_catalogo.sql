-- ETL catalogo (Peliculas_Series + Libros + Mangas) — etl_catalogo.py
-- 6 items | 12 tracking
-- idempotente: ON CONFLICT DO NOTHING
begin;

insert into public.media_items
  (category, provider, external_id, title, cover_url, trailer_url, metadata)
values
  ('Peliculas_Series','tmdb','movie-1003596','Vengadores: Doomsday','https://image.tmdb.org/t/p/w500/7bQczUMnjz8iwxNP9YrmLkfI8od.jpg','https://www.youtube.com/watch?v=gcjnEYJ4OB8','{"creator": "Joe Russo, Anthony Russo", "emission_status": "Post Production", "genres": ["Ciencia ficción", "Acción", "Aventura"], "description": "Los héroes más queridos de tres universos distintos son abocados a una colisión catastrófica donde tendrán que hacer frente a la mayor amenaza a su existencia hasta la fecha.", "release_date": "2026-12-16", "media_type": "movie", "duration_min": 165}'::jsonb),
  ('Peliculas_Series','tmdb','movie-950387','Una película de Minecraft','https://image.tmdb.org/t/p/w500/mFjtmmh4RtK9tLv1aPnUsl6st3m.jpg','https://www.youtube.com/watch?v=INBkKE45nkA','{"creator": "Jared Hess", "emission_status": "Estrenada", "platforms": "Netflix, Netflix Standard with Ads, HBO Max Amazon Channel", "genres": ["Familia", "Fantasía", "Comedia", "Aventura"], "catalog_score": "6.2", "description": "Cuatro inadaptados se encuentran luchando con problemas ordinarios cuando de repente se ven arrastrados a través de un misterioso portal al Mundo Exterior: un extraño país de las maravillas cúbico que se nutre de la imaginación. Para volver a casa, tendrán que dominar este mundo mientras se embarcan en una búsqueda mágica con un inesperado experto artesano, Steve.", "release_date": "2025-03-31", "media_type": "movie", "duration_min": 100}'::jsonb),
  ('Libros','openlibrary','5738148W','The Final Empire','https://covers.openlibrary.org/b/id/14658160-L.jpg',null,'{"author": "Brandon Sanderson", "publisher": "Open Library", "genres": ["form:novel", "series:The Mistborn Saga", "series:Mistborn Original Trilogy", "genre:high fantasy", "Courts and courtiers"], "description": "For a thousand years ashes have fallen from the sky.  For a thousand years nothing has flourished.  For a thousand years the skaa have been enslaved and live in misery, mired in inevitable fear.  For a thousand years the Lord Ruler has reigned with absolute power, ruling thanks to terror, his powers and his immortality, aided by \"benders\" and \"inquisitors\", along with the powerful magic of Allomancy."}'::jsonb),
  ('Libros','openlibrary','267096W','Анна Каренина','https://covers.openlibrary.org/b/id/2560652-L.jpg',null,'{"author": "Leo Tolstoy", "publisher": "Open Library", "genres": ["Fiction", "Adultery", "Married women", "Social life and customs", "Social conditions"], "description": "Described by William Faulkner as the best novel ever written and by Fyodor Dostoevsky as “flawless,” Anna Karenina tells of the doomed love affair between the sensuous and rebellious Anna and the dashing officer, Count Vronsky. Tragedy unfolds as Anna rejects her passionless marriage and thereby exposes herself to the hypocrisies of society. Set against a vast and richly textured canvas of nineteenth-century Russia, the novel''s seven major characters create a dynamic imbalance, playing out the contrasts of city and country life and all the variations on love and family happiness."}'::jsonb),
  ('Mangas','anilist','30002','Berserk','https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30002-Cul4OeN7bYtn.jpg',null,'{"author": "Kentarou Miura, Kouji Mori, Studio Gaga", "publisher": "AniList", "emission_status": "En emisión", "demographic": "Seinen", "genres": ["Action", "Adventure", "Drama", "Fantasy", "Horror", "Psychological"], "catalog_score": "9.2", "description": "His name is Guts, the Black Swordsman, a feared warrior spoken of only in whispers. Bearer of a gigantic sword, an iron hand, and the scars of countless battles and tortures, his flesh is also indelibly marked with The Brand, an unholy symbol that draws the forces of darkness to him and dooms him as their sacrifice. But Guts won''t take his fate lying down; he''ll cut a crimson swath of carnage through the ranks of the damned—and anyone else foolish enough to oppose him! Accompanied by Puck the Elf, more an annoyance than a companion, Guts relentlessly follows a dark, bloodstained path that leads only to death...or vengeance.\n\n(Source: Dark Horse)\n\nNotes:\n- Volumes 1-5 contain the 16 prequel chapters 0A - 0P.\n- Chapter 83 was omitted from Volume 13 due to the author’s request.\n- Volume 14 includes “Berserk: The Prototype”.\n- Due to the author''s passing, starting from Chapter 365, the manga is illustrated by Studio Gaga (Miura''s assistants) and supervised by Kouji Mori (a close friend of Miura''s).", "release_date": "1989-08-25"}'::jsonb),
  ('Mangas','anilist','147863','Even the Student Council Has Its Holes!','https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx147863-rFKeAjxaAGBo.jpg',null,'{"author": "Ryou Imamura, Muchimaro, Jan Ivan Concepcion", "publisher": "AniList", "emission_status": "En emisión", "demographic": "Shounen", "genres": ["Comedy", "Ecchi", "Slice of Life"], "catalog_score": "7.6", "description": "Mizunoe Ume just wanted to avoid repeating a grade when he joined the student council. After all, it seemed like an easy fix to his current academic problems. But then, he met his fellow council members. Each of them is eccentric in their own way-one''s an airhead, another''s scary, one''s secretly a pervert, but all in all, they''re just really weird! Yet somehow, they''re also oddly cute and endearing. Which means Mizunoe is stuck with them and all the chaos they bring to the table.\n\n(Source: Seven Seas Entertainment)\n\nNote: Winner of the 2023 Next Manga Award in the Print Manga Category.", "release_date": "2022-04-27"}'::jsonb)
on conflict (category, provider, external_id) do nothing;

-- library_items: catalogo completo a cada biblioteca personal
insert into public.library_items (library_id, media_item_id, added_by)
select l.id, mi.id, l.created_by
from public.media_items mi
join public.libraries l on l.kind = 'personal'
join public.library_members lm on lm.library_id = l.id
join auth.users u on u.id = lm.profile_id
where mi.category in ('Peliculas_Series', 'Libros', 'Mangas')
  and u.email in ('angellrnzo@gmail.com', 'angellrnzor@gmail.com')
on conflict do nothing;

-- tracking angel / Peliculas_Series (2)
insert into public.user_media_tracking
  (profile_id, media_item_id, status, rating, is_wishlisted, personal_notes, progress)
select (select id from auth.users where email = 'angellrnzo@gmail.com'), mi.id,
       v.status::public.track_status, v.rating::numeric, v.wishlist,
       nullif(v.notes, ''), nullif(v.progress, '')
from (values
  ('movie-1003596','backlog',null,false,null,null),
  ('movie-950387','backlog',null,false,null,null)
) as v(external_id, status, rating, wishlist, notes, progress)
join public.media_items mi
  on mi.category = 'Peliculas_Series' and mi.provider = 'tmdb' and mi.external_id = v.external_id
on conflict (profile_id, media_item_id) do nothing;

-- tracking angel / Libros (2)
insert into public.user_media_tracking
  (profile_id, media_item_id, status, rating, is_wishlisted, personal_notes, progress)
select (select id from auth.users where email = 'angellrnzo@gmail.com'), mi.id,
       v.status::public.track_status, v.rating::numeric, v.wishlist,
       nullif(v.notes, ''), nullif(v.progress, '')
from (values
  ('5738148W','backlog',null,false,null,null),
  ('267096W','backlog',null,false,null,null)
) as v(external_id, status, rating, wishlist, notes, progress)
join public.media_items mi
  on mi.category = 'Libros' and mi.provider = 'openlibrary' and mi.external_id = v.external_id
on conflict (profile_id, media_item_id) do nothing;

-- tracking angel / Mangas (2)
insert into public.user_media_tracking
  (profile_id, media_item_id, status, rating, is_wishlisted, personal_notes, progress)
select (select id from auth.users where email = 'angellrnzo@gmail.com'), mi.id,
       v.status::public.track_status, v.rating::numeric, v.wishlist,
       nullif(v.notes, ''), nullif(v.progress, '')
from (values
  ('30002','backlog',null,false,null,null),
  ('147863','backlog',null,false,null,null)
) as v(external_id, status, rating, wishlist, notes, progress)
join public.media_items mi
  on mi.category = 'Mangas' and mi.provider = 'anilist' and mi.external_id = v.external_id
on conflict (profile_id, media_item_id) do nothing;

-- tracking talmai / Peliculas_Series (2)
insert into public.user_media_tracking
  (profile_id, media_item_id, status, rating, is_wishlisted, personal_notes, progress)
select (select id from auth.users where email = 'angellrnzor@gmail.com'), mi.id,
       v.status::public.track_status, v.rating::numeric, v.wishlist,
       nullif(v.notes, ''), nullif(v.progress, '')
from (values
  ('movie-1003596','backlog',null,false,null,null),
  ('movie-950387','backlog',null,false,null,null)
) as v(external_id, status, rating, wishlist, notes, progress)
join public.media_items mi
  on mi.category = 'Peliculas_Series' and mi.provider = 'tmdb' and mi.external_id = v.external_id
on conflict (profile_id, media_item_id) do nothing;

-- tracking talmai / Libros (2)
insert into public.user_media_tracking
  (profile_id, media_item_id, status, rating, is_wishlisted, personal_notes, progress)
select (select id from auth.users where email = 'angellrnzor@gmail.com'), mi.id,
       v.status::public.track_status, v.rating::numeric, v.wishlist,
       nullif(v.notes, ''), nullif(v.progress, '')
from (values
  ('5738148W','backlog',null,false,null,null),
  ('267096W','backlog',null,false,null,null)
) as v(external_id, status, rating, wishlist, notes, progress)
join public.media_items mi
  on mi.category = 'Libros' and mi.provider = 'openlibrary' and mi.external_id = v.external_id
on conflict (profile_id, media_item_id) do nothing;

-- tracking talmai / Mangas (2)
insert into public.user_media_tracking
  (profile_id, media_item_id, status, rating, is_wishlisted, personal_notes, progress)
select (select id from auth.users where email = 'angellrnzor@gmail.com'), mi.id,
       v.status::public.track_status, v.rating::numeric, v.wishlist,
       nullif(v.notes, ''), nullif(v.progress, '')
from (values
  ('30002','backlog',null,false,null,null),
  ('147863','backlog',null,false,null,null)
) as v(external_id, status, rating, wishlist, notes, progress)
join public.media_items mi
  on mi.category = 'Mangas' and mi.provider = 'anilist' and mi.external_id = v.external_id
on conflict (profile_id, media_item_id) do nothing;

commit;