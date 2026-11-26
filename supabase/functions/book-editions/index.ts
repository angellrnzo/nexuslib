import { json, options, requireUser } from '../_shared/http.ts';

// book-editions — lista de ediciones de una obra de OpenLibrary.
// POST { id } donde id = external_id almacenado en media_items para Libros
// (formato '267096W' / '12345M' / 'isbn:...' — igual que item-refresh).
// Resuelve la work key y devuelve ediciones normalizadas.

const OL = 'https://openlibrary.org';

async function olFetch(path: string): Promise<any | null> {
  try {
    const r = await fetch(OL + path, { headers: { 'User-Agent': 'NexusLib/1.0 (+https://github.com/angellrnzo/nexuslib)' } });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

// external_id -> work key '/works/OLxxxW'
async function resolveWorkKey(id: string): Promise<string | null> {
  const clean = String(id || '').trim();

  if (/^isbn:/i.test(clean)) {
    const d = await olFetch('/isbn/' + encodeURIComponent(clean.slice(5)) + '.json');
    if (d && Array.isArray(d.works) && d.works[0] && d.works[0].key) return d.works[0].key;
    return null;
  }

  const olId = clean.toUpperCase().startsWith('OL') ? clean.toUpperCase() : 'OL' + clean.toUpperCase();

  if (/^OL\d+W$/.test(olId)) return '/works/' + olId;

  if (/^OL\d+M$/.test(olId)) {
    const d = await olFetch('/books/' + olId + '.json');
    if (d && Array.isArray(d.works) && d.works[0] && d.works[0].key) return d.works[0].key;
  }
  return null;
}

function langName(key: string, lang: 'es' | 'en' = 'es'): string {
  const m = String(key || '').match(/\/languages\/([a-z]{3})/i);
  if (!m) return '';
  const code = m[1].toLowerCase();
  if (lang === 'en') {
    const mapEn: Record<string, string> = { spa: 'Spanish', eng: 'English', fre: 'French', ger: 'German', ita: 'Italian', por: 'Portuguese' };
    return mapEn[code] || code;
  }
  const map: Record<string, string> = { spa: 'Español', eng: 'Inglés', fre: 'Francés', ger: 'Alemán', ita: 'Italiano', por: 'Portugués' };
  return map[code] || code;
}

function yearOf(date: string): number {
  const m = String(date || '').match(/(\d{4})/);
  return m ? Number(m[1]) : 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return options();
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;

  try {
    const body = await req.json();
    const id = String(body.id || '').trim();
    if (!id) return json({ error: 'id vacío' }, 400);
    const lang = body.lang === 'en' ? 'en' : 'es';

    const workKey = await resolveWorkKey(id);
    if (!workKey) return json({ error: 'obra no encontrada en OpenLibrary', editions: [] });

    const data = await olFetch(workKey + '/editions.json?limit=100');
    const entries = (data && data.entries) || [];
    if (!entries.length) return json({ work: workKey, editions: [] });

    // nombres de traductores: key '/authors/OL..A' -> name (cap 20 únicos)
    const tKeys = new Set<string>();
    for (const e of entries) {
      for (const t of (e.translators || [])) {
        if (t && t.key) tKeys.add(String(t.key));
      }
    }
    const tNames = new Map<string, string>();
    await Promise.all([...tKeys].slice(0, 20).map(async (k) => {
      const a = await olFetch(k + '.json');
      if (a && a.name) tNames.set(k, String(a.name));
    }));

    const editions = entries.map((e: any) => {
      const translators = (e.translators || [])
        .map((t: any) => (t && t.key ? (tNames.get(String(t.key)) || String(t.key).split('/').pop()) : null))
        .filter(Boolean);
      const langs = (e.languages || []).map((l: any) => langName(l && l.key, lang)).filter(Boolean);
      const isbns = [...(e.isbn_10 || []), ...(e.isbn_13 || [])];
      return {
        key: String(e.key || '').replace('/books/', ''),
        title: String(e.title || ''),
        publish_date: String(e.publish_date || ''),
        publishers: (e.publishers || []).map(String),
        translators,
        languages: langs,
        isbn: isbns[0] || '',
        ocaid: String(e.ocaid || ''),
        _year: yearOf(e.publish_date),
        _es: langs.some((l: string) => /espa/i.test(l)),
      };
    });

    // ES primero, luego año desc
    editions.sort((a: any, b: any) => (Number(b._es) - Number(a._es)) || (b._year - a._year));
    for (const e of editions) { delete e._year; delete e._es; }

    return json({ work: workKey, editions });
  } catch (e) {
    return json({ error: (e as Error).message || 'error consultando OpenLibrary' }, 500);
  }
});
