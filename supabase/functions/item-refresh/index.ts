import { obtenerMetadataDetallada, flatMetaToRow, Category } from '../_shared/providers.ts';
import { json, options, requireUser } from '../_shared/http.ts';

const CATEGORIES: Category[] = ['Juegos', 'Peliculas_Series', 'Libros', 'Mangas'];

// external_id viene en formato de ALMACENAMIENTO (sin prefijo OL/al-, con movie-/tv-).
// Volvemos al formato que espera cada fetcher de providers.ts.
function toApiId(category: Category, storedId: string): string {
  const id = String(storedId || '').trim();
  if (category === 'Libros' && !/^isbn:/i.test(id) && !/^OL/i.test(id)) return 'OL' + id;
  if (category === 'Mangas' && !/^(al-|mal-)/i.test(id)) return 'al-' + id;
  return id;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return options();
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;
  const { admin } = ctx;

  try {
    const body = await req.json();
    const category = String(body.category || '') as Category;
    const id = String(body.id || '').trim();
    if (!CATEGORIES.includes(category)) return json({ success: false, msg: 'Categoría inválida.' }, 400);
    if (!id) return json({ success: false, msg: 'ID vacío.' });

    // localizar el media_item por external_id almacenado
    const { data: item } = await admin
      .from('media_items').select('id, provider, external_id, title')
      .eq('category', category).eq('external_id', id)
      .maybeSingle();
    if (!item) return json({ success: false, msg: 'Elemento no encontrado en el catálogo.' });

    const apiId = toApiId(category, item.external_id);
    const meta = await obtenerMetadataDetallada(category, apiId);
    if (!meta) return json({ success: false, msg: 'No se pudo obtener metadata desde la API externa.' });

    const row = flatMetaToRow(category, meta);
    // conserva external_id almacenado (el flat puede normalizar distinto, ej. OL->sin prefijo ya aplicado)
    const update = {
      title: row.title || item.title,
      cover_url: row.cover_url,
      trailer_url: row.trailer_url,
      metadata: row.metadata,
      metadata_updated_at: new Date().toISOString(),
    };
    const u = await admin.from('media_items').update(update).eq('id', item.id);
    if (u.error) throw new Error(u.error.message);

    return json({ success: true, msg: 'Metadata actualizada: ' + update.title, data: update });
  } catch (e) {
    return json({ success: false, msg: (e as Error).message || 'Error al reparar elemento.' }, 500);
  }
});
