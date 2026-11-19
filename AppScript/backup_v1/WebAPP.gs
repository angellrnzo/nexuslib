var SCRIPT_PROPS = PropertiesService.getScriptProperties();

var META_LAST_ROW = Number(SCRIPT_PROPS.getProperty('META_LAST_ROW')) || 0;
var STEAMGRIDDB_API_KEY = (SCRIPT_PROPS.getProperty('STEAMGRIDDB_API_KEY') || '').trim();
var TMDB_API_KEY = (SCRIPT_PROPS.getProperty('TMDB_API_KEY') || '').trim();
var ULTIMA_ACT_MANGAS_SEMANAL = Number(SCRIPT_PROPS.getProperty('ULTIMA_ACT_MANGAS_SEMANAL')) || 0;
var VER_LAST_ROW = Number(SCRIPT_PROPS.getProperty('VER_LAST_ROW')) || 0;

var HEADER_TO_KEY = {
  'id': 'id',
  'appid': 'id',
  'app id': 'id',
  'app_id': 'id',
  'titulo': 'titulo',
  'título': 'titulo',
  'nombre': 'titulo',
  'autor': 'creador',
  'autores': 'creador',
  'author': 'creador',
  'authors': 'creador',
  'portada': 'portada',
  'creador': 'creador',
  'developer': 'creador',
  'desarrollador': 'creador',
  'editorial': 'editorial',
  'distribuidora': 'editorial',
  'publisher': 'editorial',
  'fecha': 'fecha',
  'estreno': 'fecha',
  'fecha_estreno': 'fecha',
  'fecha estreno': 'fecha',
  'lanzamiento': 'fecha',
  'fecha_lanzamiento': 'fecha',
  'fecha lanzamiento': 'fecha',
  'publicacion': 'fecha',
  'publicación': 'fecha',
  'fecha_publicacion': 'fecha',
  'fecha publicacion': 'fecha',
  'fecha_publicación': 'fecha',
  'fecha publicación': 'fecha',
  'steamversin': 'versionEstable',
  'steamversion': 'versionEstable',
  'versionestable': 'versionEstable',
  'versionpatch': 'versionPatch',
  'versionbeta': 'versionBeta',
  'buildestable': 'buildEstable',
  'build estable': 'buildEstable',
  'build_estable': 'buildEstable',
  'fechaestable': 'fechaEstable',
  'fecha estable': 'fechaEstable',
  'fecha_estable': 'fechaEstable',
  'beta': 'beta',
  'notaparche': 'notaParche',
  'nota parche': 'notaParche',
  'nota_parche': 'notaParche',
  'dupli': 'dupli',
  'trailer': 'trailer',
  'tráiler': 'trailer',
  'descripcion': 'descripcion',
  'descripción': 'descripcion',
  'generos': 'generos',
  'géneros': 'generos',
  'precio': 'precio',
  'dlcs': 'dlcs',
  'dlc': 'dlcs',
  'puntuacion': 'puntuacion',
  'puntuación': 'puntuacion',
  'calificacion': 'puntuacion',
  'calificación': 'puntuacion',
  'clasificacion': 'puntuacion',
  'clasificación': 'puntuacion',
  'score': 'puntuacion',
  'rating': 'puntuacion',
  'metacritic': 'puntuacion',
  'steamdeck': 'steamdeck',
  'steam deck': 'steamdeck',
  'steam_deck': 'steamdeck',
  'capturas': 'capturas',
  'tags': 'tags',
  'modos': 'modos',
  'tipo': 'tipo',
  'extension': 'extension',
  'extensión': 'extension',
  'duracion_temp': 'extension',
  'duracion temp': 'extension',
  'tomos_caps': 'extension',
  'tomos caps': 'extension',
  'paginas': 'extension',
  'páginas': 'extension',
  'plataformas': 'plataformas',
  'estadoemision': 'estadoEmision',
  'estado emision': 'estadoEmision',
  'estado emisión': 'estadoEmision',
  'estado_emision': 'estadoEmision',
  'isbn': 'isbn',
  'demografia': 'demografia',
  'demografía': 'demografia',
  'capitulostotales': 'capitulosTotales',
  'capitulos totales': 'capitulosTotales',
  'capítulos totales': 'capitulosTotales',
  'capitulos_totales': 'capitulosTotales',
  'estadoangel': 'estadoAngel',
  'estado angel': 'estadoAngel',
  'estado_angel': 'estadoAngel',
  'estadotalmai': 'estadoTalmai',
  'estado talmai': 'estadoTalmai',
  'estado_talmai': 'estadoTalmai',
  'estrellasangel': 'estrellasAngel',
  'estrellas angel': 'estrellasAngel',
  'estrellas_angel': 'estrellasAngel',
  'estrellastalmai': 'estrellasTalmai',
  'estrellas talmai': 'estrellasTalmai',
  'estrellas_talmai': 'estrellasTalmai',
  'deseadoangel': 'deseadoAngel',
  'deseado angel': 'deseadoAngel',
  'deseado_angel': 'deseadoAngel',
  'deseadotalmai': 'deseadoTalmai',
  'deseado talmai': 'deseadoTalmai',
  'deseado_talmai': 'deseadoTalmai',
  'progresoangel': 'progresoAngel',
  'progreso angel': 'progresoAngel',
  'progreso_angel': 'progresoAngel',
  'progresotalmai': 'progresoTalmai',
  'progreso talmai': 'progresoTalmai',
  'progreso_talmai': 'progresoTalmai',
  'notaangel': 'notaAngel',
  'nota angel': 'notaAngel',
  'nota_angel': 'notaAngel',
  'notatalmai': 'notaTalmai',
  'nota talmai': 'notaTalmai',
  'nota_talmai': 'notaTalmai'
};

var DEFAULT_HEADERS = {
  Juegos: [
    'Portada', 'Nombre', 'AppID', 'Developer', 'buildEstable', 'fechaEstable',
    'beta', 'notaParche', 'Lanzamiento', 'Dupli', 'Trailer', 'Descripcion',
    'Generos', 'Precio', 'DLCs', 'Distribuidora', 'Metacritic', 'SteamDeck',
    'Capturas', 'Estado Angel', 'Estrellas Angel', 'Estado Talmai',
    'Estrellas Talmai', 'Tags', 'Deseado Angel', 'Deseado Talmai', 'Modos',
    'Nota Angel', 'Nota Talmai'
  ],
  Peliculas_Series: [
    'id', 'titulo', 'creador', 'editorial', 'fecha', 'portada', 'descripcion',
    'generos', 'tipo', 'extension', 'plataformas', 'estadoEmision', 'trailer',
    'estadoAngel', 'estadoTalmai', 'estrellasAngel', 'estrellasTalmai',
    'deseadoAngel', 'deseadoTalmai', 'progresoAngel', 'progresoTalmai',
    'notaAngel', 'notaTalmai', 'puntuacion'
  ],
  Libros: [
    'id', 'titulo', 'creador', 'editorial', 'fecha', 'portada', 'descripcion',
    'generos', 'extension', 'isbn', 'capitulosTotales',
    'estadoAngel', 'estadoTalmai', 'estrellasAngel', 'estrellasTalmai',
    'deseadoAngel', 'deseadoTalmai', 'progresoAngel', 'progresoTalmai',
    'notaAngel', 'notaTalmai', 'puntuacion'
  ],
  Mangas: [
    'id', 'titulo', 'creador', 'editorial', 'fecha', 'portada', 'descripcion',
    'generos', 'extension', 'demografia', 'estadoEmision', 'capitulosTotales',
    'estadoAngel', 'estadoTalmai', 'estrellasAngel', 'estrellasTalmai',
    'deseadoAngel', 'deseadoTalmai', 'progresoAngel', 'progresoTalmai',
    'notaAngel', 'notaTalmai', 'puntuacion'
  ]
};

function mapearHeaderAKey_(rawHeader) {
  var clean = String(rawHeader || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (HEADER_TO_KEY[clean]) return HEADER_TO_KEY[clean];
  var sinGuiones = clean.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (HEADER_TO_KEY[sinGuiones]) return HEADER_TO_KEY[sinGuiones];
  return String(rawHeader || '').trim();
}

function buscarColumna_(headers, internalKey) {
  for (var i = 0; i < headers.length; i++) {
    if (mapearHeaderAKey_(headers[i]) === internalKey) return i;
  }
  return -1;
}

function getTmdbKey_() {
  if (TMDB_API_KEY && TMDB_API_KEY !== "TU_API_KEY_DE_TMDB") return TMDB_API_KEY.trim();
  try {
    var prop = PropertiesService.getScriptProperties().getProperty('TMDB_API_KEY');
    if (prop) return prop.trim();
  } catch (e) {}
  return "";
}

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('NexusLib')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}

function obtenerOCrearHoja_(nombreHoja) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(nombreHoja);
  if (!sheet) {
    var objetivo = String(nombreHoja || '').trim().toLowerCase();
    var hojas = ss.getSheets();
    for (var i = 0; i < hojas.length; i++) {
      if (hojas[i].getName().trim().toLowerCase() === objetivo) {
        sheet = hojas[i];
        break;
      }
    }
  }
  if (!sheet && DEFAULT_HEADERS[nombreHoja]) {
    sheet = ss.insertSheet(nombreHoja);
    sheet.appendRow(DEFAULT_HEADERS[nombreHoja]);
  }
  return sheet;
}

function serializarValorCelda_(val) {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    try {
      return Utilities.formatDate(val, Session.getScriptTimeZone() || 'GMT', 'yyyy-MM-dd');
    } catch (e) {
      return String(val);
    }
  }
  return val;
}

function esFechaTexto_(str) {
  var s = String(str || '').trim();
  if (!s) return false;
  return /^\d{4}-\d{2}-\d{2}/.test(s) || /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(s);
}

function limpiarValorPuntuacion_(val) {
  if (val === null || val === undefined) return 'N/A';
  if (val instanceof Date) return 'N/A';
  var s = String(val).trim();
  if (!s || s === 'N/A' || s.toLowerCase() === 'undefined' || s.toLowerCase() === 'null' || s === 'NaT') {
    return 'N/A';
  }
  if (esFechaTexto_(s)) return 'N/A';
  return s;
}

function formatearValorParaSheet_(key, val) {
  if (val === null || val === undefined) return '';
  if (key === 'puntuacion') {
    var limpio = limpiarValorPuntuacion_(val);
    if (/^\d+(\.\d+)?$/.test(limpio)) {
      return "'" + limpio;
    }
    return limpio;
  }
  return val;
}

function parsearBooleano_(val) {
  if (val === true || val === 1) return true;
  var s = String(val || '').trim().toLowerCase();
  return (s === 'true' || s === '1' || s === 'si' || s === 'sí' || s === 'yes');
}

function normalizarEstado_(val) {
  var s = String(val || '').trim();
  if (!s || s.toLowerCase() === 'pendiente' || s.toLowerCase() === 'no jugado') return 'No jugado';
  return s;
}

function coincideFila_(rowId, filaIndex, idBuscado) {
  var target = String(idBuscado || '').trim();
  if (!target) return false;
  if (target.indexOf('row-') === 0) {
    return String(filaIndex + 1) === target.replace('row-', '');
  }
  return rowId !== '' && rowId === target;
}

function getItems(categoria) {
  var sheet = obtenerOCrearHoja_(categoria);
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  var headers = rows[0].map(function(h) { return String(h || '').trim(); });
  var items = [];

  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var obj = { index: i };
    var tieneDatos = false;

    for (var j = 0; j < headers.length; j++) {
      if (!headers[j]) continue;
      var key = mapearHeaderAKey_(headers[j]);
      var val = serializarValorCelda_(r[j]);
      if (val !== '') tieneDatos = true;

      if (key === 'puntuacion') {
        var strVal = String(val || '').trim();
        if (esFechaTexto_(strVal)) {
          if (!obj.fecha) obj.fecha = strVal;
          val = 'N/A';
        } else {
          val = limpiarValorPuntuacion_(val);
        }
      }

      if (key === 'deseadoAngel' || key === 'deseadoTalmai') {
        obj[key] = parsearBooleano_(val);
      } else if (key === 'estrellasAngel' || key === 'estrellasTalmai' || key === 'capitulosTotales') {
        obj[key] = Number(val) || 0;
      } else if (key === 'estadoAngel' || key === 'estadoTalmai') {
        obj[key] = normalizarEstado_(val);
      } else {
        obj[key] = val;
      }
    }

    if (tieneDatos && ((obj.id !== undefined && obj.id !== '') || (obj.titulo !== undefined && obj.titulo !== ''))) {
      obj.id = (obj.id !== undefined && String(obj.id).trim() !== '')
        ? String(obj.id).trim()
        : ('row-' + (i + 1));
      var creadorLimpio = String(obj.creador || '').trim();
      if (!creadorLimpio || creadorLimpio.toLowerCase() === 'undefined') {
        creadorLimpio = (categoria === 'Libros') ? 'Autor por definir' : 'N/A';
      }
      obj.creador = creadorLimpio;
      obj.autor = creadorLimpio;
      obj.versionPatch = obj.versionPatch || '-';
      obj.versionEstable = obj.versionEstable || '-';
      obj.versionBeta = obj.versionBeta || '-';
      obj.buildEstable = obj.buildEstable || '-';
      obj.fechaEstable = obj.fechaEstable || '-';
      obj.beta = obj.beta || '-';
      obj.notaParche = obj.notaParche || '-';
      items.push(obj);
    }
  }
  return items;
}

function extraerIdDirecto_(categoria, input) {
  var val = String(input || '').trim();
  if (!val) return null;

  if (categoria === 'Juegos') {
    if (val.indexOf('steampowered.com/app/') !== -1) {
      var mSteam = val.match(/\/app\/(\d+)/);
      return mSteam ? mSteam[1] : null;
    }
    if (/^\d+$/.test(val)) return val;
  }

  if (categoria === 'Peliculas_Series') {
    if (val.indexOf('themoviedb.org/') !== -1) {
      var mTmdb = val.match(/\/(movie|tv)\/(\d+)/i);
      return mTmdb ? (mTmdb[1].toLowerCase() + '-' + mTmdb[2]) : null;
    }
    if (/^(movie|tv)-\d+$/i.test(val)) return val.toLowerCase();
  }

  if (categoria === 'Libros') {
    if (val.indexOf('openlibrary.org/') !== -1) {
      var mOl = val.match(/\/(works|books)\/(OL[0-9A-Z]+)/i);
      return mOl ? mOl[2].toUpperCase() : null;
    }
    if (/^OL\d+[WM]$/i.test(val)) return val.toUpperCase();
    var isbnLimpio = val.replace(/[-\s]/g, '');
    if (/^(\d{10}|\d{13})$/.test(isbnLimpio)) return 'isbn:' + isbnLimpio;
  }

  if (categoria === 'Mangas') {
    if (val.indexOf('anilist.co/manga/') !== -1) {
      var mAl = val.match(/\/manga\/(\d+)/);
      return mAl ? ('al-' + mAl[1]) : null;
    }
    if (val.indexOf('myanimelist.net/manga/') !== -1) {
      var mMal = val.match(/\/manga\/(\d+)/);
      return mMal ? ('mal-' + mMal[1]) : null;
    }
    if (/^al-\d+$/i.test(val)) return val.toLowerCase();
    if (/^\d+$/.test(val)) return 'al-' + val;
  }

  return null;
}

function existeIdEnHoja_(categoria, id) {
  var sheet = obtenerOCrearHoja_(categoria);
  if (!sheet) return false;
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return false;
  var idCol = buscarColumna_(rows[0], 'id');
  if (idCol === -1) return false;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]).trim() === String(id).trim()) return true;
  }
  return false;
}

function agregarItem(categoria, idOUrlOrName) {
  var input = String(idOUrlOrName || '').trim();
  if (!input) return { success: false, msg: 'Introduce un valor válido.' };

  try {
    var idDirecto = extraerIdDirecto_(categoria, input);

    if (idDirecto) {
      if (existeIdEnHoja_(categoria, idDirecto)) {
        return { success: false, msg: 'Este elemento ya está en tu biblioteca.' };
      }
      var dataDirecta = obtenerMetadataDetallada(categoria, idDirecto);
      if (dataDirecta) {
        if (existeIdEnHoja_(categoria, dataDirecta.id)) {
          return { success: false, msg: 'Este elemento ya está en tu biblioteca.' };
        }
        guardarFilaSheet(categoria, dataDirecta);
        return { success: true, msg: '¡Añadido: ' + dataDirecta.titulo + '!' };
      }
      return { success: false, msg: 'No se encontraron datos para el ID indicado.' };
    }

    var resultados = buscarCatalogoExterno(categoria, input);
    if (resultados && resultados.length > 0) {
      var primero = resultados[0];
      if (existeIdEnHoja_(categoria, primero.id)) {
        return { success: false, msg: 'Ya existe en tu lista: ' + primero.titulo };
      }
      var metadataCompleta = obtenerMetadataDetallada(categoria, primero.id);
      if (metadataCompleta) {
        guardarFilaSheet(categoria, metadataCompleta);
        return { success: true, msg: '¡Añadido: ' + metadataCompleta.titulo + '!' };
      }
    }

    return { success: false, msg: 'No se encontraron coincidencias.' };
  } catch (e) {
    return { success: false, msg: e.message || 'Error al añadir elemento.' };
  }
}

function buscarCatalogoExterno(categoria, query) {
  var q = String(query || '').trim();
  if (!q) return [];

  if (categoria === 'Juegos') return buscarSteam_(q);
  if (categoria === 'Peliculas_Series') return buscarTmdb_(q);
  if (categoria === 'Libros') return buscarLibros_(q);
  if (categoria === 'Mangas') return buscarMangasAniList_(q);

  return [];
}

function buscarSteam_(query) {
  if (/^\d+$/.test(query)) {
    var item = obtenerMetadataSteam(query);
    return item ? [{ id: item.id, titulo: item.titulo, subtitulo: item.creador, portada: item.portada }] : [];
  }

  var resultados = [];
  var vistos = {};

  try {
    var url = "https://store.steampowered.com/api/storesearch/?term=" + encodeURIComponent(query) + "&l=spanish&cc=US";
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var json = JSON.parse(res.getContentText());
    if (json && Array.isArray(json.items)) {
      json.items.slice(0, 8).forEach(function(it) {
        var idStr = String(it.id);
        if (!vistos[idStr]) {
          vistos[idStr] = true;
          resultados.push({
            id: idStr,
            titulo: it.name,
            subtitulo: 'Steam AppID: ' + idStr,
            portada: it.tiny_image || ('https://cdn.cloudflare.steamstatic.com/steam/apps/' + idStr + '/header.jpg')
          });
        }
      });
    }
  } catch (e) {}

  if (resultados.length < 8) {
    try {
      var url2 = "https://steamcommunity.com/actions/SearchApps/" + encodeURIComponent(query);
      var res2 = UrlFetchApp.fetch(url2, { muteHttpExceptions: true });
      var lista = JSON.parse(res2.getContentText());
      (lista || []).forEach(function(item) {
        if (resultados.length >= 8) return;
        var idStr2 = String(item.appid);
        if (!vistos[idStr2]) {
          vistos[idStr2] = true;
          resultados.push({
            id: idStr2,
            titulo: item.name,
            subtitulo: 'Steam AppID: ' + idStr2 + ' • Catálogo general',
            portada: item.icon || ('https://cdn.cloudflare.steamstatic.com/steam/apps/' + idStr2 + '/header.jpg')
          });
        }
      });
    } catch (e2) {}
  }

  return resultados;
}

function buscarTmdb_(query) {
  var apiKey = getTmdbKey_();
  if (!apiKey) {
    throw new Error('Configura tu TMDB_API_KEY en Propiedades del script para buscar películas y series.');
  }
  var url = "https://api.themoviedb.org/3/search/multi?api_key=" + encodeURIComponent(apiKey) +
            "&language=es-ES&include_adult=false&query=" + encodeURIComponent(query);
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var json = JSON.parse(res.getContentText());
  var results = (json && json.results) ? json.results : [];

  return results
    .filter(function(r) { return r.media_type === 'movie' || r.media_type === 'tv'; })
    .slice(0, 8)
    .map(function(r) {
      var esSerie = r.media_type === 'tv';
      var fecha = esSerie ? (r.first_air_date || '') : (r.release_date || '');
      var year = fecha ? fecha.substring(0, 4) : 'N/A';
      return {
        id: r.media_type + '-' + r.id,
        titulo: esSerie ? (r.name || r.original_name) : (r.title || r.original_title),
        subtitulo: (esSerie ? '📺 Serie' : '🎬 Película') + ' • ' + year,
        portada: r.poster_path ? ('https://image.tmdb.org/t/p/w342' + r.poster_path) : ''
      };
    });
}

function buscarLibros_(query) {
  var q = String(query || '').trim();
  if (!q) return [];

  var url = "https://openlibrary.org/search.json?q=" + encodeURIComponent(q) + "&fields=key,title,author_name,first_publish_year,cover_i,isbn&limit=8";
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return [];
  var json = JSON.parse(res.getContentText());
  var docs = (json && json.docs) ? json.docs : [];

  return docs.map(function(d) {
    var workId = String(d.key || '').replace('/works/', '');
    var autores = (Array.isArray(d.author_name) && d.author_name.length > 0)
      ? d.author_name.slice(0, 3).join(', ')
      : 'Autor por definir';
    var year = d.first_publish_year ? String(d.first_publish_year) : '';
    var portada = d.cover_i ? ('https://covers.openlibrary.org/b/id/' + d.cover_i + '-M.jpg') : '';
    return {
      id: workId,
      titulo: d.title || 'Sin título',
      subtitulo: autores + (year ? ' • ' + year : ''),
      portada: portada
    };
  }).filter(function(x) { return Boolean(x.id); });
}

function buscarMangasAniList_(query) {
  var gql = 'query ($search: String) { Page(page: 1, perPage: 8) { media(search: $search, type: MANGA, sort: POPULARITY_DESC) { id title { romaji english native } startDate { year } chapters status coverImage { medium large } } } }';
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ query: gql, variables: { search: query } }),
    muteHttpExceptions: true
  };
  var res = UrlFetchApp.fetch('https://graphql.anilist.co', options);
  var json = JSON.parse(res.getContentText());
  var media = (json && json.data && json.data.Page && json.data.Page.media) ? json.data.Page.media : [];

  return media.map(function(m) {
    var titulo = m.title.english || m.title.romaji || m.title.native || 'Sin título';
    var year = (m.startDate && m.startDate.year) ? m.startDate.year : '';
    var caps = m.chapters ? (m.chapters + ' caps') : 'En curso';
    return {
      id: 'al-' + m.id,
      titulo: titulo,
      subtitulo: '⛩️ Manga' + (year ? ' • ' + year : '') + ' • ' + caps,
      portada: (m.coverImage && (m.coverImage.large || m.coverImage.medium)) || ''
    };
  });
}

function obtenerMetadataDetallada(categoria, id) {
  if (categoria === 'Juegos') return obtenerMetadataSteam(id);
  if (categoria === 'Peliculas_Series') return obtenerMetadataTmdb_(id);
  if (categoria === 'Libros') return obtenerMetadataLibro_(id);
  if (categoria === 'Mangas') return obtenerMetadataManga_(id);
  return null;
}

function decodificarHtml_(texto) {
  return String(texto || '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]*>?/gm, '')
    .trim();
}

function obtenerMetadataSteam(appId) {
  var cleanId = String(appId).replace(/\D/g, '');
  if (!cleanId) return null;

  var base = {
    id: cleanId,
    titulo: 'Steam App #' + cleanId,
    creador: 'N/A',
    editorial: 'N/A',
    fecha: 'N/A',
    portada: 'https://cdn.cloudflare.steamstatic.com/steam/apps/' + cleanId + '/header.jpg',
    descripcion: 'Ficha obtenida mediante respaldo.',
    generos: 'N/A',
    precio: 'N/A',
    modos: 'N/A',
    steamdeck: 'Desconocido',
    dlcs: 'Ninguno',
    tags: '',
    dupli: '',
    versionPatch: '-',
    versionEstable: 'Actual',
    versionBeta: '-',
    buildEstable: '-',
    fechaEstable: '-',
    beta: '-',
    notaParche: '-',
    trailer: '',
    capturas: '',
    estadoAngel: 'No jugado',
    estadoTalmai: 'No jugado',
    estrellasAngel: 0,
    estrellasTalmai: 0,
    deseadoAngel: false,
    deseadoTalmai: false,
    progresoAngel: '',
    progresoTalmai: '',
    notaAngel: '',
    notaTalmai: '',
    puntuacion: 'N/A'
  };

  var encontradoEnTienda = false;

  try {
    var url = "https://store.steampowered.com/api/appdetails?appids=" + cleanId + "&cc=US&l=spanish";
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var json = JSON.parse(res.getContentText());

    if (json && json[cleanId] && json[cleanId].success && json[cleanId].data) {
      var d = json[cleanId].data;
      var genres = (d.genres || []).map(function(g) { return g.description; }).join(', ');
      var devs = (d.developers || []).join(', ');
      var price = d.is_free ? 'Gratis' : (d.price_overview ? d.price_overview.final_formatted : 'N/A');
      var trailerUrl = '';
      if (d.movies && d.movies.length > 0) {
        var mv = d.movies[0];
        trailerUrl = (mv.mp4 && (mv.mp4['480'] || mv.mp4.max)) || (mv.webm && (mv.webm['480'] || mv.webm.max)) || mv.hls_h264 || '';
      }

      base.titulo = d.name || base.titulo;
      base.creador = devs || 'N/A';
      base.editorial = (d.publishers || []).join(', ') || 'N/A';
      base.fecha = (d.release_date && d.release_date.date) ? String(d.release_date.date) : 'N/A';
      base.portada = d.header_image || base.portada;
      base.descripcion = decodificarHtml_(d.short_description) || base.descripcion;
      base.generos = genres || 'N/A';
      base.precio = price;
      base.modos = d.categories ? d.categories.map(function(c) { return c.description; }).join(', ') : 'N/A';
      base.dlcs = d.dlc ? (d.dlc.length + ' DLCs') : 'Ninguno';
      base.trailer = trailerUrl;
      base.capturas = (d.screenshots && d.screenshots.length > 0)
        ? d.screenshots.slice(0, 6).map(function(s) { return s.path_full; }).join(',')
        : '';
      base.puntuacion = (d.metacritic && d.metacritic.score) ? (d.metacritic.score / 10).toFixed(1) : 'N/A';
      encontradoEnTienda = true;
    }
  } catch (e) {}

  if (!encontradoEnTienda) {
    try {
      var storeHtmlRes = UrlFetchApp.fetch("https://store.steampowered.com/app/" + cleanId + "/?l=spanish&cc=US", {
        headers: {
          'Cookie': 'birthtime=283993201; wants_mature_content=1; lastagecheckage=1-0-1979; mature_content=1',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
        },
        followRedirects: true,
        muteHttpExceptions: true
      });
      var finalUrl = storeHtmlRes.getHeaders()['Location'] || '';
      var html = storeHtmlRes.getContentText() || '';

      if (html.indexOf('apphub_AppName') !== -1 && finalUrl.indexOf('store.steampowered.com/?') === -1) {
        var mTitle = html.match(/<div[^>]*class="apphub_AppName"[^>]*>([\s\S]*?)<\/div>/i);
        var mDesc = html.match(/<div[^>]*class="game_description_snippet"[^>]*>([\s\S]*?)<\/div>/i);
        var mImg = html.match(/<img[^>]*class="game_header_image_full"[^>]*src="([^"]+)"/i);
        var mDate = html.match(/<div[^>]*class="date"[^>]*>([\s\S]*?)<\/div>/i);
        var mTags = html.match(/class="app_tag"[^>]*>([\s\S]*?)<\/a>/gi);

        if (mTitle && mTitle[1]) base.titulo = decodificarHtml_(mTitle[1]);
        if (mDesc && mDesc[1]) base.descripcion = decodificarHtml_(mDesc[1]);
        if (mImg && mImg[1]) base.portada = mImg[1].trim();
        if (mDate && mDate[1]) base.fecha = decodificarHtml_(mDate[1]);

        if (mTags && mTags.length > 0) {
          var tagsLimpias = mTags.slice(0, 6).map(function(t) {
            return decodificarHtml_(t.replace(/^[^>]+>/, '').replace(/<\/a>$/i, ''));
          }).filter(Boolean);
          if (tagsLimpias.length > 0) {
            base.tags = tagsLimpias.join(', ');
            base.generos = tagsLimpias.slice(0, 3).join(', ');
          }
        }
        encontradoEnTienda = true;
      }
    } catch (eAge) {}
  }

  try {
    var cmdRes = UrlFetchApp.fetch("https://api.steamcmd.net/v1/info/" + cleanId, { muteHttpExceptions: true });
    if (cmdRes.getResponseCode() === 200) {
      var cmdJson = JSON.parse(cmdRes.getContentText());
      var appInfo = (cmdJson && cmdJson.data && cmdJson.data[cleanId]) ? cmdJson.data[cleanId] : null;
      var common = (appInfo && appInfo.common) ? appInfo.common : null;

      if (common) {
        if (common.name && (base.titulo.indexOf('Steam App #') === 0 || !encontradoEnTienda)) {
          base.titulo = String(common.name).trim();
        }

        if (common.associations) {
          var devsList = [];
          var pubsList = [];
          Object.keys(common.associations).forEach(function(k) {
            var assoc = common.associations[k];
            if (!assoc || !assoc.name) return;
            if (assoc.type === 'developer') devsList.push(assoc.name);
            if (assoc.type === 'publisher') pubsList.push(assoc.name);
          });
          if (base.creador === 'N/A' && devsList.length > 0) base.creador = devsList.join(', ');
          if (base.editorial === 'N/A' && pubsList.length > 0) base.editorial = pubsList.join(', ');
        }

        if (base.fecha === 'N/A' && common.steam_release_date) {
          var ts = Number(common.steam_release_date) * 1000;
          if (!isNaN(ts) && ts > 0) {
            base.fecha = Utilities.formatDate(new Date(ts), 'GMT', 'yyyy-MM-dd');
          }
        }

        if (common.steam_deck_compatibility && common.steam_deck_compatibility.category !== undefined) {
          var deckMap = { '3': 'Verificado', '2': 'Jugable', '1': 'No compatible' };
          base.steamdeck = deckMap[String(common.steam_deck_compatibility.category)] || 'Desconocido';
        }

        if (base.puntuacion === 'N/A') {
          if (common.metacritic_score) {
            base.puntuacion = (Number(common.metacritic_score) / 10).toFixed(1);
          } else if (common.review_percentage) {
            base.puntuacion = common.review_percentage + '% Steam';
          }
        }

        var branches = (appInfo && appInfo.depots && appInfo.depots.branches) ? appInfo.depots.branches : null;
        if (branches) {
          if (branches.public) {
            if (branches.public.buildid) base.buildEstable = String(branches.public.buildid).trim();
            if (branches.public.timeupdated) {
              var tsPub = Number(branches.public.timeupdated) * 1000;
              if (!isNaN(tsPub) && tsPub > 0) {
                base.fechaEstable = Utilities.formatDate(new Date(tsPub), Session.getScriptTimeZone() || 'GMT', 'yyyy-MM-dd');
              }
            }
          }
          var betaList = [];
          Object.keys(branches).forEach(function(bName) {
            if (bName === 'public') return;
            var bInfo = branches[bName] || {};
            betaList.push(bInfo.buildid ? (bName + ' #' + bInfo.buildid) : bName);
          });
          if (betaList.length > 0) base.beta = betaList.join(', ');
        }

        if (!encontradoEnTienda) {
          base.precio = 'Fuera de tienda';
          if (base.descripcion === 'Ficha obtenida mediante respaldo.') {
            base.descripcion = 'Juego retirado de la tienda de Steam o restringido por clasificación; metadata recuperada desde archivo PICS.';
          }
        }
      }
    }
  } catch (eCmd) {}

  try {
    var newsUrl = "https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=" + cleanId + "&count=1&maxlength=180";
    var newsRes = UrlFetchApp.fetch(newsUrl, { muteHttpExceptions: true });
    if (newsRes.getResponseCode() === 200) {
      var newsJson = JSON.parse(newsRes.getContentText());
      var firstNews = (newsJson && newsJson.appnews && Array.isArray(newsJson.appnews.newsitems) && newsJson.appnews.newsitems[0])
        ? newsJson.appnews.newsitems[0] : null;
      if (firstNews && firstNews.title) {
        var fDate = firstNews.date ? Utilities.formatDate(new Date(Number(firstNews.date) * 1000), Session.getScriptTimeZone() || 'GMT', 'yyyy-MM-dd') : '';
        base.notaParche = (fDate ? '[' + fDate + '] ' : '') + decodificarHtml_(firstNews.title);
      }
    }
  } catch (eNews) {}

  if (STEAMGRIDDB_API_KEY) {
    try {
      var headersSgdb = { Authorization: 'Bearer ' + STEAMGRIDDB_API_KEY };

      if (base.titulo.indexOf('Steam App #') === 0) {
        var gameRes = UrlFetchApp.fetch('https://www.steamgriddb.com/api/v2/games/steam/' + cleanId, {
          headers: headersSgdb,
          muteHttpExceptions: true
        });
        var gameJson = JSON.parse(gameRes.getContentText());
        if (gameJson && gameJson.success && gameJson.data && gameJson.data.name) {
          base.titulo = gameJson.data.name;
        }
      }

      if (!encontradoEnTienda) {
        var gridRes = UrlFetchApp.fetch('https://www.steamgriddb.com/api/v2/grids/steam/' + cleanId + '?dimensions=460x215,920x430', {
          headers: headersSgdb,
          muteHttpExceptions: true
        });
        var gridJson = JSON.parse(gridRes.getContentText());
        if (gridJson && gridJson.success && Array.isArray(gridJson.data) && gridJson.data.length > 0) {
          base.portada = gridJson.data[0].url;
        }
      }
    } catch (eSgdb) {}
  }

  return base;
}

function obtenerMetadataTmdb_(compositeId) {
  var apiKey = getTmdbKey_();
  if (!apiKey) throw new Error('Falta configurar TMDB_API_KEY en Propiedades del script');

  var parts = String(compositeId).split('-');
  var mediaType = parts[0] === 'tv' ? 'tv' : 'movie';
  var numId = parts[1] || parts[0];

  var url = "https://api.themoviedb.org/3/" + mediaType + "/" + numId +
            "?api_key=" + encodeURIComponent(apiKey) +
            "&language=es-ES&append_to_response=videos,watch/providers,credits";
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var d = JSON.parse(res.getContentText());
  if (!d || d.success === false) return null;

  var esSerie = mediaType === 'tv';
  var titulo = esSerie ? (d.name || d.original_name) : (d.title || d.original_title);
  var creador = 'N/A';
  if (esSerie && d.created_by && d.created_by.length > 0) {
    creador = d.created_by.map(function(c) { return c.name; }).join(', ');
  } else if (d.credits && d.credits.crew) {
    var dirs = d.credits.crew.filter(function(c) { return c.job === 'Director'; }).map(function(c) { return c.name; });
    if (dirs.length > 0) creador = dirs.join(', ');
  }

  var editorial = (d.production_companies && d.production_companies.length > 0)
    ? d.production_companies.slice(0, 2).map(function(p) { return p.name; }).join(', ')
    : 'N/A';

  var extension = 'N/A';
  if (esSerie) {
    var temps = d.number_of_seasons ? (d.number_of_seasons + ' temp.') : '';
    var eps = d.number_of_episodes ? (d.number_of_episodes + ' eps.') : '';
    extension = [temps, eps].filter(Boolean).join(' • ') || 'N/A';
  } else if (d.runtime) {
    extension = d.runtime + ' min';
  }

  var plataformas = [];
  var wp = (d['watch/providers'] && d['watch/providers'].results) ? d['watch/providers'].results : {};
  var region = wp.ES || wp.MX || wp.US || wp.VE || {};
  if (region.flatrate) {
    plataformas = region.flatrate.map(function(p) { return p.provider_name; });
  }

  var trailerUrl = '';
  if (d.videos && Array.isArray(d.videos.results)) {
    var yt = d.videos.results.filter(function(v) { return v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'); })[0];
    if (yt && yt.key) trailerUrl = 'https://www.youtube.com/watch?v=' + yt.key;
  }

  var estadoMap = {
    'Returning Series': 'En emisión',
    'In Production': 'En emisión',
    'Ended': 'Finalizada',
    'Canceled': 'Cancelada',
    'Released': 'Estrenada'
  };

  return {
    id: mediaType + '-' + numId,
    titulo: titulo || 'Sin título',
    creador: creador,
    editorial: editorial,
    fecha: String(esSerie ? (d.first_air_date || 'N/A') : (d.release_date || 'N/A')),
    portada: d.poster_path ? ('https://image.tmdb.org/t/p/w500' + d.poster_path) : '',
    descripcion: d.overview || 'Sin sinopsis disponible.',
    generos: (d.genres || []).map(function(g) { return g.name; }).join(', ') || 'N/A',
    tipo: esSerie ? 'Serie' : 'Película',
    extension: extension,
    plataformas: plataformas.length > 0 ? plataformas.join(', ') : 'N/A',
    estadoEmision: estadoMap[d.status] || d.status || 'N/A',
    trailer: trailerUrl,
    estadoAngel: 'No jugado',
    estadoTalmai: 'No jugado',
    estrellasAngel: 0,
    estrellasTalmai: 0,
    deseadoAngel: false,
    deseadoTalmai: false,
    progresoAngel: '',
    progresoTalmai: '',
    notaAngel: '',
    notaTalmai: '',
    puntuacion: d.vote_average ? Number(d.vote_average).toFixed(1) : 'N/A'
  };
}

function resolverAutoresOpenLibrary_(authorsArr, fallbackTitulo) {
  var nombres = [];
  var vistos = {};

  if (Array.isArray(authorsArr) && authorsArr.length > 0) {
    for (var i = 0; i < Math.min(authorsArr.length, 4); i++) {
      var entry = authorsArr[i];
      if (!entry) continue;
      if (typeof entry === 'string') {
        var cleanStr = entry.trim();
        if (cleanStr && cleanStr.indexOf('/authors/') !== 0 && !vistos[cleanStr.toLowerCase()]) {
          vistos[cleanStr.toLowerCase()] = true;
          nombres.push(cleanStr);
          continue;
        }
        entry = { key: cleanStr };
      }
      var aKey = (entry.author && entry.author.key) ? entry.author.key : (entry.key || '');
      if (!aKey) continue;
      var pathKey = aKey.indexOf('/') === 0 ? aKey : ('/authors/' + aKey);
      try {
        var aRes = UrlFetchApp.fetch('https://openlibrary.org' + pathKey + '.json', { muteHttpExceptions: true });
        if (aRes.getResponseCode() === 200) {
          var aJson = JSON.parse(aRes.getContentText());
          var aName = (aJson && (aJson.name || aJson.personal_name)) ? String(aJson.name || aJson.personal_name).trim() : '';
          if (aName && !vistos[aName.toLowerCase()]) {
            vistos[aName.toLowerCase()] = true;
            nombres.push(aName);
          }
        }
      } catch (e) {}
    }
  }

  if (nombres.length > 0) return nombres.join(', ');

  if (fallbackTitulo) {
    try {
      var sUrl = 'https://openlibrary.org/search.json?title=' + encodeURIComponent(fallbackTitulo) + '&fields=author_name&limit=3';
      var sRes = UrlFetchApp.fetch(sUrl, { muteHttpExceptions: true });
      if (sRes.getResponseCode() === 200) {
        var sJson = JSON.parse(sRes.getContentText());
        var docs = (sJson && sJson.docs) ? sJson.docs : [];
        for (var j = 0; j < docs.length; j++) {
          if (Array.isArray(docs[j].author_name) && docs[j].author_name.length > 0) {
            return docs[j].author_name.slice(0, 3).join(', ');
          }
        }
      }
    } catch (eSearch) {}
  }

  return 'Autor por definir';
}

function obtenerMetadataLibro_(idOIsbn) {
  var clean = String(idOIsbn || '').trim().replace(/^ol-(?=OL\d+[WM]$)/i, '');
  if (!clean) return null;

  var isIsbn = clean.toLowerCase().indexOf('isbn:') === 0;
  var isbnClean = isIsbn ? clean.replace(/^isbn:/i, '').replace(/[-\s]/g, '') : '';
  var endpoint = '';

  if (isIsbn) {
    endpoint = 'https://openlibrary.org/isbn/' + encodeURIComponent(isbnClean) + '.json';
  } else if (/^OL\d+M$/i.test(clean)) {
    endpoint = 'https://openlibrary.org/books/' + clean.toUpperCase() + '.json';
  } else {
    var workClean = clean.replace(/^\/works\//i, '').toUpperCase();
    endpoint = 'https://openlibrary.org/works/' + encodeURIComponent(workClean) + '.json';
  }

  var res = UrlFetchApp.fetch(endpoint, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return null;
  var d = JSON.parse(res.getContentText());
  if (!d) return null;

  var workData = null;
  if (Array.isArray(d.works) && d.works.length > 0 && d.works[0].key) {
    try {
      var wRes = UrlFetchApp.fetch('https://openlibrary.org' + d.works[0].key + '.json', { muteHttpExceptions: true });
      if (wRes.getResponseCode() === 200) {
        workData = JSON.parse(wRes.getContentText());
      }
    } catch (eW) {}
  }

  var desc = '';
  if (typeof d.description === 'string') desc = d.description;
  else if (d.description && d.description.value) desc = d.description.value;
  if (!desc && workData) {
    if (typeof workData.description === 'string') desc = workData.description;
    else if (workData.description && workData.description.value) desc = workData.description.value;
  }

  var titulo = d.title || (workData && workData.title) || 'Sin título';
  var authorsSource = (d.authors && d.authors.length > 0) ? d.authors : ((workData && workData.authors) || []);
  var autor = resolverAutoresOpenLibrary_(authorsSource, titulo);

  var coverId = (d.covers && d.covers.length > 0)
    ? d.covers[0]
    : ((workData && workData.covers && workData.covers.length > 0) ? workData.covers[0] : null);

  var workId = String((workData && workData.key) || d.key || clean)
    .replace('/works/', '')
    .replace('/books/', '');

  var numPages = d.number_of_pages || d.pagination || (workData && workData.number_of_pages) || '';
  var pags = numPages ? (String(numPages).indexOf('pág') !== -1 ? String(numPages) : (numPages + ' págs.')) : 'N/A';

  var isbnVal = (Array.isArray(d.isbn_13) && d.isbn_13[0]) ||
                  (Array.isArray(d.isbn_10) && d.isbn_10[0]) ||
                  (isbnClean || 'N/A');

  var subjectsArr = (Array.isArray(d.subjects) && d.subjects.length > 0)
    ? d.subjects
    : ((workData && Array.isArray(workData.subjects)) ? workData.subjects : []);
  var generosStr = subjectsArr.slice(0, 5).map(function(s) {
    return typeof s === 'string' ? s : (s && s.name ? s.name : '');
  }).filter(Boolean).join(', ') || 'N/A';

  return {
    id: workId,
    titulo: titulo,
    creador: autor,
    autor: autor,
    editorial: (Array.isArray(d.publishers) && d.publishers[0]) || 'Open Library',
    fecha: String(d.publish_date || (workData && workData.first_publish_date) || 'N/A'),
    portada: coverId ? ('https://covers.openlibrary.org/b/id/' + coverId + '-L.jpg') : '',
    descripcion: decodificarHtml_(desc) || 'Sin sinopsis disponible.',
    generos: generosStr,
    extension: pags,
    isbn: isbnVal,
    capitulosTotales: 0,
    estadoAngel: 'No jugado',
    estadoTalmai: 'No jugado',
    estrellasAngel: 0,
    estrellasTalmai: 0,
    deseadoAngel: false,
    deseadoTalmai: false,
    progresoAngel: '',
    progresoTalmai: '',
    notaAngel: '',
    notaTalmai: '',
    puntuacion: 'N/A'
  };
}

function obtenerMetadataManga_(idStr) {
  var raw = String(idStr || '').trim().toLowerCase();
  var isMal = raw.indexOf('mal-') === 0;
  var numId = parseInt(raw.replace(/^(al-|mal-)/, ''), 10);
  if (!numId) return null;

  var gql = isMal
    ? 'query ($id: Int) { Media(idMal: $id, type: MANGA) { id title { romaji english native } description(asHtml: false) chapters volumes status genres averageScore startDate { year month day } coverImage { extraLarge large } staff(perPage: 3) { edges { role node { name { full } } } } tags { name rank } } }'
    : 'query ($id: Int) { Media(id: $id, type: MANGA) { id title { romaji english native } description(asHtml: false) chapters volumes status genres averageScore startDate { year month day } coverImage { extraLarge large } staff(perPage: 3) { edges { role node { name { full } } } } tags { name rank } } }';

  var res = UrlFetchApp.fetch('https://graphql.anilist.co', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ query: gql, variables: { id: numId } }),
    muteHttpExceptions: true
  });
  var json = JSON.parse(res.getContentText());
  var m = (json && json.data && json.data.Media) ? json.data.Media : null;
  if (!m) return null;

  var titulo = m.title.english || m.title.romaji || m.title.native || 'Sin título';
  var mangaka = 'N/A';
  if (m.staff && m.staff.edges && m.staff.edges.length > 0) {
    mangaka = m.staff.edges.map(function(e) { return e.node.name.full; }).join(', ');
  }

  var extParts = [];
  if (m.volumes) extParts.push(m.volumes + ' tomos');
  if (m.chapters) extParts.push(m.chapters + ' caps');

  var demografia = 'N/A';
  if (m.tags && m.tags.length > 0) {
    var demos = ['Shounen', 'Seinen', 'Shoujo', 'Josei'];
    var foundDemo = m.tags.filter(function(t) { return demos.indexOf(t.name) !== -1; })[0];
    if (foundDemo) demografia = foundDemo.name;
  }

  var statusMap = {
    'RELEASING': 'En emisión',
    'FINISHED': 'Finalizado',
    'NOT_YET_RELEASED': 'Próximamente',
    'CANCELLED': 'Cancelado',
    'HIATUS': 'En pausa'
  };

  var fecha = (m.startDate && m.startDate.year)
    ? [m.startDate.year, m.startDate.month, m.startDate.day].filter(Boolean).join('-')
    : 'N/A';

  return {
    id: 'al-' + m.id,
    titulo: titulo,
    creador: mangaka,
    editorial: 'AniList',
    fecha: String(fecha),
    portada: (m.coverImage && (m.coverImage.extraLarge || m.coverImage.large)) || '',
    descripcion: (m.description || '').replace(/<[^>]*>?/gm, '') || 'Sin sinopsis disponible.',
    generos: (m.genres || []).join(', ') || 'N/A',
    extension: extParts.join(' • ') || 'N/A',
    demografia: demografia,
    estadoEmision: statusMap[m.status] || m.status || 'N/A',
    capitulosTotales: Number(m.chapters) || 0,
    estadoAngel: 'No jugado',
    estadoTalmai: 'No jugado',
    estrellasAngel: 0,
    estrellasTalmai: 0,
    deseadoAngel: false,
    deseadoTalmai: false,
    progresoAngel: '',
    progresoTalmai: '',
    notaAngel: '',
    notaTalmai: '',
    puntuacion: m.averageScore ? (m.averageScore / 10).toFixed(1) : 'N/A'
  };
}

function guardarFilaSheet(categoria, data) {
  var sheet = obtenerOCrearHoja_(categoria);
  if (!sheet) return;

  var headers = sheet.getDataRange().getValues()[0].map(function(h) { return String(h || '').trim(); });
  var row = headers.map(function(h) {
    var k = mapearHeaderAKey_(h);
    return data[k] !== undefined ? formatearValorParaSheet_(k, data[k]) : '';
  });
  sheet.appendRow(row);
  SpreadsheetApp.flush();
}

function guardarProgresoItem(categoria, id, persona, estado, estrellas, progreso) {
  var sheet = obtenerOCrearHoja_(categoria);
  if (!sheet) return { success: false };
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0].map(function(h) { return String(h || '').trim(); });
  var idCol = buscarColumna_(headers, 'id');
  var estCol = buscarColumna_(headers, 'estado' + persona);
  var ptsCol = buscarColumna_(headers, 'estrellas' + persona);
  var progCol = buscarColumna_(headers, 'progreso' + persona);

  for (var i = 1; i < rows.length; i++) {
    var rowId = idCol !== -1 ? String(rows[i][idCol]).trim() : '';
    if (coincideFila_(rowId, i, id)) {
      if (estCol !== -1) sheet.getRange(i + 1, estCol + 1).setValue(estado);
      if (ptsCol !== -1) sheet.getRange(i + 1, ptsCol + 1).setValue(estrellas);
      if (progCol !== -1) sheet.getRange(i + 1, progCol + 1).setValue(progreso);
      SpreadsheetApp.flush();
      return { success: true };
    }
  }
  return { success: false };
}

function guardarDeseadoItem(categoria, id, persona, deseado) {
  var sheet = obtenerOCrearHoja_(categoria);
  if (!sheet) return { success: false };
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0].map(function(h) { return String(h || '').trim(); });
  var idCol = buscarColumna_(headers, 'id');
  var desCol = buscarColumna_(headers, 'deseado' + persona);

  for (var i = 1; i < rows.length; i++) {
    var rowId = idCol !== -1 ? String(rows[i][idCol]).trim() : '';
    if (coincideFila_(rowId, i, id)) {
      if (desCol !== -1) sheet.getRange(i + 1, desCol + 1).setValue(Boolean(deseado));
      SpreadsheetApp.flush();
      return { success: true };
    }
  }
  return { success: false };
}

function guardarNotaItem(categoria, id, persona, nota) {
  var sheet = obtenerOCrearHoja_(categoria);
  if (!sheet) return { success: false };
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0].map(function(h) { return String(h || '').trim(); });
  var idCol = buscarColumna_(headers, 'id');
  var notaCol = buscarColumna_(headers, 'nota' + persona);

  for (var i = 1; i < rows.length; i++) {
    var rowId = idCol !== -1 ? String(rows[i][idCol]).trim() : '';
    if (coincideFila_(rowId, i, id)) {
      if (notaCol !== -1) sheet.getRange(i + 1, notaCol + 1).setValue(nota);
      SpreadsheetApp.flush();
      return { success: true };
    }
  }
  return { success: false };
}

function guardarTotalCapitulos(categoria, id, total) {
  var sheet = obtenerOCrearHoja_(categoria);
  if (!sheet) return { success: false };
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0].map(function(h) { return String(h || '').trim(); });
  var idCol = buscarColumna_(headers, 'id');
  var capCol = buscarColumna_(headers, 'capitulosTotales');

  if (capCol === -1) {
    capCol = headers.length;
    sheet.getRange(1, capCol + 1).setValue('capitulosTotales');
  }

  for (var i = 1; i < rows.length; i++) {
    var rowId = idCol !== -1 ? String(rows[i][idCol]).trim() : '';
    if (coincideFila_(rowId, i, id)) {
      sheet.getRange(i + 1, capCol + 1).setValue(Number(total) || 0);
      SpreadsheetApp.flush();
      return { success: true };
    }
  }
  return { success: false };
}

function repararItemIndividual(categoria, id) {
  try {
    var sheet = obtenerOCrearHoja_(categoria);
    if (!sheet) return { success: false, msg: 'Hoja no encontrada.' };
    var rows = sheet.getDataRange().getValues();
    var headers = rows[0].map(function(h) { return String(h || '').trim(); });
    var idCol = buscarColumna_(headers, 'id');

    for (var i = 1; i < rows.length; i++) {
      var rowId = idCol !== -1 ? String(rows[i][idCol]).trim() : '';
      if (coincideFila_(rowId, i, id)) {
        var actual = {};
        for (var j = 0; j < headers.length; j++) {
          if (!headers[j]) continue;
          actual[mapearHeaderAKey_(headers[j])] = serializarValorCelda_(rows[i][j]);
        }

        var idParaApi = rowId;
        if (!idParaApi && actual.titulo) {
          var encontrados = buscarCatalogoExterno(categoria, actual.titulo);
          if (encontrados && encontrados.length > 0) idParaApi = encontrados[0].id;
        }

        var nuevaMeta = obtenerMetadataDetallada(categoria, idParaApi);
        if (!nuevaMeta) {
          return { success: false, msg: 'No se pudo obtener metadata desde la API externa.' };
        }

        var camposPreservados = [
          'estadoAngel', 'estadoTalmai', 'estrellasAngel', 'estrellasTalmai',
          'deseadoAngel', 'deseadoTalmai', 'progresoAngel', 'progresoTalmai',
          'notaAngel', 'notaTalmai', 'capitulosTotales', 'dupli', 'versionEstable'
        ];
        camposPreservados.forEach(function(campo) {
          if (actual[campo] !== undefined && actual[campo] !== '') {
            nuevaMeta[campo] = actual[campo];
          }
        });
        nuevaMeta.estadoAngel = normalizarEstado_(nuevaMeta.estadoAngel);
        nuevaMeta.estadoTalmai = normalizarEstado_(nuevaMeta.estadoTalmai);
        nuevaMeta.deseadoAngel = parsearBooleano_(nuevaMeta.deseadoAngel);
        nuevaMeta.deseadoTalmai = parsearBooleano_(nuevaMeta.deseadoTalmai);
        nuevaMeta.estrellasAngel = Number(nuevaMeta.estrellasAngel) || 0;
        nuevaMeta.estrellasTalmai = Number(nuevaMeta.estrellasTalmai) || 0;

        var creadorFinal = String(nuevaMeta.creador || actual.creador || '').trim();
        if (!creadorFinal || creadorFinal.toLowerCase() === 'undefined' || creadorFinal === 'Autor por definir') {
          if (categoria === 'Libros') {
            creadorFinal = resolverAutoresOpenLibrary_(null, nuevaMeta.titulo || actual.titulo);
          }
        }
        nuevaMeta.creador = creadorFinal || (categoria === 'Libros' ? 'Autor por definir' : 'N/A');
        nuevaMeta.autor = nuevaMeta.creador;
        nuevaMeta.index = i;

        nuevaMeta.puntuacion = limpiarValorPuntuacion_(nuevaMeta.puntuacion);
        var filaActualizada = headers.map(function(h) {
          var k = mapearHeaderAKey_(h);
          var rawCell = nuevaMeta[k] !== undefined ? nuevaMeta[k] : (actual[k] !== undefined ? actual[k] : '');
          return formatearValorParaSheet_(k, rawCell);
        });
        sheet.getRange(i + 1, 1, 1, headers.length).setValues([filaActualizada]);
        SpreadsheetApp.flush();

        return { success: true, data: nuevaMeta };
      }
    }
    return { success: false, msg: 'Elemento no encontrado en la hoja.' };
  } catch (e) {
    return { success: false, msg: e.message || 'Error al reparar elemento.' };
  }
}

function eliminarItem(categoria, id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = obtenerOCrearHoja_(categoria);
  var trashSheet = ss.getSheetByName('Papelera');
  if (!sheet) return { success: false, msg: 'Hoja no encontrada.' };

  if (!trashSheet) {
    trashSheet = ss.insertSheet('Papelera');
    trashSheet.appendRow(['categoria', 'id', 'titulo', 'datosJson']);
  }

  var rows = sheet.getDataRange().getValues();
  var headers = rows[0].map(function(h) { return String(h || '').trim(); });
  var idCol = buscarColumna_(headers, 'id');

  for (var i = 1; i < rows.length; i++) {
    var rowId = idCol !== -1 ? String(rows[i][idCol]).trim() : '';
    if (coincideFila_(rowId, i, id)) {
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        if (!headers[j]) continue;
        obj[mapearHeaderAKey_(headers[j])] = serializarValorCelda_(rows[i][j]);
      }
      trashSheet.appendRow([categoria, String(obj.id || id), String(obj.titulo || 'Sin título'), JSON.stringify(obj)]);
      sheet.deleteRow(i + 1);
      SpreadsheetApp.flush();
      return { success: true };
    }
  }
  return { success: false, msg: 'No se encontró el elemento.' };
}

function getItemsEliminados() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var trashSheet = ss.getSheetByName('Papelera');
  if (!trashSheet) return [];
  var rows = trashSheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  var list = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0] && !r[1]) continue;
    list.push({
      categoria: String(r[0] || ''),
      id: String(r[1] || ''),
      titulo: String(r[2] || 'Elemento sin título')
    });
  }
  return list;
}

function restaurarItem(categoria, id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var trashSheet = ss.getSheetByName('Papelera');
  var targetSheet = obtenerOCrearHoja_(categoria);
  if (!trashSheet || !targetSheet) return { success: false };

  var rows = trashSheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(categoria).trim() && String(rows[i][1]).trim() === String(id).trim()) {
      var targetHeaders = targetSheet.getDataRange().getValues()[0].map(function(h) { return String(h || '').trim(); });
      var rawJson = rows[i][3];
      var restoredRow;

      if (rawJson && String(rawJson).trim().charAt(0) === '{') {
        var obj = JSON.parse(rawJson);
        if (obj.puntuacion !== undefined) {
          obj.puntuacion = limpiarValorPuntuacion_(obj.puntuacion);
        }
        restoredRow = targetHeaders.map(function(h) {
          var k = mapearHeaderAKey_(h);
          return obj[k] !== undefined ? formatearValorParaSheet_(k, obj[k]) : '';
        });
      } else {
        restoredRow = rows[i].slice(1);
      }

      targetSheet.appendRow(restoredRow);
      trashSheet.deleteRow(i + 1);
      SpreadsheetApp.flush();
      return { success: true };
    }
  }
  return { success: false };
}

var LOTE_BUILDS_JUEGOS = 60;
var TRIGGER_HANDLER_BUILDS = 'continuarLoteBuildsJuegos';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('NexusLib')
    .addItem('Rellenar builds/parches (por lotes hasta fin)', 'rellenarBuildsJuegos')
    .addItem('Actualizar todo desde cero (por lotes)', 'repararBuildsJuegosCompleto')
    .addSeparator()
    .addItem('Rellenar builds/parches (filas 2 a 80)', 'rellenarTanda1')
    .addItem('Rellenar builds/parches (filas 81 a 160)', 'rellenarTanda2')
    .addItem('Rellenar builds/parches (filas 161 a 260)', 'rellenarTanda3')
    .addItem('Rellenar builds/parches (filas 261 a 380)', 'rellenarTanda4')
    .addItem('Rellenar builds/parches (filas 381 a fin)', 'rellenarTanda5')
    .addItem('Limpiar y regenerar todo desde ID (por lotes)', 'reconstruirJuegosDesdeIdPorLotes')
    .addToUi();
}

function rellenarTanda1() { return rellenarBuildsJuegos({ filaInicio: 2, limite: 79, encadenar: false }); }
function rellenarTanda2() { return rellenarBuildsJuegos({ filaInicio: 81, limite: 80, encadenar: false }); }
function rellenarTanda3() { return rellenarBuildsJuegos({ filaInicio: 161, limite: 100, encadenar: false }); }
function rellenarTanda4() { return rellenarBuildsJuegos({ filaInicio: 261, limite: 120, encadenar: false }); }
function rellenarTanda5() { return rellenarBuildsJuegos({ filaInicio: 381, limite: 200, encadenar: false }); }

function continuarLoteBuildsJuegos() {
  limpiarTriggersBuildsJuegos_();
  var estado = leerEstadoLoteBuilds_();
  if (!estado) {
    Logger.log('No hay lote pendiente de builds.');
    return { actualizados: 0 };
  }
  return rellenarBuildsJuegos({
    indiceInicio: estado.siguienteIndice,
    forzarTodo: Boolean(estado.forzarTodo),
    limite: estado.limite || LOTE_BUILDS_JUEGOS,
    encadenar: true
  });
}

function repararBuildsJuegosCompleto() {
  limpiarEstadoLoteBuilds_();
  limpiarTriggersBuildsJuegos_();
  return rellenarBuildsJuegos({
    forzarTodo: true,
    indiceInicio: 0,
    limite: LOTE_BUILDS_JUEGOS,
    encadenar: true
  });
}

function filaBuildYaLlena_(buildVal, fechaVal, betaVal, notaVal) {
  var b = String(buildVal === undefined || buildVal === null ? '' : buildVal).trim();
  var f = String(fechaVal === undefined || fechaVal === null ? '' : fechaVal).trim();
  var n = String(notaVal === undefined || notaVal === null ? '' : notaVal).trim();
  var tieneBuild = b !== '' && b !== '-';
  var tieneFecha = f !== '' && f !== '-';
  var tieneNota = n !== '' && n !== '-';
  return Boolean(tieneBuild && (tieneFecha || tieneNota));
}

function guardarEstadoLoteBuilds_(estado) {
  SCRIPT_PROPS.setProperty('NEXUS_LOTE_BUILDS_JUEGOS', JSON.stringify(estado));
}

function leerEstadoLoteBuilds_() {
  var raw = SCRIPT_PROPS.getProperty('NEXUS_LOTE_BUILDS_JUEGOS');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function limpiarEstadoLoteBuilds_() {
  SCRIPT_PROPS.deleteProperty('NEXUS_LOTE_BUILDS_JUEGOS');
}

function limpiarTriggersBuildsJuegos_() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === TRIGGER_HANDLER_BUILDS) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

function rellenarBuildsJuegos(filaInicioOLimite, limiteOpciones) {
  var opts = {};
  if (typeof filaInicioOLimite === 'object' && filaInicioOLimite !== null) {
    opts = filaInicioOLimite;
  } else {
    if (typeof filaInicioOLimite === 'number') {
      opts.filaInicio = filaInicioOLimite;
    }
    if (typeof limiteOpciones === 'number') {
      opts.limite = limiteOpciones;
    } else if (typeof limiteOpciones === 'object' && limiteOpciones !== null) {
      opts = Object.assign(opts, limiteOpciones);
    }
  }

  var encadenar = opts.encadenar !== undefined ? Boolean(opts.encadenar) : true;
  var forzarTodo = Boolean(opts.forzarTodo);
  var maxProcesar = Number(opts.limite) || LOTE_BUILDS_JUEGOS;

  if (encadenar && opts.indiceInicio === undefined) {
    limpiarTriggersBuildsJuegos_();
  }

  var sheet = obtenerOCrearHoja_('Juegos');
  if (!sheet) throw new Error('No se encontró la hoja Juegos.');

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    limpiarEstadoLoteBuilds_();
    return { actualizados: 0 };
  }

  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
    .map(function(h) { return String(h || '').trim(); });

  var colAppId = buscarColumna_(headers, 'id');
  var colBuild = buscarColumna_(headers, 'buildEstable');
  var colFecha = buscarColumna_(headers, 'fechaEstable');
  var colBeta  = buscarColumna_(headers, 'beta');
  var colNota  = buscarColumna_(headers, 'notaParche');

  if (colAppId === -1) throw new Error('No se encontró la columna AppID.');

  var totalFilas = lastRow - 1;
  var startIdx = 0;
  if (Number.isInteger(opts.indiceInicio) && opts.indiceInicio >= 0) {
    startIdx = Math.min(opts.indiceInicio, totalFilas);
  } else if (opts.filaInicio !== undefined) {
    startIdx = Math.max(0, Math.min(totalFilas, (Number(opts.filaInicio) || 2) - 2));
  }

  var rows = sheet.getRange(2, 1, totalFilas, lastCol).getValues();
  var cursor = startIdx;
  var actualizados = 0;
  var saltados = 0;

  while (cursor < totalFilas && actualizados < maxProcesar) {
    var row = rows[cursor];
    var appId = String(row[colAppId] || '').replace(/\D/g, '');
    if (!appId) {
      cursor++;
      continue;
    }

    var yaLlena = filaBuildYaLlena_(
      colBuild !== -1 ? row[colBuild] : '',
      colFecha !== -1 ? row[colFecha] : '',
      colBeta  !== -1 ? row[colBeta]  : '',
      colNota  !== -1 ? row[colNota]  : ''
    );

    if (!forzarTodo && yaLlena) {
      saltados++;
      cursor++;
      continue;
    }

    var meta = obtenerMetadataSteam(appId);
    if (meta) {
      if (colBuild !== -1) row[colBuild] = meta.buildEstable || '-';
      if (colFecha !== -1) row[colFecha] = meta.fechaEstable || '-';
      if (colBeta  !== -1) row[colBeta]  = meta.beta || '-';
      if (colNota  !== -1) row[colNota]  = meta.notaParche || '-';
      actualizados++;
    }

    cursor++;
    Utilities.sleep(150);
  }

  sheet.getRange(2, 1, totalFilas, lastCol).setValues(rows);
  SpreadsheetApp.flush();

  var filaInicioLog = startIdx + 2;
  var filaFinLog = cursor + 1;
  Logger.log(
    'Rango ' + filaInicioLog + '-' + filaFinLog +
    ' revisado. Actualizados: ' + actualizados +
    ' | Saltados ya llenos: ' + saltados
  );

  if (encadenar && cursor < totalFilas) {
    guardarEstadoLoteBuilds_({
      siguienteIndice: cursor,
      forzarTodo: forzarTodo,
      limite: maxProcesar
    });
    ScriptApp.newTrigger(TRIGGER_HANDLER_BUILDS)
      .timeBased()
      .after(15 * 1000)
      .create();
    Logger.log('Siguiente lote programado desde fila ' + (cursor + 2) + '.');
  } else if (cursor >= totalFilas) {
    limpiarEstadoLoteBuilds_();
    Logger.log('Actualización de builds/parches completada en toda la hoja Juegos.');
  }

  return { actualizados: actualizados, saltados: saltados };
}

var LOTE_RECONSTRUIR_DESDE_ID = 60;
var TRIGGER_HANDLER_RECONSTRUIR_ID = 'continuarReconstruirDesdeIdJuegos';

/**
 * Limpia todas las columnas excepto "id", clasificaciones y datos personales en "Juegos",
 * y regenera toda la metadata desde cero por lotes a partir de cada ID.
 */
function reconstruirJuegosDesdeIdPorLotes(opciones) {
  opciones = opciones || {};
  var maxPorLote = Number(opciones.limite) || LOTE_RECONSTRUIR_DESDE_ID;

  var sheet = obtenerOCrearHoja_('Juegos');
  if (!sheet) throw new Error('No se encontró la hoja Juegos.');

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) {
    limpiarEstadoReconstruirId_();
    return { procesados: 0, total: 0 };
  }

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
    .map(function(h) { return String(h || '').trim(); });

  var colId = buscarColumna_(headers, 'id');
  if (colId === -1) throw new Error('No se encontró la columna AppID / id en "Juegos".');

  var camposPreservados = {
    id: true,
    estadoAngel: true,
    estadoTalmai: true,
    estrellasAngel: true,
    estrellasTalmai: true,
    deseadoAngel: true,
    deseadoTalmai: true,
    progresoAngel: true,
    progresoTalmai: true,
    notaAngel: true,
    notaTalmai: true
  };

  var totalFilas = lastRow - 1;

  // Primera ejecución: respalda IDs y campos personales/clasificaciones, y limpia el resto de columnas
  if (opciones.indiceInicio === undefined) {
    limpiarTriggersReconstruirId_();
    limpiarEstadoReconstruirId_();

    var filasActuales = sheet.getRange(2, 1, totalFilas, lastCol).getValues();
    var respaldos = [];

    for (var rIdx = 0; rIdx < filasActuales.length; rIdx++) {
      var filaOrig = filasActuales[rIdx];
      var idVal = String(filaOrig[colId] || '').trim();
      var saved = { id: idVal };

      for (var cIdx = 0; cIdx < headers.length; cIdx++) {
        var keyOrig = mapearHeaderAKey_(headers[cIdx]);
        if (keyOrig && camposPreservados[keyOrig] && keyOrig !== 'id') {
          saved[keyOrig] = serializarValorCelda_(filaOrig[cIdx]);
        }
      }
      respaldos.push(saved);
    }

    for (var c = 0; c < lastCol; c++) {
      var colKey = mapearHeaderAKey_(headers[c]);
      if (c === colId || camposPreservados[colKey]) continue;
      sheet.getRange(2, c + 1, totalFilas, 1).clearContent();
    }
    SpreadsheetApp.flush();

    guardarEstadoReconstruirId_({
      siguienteIndice: 0,
      limite: maxPorLote,
      respaldos: respaldos
    });

    Logger.log(
      'Limpiadas columnas de metadata en "Juegos" (' + totalFilas + ' filas) preservando ID, clasificaciones y personales. Iniciando reconstrucción por lotes.'
    );
  }

  var estado = leerEstadoReconstruirId_();
  var cursor = Number.isInteger(opciones.indiceInicio)
    ? opciones.indiceInicio
    : (estado ? (Number(estado.siguienteIndice) || 0) : 0);
  var respaldosLista = (estado && Array.isArray(estado.respaldos)) ? estado.respaldos : [];

  var rows = sheet.getRange(2, 1, totalFilas, lastCol).getValues();
  var fin = Math.min(totalFilas, cursor + maxPorLote);
  var procesados = 0;

  for (var i = cursor; i < fin; i++) {
    var row = rows[i];
    var savedItem = respaldosLista[i] || {};
    var idOriginal = String(savedItem.id || row[colId] || '').trim();
    var appIdLimpio = idOriginal.replace(/\D/g, '');

    // Mantiene siempre el ID y los campos personales/clasificaciones respaldados
    row[colId] = idOriginal;
    for (var k = 0; k < headers.length; k++) {
      var keyPres = mapearHeaderAKey_(headers[k]);
      if (keyPres && camposPreservados[keyPres] && keyPres !== 'id' && savedItem[keyPres] !== undefined) {
        row[k] = savedItem[keyPres];
      }
    }

    if (!appIdLimpio) continue;

    var meta = obtenerMetadataSteam(appIdLimpio);
    if (meta) {
      meta.id = idOriginal;
      Object.keys(camposPreservados).forEach(function(campo) {
        if (campo === 'id') return;
        if (savedItem[campo] !== undefined) {
          meta[campo] = savedItem[campo];
        }
      });

      for (var j = 0; j < headers.length; j++) {
        var key = mapearHeaderAKey_(headers[j]);
        if (!key) continue;
        if (j === colId || key === 'id') {
          row[j] = idOriginal;
        } else if (camposPreservados[key]) {
          row[j] = savedItem[key] !== undefined ? savedItem[key] : row[j];
        } else if (meta[key] !== undefined) {
          row[j] = meta[key];
        } else {
          row[j] = '';
        }
      }
      procesados++;
    }

    Utilities.sleep(150);
  }

  sheet.getRange(2, 1, totalFilas, lastCol).setValues(rows);
  SpreadsheetApp.flush();

  Logger.log(
    'Regeneradas filas ' + (cursor + 2) + ' a ' + (fin + 1) +
    ' (procesados en lote: ' + procesados + '/' + totalFilas + ').'
  );

  if (fin < totalFilas) {
    guardarEstadoReconstruirId_({
      siguienteIndice: fin,
      limite: maxPorLote,
      respaldos: respaldosLista
    });
    ScriptApp.newTrigger(TRIGGER_HANDLER_RECONSTRUIR_ID)
      .timeBased()
      .after(15 * 1000)
      .create();
    Logger.log('Siguiente lote programado desde la fila ' + (fin + 2) + '.');
  } else {
    limpiarEstadoReconstruirId_();
    Logger.log('Reconstrucción completa desde "id" finalizada en "Juegos" conservando clasificaciones y datos personales.');
  }

  return { procesados: procesados, total: totalFilas };
}

function continuarReconstruirDesdeIdJuegos() {
  limpiarTriggersReconstruirId_();
  var estado = leerEstadoReconstruirId_();
  if (!estado) {
    Logger.log('No hay lote pendiente de reconstrucción desde "id".');
    return { procesados: 0 };
  }
  return reconstruirJuegosDesdeIdPorLotes({
    indiceInicio: estado.siguienteIndice,
    limite: estado.limite || LOTE_RECONSTRUIR_DESDE_ID
  });
}

function guardarEstadoReconstruirId_(estado) {
  SCRIPT_PROPS.setProperty('NEXUS_RECONSTRUIR_ID_JUEGOS', JSON.stringify(estado));
}

function leerEstadoReconstruirId_() {
  var raw = SCRIPT_PROPS.getProperty('NEXUS_RECONSTRUIR_ID_JUEGOS');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function limpiarEstadoReconstruirId_() {
  SCRIPT_PROPS.deleteProperty('NEXUS_RECONSTRUIR_ID_JUEGOS');
}

function limpiarTriggersReconstruirId_() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === TRIGGER_HANDLER_RECONSTRUIR_ID) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}