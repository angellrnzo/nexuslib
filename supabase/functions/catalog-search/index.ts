import { buscarCatalogoExterno, Category } from '../_shared/providers.ts';
import { json, options, requireUser } from '../_shared/http.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return options();
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;

  try {
    const body = await req.json();
    const category = String(body.category || '') as Category;
    const query = String(body.query || '');
    if (!['Juegos', 'Peliculas_Series', 'Libros', 'Mangas'].includes(category)) {
      return json({ error: 'categoría inválida' }, 400);
    }
    const lang = body.lang === 'en' ? 'en' : 'es';
    const results = await buscarCatalogoExterno(category, query, lang);
    return json(results);
  } catch (e) {
    return json({ error: (e as Error).message || 'error en búsqueda' }, 500);
  }
});
