// Port de los fetchers de WebAPP.gs a Deno/Edge Functions.
// Misma lógica: búsqueda por categoría + metadata detallada por provider.
// Secrets: STEAMGRIDDB_API_KEY, TMDB_API_KEY (Deno.env)

export type Category = 'Juegos' | 'Peliculas_Series' | 'Libros' | 'Mangas';

export interface SearchResult {
  id: string;
  titulo: string;
  subtitulo: string;
  portada: string;
}

export interface FlatMeta {
  [key: string]: unknown;
  id: string;
  titulo: string;
}

const STEAMGRIDDB_API_KEY = (Deno.env.get('STEAMGRIDDB_API_KEY') || '').trim();
const TMDB_API_KEY = (Deno.env.get('TMDB_API_KEY') || '').trim();

async function getJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, { ...init, headers: { ...(init?.headers || {}) } });
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

export function decodificarHtml(texto: unknown): string {
  return String(texto ?? '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]*>?/gm, '')
    .trim();
}

function isoDate(tsSeconds: number): string {
  const d = new Date(tsSeconds * 1000);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Búsquedas (shape v1: {id, titulo, subtitulo, portada})
// ---------------------------------------------------------------------------

async function buscarSteam(query: string): Promise<SearchResult[]> {
  if (/^\d+$/.test(query)) {
    const item = await obtenerMetadataSteam(query);
    if (!item) return [];
    return [{
      id: String(item.id), titulo: String(item.titulo),
      subtitulo: String(item.creador || ''), portada: String(item.portada || ''),
    }];
  }

  const resultados: SearchResult[] = [];
  const vistos: Record<string, boolean> = {};

  const json: any = await getJson(
    'https://store.steampowered.com/api/storesearch/?term=' +
    encodeURIComponent(query) + '&l=spanish&cc=US'
  );
  if (json && Array.isArray(json.items)) {
    for (const it of json.items.slice(0, 8)) {
      const idStr = String(it.id);
      if (!vistos[idStr]) {
        vistos[idStr] = true;
        resultados.push({
          id: idStr, titulo: it.name,
          subtitulo: 'Steam AppID: ' + idStr,
          portada: it.tiny_image || ('https://cdn.cloudflare.steamstatic.com/steam/apps/' + idStr + '/header.jpg'),
        });
      }
    }
  }

  if (resultados.length < 8) {
    const lista: any = await getJson(
      'https://steamcommunity.com/actions/SearchApps/' + encodeURIComponent(query)
    );
    for (const item of (lista || [])) {
      if (resultados.length >= 8) break;
      const idStr2 = String(item.appid);
      if (!vistos[idStr2]) {
        vistos[idStr2] = true;
        resultados.push({
          id: idStr2, titulo: item.name,
          subtitulo: 'Steam AppID: ' + idStr2 + ' • Catálogo general',
          portada: item.icon || ('https://cdn.cloudflare.steamstatic.com/steam/apps/' + idStr2 + '/header.jpg'),
        });
      }
    }
  }
  return resultados;
}

async function buscarTmdb(query: string): Promise<SearchResult[]> {
  if (!TMDB_API_KEY) return [];
  const url = 'https://api.themoviedb.org/3/search/multi?api_key=' +
    encodeURIComponent(TMDB_API_KEY) +
    '&language=es-ES&include_adult=false&query=' + encodeURIComponent(query);
  const json: any = await getJson(url);
  const results = (json && json.results) ? json.results : [];

  return results
    .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
    .slice(0, 8)
    .map((r: any) => {
      const esSerie = r.media_type === 'tv';
      const fecha = esSerie ? (r.first_air_date || '') : (r.release_date || '');
      const year = fecha ? fecha.substring(0, 4) : 'N/A';
      return {
        id: r.media_type + '-' + r.id,
        titulo: esSerie ? (r.name || r.original_name) : (r.title || r.original_title),
        subtitulo: (esSerie ? 'Serie' : 'Película') + ' • ' + year,
        portada: r.poster_path ? ('https://image.tmdb.org/t/p/w342' + r.poster_path) : '',
      };
    });
}

async function buscarLibros(query: string): Promise<SearchResult[]> {
  const q = String(query || '').trim();
  if (!q) return [];
  const url = 'https://openlibrary.org/search.json?q=' + encodeURIComponent(q) +
    '&fields=key,title,author_name,first_publish_year,cover_i,isbn&limit=8';
  const res = await fetch(url);
  if (!res.ok) return [];
  const json: any = await res.json();
  const docs = (json && json.docs) ? json.docs : [];

  return docs.map((d: any) => {
    const workId = String(d.key || '').replace('/works/', '');
    const autores = (Array.isArray(d.author_name) && d.author_name.length > 0)
      ? d.author_name.slice(0, 3).join(', ')
      : 'Autor por definir';
    const year = d.first_publish_year ? String(d.first_publish_year) : '';
    const portada = d.cover_i ? ('https://covers.openlibrary.org/b/id/' + d.cover_i + '-M.jpg') : '';
    return {
      id: workId, titulo: d.title || 'Sin título',
      subtitulo: autores + (year ? ' • ' + year : ''),
      portada,
    };
  }).filter((x: SearchResult) => Boolean(x.id));
}

async function buscarMangasAniList(query: string): Promise<SearchResult[]> {
  const gql = 'query ($search: String) { Page(page: 1, perPage: 8) { media(search: $search, type: MANGA, sort: POPULARITY_DESC) { id title { romaji english native } startDate { year } chapters status coverImage { medium large } } } }';
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: gql, variables: { search: query } }),
  });
  const json: any = await res.json();
  const media = (json && json.data && json.data.Page && json.data.Page.media) ? json.data.Page.media : [];

  return media.map((m: any) => {
    const titulo = m.title.english || m.title.romaji || m.title.native || 'Sin título';
    const year = (m.startDate && m.startDate.year) ? m.startDate.year : '';
    const caps = m.chapters ? (m.chapters + ' caps') : 'En curso';
    return {
      id: 'al-' + m.id, titulo,
      subtitulo: 'Manga' + (year ? ' • ' + year : '') + ' • ' + caps,
      portada: (m.coverImage && (m.coverImage.large || m.coverImage.medium)) || '',
    };
  });
}

export async function buscarCatalogoExterno(category: Category, query: string): Promise<SearchResult[]> {
  const q = String(query || '').trim();
  if (!q) return [];
  if (category === 'Juegos') return buscarSteam(q);
  if (category === 'Peliculas_Series') return buscarTmdb(q);
  if (category === 'Libros') return buscarLibros(q);
  if (category === 'Mangas') return buscarMangasAniList(q);
  return [];
}

// ---------------------------------------------------------------------------
// ID directo desde URL/ID pegado (port de extraerIdDirecto_)
// ---------------------------------------------------------------------------

export function extraerIdDirecto(category: Category, input: string): string | null {
  const val = String(input || '').trim();
  if (!val) return null;

  if (category === 'Juegos') {
    if (val.indexOf('steampowered.com/app/') !== -1) {
      const m = val.match(/\/app\/(\d+)/);
      return m ? m[1] : null;
    }
    if (/^\d+$/.test(val)) return val;
  }

  if (category === 'Peliculas_Series') {
    if (val.indexOf('themoviedb.org/') !== -1) {
      const m = val.match(/\/(movie|tv)\/(\d+)/i);
      return m ? (m[1].toLowerCase() + '-' + m[2]) : null;
    }
    if (/^(movie|tv)-\d+$/i.test(val)) return val.toLowerCase();
  }

  if (category === 'Libros') {
    if (val.indexOf('openlibrary.org/') !== -1) {
      const m = val.match(/\/(works|books)\/(OL[0-9A-Z]+)/i);
      return m ? m[2].toUpperCase() : null;
    }
    if (/^OL\d+[WM]$/i.test(val)) return val.toUpperCase();
    const isbnLimpio = val.replace(/[-\s]/g, '');
    if (/^(\d{10}|\d{13})$/.test(isbnLimpio)) return 'isbn:' + isbnLimpio;
  }

  if (category === 'Mangas') {
    if (val.indexOf('anilist.co/manga/') !== -1) {
      const m = val.match(/\/manga\/(\d+)/);
      return m ? ('al-' + m[1]) : null;
    }
    if (val.indexOf('myanimelist.net/manga/') !== -1) {
      const m = val.match(/\/manga\/(\d+)/);
      return m ? ('mal-' + m[1]) : null;
    }
    if (/^al-\d+$/i.test(val)) return val.toLowerCase();
    if (/^\d+$/.test(val)) return 'al-' + val;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Metadata detallada por provider (shape plano v1)
// ---------------------------------------------------------------------------

export async function obtenerMetadataSteam(appId: string): Promise<FlatMeta | null> {
  const cleanId = String(appId).replace(/\D/g, '');
  if (!cleanId) return null;

  const base: FlatMeta = {
    id: cleanId,
    titulo: 'Steam App #' + cleanId,
    creador: 'N/A', editorial: 'N/A', fecha: 'N/A',
    portada: 'https://cdn.cloudflare.steamstatic.com/steam/apps/' + cleanId + '/header.jpg',
    descripcion: 'Ficha obtenida mediante respaldo.',
    generos: 'N/A', precio: 'N/A', modos: 'N/A',
    steamdeck: 'Desconocido', dlcs: 'Ninguno', tags: '', dupli: '',
    versionPatch: '-', versionEstable: 'Actual', versionBeta: '-',
    buildEstable: '-', fechaEstable: '-', beta: '-', notaParche: '-',
    trailer: '', capturas: '', puntuacion: 'N/A',
  };

  let encontradoEnTienda = false;

  try {
    const json: any = await getJson(
      'https://store.steampowered.com/api/appdetails?appids=' + cleanId + '&cc=US&l=spanish'
    );
    const d = json && json[cleanId] && json[cleanId].success ? json[cleanId].data : null;
    if (d) {
      const genres = (d.genres || []).map((g: any) => g.description).join(', ');
      const devs = (d.developers || []).join(', ');
      const price = d.is_free ? 'Gratis' : (d.price_overview ? d.price_overview.final_formatted : 'N/A');
      let trailerUrl = '';
      if (d.movies && d.movies.length > 0) {
        const mv = d.movies[0];
        trailerUrl = (mv.mp4 && (mv.mp4['480'] || mv.mp4.max)) || (mv.webm && (mv.webm['480'] || mv.webm.max)) || mv.hls_h264 || '';
      }
      base.titulo = d.name || base.titulo;
      base.creador = devs || 'N/A';
      base.editorial = (d.publishers || []).join(', ') || 'N/A';
      base.fecha = (d.release_date && d.release_date.date) ? String(d.release_date.date) : 'N/A';
      base.portada = d.header_image || base.portada;
      base.descripcion = decodificarHtml(d.short_description) || base.descripcion;
      base.generos = genres || 'N/A';
      base.precio = price;
      base.modos = d.categories ? d.categories.map((c: any) => c.description).join(', ') : 'N/A';
      base.dlcs = d.dlc ? (d.dlc.length + ' DLCs') : 'Ninguno';
      base.trailer = trailerUrl;
      base.capturas = (d.screenshots && d.screenshots.length > 0)
        ? d.screenshots.slice(0, 6).map((s: any) => s.path_full).join(',')
        : '';
      base.puntuacion = (d.metacritic && d.metacritic.score) ? (d.metacritic.score / 10).toFixed(1) : 'N/A';
      encontradoEnTienda = true;
    }
  } catch { /* sigue con fallbacks */ }

  if (!encontradoEnTienda) {
    try {
      const res = await fetch('https://store.steampowered.com/app/' + cleanId + '/?l=spanish&cc=US', {
        headers: {
          'Cookie': 'birthtime=283993201; wants_mature_content=1; lastagecheckage=1-0-1979; mature_content=1',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        },
        redirect: 'follow',
      });
      const html = await res.text();
      if (html.indexOf('apphub_AppName') !== -1) {
        const mTitle = html.match(/<div[^>]*class="apphub_AppName"[^>]*>([\s\S]*?)<\/div>/i);
        const mDesc = html.match(/<div[^>]*class="game_description_snippet"[^>]*>([\s\S]*?)<\/div>/i);
        const mImg = html.match(/<img[^>]*class="game_header_image_full"[^>]*src="([^"]+)"/i);
        const mDate = html.match(/<div[^>]*class="date"[^>]*>([\s\S]*?)<\/div>/i);
        const mTags = html.match(/class="app_tag"[^>]*>([\s\S]*?)<\/a>/gi);

        if (mTitle && mTitle[1]) base.titulo = decodificarHtml(mTitle[1]);
        if (mDesc && mDesc[1]) base.descripcion = decodificarHtml(mDesc[1]);
        if (mImg && mImg[1]) base.portada = mImg[1].trim();
        if (mDate && mDate[1]) base.fecha = decodificarHtml(mDate[1]);

        if (mTags && mTags.length > 0) {
          const tagsLimpias = mTags.slice(0, 6).map((t: string) =>
            decodificarHtml(t.replace(/^[^>]+>/, '').replace(/<\/a>$/i, ''))
          ).filter(Boolean);
          if (tagsLimpias.length > 0) {
            base.tags = tagsLimpias.join(', ');
            base.generos = tagsLimpias.slice(0, 3).join(', ');
          }
        }
        encontradoEnTienda = true;
      }
    } catch { /* PICS fallback abajo */ }
  }

  try {
    const cmdJson: any = await getJson('https://api.steamcmd.net/v1/info/' + cleanId);
    const appInfo = cmdJson && cmdJson.data && cmdJson.data[cleanId] ? cmdJson.data[cleanId] : null;
    const common = appInfo && appInfo.common ? appInfo.common : null;

    if (common) {
      if (common.name && (String(base.titulo).indexOf('Steam App #') === 0 || !encontradoEnTienda)) {
        base.titulo = String(common.name).trim();
      }

      if (common.associations) {
        const devsList: string[] = [];
        const pubsList: string[] = [];
        for (const k of Object.keys(common.associations)) {
          const assoc = common.associations[k];
          if (!assoc || !assoc.name) continue;
          if (assoc.type === 'developer') devsList.push(assoc.name);
          if (assoc.type === 'publisher') pubsList.push(assoc.name);
        }
        if (base.creador === 'N/A' && devsList.length > 0) base.creador = devsList.join(', ');
        if (base.editorial === 'N/A' && pubsList.length > 0) base.editorial = pubsList.join(', ');
      }

      if (base.fecha === 'N/A' && common.steam_release_date) {
        const f = isoDate(Number(common.steam_release_date));
        if (f) base.fecha = f;
      }

      if (common.steam_deck_compatibility && common.steam_deck_compatibility.category !== undefined) {
        const deckMap: Record<string, string> = { '3': 'Verificado', '2': 'Jugable', '1': 'No compatible' };
        base.steamdeck = deckMap[String(common.steam_deck_compatibility.category)] || 'Desconocido';
      }

      if (base.puntuacion === 'N/A') {
        if (common.metacritic_score) {
          base.puntuacion = (Number(common.metacritic_score) / 10).toFixed(1);
        } else if (common.review_percentage) {
          base.puntuacion = common.review_percentage + '% Steam';
        }
      }

      const branches = (appInfo && appInfo.depots && appInfo.depots.branches) ? appInfo.depots.branches : null;
      if (branches) {
        if (branches.public) {
          if (branches.public.buildid) base.buildEstable = String(branches.public.buildid).trim();
          if (branches.public.timeupdated) {
            const f = isoDate(Number(branches.public.timeupdated));
            if (f) base.fechaEstable = f;
          }
        }
        const betaList: string[] = [];
        for (const bName of Object.keys(branches)) {
          if (bName === 'public') continue;
          const bInfo = branches[bName] || {};
          betaList.push(bInfo.buildid ? (bName + ' #' + bInfo.buildid) : bName);
        }
        if (betaList.length > 0) base.beta = betaList.join(', ');
      }

      if (!encontradoEnTienda) {
        base.precio = 'Fuera de tienda';
        if (base.descripcion === 'Ficha obtenida mediante respaldo.') {
          base.descripcion = 'Juego retirado de la tienda de Steam o restringido por clasificación; metadata recuperada desde archivo PICS.';
        }
      }
    }
  } catch { /* news debajo */ }

  try {
    const newsJson: any = await getJson(
      'https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=' + cleanId + '&count=1&maxlength=180'
    );
    const firstNews = (newsJson && newsJson.appnews && Array.isArray(newsJson.appnews.newsitems) && newsJson.appnews.newsitems[0])
      ? newsJson.appnews.newsitems[0] : null;
    if (firstNews && firstNews.title) {
      const fDate = firstNews.date ? isoDate(Number(firstNews.date)) : '';
      base.notaParche = (fDate ? '[' + fDate + '] ' : '') + decodificarHtml(firstNews.title);
    }
  } catch { /* fin steam */ }

  if (STEAMGRIDDB_API_KEY) {
    try {
      const headersSgdb = { Authorization: 'Bearer ' + STEAMGRIDDB_API_KEY };

      if (String(base.titulo).indexOf('Steam App #') === 0) {
        const gameJson: any = await getJson(
          'https://www.steamgriddb.com/api/v2/games/steam/' + cleanId, { headers: headersSgdb }
        );
        if (gameJson && gameJson.success && gameJson.data && gameJson.data.name) {
          base.titulo = gameJson.data.name;
        }
      }

      if (!encontradoEnTienda) {
        const gridJson: any = await getJson(
          'https://www.steamgriddb.com/api/v2/grids/steam/' + cleanId + '?dimensions=460x215,920x430',
          { headers: headersSgdb }
        );
        if (gridJson && gridJson.success && Array.isArray(gridJson.data) && gridJson.data.length > 0) {
          base.portada = gridJson.data[0].url;
        }
      }
    } catch { /* sgdb opcional */ }
  }

  return base;
}

export async function obtenerMetadataTmdb(compositeId: string): Promise<FlatMeta | null> {
  if (!TMDB_API_KEY) return null;
  const parts = String(compositeId).split('-');
  const mediaType = parts[0] === 'tv' ? 'tv' : 'movie';
  const numId = parts[1] || parts[0];

  const url = 'https://api.themoviedb.org/3/' + mediaType + '/' + numId +
    '?api_key=' + encodeURIComponent(TMDB_API_KEY) +
    '&language=es-ES&append_to_response=videos,watch/providers,credits';
  const d: any = await getJson(url);
  if (!d || d.success === false) return null;

  const esSerie = mediaType === 'tv';
  const titulo = esSerie ? (d.name || d.original_name) : (d.title || d.original_title);
  let creador = 'N/A';
  if (esSerie && d.created_by && d.created_by.length > 0) {
    creador = d.created_by.map((c: any) => c.name).join(', ');
  } else if (d.credits && d.credits.crew) {
    const dirs = d.credits.crew.filter((c: any) => c.job === 'Director').map((c: any) => c.name);
    if (dirs.length > 0) creador = dirs.join(', ');
  }

  const editorial = (d.production_companies && d.production_companies.length > 0)
    ? d.production_companies.slice(0, 2).map((p: any) => p.name).join(', ')
    : 'N/A';

  let extension = 'N/A';
  if (esSerie) {
    const temps = d.number_of_seasons ? (d.number_of_seasons + ' temp.') : '';
    const eps = d.number_of_episodes ? (d.number_of_episodes + ' eps.') : '';
    extension = [temps, eps].filter(Boolean).join(' • ') || 'N/A';
  } else if (d.runtime) {
    extension = d.runtime + ' min';
  }

  let plataformas: string[] = [];
  const wp = (d['watch/providers'] && d['watch/providers'].results) ? d['watch/providers'].results : {};
  const region = wp.ES || wp.MX || wp.US || wp.VE || {};
  if (region.flatrate) {
    plataformas = region.flatrate.map((p: any) => p.provider_name);
  }

  let trailerUrl = '';
  if (d.videos && Array.isArray(d.videos.results)) {
    const yt = d.videos.results.filter((v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'))[0];
    if (yt && yt.key) trailerUrl = 'https://www.youtube.com/watch?v=' + yt.key;
  }

  const estadoMap: Record<string, string> = {
    'Returning Series': 'En emisión', 'In Production': 'En emisión',
    'Ended': 'Finalizada', 'Canceled': 'Cancelada', 'Released': 'Estrenada',
  };

  return {
    id: mediaType + '-' + numId,
    titulo: titulo || 'Sin título',
    creador, editorial,
    fecha: String(esSerie ? (d.first_air_date || 'N/A') : (d.release_date || 'N/A')),
    portada: d.poster_path ? ('https://image.tmdb.org/t/p/w500' + d.poster_path) : '',
    descripcion: d.overview || 'Sin sinopsis disponible.',
    generos: (d.genres || []).map((g: any) => g.name).join(', ') || 'N/A',
    tipo: esSerie ? 'Serie' : 'Película',
    extension,
    plataformas: plataformas.length > 0 ? plataformas.join(', ') : 'N/A',
    estadoEmision: estadoMap[d.status] || d.status || 'N/A',
    trailer: trailerUrl,
    puntuacion: d.vote_average ? Number(d.vote_average).toFixed(1) : 'N/A',
  };
}

async function resolverAutoresOpenLibrary(authorsArr: any, fallbackTitulo?: string): Promise<string> {
  const nombres: string[] = [];
  const vistos: Record<string, boolean> = {};

  if (Array.isArray(authorsArr) && authorsArr.length > 0) {
    // fetchAll: resolver las keys primero, luego fetch paralelo (Promise.all)
    // — antes eran hasta 4 fetches secuenciales (~4x latencia).
    const direct: string[] = [];
    const fetches: Promise<string>[] = [];
    for (let i = 0; i < Math.min(authorsArr.length, 4); i++) {
      let entry = authorsArr[i];
      if (!entry) continue;
      if (typeof entry === 'string') {
        const cleanStr = entry.trim();
        if (cleanStr && cleanStr.indexOf('/authors/') !== 0 && !vistos[cleanStr.toLowerCase()]) {
          vistos[cleanStr.toLowerCase()] = true;
          direct.push(cleanStr);
          continue;
        }
        entry = { key: cleanStr };
      }
      const aKey = (entry.author && entry.author.key) ? entry.author.key : (entry.key || '');
      if (!aKey) continue;
      const pathKey = aKey.indexOf('/') === 0 ? aKey : ('/authors/' + aKey);
      fetches.push((async () => {
        try {
          const aRes = await fetch('https://openlibrary.org' + pathKey + '.json');
          if (!aRes.ok) return '';
          const aJson: any = await aRes.json();
          return (aJson && (aJson.name || aJson.personal_name)) ? String(aJson.name || aJson.personal_name).trim() : '';
        } catch { return ''; }
      })());
    }
    // nombres directos primero (orden de entrada), luego los resueltos en paralelo
    for (const n of direct) { if (!vistos[n.toLowerCase()]) { vistos[n.toLowerCase()] = true; nombres.push(n); } }
    const resueltos = await Promise.all(fetches);
    for (const aName of resueltos) {
      if (aName && !vistos[aName.toLowerCase()]) {
        vistos[aName.toLowerCase()] = true;
        nombres.push(aName);
      }
    }
  }

  if (nombres.length > 0) return nombres.join(', ');

  if (fallbackTitulo) {
    try {
      const sUrl = 'https://openlibrary.org/search.json?title=' + encodeURIComponent(fallbackTitulo) + '&fields=author_name&limit=3';
      const sRes = await fetch(sUrl);
      if (sRes.ok) {
        const sJson: any = await sRes.json();
        const docs = (sJson && sJson.docs) ? sJson.docs : [];
        for (const doc of docs) {
          if (Array.isArray(doc.author_name) && doc.author_name.length > 0) {
            return doc.author_name.slice(0, 3).join(', ');
          }
        }
      }
    } catch { /* fin */ }
  }

  return 'Autor por definir';
}

export async function obtenerMetadataLibro(idOIsbn: string): Promise<FlatMeta | null> {
  const clean = String(idOIsbn || '').trim().replace(/^ol-(?=OL\d+[WM]$)/i, '');
  if (!clean) return null;

  const isIsbn = clean.toLowerCase().indexOf('isbn:') === 0;
  const isbnClean = isIsbn ? clean.replace(/^isbn:/i, '').replace(/[-\s]/g, '') : '';
  let endpoint = '';

  if (isIsbn) {
    endpoint = 'https://openlibrary.org/isbn/' + encodeURIComponent(isbnClean) + '.json';
  } else if (/^OL\d+M$/i.test(clean)) {
    endpoint = 'https://openlibrary.org/books/' + clean.toUpperCase() + '.json';
  } else {
    const workClean = clean.replace(/^\/works\//i, '').toUpperCase();
    endpoint = 'https://openlibrary.org/works/' + encodeURIComponent(workClean) + '.json';
  }

  const res = await fetch(endpoint);
  if (!res.ok) return null;
  const d: any = await res.json();
  if (!d) return null;

  let workData: any = null;
  if (Array.isArray(d.works) && d.works.length > 0 && d.works[0].key) {
    try {
      const wRes = await fetch('https://openlibrary.org' + d.works[0].key + '.json');
      if (wRes.ok) workData = await wRes.json();
    } catch { /* sin work data */ }
  }

  let desc = '';
  if (typeof d.description === 'string') desc = d.description;
  else if (d.description && d.description.value) desc = d.description.value;
  if (!desc && workData) {
    if (typeof workData.description === 'string') desc = workData.description;
    else if (workData.description && workData.description.value) desc = workData.description.value;
  }

  const titulo = d.title || (workData && workData.title) || 'Sin título';
  const authorsSource = (d.authors && d.authors.length > 0) ? d.authors : ((workData && workData.authors) || []);
  const autor = await resolverAutoresOpenLibrary(authorsSource, titulo);

  const coverId = (d.covers && d.covers.length > 0)
    ? d.covers[0]
    : ((workData && workData.covers && workData.covers.length > 0) ? workData.covers[0] : null);

  const workId = String((workData && workData.key) || d.key || clean)
    .replace('/works/', '').replace('/books/', '');

  const numPages = d.number_of_pages || d.pagination || (workData && workData.number_of_pages) || '';
  const pags = numPages ? (String(numPages).indexOf('pág') !== -1 ? String(numPages) : (numPages + ' págs.')) : 'N/A';

  const isbnVal = (Array.isArray(d.isbn_13) && d.isbn_13[0]) ||
    (Array.isArray(d.isbn_10) && d.isbn_10[0]) ||
    (isbnClean || 'N/A');

  const subjectsArr = (Array.isArray(d.subjects) && d.subjects.length > 0)
    ? d.subjects
    : ((workData && Array.isArray(workData.subjects)) ? workData.subjects : []);
  const generosStr = subjectsArr.slice(0, 5).map((s: any) =>
    typeof s === 'string' ? s : (s && s.name ? s.name : '')
  ).filter(Boolean).join(', ') || 'N/A';

  return {
    id: workId, titulo, creador: autor, autor,
    editorial: (Array.isArray(d.publishers) && d.publishers[0]) || 'Open Library',
    fecha: String(d.publish_date || (workData && workData.first_publish_date) || 'N/A'),
    portada: coverId ? ('https://covers.openlibrary.org/b/id/' + coverId + '-L.jpg') : '',
    descripcion: decodificarHtml(desc) || 'Sin sinopsis disponible.',
    generos: generosStr,
    extension: pags,
    isbn: isbnVal,
    puntuacion: 'N/A',
  };
}

export async function obtenerMetadataManga(idStr: string): Promise<FlatMeta | null> {
  const raw = String(idStr || '').trim().toLowerCase();
  const isMal = raw.indexOf('mal-') === 0;
  const numId = parseInt(raw.replace(/^(al-|mal-)/, ''), 10);
  if (!numId) return null;

  const gql = isMal
    ? 'query ($id: Int) { Media(idMal: $id, type: MANGA) { id title { romaji english native } description(asHtml: false) chapters volumes status genres averageScore startDate { year month day } coverImage { extraLarge large } staff(perPage: 3) { edges { role node { name { full } } } } tags { name rank } } }'
    : 'query ($id: Int) { Media(id: $id, type: MANGA) { id title { romaji english native } description(asHtml: false) chapters volumes status genres averageScore startDate { year month day } coverImage { extraLarge large } staff(perPage: 3) { edges { role node { name { full } } } } tags { name rank } } }';

  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: gql, variables: { id: numId } }),
  });
  const json: any = await res.json();
  const m = (json && json.data && json.data.Media) ? json.data.Media : null;
  if (!m) return null;

  const titulo = m.title.english || m.title.romaji || m.title.native || 'Sin título';
  let mangaka = 'N/A';
  if (m.staff && m.staff.edges && m.staff.edges.length > 0) {
    mangaka = m.staff.edges.map((e: any) => e.node.name.full).join(', ');
  }

  const extParts: string[] = [];
  if (m.volumes) extParts.push(m.volumes + ' tomos');
  if (m.chapters) extParts.push(m.chapters + ' caps');

  let demografia = 'N/A';
  if (m.tags && m.tags.length > 0) {
    const demos = ['Shounen', 'Seinen', 'Shoujo', 'Josei'];
    const foundDemo = m.tags.filter((t: any) => demos.indexOf(t.name) !== -1)[0];
    if (foundDemo) demografia = foundDemo.name;
  }

  const statusMap: Record<string, string> = {
    'RELEASING': 'En emisión', 'FINISHED': 'Finalizado',
    'NOT_YET_RELEASED': 'Próximamente', 'CANCELLED': 'Cancelado', 'HIATUS': 'En pausa',
  };

  const fecha = (m.startDate && m.startDate.year)
    ? [m.startDate.year, m.startDate.month, m.startDate.day].filter(Boolean).join('-')
    : 'N/A';

  return {
    id: 'al-' + m.id,
    titulo, creador: mangaka, editorial: 'AniList',
    fecha: String(fecha),
    portada: (m.coverImage && (m.coverImage.extraLarge || m.coverImage.large)) || '',
    descripcion: (m.description || '').replace(/<[^>]*>?/gm, '') || 'Sin sinopsis disponible.',
    generos: (m.genres || []).join(', ') || 'N/A',
    extension: extParts.join(' • ') || 'N/A',
    demografia,
    estadoEmision: statusMap[m.status] || m.status || 'N/A',
    capitulosTotales: Number(m.chapters) || 0,
    puntuacion: m.averageScore ? (m.averageScore / 10).toFixed(1) : 'N/A',
  };
}

export async function obtenerMetadataDetallada(category: Category, id: string): Promise<FlatMeta | null> {
  if (category === 'Juegos') return obtenerMetadataSteam(id);
  if (category === 'Peliculas_Series') return obtenerMetadataTmdb(id);
  if (category === 'Libros') return obtenerMetadataLibro(id);
  if (category === 'Mangas') return obtenerMetadataManga(id);
  return null;
}

// ---------------------------------------------------------------------------
// FlatMeta (shape v1) -> fila media_items (provider/external_id/metadata jsonb)
// external_id SIN prefijo según convención ETL:
//   Libros 'OL267096W'->'267096W' | Mangas 'al-147'->'147' | resto igual
// ---------------------------------------------------------------------------

const PROVIDER: Record<Category, string> = {
  Juegos: 'steam', Peliculas_Series: 'tmdb', Libros: 'openlibrary', Mangas: 'anilist',
};

function csvToArray(v: unknown): string[] | undefined {
  if (typeof v !== 'string') return undefined;
  const arr = v.split(',').map(s => s.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
}

function strOrUndef(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  return (s && s !== 'N/A' && s !== 'Ninguno' && s !== '-') ? s : undefined;
}

function numOrUndef(v: unknown): number | undefined {
  const n = Number(v);
  return isFinite(n) && n > 0 ? n : undefined;
}

function parseIsoOrRaw(v: unknown): { iso?: string; raw?: string } {
  const s = strOrUndef(v);
  if (!s) return {};
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return { iso: s.slice(0, 10) };
  const t = Date.parse(s);
  if (!isNaN(t)) return { iso: new Date(t).toISOString().slice(0, 10) };
  return { raw: s };
}

export function flatMetaToRow(category: Category, meta: FlatMeta): {
  provider: string; external_id: string; title: string;
  cover_url: string | null; trailer_url: string | null; metadata: Record<string, unknown>;
} {
  let externalId = String(meta.id || '');
  if (category === 'Libros') externalId = externalId.replace(/^OL/i, '');
  if (category === 'Mangas') externalId = externalId.replace(/^al-/i, '');

  const m: Record<string, unknown> = {};
  const set = (k: string, v: unknown) => { if (v !== undefined && v !== null && v !== '') m[k] = v; };

  if (category === 'Juegos') {
    set('developer', strOrUndef(meta.creador));
    set('publisher', strOrUndef(meta.editorial));
    set('price', strOrUndef(meta.precio));
    set('steam_deck', strOrUndef(meta.steamdeck));
    set('screenshots', strOrUndef(meta.capturas));
    set('modes', strOrUndef(meta.modos));
    set('tags', strOrUndef(meta.tags));
    set('description', strOrUndef(meta.descripcion));
    set('last_patch_note', strOrUndef(meta.notaParche));
    set('build_estable', numOrUndef(meta.buildEstable));
    set('build_date', strOrUndef(meta.fechaEstable));
    const dlcsN = Number(String(meta.dlcs || '').match(/\d+/)?.[0]);
    if (dlcsN > 0) m.dlcs = dlcsN;
    set('genres', csvToArray(meta.generos));
    const rel = parseIsoOrRaw(meta.fecha);
    set('release_date', rel.iso); set('release_date_raw', rel.raw);
    set('beta_branches', csvToArray(meta.beta));
    const score = strOrUndef(meta.puntuacion);
    if (score) {
      if (score.endsWith('% Steam')) m.catalog_score = score;
      else m.metacritic = score;
    }
  } else if (category === 'Peliculas_Series') {
    set('creator', strOrUndef(meta.creador));
    set('emission_status', strOrUndef(meta.estadoEmision));
    set('platforms', strOrUndef(meta.plataformas));
    set('media_type', meta.tipo === 'Serie' ? 'series' : 'movie');
    const dur = Number(String(meta.extension || '').match(/(\d+)/)?.[1]);
    if (dur) m.duration_min = dur;
    set('genres', csvToArray(meta.generos));
    set('catalog_score', strOrUndef(meta.puntuacion));
    set('description', strOrUndef(meta.descripcion));
    const rel = parseIsoOrRaw(meta.fecha);
    set('release_date', rel.iso); set('release_date_raw', rel.raw);
    if (meta.tipo === 'Serie' && typeof meta.extension === 'string' && meta.extension !== 'N/A') {
      m.seasons_episodes = meta.extension;
    }
  } else if (category === 'Libros') {
    set('author', strOrUndef(meta.creador) || strOrUndef(meta.autor));
    set('publisher', strOrUndef(meta.editorial));
    set('isbn', strOrUndef(meta.isbn));
    const pags = Number(String(meta.extension || '').match(/(\d+)/)?.[1]);
    if (pags) m.pages = pags;
    set('genres', csvToArray(meta.generos));
    set('description', strOrUndef(meta.descripcion));
    const rel = parseIsoOrRaw(meta.fecha);
    set('release_date', rel.iso); set('release_date_raw', rel.raw);
  } else if (category === 'Mangas') {
    set('author', strOrUndef(meta.creador));
    set('publisher', strOrUndef(meta.editorial));
    set('emission_status', strOrUndef(meta.estadoEmision));
    set('volumes_chapters', strOrUndef(meta.extension));
    set('demographic', strOrUndef(meta.demografia));
    set('total_chapters', numOrUndef(meta.capitulosTotales));
    set('genres', csvToArray(meta.generos));
    set('catalog_score', strOrUndef(meta.puntuacion));
    set('description', strOrUndef(meta.descripcion));
    const rel = parseIsoOrRaw(meta.fecha);
    set('release_date', rel.iso); set('release_date_raw', rel.raw);
  }

  return {
    provider: PROVIDER[category],
    external_id: externalId,
    title: String(meta.titulo || 'Sin título'),
    cover_url: strOrUndef(meta.portada) || null,
    trailer_url: strOrUndef(meta.trailer) || null,
    metadata: m,
  };
}
