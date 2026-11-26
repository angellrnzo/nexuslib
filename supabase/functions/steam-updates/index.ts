import { json, options, requireUser } from '../_shared/http.ts';

// steam-updates — proxy del RSS de noticias de Steam por appid.
// Devuelve los últimos items (parches, hotfixes, updates) para el
// "Game Update History" del modal de juegos. Sin key, sin storage.

const UPDATE_RE = /(actualizaci|patch|hotfix|update|parche|novedad|release|version|dlc)/i;

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1].trim() : '';
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

    const url = `https://store.steampowered.com/feeds/news/app/${appid}?l=spanish&cc=US`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'NexusLib/1.0 (+https://angellrnzo.github.io/nexuslib)' },
    });
    if (!res.ok) return json({ error: `steam RSS ${res.status}` }, 502);

    const xml = await res.text();
    const items: { date: string; title: string; url: string; summary: string; is_update: boolean }[] = [];

    const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    for (const b of blocks.slice(0, 20)) {
      const title = stripTags(tag(b, 'title'));
      const link = decodeEntities(tag(b, 'link'));
      const pubDate = decodeEntities(tag(b, 'pubDate'));
      const desc = stripTags(tag(b, 'description')).slice(0, 400);
      if (!title) continue;
      items.push({
        date: pubDate,
        title,
        url: link,
        summary: desc,
        is_update: UPDATE_RE.test(title),
      });
    }

    return json({ appid, count: items.length, items });
  } catch (e) {
    return json({ error: (e as Error).message || 'error fetching steam news' }, 500);
  }
});
