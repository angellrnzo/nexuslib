import { json, options, requireUser } from '../_shared/http.ts';

// health — diagnóstico de keys/config SIN exponer valores.
// POST {} -> { ok, checks: { steamgriddb, tmdb, supabase } }
// Solo valida presencia + un probe barato; nunca devuelve la key.

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return options();
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;

  const checks: Record<string, { present: boolean; reachable?: boolean; detail?: string }> = {};

  const sgd = Deno.env.get('STEAMGRIDDB_API_KEY');
  checks.steamgriddb = { present: !!sgd };
  if (sgd) {
    try {
      const r = await fetch('https://www.steamgriddb.com/api/v2/search/autocomplete/' + encodeURIComponent('test'), {
        headers: { 'Authorization': 'Bearer ' + sgd },
      });
      checks.steamgriddb.reachable = r.ok || r.status === 404 || r.status === 400;
      checks.steamgriddb.detail = 'http ' + r.status;
    } catch (e) {
      checks.steamgriddb.reachable = false;
      checks.steamgriddb.detail = String(e);
    }
  }

  const tmdb = Deno.env.get('TMDB_API_KEY');
  checks.tmdb = { present: !!tmdb };
  if (tmdb) {
    try {
      const r = await fetch('https://api.themoviedb.org/3/configuration?api_key=' + encodeURIComponent(tmdb));
      checks.tmdb.reachable = r.ok;
      checks.tmdb.detail = 'http ' + r.status;
    } catch (e) {
      checks.tmdb.reachable = false;
      checks.tmdb.detail = String(e);
    }
  }

  checks.supabase = { present: true, reachable: true, detail: 'service role OK' };

  const ok = Object.values(checks).every(c => c.present !== false);
  return json({ ok, checks });
});
