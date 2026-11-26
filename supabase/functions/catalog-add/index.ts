import {
  buscarCatalogoExterno, extraerIdDirecto, obtenerMetadataDetallada,
  flatMetaToRow, Category,
} from '../_shared/providers.ts';
import { json, options, requireUser } from '../_shared/http.ts';

const CATEGORIES: Category[] = ['Juegos', 'Peliculas_Series', 'Libros', 'Mangas'];

// libraries personales donde se inserta el item:
//   - la mía
//   - las de vínculos 'pareja' aceptados (paridad con el Sheet compartido de v1)
async function targetLibraries(admin: any, userId: string): Promise<string[]> {
  const { data: mem } = await admin
    .from('library_members').select('library_id, libraries!inner(kind)')
    .eq('profile_id', userId);
  const myLibs = (mem || []).filter((m: any) => m.libraries?.kind === 'personal')
    .map((m: any) => m.library_id);
  if (!myLibs.length) return [];

  const libs = new Set<string>(myLibs);
  const { data: links } = await admin
    .from('library_links').select('owner_library_id, linked_library_id')
    .eq('status', 'accepted').eq('link_type', 'pareja')
    .in('owner_library_id', myLibs);
  for (const l of links || []) {
    const other = l.owner_library_id === myLibs[0] ? l.linked_library_id : l.owner_library_id;
    // owner es mío -> el otro es linked; si owner no es mío (link inverso), owner es el otro
    const candidate = myLibs.includes(l.owner_library_id) ? l.linked_library_id : l.owner_library_id;
    void other;
    libs.add(candidate);
  }
  // también links donde yo soy el linked_library_id
  const { data: links2 } = await admin
    .from('library_links').select('owner_library_id, linked_library_id')
    .eq('status', 'accepted').eq('link_type', 'pareja')
    .in('linked_library_id', myLibs);
  for (const l of links2 || []) libs.add(l.owner_library_id);

  // filtrar: solo libraries kind='personal'
  const { data: libRows } = await admin
    .from('libraries').select('id, kind').in('id', [...libs]);
  return (libRows || []).filter((r: any) => r.kind === 'personal').map((r: any) => r.id);
}

async function ensureLibraryItem(admin: any, libraryId: string, mediaItemId: string, userId: string) {
  const { data: existing } = await admin
    .from('library_items').select('id, deleted_at')
    .eq('library_id', libraryId).eq('media_item_id', mediaItemId)
    .maybeSingle();
  if (!existing) {
    await admin.from('library_items').insert({
      library_id: libraryId, media_item_id: mediaItemId, added_by: userId,
    });
  } else if (existing.deleted_at) {
    await admin.from('library_items')
      .update({ deleted_at: null }).eq('id', existing.id);
  }
}

async function findMediaItem(admin: any, category: Category, provider: string, externalId: string) {
  const { data } = await admin
    .from('media_items').select('id, title')
    .eq('category', category).eq('provider', provider).eq('external_id', externalId)
    .maybeSingle();
  return data;
}

async function alreadyInLibrary(admin: any, libraryIds: string[], externalId: string, category: Category): Promise<boolean> {
  const { data } = await admin
    .from('library_items')
    .select('id, media_items!inner(category, external_id)')
    .in('library_id', libraryIds).is('deleted_at', null)
    .eq('media_items.category', category).eq('media_items.external_id', externalId)
    .limit(1);
  return (data || []).length > 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return options();
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;
  const { userId, admin } = ctx;

  try {
    const body = await req.json();
    const category = String(body.category || '') as Category;
    const input = String(body.idOrUrlOrName || '').trim().slice(0, 300);
    const lang = body.lang === 'en' ? 'en' : 'es';
    if (!CATEGORIES.includes(category)) return json({ success: false, msg: 'Categoría inválida.' }, 400);
    if (!input) return json({ success: false, msg: 'Introduce un valor válido.' });

    const libIds = await targetLibraries(admin, userId);
    if (!libIds.length) return json({ success: false, msg: 'No tienes biblioteca personal.' });

    // 1) ID/URL directo
    const idDirecto = extraerIdDirecto(category, input);
    if (idDirecto) {
      // normalizar a external_id de almacenamiento para el check "ya existe"
      let probeId = idDirecto;
      if (category === 'Libros' && !/^isbn:/i.test(probeId)) probeId = probeId.replace(/^OL/i, '');
      if (category === 'Mangas') probeId = probeId.replace(/^al-/i, '');
      if (await alreadyInLibrary(admin, libIds, probeId, category)) {
        return json({ success: false, msg: 'Este elemento ya está en tu biblioteca.' });
      }

      const meta = await obtenerMetadataDetallada(category, idDirecto, lang);
      if (!meta) return json({ success: false, msg: 'No se encontraron datos para el ID indicado.' });
      const row = flatMetaToRow(category, meta);
      // check autoritativo: el probe anterior usa el ID crudo (isbn:/mal- no
      // coinciden con el external_id almacenado); aqui ya es canonico
      if (await alreadyInLibrary(admin, libIds, row.external_id, category)) {
        return json({ success: false, msg: 'Este elemento ya está en tu biblioteca.' });
      }

      let item = await findMediaItem(admin, category, row.provider, row.external_id);
      if (!item) {
        const ins = await admin.from('media_items').insert({
          category, provider: row.provider, external_id: row.external_id,
          title: row.title, cover_url: row.cover_url, trailer_url: row.trailer_url,
          metadata: row.metadata, metadata_updated_at: new Date().toISOString(),
        }).select('id, title').single();
        if (ins.error) {
          // race: otro usuario lo insertó antes -> re-leer
          item = await findMediaItem(admin, category, row.provider, row.external_id);
          if (!item) throw new Error(ins.error.message);
        } else {
          item = ins.data;
        }
      }
      for (const libId of libIds) await ensureLibraryItem(admin, libId, item.id, userId);
      return json({ success: true, msg: '¡Añadido: ' + item.title + '!' });
    }

    // 2) Búsqueda -> primer resultado
    const resultados = await buscarCatalogoExterno(category, input, lang);
    if (resultados && resultados.length > 0) {
      const primero = resultados[0];
      let probeId = primero.id;
      if (category === 'Libros') probeId = probeId.replace(/^OL/i, '');
      if (category === 'Mangas') probeId = probeId.replace(/^al-/i, '');
      if (await alreadyInLibrary(admin, libIds, probeId, category)) {
        return json({ success: false, msg: 'Ya existe en tu lista: ' + primero.titulo });
      }

      const meta = await obtenerMetadataDetallada(category, primero.id, lang);
      if (meta) {
        const row = flatMetaToRow(category, meta);
        if (await alreadyInLibrary(admin, libIds, row.external_id, category)) {
          return json({ success: false, msg: 'Ya existe en tu lista: ' + (meta.titulo || primero.titulo) });
        }
        let item = await findMediaItem(admin, category, row.provider, row.external_id);
        if (!item) {
          const ins = await admin.from('media_items').insert({
            category, provider: row.provider, external_id: row.external_id,
            title: row.title, cover_url: row.cover_url, trailer_url: row.trailer_url,
            metadata: row.metadata, metadata_updated_at: new Date().toISOString(),
          }).select('id, title').single();
          if (ins.error) {
            item = await findMediaItem(admin, category, row.provider, row.external_id);
            if (!item) throw new Error(ins.error.message);
          } else {
            item = ins.data;
          }
        }
        for (const libId of libIds) await ensureLibraryItem(admin, libId, item.id, userId);
        return json({ success: true, msg: '¡Añadido: ' + item.title + '!' });
      }
    }

    return json({ success: false, msg: 'No se encontraron coincidencias.' });
  } catch (e) {
    return json({ success: false, msg: (e as Error).message || 'Error al añadir elemento.' }, 500);
  }
});
