import { json, options, requireUser } from '../_shared/http.ts';

// steam-reviews — scrape del resumen de reseñas de la store page.
// El endpoint appreviews JSON está muerto; la data vive en los
// data-tooltip-html de .user_reviews_summary_row (30d + all-time).
// POST { appid } -> { pct, total, pct30, total30, tier }

const COOKIES = 'birthtime=283993201; wants_mature_content=1; lastagecheckage=1-0-1979; mature_content=1';

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

// '14,454' | '23.297' -> 14454
function parseNum(s: string): number {
  const clean = String(s || '').replace(/[.,\s]/g, '');
  const n = Number(clean);
  return isNaN(n) ? 0 : n;
}

// 'El 94% de las 14,454 reseñas de los usuarios en los últimos 30 días son positivas'
function extract(html: string, needle: string): { pct: number; total: number } | null {
  const re = /data-tooltip-html="([^"]*)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const tip = decodeEntities(m[1]);
    if (tip.toLowerCase().indexOf(needle) === -1) continue;
    const pm = tip.match(/(\d+(?:[.,]\d+)?)\s*%/);
    const tm = tip.match(/de las\s+([\d.,]+)\s*rese/i);
    if (pm && tm) return { pct: Number(String(pm[1]).replace(',', '.')), total: parseNum(tm[1]) };
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return options();
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;

  try {
    const body = await req.json();
    const appid = String(body.appid || '').trim();
    if (!/^\d+$/.test(appid)) return json({ error: 'appid inválido' }, 400);

    const res = await fetch('https://store.steampowered.com/app/' + appid + '/?l=spanish&cc=US', {
      headers: {
        'Cookie': COOKIES,
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'User-Agent': 'NexusLib/1.0',
      },
      redirect: 'follow',
    });
    if (!res.ok) return json({ error: 'steam store ' + res.status }, 502);
    const html = await res.text();
    if (html.indexOf('apphub_AppName') === -1) {
      return json({ error: 'store page sin contenido (posible agecheck)' }, 502);
    }

    // all-time: "en tu idioma son positivas" — 30d: "últimos 30 días"
    const all = extract(html, 'en tu idioma') || extract(html, 'son positivas');
    const d30 = extract(html, 'ltimos 30') || extract(html, 'ltimos 30 días');

    if (!all && !d30) return json({ error: 'sin datos de reseñas en la página' }, 404);

    const pct = all ? all.pct : (d30 ? d30.pct : 0);
    const total = all ? all.total : (d30 ? d30.total : 0);

    // tier 5-bloques (spec): 0-20 muy negativas ... 80-100 muy positivas
    const tier = pct >= 80 ? 'Muy positivas' : pct >= 60 ? 'Mayormente positivas'
      : pct >= 40 ? 'Neutras' : pct >= 20 ? 'Mayormente negativas' : 'Muy negativas';

    return json({
      appid,
      pct, total,
      pct30: d30 ? d30.pct : null,
      total30: d30 ? d30.total : null,
      tier,
    });
  } catch (e) {
    return json({ error: (e as Error).message || 'error consultando steam' }, 500);
  }
});
