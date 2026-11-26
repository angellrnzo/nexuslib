# NexusLib — Auditorías de código

Registro de bugs encontrados en sweeps + checklist reutilizable para futuras
revisiones. Complementa `TESTING.md` (E2E manual) — esto es revisión estática.

## Bugs encontrados (historial)

| Commit | Sev | Bug | Detección | Fix |
|---|---|---|---|---|
| `3843afc` | crítico | URL JustWatch con expresión JS dentro del template literal → href literal roto | grep de URLs | template literal correcto `/es/`/`/en/` |
| `3843afc` | crítico | `t()` inyectado dentro del dict `STR` (auto-referencia `'err.x': t('err.x')`) → runtime fatal al evaluar el objeto | paridad dict + grep de valores | restaurar literales ES |
| `57fe19c` | alto | `nexusRun._exec` retornaba `undefined` → `.withFailureHandler()` post-call = TypeError; toasts de error de tracking nunca funcionaron | lectura de chaining | `_exec` retorna promesa encadenable; 11 métodos con `return` |
| `b02ccfb` | alto | Cambio de username no limpiaba caché `media_lib_*` → sufijos de persona stale 12h | razonamiento sobre generadores de sufijo | clear cache + reload + toast |
| `b02ccfb` | medio | Stats agregaban `estado*/deseado*/estrellas*` sin respetar `visible{Sufijo}===false` → fuga de privacidad en Balance/Nota Media | auditoría privacidad | filtro por flag en aggregate |
| `b02ccfb` | medio | Match modal ignoraba `visible===false` de la otra persona | idem | mismo filtro |
| `9fd8ac6` | medio | `steam-updates`/`steam-reviews`/`book-editions` ignoraban `lang` → updates/tier/idiomas siempre en español | auditoría i18n capa 2 | `lang` param + `tier_idx` + `langName` bilingüe |
| `9fd8ac6` | bajo | `catalog-add` check "ya existe" usaba ID crudo → ISBN/MAL nunca coincidían con `external_id` canónico | traza de normalización | check autoritativo post-metadata |
| `9fd8ac6` | bajo | `toLocaleString('es')`/`toLocaleDateString('es')` hardcodeados ×3 | grep de locales | `NEXUS_LANG === 'en' ? 'en-US' : 'es'` |
| `812d135` | bajo | `.tracking-container` 1fr 1fr fijo → 1 persona ocupaba media columna | auditoría responsive | clase `.single` dinámica |
| `812d135` | bajo | `.match-grid` minmax(150px) → 1 columna en móvil | idem | minmax(110px) bajo 600px |
| `812d135` | bajo | `.stat-detail-line` sin `overflow-wrap` → overflow con títulos largos | idem | `overflow-wrap:anywhere` |
| fix `:root` | **crítico** | vars auto-referenciadas en `:root` tras sweep de tokens (--text: var(--text)) -> TODO el texto invisible | reporte visual usuario | valores literales restaurados en `:root` |
| `1e27dc5` | **crítico** | Policy `links_owner for all` → lado invitado podía UPDATE/DELETE la fila del owner: auto-aceptar vínculos, exponer `visibility`/tracking ajeno | auditoría RLS cruzada | `07_links_rls_fix.sql` aplicada a prod; editor 'in' read-only |

## Patrones que ya nos mordieron (lecciones)

- **Replaces globales de i18n**: nunca correr `str.replace` sobre todo el
  archivo — muerde dentro del propio dict `STR`. Verificar siempre que los
  valores del dict sigan siendo literales.
- **Expresiones JS dentro de template literals**: `'...' + (expr)` dentro de
  backticks queda literal. `node --check` NO lo detecta.
- **Chaining post-call**: cualquier método que retorne objeto necesita `return`
  explícito o el chain muere en silencio.
- **`for all` en RLS**: revisar siempre qué lado de una relación puede mutar.
  SELECT amplio + UPDATE/DELETE por rol, nunca ambos lados.
- **Vars CSS auto-referenciadas**: una custom property que se referencia a si misma
  (--x: var(--x)) es circular = invalida -> el color cae a unset (texto negro
  invisible). Nacio del sweep de tokens que reemplazo hex DENTRO de las
  definiciones :root. Verificar siempre que cada --token: tenga valor literal.
- **Checks de duplicados con ID crudo**: normalizar al formato canónico de
  almacenamiento ANTES de comparar (`isbn:`/`mal-`/`OL`/`al-` prefixes).
- **Datos de privacidad en agregados**: cualquier `stats{}`/`match`/lista que
  itere items debe filtrar `visible{Sufijo} === false`.

## Checklist de auditoría futura

### 1. i18n

```bash
# paridad ES/EN del dict (debe dar diff vacío)
python -c "import re; s=open('index.html',encoding='utf-8').read(); \
es=s[s.find('es: {'):s.find('en: {')]; en=s[s.find('en: {'):]; \
print(set(re.findall(r\"'([^']+)':\",es)) ^ set(re.findall(r\"'([^']+)':\",en)))"

# valores del dict que se autlo-referencian (bug STR)
grep -n "': *t('" index.html

# strings en español hardcodeados en JS (excluir dict ES y valores canonicos DB)
grep -n "'[A-ZÁÉÍÓÚ][a-záéíóú]* [a-z]" index.html | grep -v "^3[0-2][0-9][0-9]:"
```

Verificar también: `data-i18n`/`data-i18n-ph`/`data-i18n-title` sin clave en
dict; `metaTr` cubre géneros/plataformas nuevos de APIs; functions aceptan
`lang` cuando devuelven texto localizado.

### 2. JS / runtime

```bash
# sintaxis de los 3 bloques script
python -c "import re; s=open('index.html',encoding='utf-8').read(); \
open('_t.js','w').write('\n;\n'.join(re.findall(r'<script>(.*?)</script>',s,re.S)))" \
&& node --check _t.js && rm _t.js

# funciones llamadas que no existen
grep -o "onclick=\"[a-zA-Z_]*" index.html | sort -u   # vs function declarations

# getElementById a IDs inexistentes
grep -o "getElementById('[^']*'" index.html | sort -u
```

Patrones extra: `JSON.parse` sin try/catch; `setInterval` sin cleanup;
listeners duplicados; `innerHTML` con datos de API sin `escaparHTML`.

### 3. Edge Functions (`supabase/functions/`)

```bash
deno check supabase/functions/*/index.ts
```

Checklist por función nueva/modificada:

- `requireUser(req)` antes de cualquier lógica (todas)
- `lang` whitelist `body.lang === 'en' ? 'en' : 'es'` si devuelve texto
- Validación de inputs: categoría whitelist, appid `^\d+$`, caps de longitud
- Nunca devolver secrets ni valores de `Deno.env`
- Errores: `{ error|success:false, msg }` shape consistente con lo que el
  frontend espera
- Compatibilidad: cambios aditivos (campos extra, params opcionales) — el
  frontend viejo debe seguir funcionando

### 4. SQL / RLS

```bash
# policies por tabla (revisar 'for all' y lados de relaciones)
grep -n "create policy" database/*.sql
```

Por cada tabla con relación usuario↔usuario:

- SELECT: ¿qué lados necesitan ver? (mínimo necesario)
- INSERT/UPDATE/DELETE: ¿solo el dueño del recurso o también el otro lado?
- Funciones `security definer`: ¿tienen `set search_path = public`? ¿validan
  `auth.uid()`? ¿`revoke all ... from public, anon` + `grant ... authenticated`?
- Vistas `security_invoker` vs definer: la matriz de visibilidad debe ser
  server-side (ver `v_cross_library_matches`)
- Tablas nuevas → RLS habilitado + policies + entrada en `apply_schema.py`

### 5. Drift frontend ↔ backend

```bash
# RPCs llamados vs definidos
grep -o "rpc('[a-z_]*'" index.html | sort -u
grep -rhn "function public\." database/*.sql | grep -o "public\.[a-z_]*" | sort -u

# Edge Functions invocadas vs carpetas
ls supabase/functions/
grep -o "functions.invoke('[a-z-]*'" index.html | sort -u
```

### 6. SW / PWA

- `index.html` cambió → bump `nexuslib-cache-vNN` en `service-worker.js`
- `urlsToCache` solo assets estáticos; nunca meter respuestas de API
- `manifest.json` icons existen en `icons/`

### 4b. CSS vars (check mecanico — bug real 2026-11-27)

```bash
# self-references y aliases a tokens inexistentes (debe dar vacio)
python -c "import re,glob; pat=re.compile(r'(--[a-zA-Z0-9-]+)\s*:\s*var\(\s*\s*\)'); print([ (f,m.group(1)) for f in glob.glob('**/*.html',recursive=True) for m in pat.finditer(open(f,encoding='utf-8',errors='ignore').read()) ])"
```

Verificar ademas que todo `var(--x)` usado en CSS exista en `:root` y que
cada `--token:` tenga valor literal o alias a otro token definido.

### 7. Visual / responsive

- grids `minmax(Xpx,1fr)`: ¿cabe 1 item solo? (caso `.tracking-container.single`)
- breakpoints 560/480/768/600/640 + `pointer:coarse` + `prefers-reduced-motion`
- `toLocaleString`/`toLocaleDateString` siempre con locale dinámico
- inline `style=` con colores → preferir vars `--*` cuando exista token

### 8. Privacidad (`visible{Sufijo}` / `is_private` / `shared_with`)

Todo aggregate, lista, modal o badge que itere items de otras personas debe
respetar los flags. Barrido rápido:

```bash
grep -n "estado\|deseado\|estrellas\|progreso" index.html | grep -v "visible"
```

Revisar manualmente cada hit en contexto de stats/match/share.

## Estado de cobertura

Áreas auditadas al 2026-11-27: i18n dict + refs, XSS/escapes, chaining RPC,
privacidad stats/match, visual/responsive, Edge Functions (7/7), RLS completo,
RPC drift, auth flows, SW/manifest, backup workflow, share/send flow,
verificaciones web (OL UA/rate limits, AniList 30rpm, Steam appdetails,
pg_cron free tier), espejo standby verificado en vivo (datos + schema).

No auditado aún: `database/etl/` (scripts ETL), `database/legacy/`,
`AppScript/` (congelado, no aplica), `sync_auth_users.py`,
`mirror_to_standby.py` lógica interna, `restore_backup.py`.
